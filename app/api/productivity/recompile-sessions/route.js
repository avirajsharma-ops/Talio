import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { recompileSessionsForUser, recompileAllSessions } from '@/lib/sessionAggregator';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * POST - Recompile productivity sessions using the new 30-screenshot logic
 * 
 * Body:
 * - userId: (optional) Specific user to recompile. If not provided, recompiles all users.
 * - startDate: (optional) Start date for recompilation (YYYY-MM-DD)
 * - endDate: (optional) End date for recompilation (YYYY-MM-DD)
 * 
 * Access: admin/god_admin only
 */
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

    await connectDB();

    // Verify admin access
    const requester = await User.findById(decoded.userId).select('role').lean();
    if (!requester || !['admin', 'god_admin'].includes(requester.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { userId, startDate, endDate } = body;

    // Parse date range if provided
    let dateRange;
    if (startDate || endDate) {
      dateRange = {};
      if (startDate) {
        dateRange.start = new Date(startDate);
        dateRange.start.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        dateRange.end = new Date(endDate);
        dateRange.end.setHours(23, 59, 59, 999);
      }
    }

    let result;
    if (userId) {
      // Recompile for specific user
      console.log(`[Recompile] Starting recompile for user ${userId}`);
      result = await recompileSessionsForUser(userId, dateRange);
      
      return NextResponse.json({
        success: true,
        message: `Recompiled sessions for user ${userId}`,
        result: {
          userId,
          sessionsDeleted: result.deletedCount || 0,
          sessionsCreated: result.createdCount || 0,
          dateRange: dateRange ? { start: startDate, end: endDate } : 'all time'
        }
      });
    } else {
      // Recompile for all users
      console.log('[Recompile] Starting recompile for all users');
      result = await recompileAllSessions(dateRange);
      
      return NextResponse.json({
        success: true,
        message: 'Recompiled sessions for all users',
        result: {
          usersProcessed: result.usersProcessed || 0,
          totalSessionsDeleted: result.totalDeleted || 0,
          totalSessionsCreated: result.totalCreated || 0,
          errors: result.errors || [],
          dateRange: dateRange ? { start: startDate, end: endDate } : 'all time'
        }
      });
    }
  } catch (error) {
    console.error('[Recompile API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to recompile sessions',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * GET - Get recompile status/info
 */
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

    await connectDB();

    // Verify admin access
    const requester = await User.findById(decoded.userId).select('role').lean();
    if (!requester || !['admin', 'god_admin'].includes(requester.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied. Admin privileges required.' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      info: {
        description: 'Recompile productivity sessions using the new 30-screenshot session logic',
        endpoints: {
          POST: {
            description: 'Trigger recompilation',
            body: {
              userId: '(optional) Specific user ID to recompile',
              startDate: '(optional) Start date YYYY-MM-DD',
              endDate: '(optional) End date YYYY-MM-DD'
            }
          }
        },
        sessionLogic: {
          screenshotsPerSession: 30,
          lastSessionMarker: 'User checkout from Attendance record',
          fields: {
            sessionNumber: 'Sequential session number for the day (1, 2, 3...)',
            isLastSessionOfDay: 'True if this is the final session for the day',
            checkoutTriggered: 'True if session ended due to user checkout'
          }
        }
      }
    });
  } catch (error) {
    console.error('[Recompile API] GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get recompile info'
    }, { status: 500 });
  }
}
