'use server';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import ProductivityData from '@/models/ProductivityData';
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

/**
 * GET - Get user cards for raw captures monitoring
 * Returns users who have raw capture data with summary stats
 * 
 * Access levels:
 * - god_admin/admin: See all users
 * - Department head (via Department.head): See users in their department
 * - employee/hr/manager (non-dept-head): See only their own card
 */
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

    console.log('[Raw Captures User Cards API] Access check:', {
      userId,
      role: currentUser.role,
      isAdmin: isAdminOrGodAdmin,
      isDeptHead,
      departmentId: headOfDepartment?._id?.toString()
    });

    // Build match stage based on access level
    let userFilter = {};
    let legacyUserFilter = {};
    
    if (isAdminOrGodAdmin) {
      // Admins see all users - no filter
    } else if (isDeptHead) {
      // Department heads see only users in their department
      const deptEmployees = await Employee.find({ 
        department: headOfDepartment._id,
        status: 'active'
      }).select('userId');
      const deptUserIds = deptEmployees.filter(e => e.userId).map(e => e.userId);
      userFilter.userId = { $in: deptUserIds };
      legacyUserFilter.monitoredUserId = { $in: deptUserIds };
    } else {
      // All other roles see only their own data
      userFilter.userId = currentUser._id;
      legacyUserFilter.monitoredUserId = currentUser._id;
    }

    // Get raw captures grouped by user from both models
    const [productivityByUser, legacyByUser] = await Promise.all([
      // New ProductivityData model
      ProductivityData.aggregate([
        { $match: { ...userFilter, status: { $in: ['synced', 'analyzed'] } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$userId',
            totalCaptures: { $sum: 1 },
            latestCapture: { $first: '$createdAt' },
            avgProductivity: { $avg: '$productivityScore' },
            totalActiveTime: { $sum: '$totalActiveTime' },
            todayCaptures: {
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
      ]),
      // Legacy MayaScreenSummary model
      MayaScreenSummary.aggregate([
        { $match: { ...legacyUserFilter, status: { $ne: 'pending' } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$monitoredUserId',
            totalCaptures: { $sum: 1 },
            latestCapture: { $first: '$createdAt' },
            avgProductivity: { $avg: '$productivityScore' },
            totalActiveTime: { $sum: '$totalActiveTime' },
            todayCaptures: {
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
      ])
    ]);

    // Merge results from both models
    const userDataMap = new Map();
    
    // Add productivity data
    productivityByUser.forEach(data => {
      const id = data._id?.toString();
      if (id) {
        userDataMap.set(id, {
          _id: data._id,
          totalCaptures: data.totalCaptures || 0,
          latestCapture: data.latestCapture,
          avgProductivity: data.avgProductivity || 0,
          totalActiveTime: data.totalActiveTime || 0,
          todayCaptures: data.todayCaptures || 0
        });
      }
    });
    
    // Merge legacy data
    legacyByUser.forEach(data => {
      const id = data._id?.toString();
      if (id) {
        if (userDataMap.has(id)) {
          const existing = userDataMap.get(id);
          existing.totalCaptures += data.totalCaptures || 0;
          existing.todayCaptures += data.todayCaptures || 0;
          existing.totalActiveTime += data.totalActiveTime || 0;
          // Take most recent capture
          if (data.latestCapture && (!existing.latestCapture || data.latestCapture > existing.latestCapture)) {
            existing.latestCapture = data.latestCapture;
          }
          // Average the productivity scores
          if (data.avgProductivity) {
            existing.avgProductivity = (existing.avgProductivity + data.avgProductivity) / 2;
          }
        } else {
          userDataMap.set(id, {
            _id: data._id,
            totalCaptures: data.totalCaptures || 0,
            latestCapture: data.latestCapture,
            avgProductivity: data.avgProductivity || 0,
            totalActiveTime: data.totalActiveTime || 0,
            todayCaptures: data.todayCaptures || 0
          });
        }
      }
    });

    const capturesByUser = Array.from(userDataMap.values());

    // Get user details for each
    const userCards = await Promise.all(
      capturesByUser.map(async (data) => {
        const user = await User.findById(data._id).select('name email profilePicture');
        const employee = await Employee.findOne({ userId: data._id }).select('firstName lastName employeeCode designation profilePicture department').populate('department', 'name');
        
        let name = 'Unknown User';
        let profilePicture = null;
        let employeeCode = '';
        let designation = '';
        let department = '';
        
        if (employee) {
          name = employee.firstName ? `${employee.firstName} ${employee.lastName || ''}`.trim() : (user?.name || 'Unknown User');
          profilePicture = employee.profilePicture || user?.profilePicture;
          employeeCode = employee.employeeCode || '';
          designation = typeof employee.designation === 'object' ? employee.designation?.title : employee.designation || '';
          department = employee.department?.name || '';
        } else if (user) {
          name = user.name || user.email?.split('@')[0] || 'Unknown User';
          profilePicture = user.profilePicture;
        }

        return {
          id: data._id?.toString(),
          odooId: data._id?.toString(),
          userId: data._id?.toString(),
          name,
          profilePicture,
          employeeCode,
          designation,
          department,
          totalCaptures: data.totalCaptures || 0,
          todayCaptures: data.todayCaptures || 0,
          avgProductivity: Math.round(data.avgProductivity || 0),
          totalActiveTime: Math.round((data.totalActiveTime || 0) / 60000), // Convert to minutes
          latestCapture: data.latestCapture,
          isOwn: data._id?.toString() === userId?.toString()
        };
      })
    );

    // Sort: own user first, then by total captures
    userCards.sort((a, b) => {
      if (a.isOwn && !b.isOwn) return -1;
      if (!a.isOwn && b.isOwn) return 1;
      return (b.totalCaptures || 0) - (a.totalCaptures || 0);
    });

    return NextResponse.json({ 
      success: true, 
      data: userCards,
      accessLevel: isAdminOrGodAdmin ? 'admin' : isDeptHead ? 'department_head' : 'self_only'
    });

  } catch (error) {
    console.error('Raw Captures User Cards Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch raw captures user cards' 
    }, { status: 500 });
  }
}
