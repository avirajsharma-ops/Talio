import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';
import Employee from '@/models/Employee';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * GET - Get user cards for activity monitoring
 * Returns users with their latest session summary
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

    // Get requester's role
    const requester = await User.findById(decoded.userId).select('role');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    const isDeptHead = requester?.role === 'department_head';
    const isManager = requester?.role === 'manager';

    if (!isAdmin && !isDeptHead && !isManager) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only admins, department heads, and managers can view user cards' 
      }, { status: 403 });
    }

    // Build query for users based on role
    let employeeQuery = { status: 'active' };
    
    if (isDeptHead) {
      // Get department head's employee record to find their department
      const deptHeadEmployee = await Employee.findOne({ userId: decoded.userId }).select('department');
      if (deptHeadEmployee?.department) {
        employeeQuery.department = deptHeadEmployee.department;
      }
    } else if (isManager) {
      // Managers can only see their direct reports
      const managerEmployee = await Employee.findOne({ userId: decoded.userId }).select('_id');
      if (managerEmployee) {
        employeeQuery.reportingTo = managerEmployee._id;
      }
    }

    // Get all active employees with user info
    const employees = await Employee.find(employeeQuery)
      .populate('userId', 'name email profilePicture lastActive')
      .populate('department', 'name')
      .select('firstName lastName employeeCode designation profilePicture userId department')
      .lean();

    // Get latest session and session count for each employee
    const userCards = await Promise.all(employees.map(async (employee) => {
      if (!employee.userId) return null;

      // Get latest session
      const latestSession = await ProductivitySession.findOne({ 
        userId: employee.userId._id,
        status: 'completed'
      })
        .sort({ sessionEnd: -1 })
        .select('sessionStart sessionEnd aiAnalysis.productivityScore aiAnalysis.focusScore screenshots')
        .lean();

      // Get total session count
      const totalSessions = await ProductivitySession.countDocuments({
        userId: employee.userId._id,
        status: 'completed'
      });

      // Calculate today's activity
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todaySessions = await ProductivitySession.find({
        userId: employee.userId._id,
        sessionStart: { $gte: todayStart },
        status: 'completed'
      }).select('durationMinutes aiAnalysis.productivityScore').lean();

      const todayDuration = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const avgProductivity = todaySessions.length > 0
        ? todaySessions.reduce((sum, s) => sum + (s.aiAnalysis?.productivityScore || 0), 0) / todaySessions.length
        : 0;

      return {
        id: employee._id,
        odooId: employee.userId._id,
        name: employee.firstName && employee.lastName 
          ? `${employee.firstName} ${employee.lastName}`
          : employee.userId.name,
        email: employee.userId.email,
        employeeCode: employee.employeeCode,
        designation: employee.designation,
        department: employee.department?.name || 'Unassigned',
        profilePicture: employee.profilePicture || employee.userId.profilePicture,
        lastActive: employee.userId.lastActive,
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

    // Filter out null entries and sort by latest activity
    const validUserCards = userCards
      .filter(card => card !== null)
      .sort((a, b) => {
        if (!a.latestSession && !b.latestSession) return 0;
        if (!a.latestSession) return 1;
        if (!b.latestSession) return -1;
        return new Date(b.latestSession.sessionEnd) - new Date(a.latestSession.sessionEnd);
      });

    return NextResponse.json({
      success: true,
      data: validUserCards,
      totalUsers: validUserCards.length
    });

  } catch (error) {
    console.error('[User Cards API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user cards' 
    }, { status: 500 });
  }
}
