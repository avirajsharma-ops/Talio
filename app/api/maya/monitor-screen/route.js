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
import { canMonitorScreen } from '@/lib/mayaPermissions';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

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

    // Get requester user with employeeId populated
    const requester = await User.findById(userId).populate('employeeId');
    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { targetUserId, targetUserEmail, reason } = body;

    // Find target user with employeeId populated
    let targetUser;
    if (targetUserId) {
      targetUser = await User.findById(targetUserId).populate('employeeId');
    } else if (targetUserEmail) {
      targetUser = await User.findOne({ email: targetUserEmail }).populate('employeeId');
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Get employee records to check departments
    const requesterEmployee = requester.employeeId ? await Employee.findById(requester.employeeId).select('department firstName lastName') : null;
    const targetEmployee = targetUser.employeeId ? await Employee.findById(targetUser.employeeId).select('department firstName lastName') : null;

    // Check authorization using canMonitorScreen from mayaPermissions
    const authCheck = canMonitorScreen(
      requester.role,
      requesterEmployee?.department,
      targetEmployee?.department
    );

    if (!authCheck.allowed) {
      // Log unauthorized attempt
      await ScreenMonitor.create({
        requestedBy: requester._id,
        requestedByName: requesterEmployee ? `${requesterEmployee.firstName} ${requesterEmployee.lastName}` : requester.email,
        requestedByRole: requester.role,
        targetUser: targetUser._id,
        targetUserName: targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : targetUser.email,
        targetUserRole: targetUser.role,
        reason,
        isAuthorized: false,
        authorizationReason: authCheck.reason,
        status: 'failed',
        error: 'Unauthorized: ' + authCheck.reason,
      });

      return NextResponse.json({
        error: 'You are not authorized to monitor this user',
        reason: authCheck.reason,
      }, { status: 403 });
    }

    // Create monitoring request
    const monitorRequest = await ScreenMonitor.create({
      requestedBy: requester._id,
      requestedByName: requesterEmployee ? `${requesterEmployee.firstName} ${requesterEmployee.lastName}` : requester.email,
      requestedByRole: requester.role,
      targetUser: targetUser._id,
      targetUserName: targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : targetUser.email,
      targetUserRole: targetUser.role,
      reason,
      isAuthorized: true,
      authorizationReason: authCheck.reason,
      status: 'pending',
    });

    // Emit Socket.IO event to request screenshot from target user's session
    global.io?.emit('maya:screen-capture-request', {
      requestId: monitorRequest._id,
      targetUserId: targetUser._id.toString(),
      requestedBy: requesterEmployee ? `${requesterEmployee.firstName} ${requesterEmployee.lastName}` : requester.email,
    });

    return NextResponse.json({
      success: true,
      message: 'Screen monitoring request sent',
      requestId: monitorRequest._id,
      targetUser: targetEmployee ? `${targetEmployee.firstName} ${targetEmployee.lastName}` : targetUser.email,
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

