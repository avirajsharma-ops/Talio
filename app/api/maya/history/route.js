import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export async function GET(request) {
  try {
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;

    await connectDB();

    const history = await MayaChatHistory.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('messages createdAt metadata');

    return NextResponse.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('MAYA History Fetch Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chat history' 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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
    const { type, message, response, action, result } = await request.json();

    await connectDB();

    const historyEntry = await MayaChatHistory.create({
      userId,
      messages: [
        { 
          role: 'user', 
          content: message, 
          timestamp: new Date() 
        },
        ...(response ? [{
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }] : [])
      ],
      metadata: {
        type: type || 'chat',
        action: action,
        result: result,
        source: 'desktop-app'
      }
    });

    return NextResponse.json({
      success: true,
      data: historyEntry
    });

  } catch (error) {
    console.error('MAYA History Save Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save chat history' 
    }, { status: 500 });
  }
}
