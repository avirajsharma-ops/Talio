import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import KeystrokeLog from '@/models/KeystrokeLog';
import MouseActivityLog from '@/models/MouseActivityLog';
import WindowActivityLog from '@/models/WindowActivityLog';
import ApplicationUsageLog from '@/models/ApplicationUsageLog';
import AutoScreenCapture from '@/models/AutoScreenCapture';
import { getCurrentISTDate, getISTStartOfDay, getISTEndOfDay } from '@/lib/timezone';


export const dynamic = 'force-dynamic'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * GET /api/activity/summary
 * Get comprehensive activity summary with filters
 * Query params: period (hourly|daily|weekly|monthly), employeeId (optional, for managers/admins), date
 */
export async function GET(request) {
  try {
    await connectDB();

    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.payload.userId;

    const user = await User.findById(userId).populate('employeeId');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'daily'; // hourly, daily, weekly, monthly
    const targetEmployeeId = searchParams.get('employeeId');
    const dateParam = searchParams.get('date'); // ISO date string

    // Determine which employee to get data for
    let targetEmployee;
    
    if (targetEmployeeId) {
      // Check permissions (admin, god_admin, or department_head can view employee data)
      if (!['admin', 'god_admin', 'department_head', 'hr'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      targetEmployee = await Employee.findById(targetEmployeeId);
      
      // Department head can only view their department
      if (user.role === 'department_head') {
        if (!targetEmployee || targetEmployee.department?.toString() !== user.employeeId?.department?.toString()) {
          return NextResponse.json(
            { error: 'Access denied - employee not in your department' },
            { status: 403 }
          );
        }
      }
    } else {
      // Get own data
      targetEmployee = user.employeeId;
    }

    if (!targetEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Calculate date range based on period
    const targetDate = dateParam ? new Date(dateParam) : getCurrentISTDate();
    const { startDate, endDate } = getDateRange(targetDate, period);

    // Fetch activity data
    const [keystrokes, mouseActivity, windowActivity, screenshots, appUsage] = await Promise.all([
      KeystrokeLog.find({
        employee: targetEmployee._id,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 }),
      
      MouseActivityLog.find({
        employee: targetEmployee._id,
        startTime: { $gte: startDate, $lte: endDate }
      }).sort({ startTime: 1 }),
      
      WindowActivityLog.find({
        employee: targetEmployee._id,
        focusStartTime: { $gte: startDate, $lte: endDate }
      }).sort({ focusStartTime: 1 }),
      
      AutoScreenCapture.find({
        employee: targetEmployee._id,
        capturedAt: { $gte: startDate, $lte: endDate }
      }).sort({ capturedAt: -1 }).limit(100),
      
      ApplicationUsageLog.find({
        employee: targetEmployee._id,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: -1 })
    ]);

    // Calculate summary statistics
    const summary = {
      period,
      startDate,
      endDate,
      employee: {
        id: targetEmployee._id,
        name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
        email: targetEmployee.email,
        department: targetEmployee.department
      },
      
      // Keystroke statistics
      keystrokes: {
        total: keystrokes.reduce((sum, k) => sum + k.keystrokeCount, 0),
        words: keystrokes.reduce((sum, k) => sum + k.wordCount, 0),
        sessions: keystrokes.length,
        totalDuration: keystrokes.reduce((sum, k) => sum + (k.duration || 0), 0),
        averageWPM: calculateAverageWPM(keystrokes)
      },
      
      // Mouse activity
      mouse: {
        clicks: mouseActivity.reduce((sum, m) => sum + m.clickCount, 0),
        scrolls: mouseActivity.reduce((sum, m) => sum + m.scrollCount, 0),
        totalEvents: mouseActivity.reduce((sum, m) => sum + m.events.length, 0),
        sessions: mouseActivity.length
      },
      
      // Window/application usage
      windows: {
        uniqueApplications: [...new Set(windowActivity.map(w => w.domain || w.applicationName))].length,
        totalSwitches: windowActivity.length,
        totalTimeSpent: windowActivity.reduce((sum, w) => sum + (w.timeSpent || 0), 0),
        categories: aggregateCategories(windowActivity),
        topApplications: getTopApplications(windowActivity, 10),
        productivityScore: calculateOverallProductivity(windowActivity)
      },
      
      // Screenshots
      screenshots: {
        total: screenshots.length,
        analyzed: screenshots.filter(s => s.analysis?.summary).length,
        productivityBreakdown: aggregateProductivity(screenshots),
        activityTypes: aggregateActivityTypes(screenshots),
        recentCaptures: screenshots.slice(0, 10).map(s => ({
          id: s._id,
          capturedAt: s.capturedAt,
          windowTitle: s.windowTitle,
          productivity: s.analysis?.productivity,
          activity: s.analysis?.activity,
          summary: s.analysis?.summary
        }))
      },
      
      // Daily application summary
      applications: appUsage.map(app => ({
        date: app.date,
        totalActiveTime: app.totalActiveTime,
        totalApplications: app.totalApplications,
        mostUsedApp: app.mostUsedApp,
        productivityAverage: app.productivityAverage,
        applications: app.applications.slice(0, 15) // Top 15 apps
      })),
      
      // Time-based breakdown (hourly if period is daily)
      timeline: period === 'daily' || period === 'hourly' ? generateTimeline(windowActivity, period) : null
    };

    return NextResponse.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Activity summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity summary', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper: Get date range based on period
 */
function getDateRange(targetDate, period) {
  const date = new Date(targetDate);
  let startDate, endDate;

  switch (period) {
    case 'hourly':
      // Current hour
      startDate = new Date(date);
      startDate.setMinutes(0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);
      break;
      
    case 'daily':
      // Today (full day)
      startDate = getISTStartOfDay(date);
      endDate = getISTEndOfDay(date);
      break;
      
    case 'weekly':
      // Current week (Monday to Sunday)
      startDate = new Date(date);
      startDate.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
      break;
      
    case 'monthly':
      // Current month
      startDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
      
    default:
      startDate = getISTStartOfDay(date);
      endDate = getISTEndOfDay(date);
  }

  return { startDate, endDate };
}

/**
 * Helper: Calculate average WPM
 */
function calculateAverageWPM(keystrokes) {
  if (keystrokes.length === 0) return 0;
  
  const totalWords = keystrokes.reduce((sum, k) => sum + k.wordCount, 0);
  const totalMinutes = keystrokes.reduce((sum, k) => sum + (k.duration || 0), 0) / 60000;
  
  return totalMinutes > 0 ? Math.round(totalWords / totalMinutes) : 0;
}

/**
 * Helper: Aggregate categories
 */
function aggregateCategories(windowActivity) {
  const categories = {};
  
  windowActivity.forEach(w => {
    const cat = w.category || 'unknown';
    if (!categories[cat]) {
      categories[cat] = {
        count: 0,
        timeSpent: 0
      };
    }
    categories[cat].count++;
    categories[cat].timeSpent += w.timeSpent || 0;
  });
  
  return categories;
}

/**
 * Helper: Get top applications
 */
function getTopApplications(windowActivity, limit = 10) {
  const apps = {};
  
  windowActivity.forEach(w => {
    const appName = w.domain || w.applicationName || 'Unknown';
    if (!apps[appName]) {
      apps[appName] = {
        name: appName,
        timeSpent: 0,
        switches: 0,
        category: w.category
      };
    }
    apps[appName].timeSpent += w.timeSpent || 0;
    apps[appName].switches++;
  });
  
  return Object.values(apps)
    .sort((a, b) => b.timeSpent - a.timeSpent)
    .slice(0, limit);
}

/**
 * Helper: Calculate overall productivity
 */
function calculateOverallProductivity(windowActivity) {
  if (windowActivity.length === 0) return 0;
  
  const totalScore = windowActivity.reduce((sum, w) => sum + (w.productivityScore || 50), 0);
  return Math.round(totalScore / windowActivity.length);
}

/**
 * Helper: Aggregate productivity levels
 */
function aggregateProductivity(screenshots) {
  const breakdown = {
    'highly-productive': 0,
    'productive': 0,
    'neutral': 0,
    'low-productivity': 0,
    'distraction': 0
  };
  
  screenshots.forEach(s => {
    const level = s.analysis?.productivity || 'neutral';
    if (breakdown[level] !== undefined) {
      breakdown[level]++;
    }
  });
  
  return breakdown;
}

/**
 * Helper: Aggregate activity types
 */
function aggregateActivityTypes(screenshots) {
  const activities = {};
  
  screenshots.forEach(s => {
    const activity = s.analysis?.activity || 'unknown';
    activities[activity] = (activities[activity] || 0) + 1;
  });
  
  return activities;
}

/**
 * Helper: Generate hourly timeline
 */
function generateTimeline(windowActivity, period) {
  if (period !== 'daily' && period !== 'hourly') return null;
  
  const timeline = [];
  
  // Group by hour
  const hourlyData = {};
  
  windowActivity.forEach(w => {
    const hour = new Date(w.focusStartTime).getHours();
    if (!hourlyData[hour]) {
      hourlyData[hour] = {
        hour,
        timeSpent: 0,
        applications: new Set(),
        productivityTotal: 0,
        count: 0
      };
    }
    
    hourlyData[hour].timeSpent += w.timeSpent || 0;
    hourlyData[hour].applications.add(w.domain || w.applicationName);
    hourlyData[hour].productivityTotal += w.productivityScore || 50;
    hourlyData[hour].count++;
  });
  
  // Convert to array
  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData[hour];
    timeline.push({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      timeSpent: data ? data.timeSpent : 0,
      applications: data ? data.applications.size : 0,
      productivity: data ? Math.round(data.productivityTotal / data.count) : 0,
      active: !!data
    });
  }
  
  return timeline;
}
