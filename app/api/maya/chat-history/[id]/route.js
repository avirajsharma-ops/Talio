import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import MayaChatHistory from '@/models/MayaChatHistory';

export async function DELETE(request, { params }) {
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
    const { id } = params;

    // Find and delete the conversation (only if it belongs to the user)
    const conversation = await MayaChatHistory.findOneAndDelete({
      _id: id,
      userId: user._id
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: error.message },
      { status: 500 }
    );
  }
}
