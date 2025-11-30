import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// GET - Get screenshot interval settings for current user
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

    const user = await User.findById(decoded.userId).populate('employeeId');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get interval from employee record or use default (1 minute)
    const interval = user.employeeId?.screenshotInterval || 60 * 1000; // milliseconds

    return NextResponse.json({
      success: true,
      data: {
        interval: interval,
        intervalMinutes: interval / (60 * 1000)
      }
    });

  } catch (error) {
    console.error('Get Screenshot Interval Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get screenshot interval' 
    }, { status: 500 });
  }
}

// POST - Set screenshot interval for employee(s) (Admin/Dept Head only)
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

    const requester = await User.findById(decoded.userId).select('role employeeId');
    if (!requester) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check permission
    if (!['admin', 'god_admin', 'department_head'].includes(requester.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only admins and department heads can set screenshot intervals' 
      }, { status: 403 });
    }

    const { targetEmployeeIds, intervalMinutes } = await request.json();

    if (!targetEmployeeIds || !Array.isArray(targetEmployeeIds) || targetEmployeeIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Target employee IDs array is required' 
      }, { status: 400 });
    }

    if (!intervalMinutes || intervalMinutes < 1 || intervalMinutes > 1440) {
      return NextResponse.json({ 
        success: false, 
        error: 'Interval must be between 1 and 1440 minutes (24 hours)' 
      }, { status: 400 });
    }

    const intervalMs = intervalMinutes * 60 * 1000;

    // If department head, verify all targets are in their department
    if (requester.role === 'department_head') {
      const requesterEmployee = await Employee.findById(requester.employeeId).select('department');
      const targetEmployees = await Employee.find({ _id: { $in: targetEmployeeIds } }).select('department');
      
      const allInDepartment = targetEmployees.every(emp => 
        emp.department?.toString() === requesterEmployee.department?.toString()
      );

      if (!allInDepartment) {
        return NextResponse.json({ 
          success: false, 
          error: 'You can only set intervals for employees in your department' 
        }, { status: 403 });
      }
    }

    // Update screenshot interval for all target employees
    await Employee.updateMany(
      { _id: { $in: targetEmployeeIds } },
      { $set: { screenshotInterval: intervalMs } }
    );

    // Emit socket event to notify desktop apps
    if (global.io) {
      for (const employeeId of targetEmployeeIds) {
        const employee = await Employee.findById(employeeId).populate('userId');
        if (employee && employee.userId) {
          global.io.to(`user:${employee.userId._id}`).emit('screenshot-interval-updated', {
            interval: intervalMs,
            intervalMinutes: intervalMinutes
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Screenshot interval updated to ${intervalMinutes} minutes for ${targetEmployeeIds.length} employee(s)`,
      data: {
        updatedCount: targetEmployeeIds.length,
        intervalMinutes: intervalMinutes
      }
    });

  } catch (error) {
    console.error('Set Screenshot Interval Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to set screenshot interval' 
    }, { status: 500 });
  }
}
