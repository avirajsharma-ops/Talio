import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { prompt, context, tone = 'professional', type = 'compose' } = await request.json();

    if (!prompt && !context) {
      return NextResponse.json({ success: false, error: 'Prompt or context is required' }, { status: 400 });
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!geminiApiKey) {
      return NextResponse.json({
        success: false,
        error: 'AI service is not configured.'
      }, { status: 503 });
    }

    // Construct system prompt
    let systemPrompt = `You are an expert AI email assistant integrated into Talio HRMS.
Your task is to help the user ${type === 'reply' ? 'reply to an email' : 'compose a new email'}.

TONE: ${tone}
FORMAT: HTML (use <p>, <br>, <ul>, <li>, <strong>, etc. where appropriate, but keep it clean)

INSTRUCTIONS:
- Write a clear, concise, and professional email based on the user's request.
- If it's a reply, address the points raised in the context.
- Do not include placeholders like "[Your Name]" unless absolutely necessary.
- Do not include the subject line in the body, just the email content.
- Use proper salutations and sign-offs.
`;

    let userMessage = '';
    if (type === 'reply' && context) {
      userMessage = `
CONTEXT (Email I am replying to):
"${context}"

MY INSTRUCTIONS FOR THE REPLY:
"${prompt || 'Write a suitable reply'}"
`;
    } else {
      userMessage = `
MY INSTRUCTIONS FOR THE EMAIL:
"${prompt}"
`;
    }

    const payload = {
      contents: [{
        parts: [{
          text: `${systemPrompt}\n\n${userMessage}`
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    };

    // Call Gemini API
    // Try different models if one fails
    const candidates = [
      { version: 'v1beta', model: 'gemini-1.5-flash' },
      { version: 'v1beta', model: 'gemini-1.5-pro' },
      { version: 'v1', model: 'gemini-pro' }
    ];

    let generatedEmail = '';
    let lastError = null;

    for (const { version, model } of candidates) {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiApiKey}`;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          generatedEmail = data.candidates?.[0]?.content?.parts?.[0]?.text;
          break;
        } else {
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          lastError = { status: res.status, error: errorData };
        }
      } catch (err) {
        lastError = { error: err.message };
      }
    }

    if (!generatedEmail) {
      console.error('Gemini API failed:', lastError);
      throw new Error('Failed to generate email');
    }

    // Clean up markdown code blocks if present
    generatedEmail = generatedEmail.replace(/```html/g, '').replace(/```/g, '').trim();

    return NextResponse.json({
      success: true,
      content: generatedEmail
    });

  } catch (error) {
    console.error('AI Email Compose Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate email. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}
