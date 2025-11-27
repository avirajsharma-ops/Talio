import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';

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
    const { message, screenCapture } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    // Get user to retrieve employeeId
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).select('employeeId name email');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    
    console.log('🔑 Gemini API Key exists:', !!geminiApiKey);
    
    if (!geminiApiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'MAYA is not configured. Please contact your administrator.' 
      }, { status: 503 });
    }

    // Find or create employee record if missing
    let employeeId = user.employeeId;
    let employeeData = null;
    if (!employeeId) {
      const Employee = (await import('@/models/Employee')).default;
      let employee = await Employee.findOne({ userId });
      
      if (!employee) {
        // Parse name into firstName and lastName
        const nameParts = (user.name || 'User').split(' ');
        const firstName = nameParts[0] || 'User';
        const lastName = nameParts.slice(1).join(' ') || 'Employee';
        
        // Create a basic employee record for MAYA functionality
        employee = await Employee.create({
          userId,
          firstName,
          lastName,
          name: user.name || 'User',
          email: user.email,
          phone: user.phone || '0000000000',
          employeeCode: `EMP${Date.now()}`,
          joiningDate: new Date(),
          dateOfJoining: new Date(),
          status: 'active'
        });
        
        // Update user with employeeId
        user.employeeId = employee._id;
        await user.save();
      }
      employeeId = employee._id;
      employeeData = employee;
    } else {
      const Employee = (await import('@/models/Employee')).default;
      employeeData = await Employee.findById(employeeId).select('firstName lastName name employeeCode designation department');
    }

    // Create chat history entry with user and employee details
    const chatSession = await MayaChatHistory.create({
      userId,
      employeeId,
      employeeName: employeeData?.name || `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() || user.name || 'User',
      employeeCode: employeeData?.employeeCode || '',
      designation: employeeData?.designation || '',
      department: employeeData?.department || '',
      sessionId: `session_${Date.now()}_${userId}`,
      messages: [
        { role: 'user', content: message, timestamp: new Date() }
      ]
    });

    // Use Gemini API only
    let assistantMessage = '';

    try {
      console.log('🤖 Using Gemini API...', screenCapture ? 'with screen capture' : '');

      // Use models available on this API key (discovered via ListModels)
      // For vision tasks, use models that support images
      const candidates = screenCapture ? [
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-pro' },
      ] : [
        { version: 'v1beta', model: 'gemini-2.0-flash' },
        { version: 'v1beta', model: 'gemini-2.5-flash' },
        { version: 'v1beta', model: 'gemini-2.0-flash-lite' },
        { version: 'v1beta', model: 'gemini-flash-latest' },
      ];

      // Build the prompt based on whether we have a screen capture
      const systemPrompt = `You are MAYA, a versatile and intelligent AI assistant integrated into the Talio HRMS platform. While you specialize in HR-related tasks like attendance, leave management, payroll, and workplace queries, you are also a capable personal office assistant who can help with:

1. **General Knowledge & Questions**: Answer any question on any topic - science, history, technology, current events, etc.
2. **Creative Tasks**: Help with writing, brainstorming ideas, drafting emails, creating presentations, storytelling, poetry, etc.
3. **Productivity & Planning**: Help organize schedules, set reminders, plan meetings, create to-do lists, time management tips.
4. **Research & Analysis**: Summarize topics, explain concepts, compare options, provide insights.
5. **Communication**: Draft professional emails, messages, reports, and other business communications.
6. **Problem Solving**: Help troubleshoot issues, provide solutions, offer advice on various challenges.
7. **Learning & Education**: Explain complex topics simply, help with learning new skills, provide study tips.
8. **Screen Analysis**: When shown a screenshot, analyze what's on screen and provide helpful insights, explanations, or assistance.

Your personality: Be warm, helpful, witty when appropriate, and professional. You're like a smart, friendly colleague who's always ready to help. Keep responses concise but comprehensive. Use bullet points or numbered lists when helpful.

When you don't know something with certainty, say so honestly. For real-time information like weather, stock prices, or current news, acknowledge that you may not have the latest data.`;

      let payload;
      
      if (screenCapture) {
        // Vision request with image
        console.log('📸 Processing screen capture with Gemini Vision...');
        
        // Extract base64 data from data URL
        const base64Data = screenCapture.replace(/^data:image\/\w+;base64,/, '');
        
        payload = {
          contents: [{
            parts: [
              {
                text: `${systemPrompt}

The user has shared their screen with you. Please analyze what you see and respond to their query.

User Query: ${message}`
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64Data
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          }
        };
      } else {
        // Text-only request
        payload = {
          contents: [{
            parts: [{
              text: `${systemPrompt}

User Query: ${message}`
            }]
          }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1000,
          }
        };
      }

      let lastError = null;
      for (const { version, model } of candidates) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${geminiApiKey}`;
        try {
          console.log(`➡️ Trying Gemini model: ${model} on ${version}`);
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (res.ok) {
            const data = await res.json();
            assistantMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;
            console.log(`✅ Gemini response received via ${version}/${model}`);
            break;
          } else {
            const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('⚠️ Gemini API attempt failed:', { version, model, status: res.status, error: errorData });
            lastError = { status: res.status, error: errorData };
          }
        } catch (err) {
          console.warn('⚠️ Gemini API network/exception:', { version, model, error: err.message });
          lastError = { error: err.message };
        }
      }

      if (!assistantMessage) {
        console.error('❌ Gemini API failed for all candidates:', lastError);
        throw new Error('Gemini API failed');
      }
    } catch (error) {
      console.error('❌ Gemini error:', error.message);
      assistantMessage = 'I apologize, but I encountered an error connecting to AI services. Please try again later or contact your administrator.';
    }

    console.log(`💬 Gemini response:`, (assistantMessage || '').substring(0, 100) + '...');

    // Update chat history with assistant response
    chatSession.messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date()
    });
    await chatSession.save();

    // Note: MayaMessage model is for relay messages between users, not chat history
    // Chat history is stored in MayaChatHistory model above

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
