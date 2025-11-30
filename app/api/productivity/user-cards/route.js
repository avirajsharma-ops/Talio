import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

export const dynamic = 'force-dynamic';

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
 * Check if a user is a department head via Department.head or Department.heads[] field
 */
async function getDepartmentIfHead(userId) {
  // Convert userId to ObjectId if needed
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;
  
  // Get the employee ID for this user
  const user = await User.findById(userObjId).select('employeeId').lean();
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId: userObjId }).select('_id').lean();
    employeeId = employee?._id;
  }
  
  if (!employeeId) {
    console.log('[getDepartmentIfHead] No employee found for userId:', userId);
    return null;
  }
  
  // Check if this employee is head of any department (check both head and heads fields)
  const department = await Department.findOne({ 
    $or: [
      { head: employeeId },
      { heads: employeeId }
    ],
    isActive: true 
  }).lean();
  console.log('[getDepartmentIfHead] Check result:', { userId, employeeId: employeeId?.toString(), foundDepartment: department?.name || null });
  return department;
}

/**
 * GET - Get user cards for activity monitoring
 * Returns users with their latest session summary
 * 
 * Query params:
 * - quick=true: Return basic user info without session stats (fast load)
 * - userId: Get stats for specific user only (for progressive loading)
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

    const { searchParams } = new URL(request.url);
    const quickMode = searchParams.get('quick') === 'true';
    const specificUserId = searchParams.get('userId');

    // Get requester's info
    const requester = await User.findById(decoded.userId).select('role').lean();
    if (!requester) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    // Check if user is a department head via Department.head field
    const headOfDepartment = await getDepartmentIfHead(decoded.userId);
    const isDeptHead = !!headOfDepartment;

    // Build query for users based on role
    let employeeQuery = { status: 'active' };
    
    if (isAdmin) {
      // Admins see all users - no additional filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      employeeQuery.department = headOfDepartment._id;
    } else {
      // All other roles see only their own card
      // First try Employee.userId lookup
      let requesterEmployee = await Employee.findOne({ userId: decoded.userId }).select('_id').lean();
      
      // If not found, try User.employeeId reverse lookup
      if (!requesterEmployee) {
        const userWithEmployeeId = await User.findById(decoded.userId).select('employeeId').lean();
        if (userWithEmployeeId?.employeeId) {
          requesterEmployee = await Employee.findById(userWithEmployeeId.employeeId).select('_id').lean();
        }
      }
      
      if (requesterEmployee) {
        employeeQuery._id = requesterEmployee._id;
      } else {
        // Return user's own card even if no Employee record exists
        // This creates a minimal card from the User record
        const userRecord = await User.findById(decoded.userId).select('name email profilePicture lastActive').lean();
        if (userRecord) {
          const minimalCard = {
            id: decoded.userId,
            odooId: decoded.userId,
            userId: decoded.userId,
            name: userRecord.name || 'Unknown User',
            email: userRecord.email || '',
            employeeCode: '',
            designation: '',
            department: 'Unassigned',
            profilePicture: userRecord.profilePicture,
            lastActive: userRecord.lastActive,
            isOwnCard: true,
            latestSession: null,
            totalSessions: 0,
            todayStats: { duration: 0, sessionsCount: 0, avgProductivity: null },
            statsLoading: false
          };
          return NextResponse.json({ 
            success: true, 
            data: [minimalCard], 
            totalUsers: 1,
            accessLevel: 'self_only'
          });
        }
        return NextResponse.json({ success: true, data: [], totalUsers: 0, accessLevel: 'self_only' });
      }
    }

    // If requesting stats for specific user, validate access
    if (specificUserId && !quickMode) {
      return await getUserStats(specificUserId, decoded.userId, isAdmin, isDeptHead, headOfDepartment);
    }

    // Get employees with user info - use lean for performance
    const employees = await Employee.find(employeeQuery)
      .populate('userId', 'name email profilePicture lastActive')
      .populate('department', 'name')
      .populate('designation', 'title levelName description')
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

    // QUICK MODE: Return basic user info without session stats
    if (quickMode) {
      const basicCards = employees.map(employee => {
        let userInfo = employee.userId;
        let userId = userInfo?._id || userInfo;
        
        if (!userId) {
          const reverseUser = employeeToUserMap[employee._id.toString()];
          if (reverseUser) {
            userId = reverseUser._id;
            userInfo = reverseUser;
          }
        }

        const userName = employee.firstName && employee.lastName 
          ? `${employee.firstName} ${employee.lastName}`
          : (userInfo?.name || 'Unknown');

        return {
          id: employee._id,
          odooId: userId?.toString() || null,
          userId: userId?.toString() || null,
          name: userName,
          email: userInfo?.email || employee.email,
          employeeCode: employee.employeeCode,
          designation: employee.designation?.title || employee.designation || '',
          department: employee.department?.name || 'Unassigned',
          profilePicture: employee.profilePicture || userInfo?.profilePicture,
          lastActive: userInfo?.lastActive,
          isOwnCard: userId?.toString() === decoded.userId.toString(),
          // Placeholder stats - will be loaded progressively
          latestSession: null,
          totalSessions: null, // null indicates "loading"
          todayStats: { duration: null, sessionsCount: null, avgProductivity: null },
          statsLoading: true
        };
      });

      // Sort: own card first
      const sortedCards = basicCards.sort((a, b) => {
        if (a.isOwnCard && !b.isOwnCard) return -1;
        if (!a.isOwnCard && b.isOwnCard) return 1;
        return 0;
      });

      return NextResponse.json({
        success: true,
        data: sortedCards,
        totalUsers: sortedCards.length,
        accessLevel: isAdmin ? 'admin' : isDeptHead ? 'department_head' : 'self_only',
        quickMode: true
      });
    }

    // FULL MODE: Use aggregation for better performance
    const userIds = [];
    const employeeMap = {};

    employees.forEach(employee => {
      let userInfo = employee.userId;
      let userId = userInfo?._id || userInfo;
      
      if (!userId) {
        const reverseUser = employeeToUserMap[employee._id.toString()];
        if (reverseUser) {
          userId = reverseUser._id;
          userInfo = reverseUser;
        }
      }

      if (userId) {
        const userObjId = toObjectId(userId);
        if (userObjId) {
          userIds.push(userObjId);
          employeeMap[userObjId.toString()] = { employee, userInfo, userId };
        }
      }
    });

    // Batch aggregate session stats for all users at once
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [sessionStats, latestSessions] = await Promise.all([
      // Get aggregated stats per user
      ProductivitySession.aggregate([
        { $match: { userId: { $in: userIds }, status: 'completed' } },
        { $facet: {
          // Total sessions per user
          totalCounts: [
            { $group: { _id: '$userId', count: { $sum: 1 } } }
          ],
          // Today's stats per user
          todayStats: [
            { $match: { sessionStart: { $gte: todayStart } } },
            { $group: {
              _id: '$userId',
              sessionsCount: { $sum: 1 },
              totalDuration: { $sum: '$sessionDuration' },
              avgProductivity: { $avg: '$aiAnalysis.productivityScore' }
            }}
          ]
        }}
      ]),
      // Get latest session per user
      ProductivitySession.aggregate([
        { $match: { userId: { $in: userIds }, status: 'completed' } },
        { $sort: { sessionEnd: -1 } },
        { $group: {
          _id: '$userId',
          latestSession: { $first: '$$ROOT' }
        }},
        { $project: {
          'latestSession.sessionStart': 1,
          'latestSession.sessionEnd': 1,
          'latestSession.aiAnalysis.productivityScore': 1,
          'latestSession.aiAnalysis.focusScore': 1,
          'latestSession.screenshots': { $slice: ['$latestSession.screenshots', -1] }
        }}
      ])
    ]);

    // Build lookup maps from aggregation results
    const totalCountsMap = {};
    const todayStatsMap = {};
    const latestSessionsMap = {};

    if (sessionStats.length > 0) {
      sessionStats[0].totalCounts?.forEach(item => {
        totalCountsMap[item._id.toString()] = item.count;
      });
      sessionStats[0].todayStats?.forEach(item => {
        todayStatsMap[item._id.toString()] = item;
      });
    }
    latestSessions.forEach(item => {
      latestSessionsMap[item._id.toString()] = item.latestSession;
    });

    // Build user cards with stats
    const userCards = employees.map(employee => {
      let userInfo = employee.userId;
      let userId = userInfo?._id || userInfo;
      
      if (!userId) {
        const reverseUser = employeeToUserMap[employee._id.toString()];
        if (reverseUser) {
          userId = reverseUser._id;
          userInfo = reverseUser;
        }
      }

      const userIdStr = userId?.toString();
      const totalSessions = totalCountsMap[userIdStr] || 0;
      const todayData = todayStatsMap[userIdStr];
      const latestSession = latestSessionsMap[userIdStr];

      const userName = employee.firstName && employee.lastName 
        ? `${employee.firstName} ${employee.lastName}`
        : (userInfo?.name || 'Unknown');

      return {
        id: employee._id,
        odooId: userIdStr || null,
        userId: userIdStr || null,
        name: userName,
        email: userInfo?.email || employee.email,
        employeeCode: employee.employeeCode,
        designation: employee.designation?.title || employee.designation || '',
        department: employee.department?.name || 'Unassigned',
        profilePicture: employee.profilePicture || userInfo?.profilePicture,
        lastActive: userInfo?.lastActive,
        isOwnCard: userIdStr === decoded.userId.toString(),
        latestSession: latestSession ? {
          sessionStart: latestSession.sessionStart,
          sessionEnd: latestSession.sessionEnd,
          productivityScore: latestSession.aiAnalysis?.productivityScore,
          focusScore: latestSession.aiAnalysis?.focusScore,
          screenshotCount: latestSession.screenshots?.length || 0,
          latestScreenshot: latestSession.screenshots?.[0]?.thumbnail || latestSession.screenshots?.[0]?.fullData
        } : null,
        totalSessions,
        todayStats: {
          duration: todayData?.totalDuration || 0,
          sessionsCount: todayData?.sessionsCount || 0,
          avgProductivity: Math.round(todayData?.avgProductivity || 0)
        },
        statsLoading: false
      };
    });

    // Sort: own card first, then by latest activity
    const sortedCards = userCards.sort((a, b) => {
      if (a.isOwnCard && !b.isOwnCard) return -1;
      if (!a.isOwnCard && b.isOwnCard) return 1;
      if (!a.latestSession && !b.latestSession) return 0;
      if (!a.latestSession) return 1;
      if (!b.latestSession) return -1;
      return new Date(b.latestSession.sessionEnd) - new Date(a.latestSession.sessionEnd);
    });

    return NextResponse.json({
      success: true,
      data: sortedCards,
      totalUsers: sortedCards.length,
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

/**
 * Get stats for a specific user (for progressive loading)
 */
