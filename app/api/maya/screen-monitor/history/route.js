import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import ScreenMonitorLog from '@/models/ScreenMonitorLog';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

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

    const user = await User.findById(decoded.userId)
      .populate('employeeId')
      .lean();

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const includeScreenshot = searchParams.get('includeScreenshot') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    let query = {};

    // Check user roles
    const allowedRoles = ['admin', 'god_admin', 'hr', 'department_head'];
    const isPrivilegedUser = allowedRoles.includes(user.role);

    // If specific employee requested
    if (employeeId) {
      const targetEmployee = await Employee.findById(employeeId).lean();
      if (!targetEmployee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }

      // Check if this is the user's own employee record
      const isOwnRecord = user.employeeId &&
        (user.employeeId._id?.toString() === employeeId || user.employeeId.toString() === employeeId);

      if (!isPrivilegedUser && !isOwnRecord) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: 'You can only view your own monitoring history'
          },
          { status: 403 }
        );
      }

      // If department_head, verify they manage this employee (unless it's their own)
      if (user.role === 'department_head' && !isOwnRecord) {
        if (!user.employeeId) {
          return NextResponse.json(
            { error: 'Department head must be linked to an employee record' },
            { status: 403 }
          );
        }

        const requestingEmployee = await Employee.findById(user.employeeId._id).lean();

        if (!requestingEmployee.department || !targetEmployee.department) {
          return NextResponse.json(
            { error: 'Department information missing' },
            { status: 403 }
          );
        }

        if (requestingEmployee.department.toString() !== targetEmployee.department.toString()) {
          return NextResponse.json(
            {
              error: 'Access denied',
              message: 'Department heads can only view employees in their department'
            },
            { status: 403 }
          );
        }
      }

      query.targetEmployee = employeeId;
    } else {
      // No specific employee requested
      if (!isPrivilegedUser) {
        // Regular employees can only see their own monitoring
        if (!user.employeeId) {
          return NextResponse.json(
            { error: 'User must be linked to an employee record' },
            { status: 403 }
          );
        }
        query.targetEmployee = user.employeeId._id || user.employeeId;
      } else if (user.role === 'department_head') {
        // Department head sees their department's employees
        if (!user.employeeId) {
          return NextResponse.json(
            { error: 'Department head must be linked to an employee record' },
            { status: 403 }
          );
        }

        const requestingEmployee = await Employee.findById(user.employeeId._id).lean();

        if (!requestingEmployee.department) {
          return NextResponse.json(
            { error: 'Department information missing' },
            { status: 403 }
          );
        }

        // Get all employees in this department
        const departmentEmployees = await Employee.find({
          department: requestingEmployee.department
        }).select('_id').lean();

        query.targetEmployee = {
          $in: departmentEmployees.map(e => e._id)
        };
      }
      // Admins can see all (no filter needed)
    }

    // Build projection to exclude screenshot data if not requested
    const projection = includeScreenshot ? {} : { 'screenshot.data': 0 };

    // Get total count for pagination
    const total = await ScreenMonitorLog.countDocuments(query);

    // Fetch monitoring logs
    const logs = await ScreenMonitorLog.find(query, projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      logs: logs.map(log => ({
        ...log,
        screenshot: log.screenshot ? {
          mimeType: log.screenshot.mimeType,
          size: log.screenshot.size,
          capturedAt: log.screenshot.capturedAt,
          ...(includeScreenshot && { data: log.screenshot.data })
        } : null
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get screen monitoring history error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch screen monitoring history',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
