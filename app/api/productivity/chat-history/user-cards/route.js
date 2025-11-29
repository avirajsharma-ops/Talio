'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * Check if a user is a department head via Department.head field
 */
async function getDepartmentIfHead(userId) {
  const user = await User.findById(userId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) return null;
  
  const department = await Department.findOne({ head: employeeId, isActive: true });
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
    
    // Build aggregation pipeline based on access level
    let matchStage = {};
    
    if (isAdminOrGodAdmin) {
      // Admins see all chat history - no filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      const deptEmployees = await Employee.find({ 
        department: headOfDepartment._id,
        status: 'active'
      }).select('userId');
      const deptUserIds = deptEmployees.filter(e => e.userId).map(e => e.userId);
      matchStage.userId = { $in: deptUserIds };
    } else {
      // All other roles see only their own chat history
      matchStage.userId = currentUser._id;
    }

    // Get chat history grouped by user
    const chatHistoryByUser = await MayaChatHistory.aggregate([
      { $match: matchStage },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$userId',
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: { $size: { $ifNull: ['$messages', []] } } },
          lastMessageTime: { $first: '$createdAt' },
          lastMessages: { $first: '$messages' },
          todayConversations: {
            $sum: {
              $cond: [
                { 
                  $gte: [
                    '$createdAt', 
                    new Date(new Date().setHours(0, 0, 0, 0))
                  ] 
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Get user details for each
    const userCards = await Promise.all(
      chatHistoryByUser.map(async (chat) => {
        const user = await User.findById(chat._id).select('name email profilePicture');
        const employee = await Employee.findOne({ userId: chat._id }).select('firstName lastName employeeCode designation profilePicture department');
        
        let name = 'Unknown User';
        let profilePicture = null;
        let employeeCode = '';
        let designation = '';
        
        if (employee) {
          name = employee.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : (user?.name || 'Unknown User');
          profilePicture = employee.profilePicture || user?.profilePicture;
          employeeCode = employee.employeeCode || '';
          designation = typeof employee.designation === 'object' ? employee.designation?.title : employee.designation || '';
        } else if (user) {
          name = user.name || user.email?.split('@')[0] || 'Unknown User';
          profilePicture = user.profilePicture;
        }

        // Get the last user message for preview
        let lastMessage = '';
        if (chat.lastMessages && chat.lastMessages.length > 0) {
          const userMessage = chat.lastMessages.find(m => m.role === 'user');
          lastMessage = userMessage?.content || chat.lastMessages[0]?.content || '';
          if (lastMessage.length > 100) {
            lastMessage = lastMessage.substring(0, 100) + '...';
          }
        }

        return {
          id: chat._id?.toString(),
          userId: chat._id?.toString(),
          name,
          profilePicture,
          employeeCode,
          designation,
          totalConversations: chat.totalConversations || 0,
          totalMessages: chat.totalMessages || 0,
          todayConversations: chat.todayConversations || 0,
          lastMessageTime: chat.lastMessageTime,
          lastMessage,
          isOwn: chat._id?.toString() === userId?.toString()
        };
      })
    );

    // Sort: own user first, then by total conversations
    userCards.sort((a, b) => {
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      return (b.totalConversations || 0) - (a.totalConversations || 0);
    });

    return NextResponse.json({ 
      success: true, 
      data: userCards,
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