async function getUserStats(userId, requesterId, isAdmin, isDeptHead, headOfDepartment) {
  const userObjId = toObjectId(userId);
  if (!userObjId) {
    return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
  }

  // Verify access
  if (!isAdmin && !isDeptHead && userId !== requesterId) {
    return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalSessions, todaySessions, latestSession] = await Promise.all([
    ProductivitySession.countDocuments({ userId: userObjId, status: 'completed' }),
    ProductivitySession.find({
      userId: userObjId,
      sessionStart: { $gte: todayStart },
      status: 'completed'
    }).select('sessionDuration aiAnalysis.productivityScore').lean(),
    ProductivitySession.findOne({ userId: userObjId, status: 'completed' })
      .sort({ sessionEnd: -1 })
      .select('sessionStart sessionEnd aiAnalysis.productivityScore aiAnalysis.focusScore screenshots')
      .lean()
  ]);

  const todayDuration = todaySessions.reduce((sum, s) => sum + (s.sessionDuration || 30), 0);
  const analyzedSessions = todaySessions.filter(s => s.aiAnalysis?.productivityScore > 0);
  const avgProductivity = analyzedSessions.length > 0
    ? Math.round(analyzedSessions.reduce((sum, s) => sum + s.aiAnalysis.productivityScore, 0) / analyzedSessions.length)
    : 0;

  return NextResponse.json({
    success: true,
    userId,
    stats: {
      totalSessions,
      latestSession: latestSession ? {
        sessionStart: latestSession.sessionStart,
        sessionEnd: latestSession.sessionEnd,
        productivityScore: latestSession.aiAnalysis?.productivityScore,
        focusScore: latestSession.aiAnalysis?.focusScore,
        latestScreenshot: latestSession.screenshots?.[latestSession.screenshots.length - 1]?.thumbnail
      } : null,
      todayStats: {
        duration: todayDuration,
        sessionsCount: todaySessions.length,
        avgProductivity
      }
    }
  });
}
