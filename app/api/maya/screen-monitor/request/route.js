import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import ScreenMonitorLog from '@/models/ScreenMonitorLog';
import { toISTString } from '@/lib/timezone';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export async function POST(request) {
  try {
    await connectDB();

    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      decoded = payload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Get requesting user with employee data
    const requestingUser = await User.findById(decoded.userId)
      .populate('employeeId')
      .lean();

    if (!requestingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is admin or department_head
    const allowedRoles = ['admin', 'god_admin', 'department_head'];
    if (!allowedRoles.includes(requestingUser.role)) {
      return NextResponse.json(
        { 
          error: 'Access denied',
          message: 'Only admins and department heads can request screen monitoring'
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { employeeId, reason } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: 'Employee ID is required' },
        { status: 400 }
      );
    }

    // Get target employee
    const targetEmployee = await Employee.findById(employeeId)
      .populate('department')
      .lean();

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Target employee not found' },
        { status: 404 }
      );
    }

    // If department_head, verify they manage this employee's department
    if (requestingUser.role === 'department_head') {
      if (!requestingUser.employeeId) {
        return NextResponse.json(
          { error: 'Department head must be linked to an employee record' },
          { status: 403 }
        );
      }

      const requestingEmployee = await Employee.findById(requestingUser.employeeId._id).lean();
      
      if (!requestingEmployee.department || !targetEmployee.department) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            message: 'Department information missing'
          },
          { status: 403 }
        );
      }

      if (requestingEmployee.department.toString() !== targetEmployee.department._id.toString()) {
        return NextResponse.json(
          { 
            error: 'Access denied',
            message: 'Department heads can only monitor employees in their department'
          },
          { status: 403 }
        );
      }
    }

    // Get target user to send the screen capture request
    const targetUser = await User.findOne({ employeeId: targetEmployee._id }).lean();

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user account not found' },
        { status: 404 }
      );
    }

    // Create screen monitor log
    const monitorLog = await ScreenMonitorLog.create({
      requestedBy: requestingUser._id,
      requestedByName: requestingUser.employeeId 
        ? `${requestingUser.employeeId.firstName} ${requestingUser.employeeId.lastName}`
        : requestingUser.email,
      requestedByRole: requestingUser.role,
      targetEmployee: targetEmployee._id,
      targetEmployeeName: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
      targetEmployeeEmail: targetEmployee.email,
      targetDepartment: targetEmployee.department?._id,
      targetDepartmentName: targetEmployee.department?.name,
      requestReason: reason || 'Activity monitoring',
      status: 'pending'
    });

    // Emit socket event to target user's client to capture screen
    const io = global.io;
    if (io) {
      io.to(`user:${targetUser._id}`).emit('maya:screen-capture-request', {
        logId: monitorLog._id.toString(),
        requestedBy: requestingUser.employeeId 
          ? `${requestingUser.employeeId.firstName} ${requestingUser.employeeId.lastName}`
          : requestingUser.email,
        timestamp: toISTString()
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Screen monitoring request sent',
      logId: monitorLog._id,
      targetEmployee: {
        id: targetEmployee._id,
        name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
        email: targetEmployee.email,
        department: targetEmployee.department?.name
      }
    });

  } catch (error) {
    console.error('Screen monitor request error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to request screen monitoring',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET - Fetch pending screen monitoring requests for current user
export async function GET(request) {
  try {
    await connectDB();

    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      decoded = payload;
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    const user = await User.findById(decoded.userId).lean();
    if (!user || !user.employeeId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get pending requests for this employee
    const pendingRequests = await ScreenMonitorLog.find({
      targetEmployee: user.employeeId,
      status: 'pending'
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

    return NextResponse.json({
      success: true,
      requests: pendingRequests
    });

  } catch (error) {
    console.error('Get pending requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}
