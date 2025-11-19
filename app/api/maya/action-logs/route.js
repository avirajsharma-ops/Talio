import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import MayaActionLog from '@/models/MayaActionLog';

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

    // Fetch action logs for the user
    const actions = await MayaActionLog.find({ userId: user._id })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      actions,
      total: actions.length
    });

  } catch (error) {
    console.error('Error fetching action logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch action logs', details: error.message },
      { status: 500 }
    );
  }
}

