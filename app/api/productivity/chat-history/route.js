import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import MayaChatHistory from '@/models/MayaChatHistory';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

// Helper to safely convert to ObjectId
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper function to check if user is a department head (via Department.head field)
async function getDepartmentIfHead(userId) {
  // Convert userId to ObjectId if needed
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;
  
  // First get the employee ID for this user
  const user = await User.findById(userObjId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    // Try to find employee by userId
    const employee = await Employee.findOne({ userId: userObjId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) {
    console.log('[getDepartmentIfHead] No employee found for userId:', userId);
    return null;
  }
  
  // Check if this employee is head of any department
  const department = await Department.findOne({ head: employeeId, isActive: true });
  console.log('[getDepartmentIfHead] Check result:', { userId, employeeId: employeeId?.toString(), foundDepartment: department?.name || null });
  return department;
}

// Helper function to check if user can view target user's chat history
async function canViewChatHistory(requesterId, requesterRole, targetUserId) {
  // god_admin and admin can view everyone's chat
  if (requesterRole === 'god_admin' || requesterRole === 'admin') {
    return true;
  }

  // Check if user is department head via Department model
  const department = await getDepartmentIfHead(requesterId);
  
  if (department) {
    // Get target employee's department - convert targetUserId to ObjectId
    const targetObjId = toObjectId(targetUserId);
    const targetEmployee = await Employee.findOne({ userId: targetObjId }).select('department');
    
    if (targetEmployee && targetEmployee.department && 
        targetEmployee.department.toString() === department._id.toString()) {
      return true;
    }
  }

  // User can always view their own chat
  if (requesterId.toString() === targetUserId.toString()) {
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
    const offset = parseInt(searchParams.get('offset')) || 0;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await connectDB();

    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let query = {};
    
    // Check if user is a department head (via Department.head field)
    const headOfDepartment = await getDepartmentIfHead(userId);
    
    console.log('[Chat History API] User check:', { userId, role: user.role, isHead: !!headOfDepartment, departmentId: headOfDepartment?._id });
    
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
      // Convert string ID to ObjectId for proper querying
      const targetObjId = toObjectId(targetUserId);
      if (!targetObjId) {
        return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
      }
      query.userId = targetObjId;
      console.log('[Chat History API] Query for specific user:', { targetUserId, targetObjId });
    } else {
      // No specific user - return based on role/department head status
      if (user.role === 'god_admin' || user.role === 'admin') {
        // Admin/god_admin can see all
        // No filter needed
      } else if (headOfDepartment) {
        // User is head of a department - get all employees in that department
        const departmentEmployees = await Employee.find({ 
          department: headOfDepartment._id 
        }).select('userId');
        const departmentUserIds = departmentEmployees
          .filter(e => e.userId)
          .map(e => e.userId);
        
        // Always include the head's own userId
        if (!departmentUserIds.some(id => id?.toString() === userId)) {
          departmentUserIds.push(userId);
        }
        
        query.userId = { $in: departmentUserIds };
        console.log('[Chat History API] Department head query - department:', headOfDepartment.name, 'users:', departmentUserIds.length);
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
      .skip(offset)
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
