/**
 * MAYA Screen Monitoring API
 * Allows authorized users to monitor screens based on hierarchy
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import ScreenMonitor from '@/models/ScreenMonitor';
import { canUserAccessTarget, ROLE_HIERARCHY } from '@/lib/mayaPermissions';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * Check if user can monitor target based on hierarchy
 */
function canMonitorUser(requesterRole, targetRole) {
  // GOD admin can monitor anyone
  if (requesterRole === 'god_admin') {
    return true;
  }

  // Get hierarchy levels
  const requesterLevel = ROLE_HIERARCHY[requesterRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  // Can only monitor users at lower hierarchy level
  return requesterLevel > targetLevel;
}

/**
 * POST /api/maya/monitor-screen
 * Request to monitor a user's screen
 */
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    // Get requester user
    const requester = await User.findById(userId).populate('employee');
    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { targetUserId, targetUserEmail, reason } = body;

    // Find target user
    let targetUser;
    if (targetUserId) {
      targetUser = await User.findById(targetUserId).populate('employee');
    } else if (targetUserEmail) {
      targetUser = await User.findOne({ email: targetUserEmail }).populate('employee');
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Check authorization
    const isAuthorized = canMonitorUser(requester.role, targetUser.role);

    if (!isAuthorized) {
      // Log unauthorized attempt
      await ScreenMonitor.create({
        requestedBy: requester._id,
        requestedByName: requester.employee?.name || requester.email,
        requestedByRole: requester.role,
        targetUser: targetUser._id,
        targetUserName: targetUser.employee?.name || targetUser.email,
        targetUserRole: targetUser.role,
        reason,
        isAuthorized: false,
        authorizationReason: `Insufficient permissions: ${requester.role} cannot monitor ${targetUser.role}`,
        status: 'failed',
        error: 'Unauthorized: Insufficient hierarchy level',
      });

      return NextResponse.json({ 
        error: 'You are not authorized to monitor this user',
        reason: `Your role (${requester.role}) does not have permission to monitor ${targetUser.role}`,
      }, { status: 403 });
    }

    // Create monitoring request
    const monitorRequest = await ScreenMonitor.create({
      requestedBy: requester._id,
      requestedByName: requester.employee?.name || requester.email,
      requestedByRole: requester.role,
      targetUser: targetUser._id,
      targetUserName: targetUser.employee?.name || targetUser.email,
      targetUserRole: targetUser.role,
      reason,
      isAuthorized: true,
      authorizationReason: `Authorized: ${requester.role} can monitor ${targetUser.role}`,
      status: 'pending',
    });

    // Emit Socket.IO event to request screenshot from target user's session
    global.io?.emit('maya:screen-capture-request', {
      requestId: monitorRequest._id,
      targetUserId: targetUser._id.toString(),
      requestedBy: requester.employee?.name || requester.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Screen monitoring request sent',
      requestId: monitorRequest._id,
      targetUser: targetUser.employee?.name || targetUser.email,
      status: 'pending',
    });

  } catch (error) {
    console.error('❌ MAYA Screen Monitor Error:', error);
    return NextResponse.json({ 
      error: 'Failed to monitor screen',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/maya/monitor-screen
 * Get monitoring history
 */
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const monitoringLogs = await ScreenMonitor.getRecentMonitoring(userId, limit);

    return NextResponse.json({
      success: true,
      logs: monitoringLogs,
      count: monitoringLogs.length,
    });

  } catch (error) {
    console.error('❌ Get Monitoring Logs Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get monitoring logs',
      details: error.message,
    }, { status: 500 });
  }
}

