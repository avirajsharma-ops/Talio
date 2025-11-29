import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * GET - Get full session details including all screenshots
 */
export async function GET(request, { params }) {
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

    await connectDB();

    const { sessionId } = await params;

    // Fetch full session with all data
    const session = await ProductivitySession.findById(sessionId)
      .populate('employeeId', 'firstName lastName employeeCode designation department profilePicture')
      .populate('userId', 'name email profilePicture')
      .lean();

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const requester = await User.findById(decoded.userId).select('role');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    const isDeptHead = requester?.role === 'department_head';
    const isOwner = session.userId._id?.toString() === decoded.userId || 
                    session.userId?.toString() === decoded.userId;

    if (!isAdmin && !isDeptHead && !isOwner) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('[Session Detail API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch session details' 
    }, { status: 500 });
  }
}
