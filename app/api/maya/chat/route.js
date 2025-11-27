import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import MayaMessage from '@/models/MayaMessage';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    // Get user to retrieve employeeId
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).select('employeeId');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!openaiApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'MAYA is not configured. Please contact your administrator.' 
      }, { status: 503 });
    }

    // Create chat history entry
    const chatSession = await MayaChatHistory.create({
      userId,
      employeeId: user.employeeId,
      sessionId: `session_${Date.now()}_${userId}`,
      messages: [
        { role: 'user', content: message, timestamp: new Date() }
      ],
      metadata: {
        source: 'desktop-app',
        userAgent: request.headers.get('user-agent')
      }
    });

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are MAYA, a helpful and professional AI assistant for the Talio HRMS system. You help employees with HR-related tasks, attendance tracking, leave management, and general workplace queries. Be concise, friendly, and professional. Keep responses brief and actionable.`
          },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!openaiResponse.ok) {
      throw new Error('OpenAI API request failed');
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

    // Update chat history with assistant response
    chatSession.messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date()
    });
    await chatSession.save();

    // Save to MayaMessage for tracking
    await MayaMessage.create({
      userId,
      sessionId: chatSession._id,
      userMessage: message,
      mayaResponse: assistantMessage,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      sessionId: chatSession._id
    });

  } catch (error) {
    console.error('MAYA Chat Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process your message. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}
