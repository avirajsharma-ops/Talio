import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import User from '@/models/User';
import Employee from '@/models/Employee';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper function to check if user can view target user's chat history
async function canViewChatHistory(requesterId, requesterRole, targetUserId) {
  // god_admin and admin can view everyone's chat
  if (requesterRole === 'god_admin' || requesterRole === 'admin') {
    return true;
  }

  // Department head can view their department members' chat
  if (requesterRole === 'department_head') {
    const requester = await Employee.findOne({ userId: requesterId }).select('department');
    const target = await Employee.findOne({ userId: targetUserId }).select('department');
    
    if (requester && target && requester.department && 
        requester.department.toString() === target.department.toString()) {
      return true;
    }
  }

  // User can always view their own chat
  if (requesterId === targetUserId) {
    return true;
  }

  return false;
}

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

    const userId = decoded.userId;
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit')) || 50;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await connectDB();

    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let query = {};
    
    // Determine which users' chat history to fetch
    if (targetUserId) {
      // Specific user requested - check permission
      const canView = await canViewChatHistory(userId, user.role, targetUserId);
      if (!canView) {
        return NextResponse.json({ 
          success: false, 
          error: 'You do not have permission to view this user\'s chat history' 
        }, { status: 403 });
      }
      query.userId = targetUserId;
    } else {
      // No specific user - return based on role
      if (user.role === 'god_admin' || user.role === 'admin') {
        // Admin/god_admin can see all
        // No filter needed
      } else if (user.role === 'department_head') {
        // Department head sees their department
        const employee = await Employee.findOne({ userId }).select('department');
        if (employee && employee.department) {
          const departmentEmployees = await Employee.find({ 
            department: employee.department 
          }).select('userId');
          const departmentUserIds = departmentEmployees.map(e => e.userId);
          query.userId = { $in: departmentUserIds };
        }
      } else {
        // Regular employees see only their own chat
        query.userId = userId;
      }
    }

    // Apply date filters if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const chatHistory = await MayaChatHistory.find(query)
      .populate('userId', 'name email')
      .populate('employeeId', 'name employeeCode department designation')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: chatHistory,
      count: chatHistory.length
    });

  } catch (error) {
    console.error('MAYA Chat History Fetch Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chat history' 
    }, { status: 500 });
  }
}
