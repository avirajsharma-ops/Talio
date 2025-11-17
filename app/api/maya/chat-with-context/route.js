/**
 * MAYA Chat with Vector Context API
 * This endpoint automatically retrieves relevant context from vector database
 * and includes it in MAYA's response
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getVectorContext, buildMayaPrompt } from '@/lib/mayaVectorContext';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, conversationHistory = [], useVectorContext = true } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    let systemPrompt = `You are MAYA, an intelligent AI assistant for the Talio HRMS system.
You help employees with HR-related queries, company information, and general assistance.
Be helpful, professional, and friendly.`;

    let userMessage = message;

    // Get vector context if enabled
    if (useVectorContext) {
      try {
        const vectorContext = await getVectorContext(message, {
          maxResults: 5,
        });

        if (vectorContext.success && vectorContext.hasResults) {
          // Build enhanced prompt with context
          userMessage = buildMayaPrompt(message, vectorContext);
          
          console.log('✅ Vector context retrieved:', {
            count: vectorContext.count,
            queryType: vectorContext.queryType,
          });
        } else {
          console.log('ℹ️ No vector context found for query');
        }
      } catch (error) {
        console.error('⚠️ Vector context error (continuing without):', error);
        // Continue without vector context if it fails
      }
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
      stream: false,
    });

    const response = completion.choices[0].message.content;

    return NextResponse.json({
      success: true,
      response,
      usage: completion.usage,
    });
  } catch (error) {
    console.error('MAYA chat error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Streaming version
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const message = searchParams.get('message');

  if (!message) {
    return NextResponse.json(
      {
        message: 'MAYA Chat with Vector Context API',
        usage: {
          method: 'POST',
          endpoint: '/api/maya/chat-with-context',
          body: {
            message: 'your message',
            conversationHistory: [
              { role: 'user', content: 'previous message' },
              { role: 'assistant', content: 'previous response' },
            ],
            useVectorContext: true,
          },
        },
        example: {
          message: 'Who are the React developers in the Engineering department?',
          useVectorContext: true,
        },
      },
      { status: 200 }
    );
  }

  // Simple GET request
  try {
    const vectorContext = await getVectorContext(message, {
      maxResults: 5,
    });

    const prompt = buildMayaPrompt(message, vectorContext);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are MAYA, an AI assistant for Talio HRMS.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return NextResponse.json({
      success: true,
      message,
      response: completion.choices[0].message.content,
      vectorContext: {
        hasResults: vectorContext.hasResults,
        count: vectorContext.count,
        queryType: vectorContext.queryType,
      },
    });
  } catch (error) {
    console.error('MAYA chat GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

