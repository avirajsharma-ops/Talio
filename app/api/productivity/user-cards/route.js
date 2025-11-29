import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

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
  
  // Get the employee ID for this user
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
  
  // Check if this employee is head of any department
  const department = await Department.findOne({ head: employeeId, isActive: true });
  console.log('[getDepartmentIfHead] Check result:', { userId, employeeId: employeeId?.toString(), foundDepartment: department?.name || null });
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
    
    if (isAdmin) {
      // Admins see all users - no additional filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      employeeQuery.department = headOfDepartment._id;
    } else {
      // All other roles (employee, hr, manager who is not dept head) see only their own card
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
      .select('firstName lastName employeeCode designation profilePicture userId department email')
      .lean();

    // For employees without userId, fetch users via User.employeeId (reverse relationship)
    const employeeIds = employees.map(emp => emp._id);
    const usersWithEmployeeId = await User.find({ 
      employeeId: { $in: employeeIds } 
    }).select('_id name email profilePicture lastActive employeeId').lean();
    
    // Create a map of employeeId -> User
    const employeeToUserMap = {};
    usersWithEmployeeId.forEach(user => {
      if (user.employeeId) {
        employeeToUserMap[user.employeeId.toString()] = user;
      }
    });

    console.log('[User Cards API] Employee to User mapping:', {
      totalEmployees: employees.length,
      employeesWithUserId: employees.filter(e => e.userId).length,
      usersFoundByEmployeeId: usersWithEmployeeId.length
    });

    // Get latest session and session count for each employee
    const userCards = await Promise.all(employees.map(async (employee) => {
      // Get userId from either Employee.userId or User.employeeId (reverse lookup)
      let userInfo = employee.userId;
      let userId = userInfo?._id || userInfo;
      
      // If no userId on employee, check reverse relationship
      if (!userId) {
        const reverseUser = employeeToUserMap[employee._id.toString()];
        if (reverseUser) {
          userId = reverseUser._id;
          userInfo = reverseUser;
        }
      }
      
      // Convert to ObjectId for querying
      const userObjId = toObjectId(userId);
      
      // Still include employee even if no user account (show card without session data)
      if (!userObjId) {
        const userName = employee.firstName && employee.lastName 
          ? `${employee.firstName} ${employee.lastName}`
          : 'Unknown';
        
        return {
          id: employee._id,
          odooId: null,
          userId: null,
          name: userName,
          email: employee.email,
          employeeCode: employee.employeeCode,
          designation: employee.designation?.title || employee.designation || '',
          department: employee.department?.name || 'Unassigned',
          profilePicture: employee.profilePicture,
          lastActive: null,
          isOwnCard: false,
          latestSession: null,
          totalSessions: 0,
          todayStats: { duration: 0, sessionsCount: 0, avgProductivity: 0 }
        };
      }

      // Get latest session
      const latestSession = await ProductivitySession.findOne({ 
        userId: userObjId,
        status: 'completed'
      })
        .sort({ sessionEnd: -1 })
        .select('sessionStart sessionEnd aiAnalysis.productivityScore aiAnalysis.focusScore screenshots sessionDuration totalActiveTime')
        .lean();

      // Get total session count
      const totalSessions = await ProductivitySession.countDocuments({
        userId: userObjId,
        status: 'completed'
      });

      // Calculate today's activity
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      let todaySessions = await ProductivitySession.find({
        userId: userObjId,
        sessionStart: { $gte: todayStart },
        status: 'completed'
      }).select('sessionDuration totalActiveTime aiAnalysis.productivityScore screenshots').lean();

      // Calculate duration from sessions
      let todayDuration = todaySessions.reduce((sum, s) => {
        // sessionDuration is in minutes, totalActiveTime is in ms
        const mins = s.sessionDuration || (s.totalActiveTime ? Math.round(s.totalActiveTime / 60000) : 30);
        return sum + mins;
      }, 0);
      
      // Calculate average productivity - if no AI analysis, estimate from screenshots
      let avgProductivity = 0;
      const analyzedSessions = todaySessions.filter(s => s.aiAnalysis?.productivityScore > 0);
      if (analyzedSessions.length > 0) {
        avgProductivity = analyzedSessions.reduce((sum, s) => sum + s.aiAnalysis.productivityScore, 0) / analyzedSessions.length;
      } else if (todaySessions.length > 0) {
        // No AI analysis yet - show that there's activity but needs analysis
        // Give a base score based on having screenshots
        const hasScreenshots = todaySessions.some(s => s.screenshots?.length > 0);
        avgProductivity = hasScreenshots ? 50 : 0; // 50% indicates "pending analysis"
      }
      
      // If no sessions today, check all-time stats
      if (todaySessions.length === 0 && totalSessions > 0) {
        // Get stats from most recent sessions (last 7 days)
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentSessions = await ProductivitySession.find({
          userId: userObjId,
          sessionStart: { $gte: weekAgo },
          status: 'completed'
        }).select('aiAnalysis.productivityScore').lean();
        
        const recentAnalyzed = recentSessions.filter(s => s.aiAnalysis?.productivityScore > 0);
        if (recentAnalyzed.length > 0) {
          avgProductivity = recentAnalyzed.reduce((sum, s) => sum + s.aiAnalysis.productivityScore, 0) / recentAnalyzed.length;
        }
      }
      
      // If no sessions, fallback to raw ProductivityData for stats
      if (totalSessions === 0) {
        const rawStats = await ProductivityData.aggregate([
          { $match: { userId: userObjId, status: { $in: ['synced', 'analyzed'] } } },
          { $group: {
            _id: null,
            totalActiveTime: { $sum: '$totalActiveTime' },
            productiveTime: { $sum: '$productiveTime' },
            count: { $sum: 1 }
          }}
        ]);
        
        const todayRawStats = await ProductivityData.aggregate([
          { $match: { 
            userId: userObjId, 
            status: { $in: ['synced', 'analyzed'] },
            createdAt: { $gte: todayStart }
          }},
          { $group: {
            _id: null,
            totalActiveTime: { $sum: '$totalActiveTime' },
            productiveTime: { $sum: '$productiveTime' },
            count: { $sum: 1 }
          }}
        ]);
        
        if (todayRawStats.length > 0) {
          const stats = todayRawStats[0];
          todayDuration = Math.round((stats.totalActiveTime || 0) / 60000); // Convert ms to mins
          avgProductivity = stats.totalActiveTime > 0 
            ? Math.round((stats.productiveTime / stats.totalActiveTime) * 100) 
            : 0;
        }
      }

      const userName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : (userInfo?.name || 'Unknown');

      return {
        id: employee._id,
        odooId: userId,
        userId: userId.toString(),
        name: userName,
        email: userInfo?.email || employee.email,
        employeeCode: employee.employeeCode,
        designation: employee.designation?.title || employee.designation || '',
        department: employee.department?.name || 'Unassigned',
        profilePicture: employee.profilePicture || userInfo?.profilePicture,
        lastActive: userInfo?.lastActive,
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
