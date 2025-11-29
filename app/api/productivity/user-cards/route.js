import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * Check if a user is a department head via Department.head field
 */
async function getDepartmentIfHead(userId) {
  // Get the employee ID for this user
  const user = await User.findById(userId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) return null;
  
  // Check if this employee is head of any department
  const department = await Department.findOne({ head: employeeId, isActive: true });
  return department;
}

/**
 * GET - Get user cards for activity monitoring
 * Returns users with their latest session summary
 * 
 * Access levels:
 * - god_admin/admin: See all users
 * - Department head (via Department.head): See users in their department
 * - employee/hr/manager (non-dept-head): See only their own card
 */
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

    // Get requester's info
    const requester = await User.findById(decoded.userId).select('role');
    if (!requester) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    // Check if user is a department head via Department.head field
    const headOfDepartment = await getDepartmentIfHead(decoded.userId);
    const isDeptHead = !!headOfDepartment;

    console.log('[User Cards API] Access check:', {
      userId: decoded.userId,
      role: requester.role,
      isAdmin,
      isDeptHead,
      departmentId: headOfDepartment?._id?.toString()
    });

    // Build query for users based on role
    let employeeQuery = { status: 'active' };
    let onlyOwnCard = false;
    
    if (isAdmin) {
      // Admins see all users - no additional filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      employeeQuery.department = headOfDepartment._id;
    } else {
      // All other roles (employee, hr, manager who is not dept head) see only their own card
      onlyOwnCard = true;
      const requesterEmployee = await Employee.findOne({ userId: decoded.userId }).select('_id');
      if (requesterEmployee) {
        employeeQuery._id = requesterEmployee._id;
      } else {
        // User has no employee record, return empty
        return NextResponse.json({
          success: true,
          data: [],
          totalUsers: 0
        });
      }
    }

    // Get employees with user info
    const employees = await Employee.find(employeeQuery)
      .populate('userId', 'name email profilePicture lastActive')
      .populate('department', 'name')
      .select('firstName lastName employeeCode designation profilePicture userId department')
      .lean();

    // Get latest session and session count for each employee
    const userCards = await Promise.all(employees.map(async (employee) => {
      if (!employee.userId) return null;

      const userId = employee.userId._id || employee.userId;

      // Get latest session
      const latestSession = await ProductivitySession.findOne({ 
        userId: userId,
        status: 'completed'
      })
        .sort({ sessionEnd: -1 })
        .select('sessionStart sessionEnd aiAnalysis.productivityScore aiAnalysis.focusScore screenshots')
        .lean();

      // Get total session count
      const totalSessions = await ProductivitySession.countDocuments({
        userId: userId,
        status: 'completed'
      });

      // Calculate today's activity
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todaySessions = await ProductivitySession.find({
        userId: userId,
        sessionStart: { $gte: todayStart },
        status: 'completed'
      }).select('durationMinutes aiAnalysis.productivityScore').lean();

      const todayDuration = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const avgProductivity = todaySessions.length > 0
        ? todaySessions.reduce((sum, s) => sum + (s.aiAnalysis?.productivityScore || 0), 0) / todaySessions.length
        : 0;

      const userName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : (employee.userId?.name || 'Unknown');

      return {
        id: employee._id,
        odooId: userId,
        userId: userId.toString(),
        name: userName,
        email: employee.userId?.email,
        employeeCode: employee.employeeCode,
        designation: employee.designation?.title || employee.designation || '',
        department: employee.department?.name || 'Unassigned',
        profilePicture: employee.profilePicture || employee.userId?.profilePicture,
        lastActive: employee.userId?.lastActive,
        isOwnCard: userId.toString() === decoded.userId.toString(),
        latestSession: latestSession ? {
          sessionStart: latestSession.sessionStart,
          sessionEnd: latestSession.sessionEnd,
          productivityScore: latestSession.aiAnalysis?.productivityScore,
          focusScore: latestSession.aiAnalysis?.focusScore,
          screenshotCount: latestSession.screenshots?.length || 0,
          latestScreenshot: latestSession.screenshots?.[latestSession.screenshots.length - 1]?.thumbnailUrl
        } : null,
        totalSessions,
        todayStats: {
          duration: todayDuration,
          sessionsCount: todaySessions.length,
          avgProductivity: Math.round(avgProductivity)
        }
      };
    }));

    // Filter out null entries and sort: own card first, then by latest activity
    const validUserCards = userCards
      .filter(card => card !== null)
      .sort((a, b) => {
        // Own card always first
        if (a.isOwnCard && !b.isOwnCard) return -1;
        if (!a.isOwnCard && b.isOwnCard) return 1;
        // Then sort by latest activity
        if (!a.latestSession && !b.latestSession) return 0;
        if (!a.latestSession) return 1;
        if (!b.latestSession) return -1;
        return new Date(b.latestSession.sessionEnd) - new Date(a.latestSession.sessionEnd);
      });

    return NextResponse.json({
      success: true,
      data: validUserCards,
      totalUsers: validUserCards.length,
      accessLevel: isAdmin ? 'admin' : isDeptHead ? 'department_head' : 'self_only'
    });

  } catch (error) {
    console.error('[User Cards API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user cards' 
    }, { status: 500 });
  }
}
