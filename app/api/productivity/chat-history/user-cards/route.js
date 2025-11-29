'use server';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Helper to safely convert to ObjectId
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

/**
 * Check if a user is a department head via Department.head field
 */
async function getDepartmentIfHead(userId) {
  // Convert userId to ObjectId if needed
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;
  
  const user = await User.findById(userObjId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId: userObjId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) {
    console.log('[getDepartmentIfHead] No employee found for userId:', userId);
    return null;
  }
  
  const department = await Department.findOne({ head: employeeId, isActive: true });
  console.log('[getDepartmentIfHead] Check result:', { userId, employeeId: employeeId?.toString(), foundDepartment: department?.name || null });
  return department;
}

export async function GET(request) {
  try {
    await connectDB();

    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      decoded = payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId || decoded._id || decoded.id;

    // Get the user
    const currentUser = await User.findById(userId).select('role');
    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const isAdminOrGodAdmin = currentUser.role === 'admin' || currentUser.role === 'god_admin';
    
    // Check if user is a department head via Department.head field
    const headOfDepartment = await getDepartmentIfHead(userId);
    const isDeptHead = !!headOfDepartment;

    console.log('[Chat User Cards API] Access check:', {
      userId,
      role: currentUser.role,
      isAdmin: isAdminOrGodAdmin,
      isDeptHead,
      departmentId: headOfDepartment?._id?.toString()
    });
    
    // Build employee query based on access level (same as user-cards API)
    let employeeQuery = { status: 'active' };
    
    if (isAdminOrGodAdmin) {
      // Admins see all users - no additional filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      employeeQuery.department = headOfDepartment._id;
    } else {
      // All other roles see only their own card
      const requesterEmployee = await Employee.findOne({ userId: userId }).select('_id');
      if (requesterEmployee) {
        employeeQuery._id = requesterEmployee._id;
      } else {
        return NextResponse.json({
          success: true,
          data: [],
          accessLevel: 'self_only'
        });
      }
    }

    // Get all employees first (like user-cards API)
    const employees = await Employee.find(employeeQuery)
      .populate('userId', 'name email profilePicture')
      .populate('department', 'name')
      .select('firstName lastName employeeCode designation profilePicture userId department')
      .lean();

    // Get chat history stats for each employee
    const userCards = await Promise.all(employees.map(async (employee) => {
      if (!employee.userId) return null;
      
      const empUserId = employee.userId._id || employee.userId;
      // Convert to ObjectId for aggregation
      const empUserObjId = toObjectId(empUserId);
      if (!empUserObjId) return null;
      
      // Get chat history stats for this user
      const chatStats = await MayaChatHistory.aggregate([
        { $match: { userId: empUserObjId } },
        {
          $group: {
            _id: null,
            totalConversations: { $sum: 1 },
            totalMessages: { $sum: { $size: { $ifNull: ['$messages', []] } } },
            lastMessageTime: { $max: '$createdAt' },
            todayConversations: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', new Date(new Date().setHours(0, 0, 0, 0))] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      // Get the last conversation for preview
      const lastConversation = await MayaChatHistory.findOne({ userId: empUserObjId })
        .sort({ createdAt: -1 })
        .select('messages')
        .lean();

      let lastMessage = '';
      if (lastConversation?.messages?.length > 0) {
        const userMessage = lastConversation.messages.find(m => m.role === 'user');
        lastMessage = userMessage?.content || lastConversation.messages[0]?.content || '';
        if (lastMessage.length > 100) {
          lastMessage = lastMessage.substring(0, 100) + '...';
        }
      }

      const stats = chatStats[0] || { totalConversations: 0, totalMessages: 0, todayConversations: 0, lastMessageTime: null };
      
      const userName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : (employee.userId?.name || 'Unknown');

      return {
        id: employee._id?.toString(),
        odooId: empUserId?.toString(),
        userId: empUserId?.toString(),
        name: userName,
        email: employee.userId?.email,
        profilePicture: employee.profilePicture || employee.userId?.profilePicture,
        employeeCode: employee.employeeCode || '',
        designation: typeof employee.designation === 'object' ? employee.designation?.title : employee.designation || '',
        department: employee.department?.name || 'Unassigned',
        totalConversations: stats.totalConversations || 0,
        totalMessages: stats.totalMessages || 0,
        todayConversations: stats.todayConversations || 0,
        lastMessageTime: stats.lastMessageTime,
        lastMessage,
        isOwn: empUserId?.toString() === userId?.toString()
      };
    }));

    // Filter out null entries and sort: own user first, then by total conversations
    const validUserCards = userCards
      .filter(card => card !== null)
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1;
        if (!a.isOwn && b.isOwn) return 1;
        return (b.totalConversations || 0) - (a.totalConversations || 0);
      });

    return NextResponse.json({ 
      success: true, 
      data: validUserCards,
      totalUsers: validUserCards.length,
      accessLevel: isAdminOrGodAdmin ? 'admin' : isDeptHead ? 'department_head' : 'self_only'
    });

  } catch (error) {
    console.error('Chat History User Cards Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch chat history user cards' 
    }, { status: 500 });
  }
}
