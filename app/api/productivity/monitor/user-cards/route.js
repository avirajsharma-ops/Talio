'use server';

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import ProductivityData from '@/models/ProductivityData';
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

/**
 * GET - Get user cards for raw captures monitoring
 * Returns ALL accessible employees with their raw capture stats
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

    // Get raw capture stats for each employee
    const userCards = await Promise.all(employees.map(async (employee) => {
      if (!employee.userId) return null;
      
      const empUserId = employee.userId._id || employee.userId;
      // Convert to ObjectId for aggregation
      const empUserObjId = toObjectId(empUserId);
      if (!empUserObjId) return null;
      
      // Get stats from both ProductivityData and MayaScreenSummary
      const [productivityStats, legacyStats] = await Promise.all([
        ProductivityData.aggregate([
          { $match: { userId: empUserObjId, status: { $in: ['synced', 'analyzed'] } } },
          {
            $group: {
              _id: null,
              totalCaptures: { $sum: 1 },
              latestCapture: { $max: '$createdAt' },
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
        MayaScreenSummary.aggregate([
          { $match: { monitoredUserId: empUserObjId, status: { $ne: 'pending' } } },
          {
            $group: {
              _id: null,
              totalCaptures: { $sum: 1 },
              latestCapture: { $max: '$createdAt' },
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

      // Merge stats from both sources
      const prodStats = productivityStats[0] || { totalCaptures: 0, todayCaptures: 0, avgProductivity: 0, totalActiveTime: 0, latestCapture: null };
      const legStats = legacyStats[0] || { totalCaptures: 0, todayCaptures: 0, avgProductivity: 0, totalActiveTime: 0, latestCapture: null };
      
      const totalCaptures = (prodStats.totalCaptures || 0) + (legStats.totalCaptures || 0);
      const todayCaptures = (prodStats.todayCaptures || 0) + (legStats.todayCaptures || 0);
      const totalActiveTime = (prodStats.totalActiveTime || 0) + (legStats.totalActiveTime || 0);
      
      // Get the most recent capture time
      let latestCapture = prodStats.latestCapture || legStats.latestCapture;
      if (prodStats.latestCapture && legStats.latestCapture) {
        latestCapture = prodStats.latestCapture > legStats.latestCapture ? prodStats.latestCapture : legStats.latestCapture;
      }
      
      // Average productivity (if both have values)
      let avgProductivity = 0;
      if (prodStats.avgProductivity && legStats.avgProductivity) {
        avgProductivity = (prodStats.avgProductivity + legStats.avgProductivity) / 2;
      } else {
        avgProductivity = prodStats.avgProductivity || legStats.avgProductivity || 0;
      }
      
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
        totalCaptures,
        todayCaptures,
        avgProductivity: Math.round(avgProductivity),
        totalActiveTime: Math.round(totalActiveTime / 60000), // Convert to minutes
        latestCapture,
        isOwn: empUserId?.toString() === userId?.toString()
      };
    }));

    // Filter out null entries and sort: own user first, then by total captures
    const validUserCards = userCards
      .filter(card => card !== null)
      .sort((a, b) => {
        if (a.isOwn && !b.isOwn) return -1;
        if (!a.isOwn && b.isOwn) return 1;
        return (b.totalCaptures || 0) - (a.totalCaptures || 0);
      });

    return NextResponse.json({ 
      success: true, 
      data: validUserCards,
      totalUsers: validUserCards.length,
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
