import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import MayaChatHistory from '@/models/MayaChatHistory';

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

    // Check if user is admin, department_head or manager
    const allowedRoles = ['admin', 'god_admin', 'department_head', 'manager'];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: 'Only admins, department heads and managers can view employee chats'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const sessionId = searchParams.get('sessionId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    let query = {};

    // If specific employee requested, verify access and build query
    if (employeeId) {
      const targetEmployee = await Employee.findById(employeeId).lean();
      if (!targetEmployee) {
        return NextResponse.json(
          { error: 'Employee not found' },
          { status: 404 }
        );
      }

      // If department_head or manager, verify they manage this employee
      if (user.role === 'department_head' || user.role === 'manager') {
        if (!user.employeeId) {
          return NextResponse.json(
            { error: 'Department head/manager must be linked to an employee record' },
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
              message: 'Department heads/managers can only view chats of employees in their department'
            },
            { status: 403 }
          );
        }
      }

      query.employeeId = employeeId;
    } else {
      // If department_head or manager, only show their department's employees
      if (user.role === 'department_head' || user.role === 'manager') {
        if (!user.employeeId) {
          return NextResponse.json(
            { error: 'Department head/manager must be linked to an employee record' },
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

        query.employeeId = {
          $in: departmentEmployees.map(e => e._id)
        };
      }
      // Admins can see all
    }

    // If specific session requested
    if (sessionId) {
      query.sessionId = sessionId;
    }

    // Get total count for pagination
    const total = await MayaChatHistory.countDocuments(query);

    // Fetch chat histories
    const chats = await MayaChatHistory.find(query)
      .populate('employeeId', 'firstName lastName email employeeCode department')
      .populate({
        path: 'employeeId',
        populate: {
          path: 'department',
          select: 'name'
        }
      })
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // If sessionId is provided, return full messages; otherwise return summaries
    const responseData = sessionId 
      ? chats 
      : chats.map(chat => ({
          _id: chat._id,
          sessionId: chat.sessionId,
          employeeId: chat.employeeId,
          totalMessages: chat.totalMessages,
          lastMessageAt: chat.lastMessageAt,
          createdAt: chat.createdAt,
          // Return only last 2 messages as preview
          recentMessages: chat.messages.slice(-2).map(msg => ({
            role: msg.role,
            content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
            timestamp: msg.timestamp
          }))
        }));

    return NextResponse.json({
      success: true,
      chats: responseData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get employee chats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee chats',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
