import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import MayaChatHistory from '@/models/MayaChatHistory';

export async function GET(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Fetch chat history for the user
    const history = await MayaChatHistory.find({ userId: user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      history,
      total: history.length
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history', details: error.message },
      { status: 500 }
    );
  }
}

