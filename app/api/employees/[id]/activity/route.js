import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import KeystrokeLog from '@/models/KeystrokeLog';
import WindowActivityLog from '@/models/WindowActivityLog';
import AutoScreenCapture from '@/models/AutoScreenCapture';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * GET /api/employees/[id]/activity
 * Get activity data for an employee (screenshots, keystrokes, app usage)
 * Accessible by: admin, god_admin, department_head (own dept), or the employee themselves
 */
export async function GET(request, { params }) {
  try {
    await connectDB();

    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const requesterId = decoded.payload.userId;

    const requester = await User.findById(requesterId).populate('employeeId');
    if (!requester) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id: targetEmployeeId } = await params;

    // Get target employee
    const targetEmployee = await Employee.findById(targetEmployeeId).populate('department');
    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Permission check
    const isAdmin = ['admin', 'god_admin'].includes(requester.role);
    const isSelf = requester.employeeId?._id?.toString() === targetEmployeeId;
    const isDeptHead = requester.role === 'department_head' && 
      requester.employeeId?.department?.toString() === targetEmployee.department?._id?.toString();

    if (!isAdmin && !isSelf && !isDeptHead) {
      return NextResponse.json({ 
        error: 'You do not have permission to view this employee\'s activity' 
      }, { status: 403 });
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const includeScreenshots = searchParams.get('includeScreenshots') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '50');

    const dateFilter = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };

    // Get target user ID
    const targetUser = await User.findOne({ employeeId: targetEmployeeId });

    // Fetch activity data
    const [keystrokes, windowActivity, screenshots] = await Promise.all([
      // Keystroke logs (aggregated by hour)
      KeystrokeLog.aggregate([
        {
          $match: {
            employee: targetEmployee._id,
            timestamp: dateFilter
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              hour: { $hour: '$timestamp' }
            },
            totalKeystrokes: { $sum: '$keystrokeCount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': -1, '_id.hour': -1 } },
        { $limit: 168 } // Last 7 days * 24 hours
      ]),

      // Window activity logs
      WindowActivityLog.find({
        employee: targetEmployee._id,
        focusStartTime: dateFilter
      })
        .sort({ focusStartTime: -1 })
        .limit(limit)
        .select('applicationName windowTitle timeSpent category productivityScore focusStartTime focusEndTime'),

      // Screenshots (without full image data for list view)
      includeScreenshots ? AutoScreenCapture.find({
        employee: targetEmployee._id,
        capturedAt: dateFilter
      })
        .sort({ capturedAt: -1 })
        .limit(limit)
        .select('capturedAt analysis source deviceInfo')
        .lean()
        .then(docs => docs.map(doc => ({
          ...doc,
          // Don't include full screenshot in list
          hasScreenshot: true
        }))) : []
    ]);

    // Calculate productivity stats
    const productivityStats = {
      totalKeystrokes: keystrokes.reduce((sum, k) => sum + k.totalKeystrokes, 0),
      totalActiveTime: windowActivity.reduce((sum, w) => sum + (w.timeSpent || 0), 0),
      productiveTime: windowActivity
        .filter(w => w.category === 'productive')
        .reduce((sum, w) => sum + (w.timeSpent || 0), 0),
      distractionTime: windowActivity
        .filter(w => w.category === 'distraction')
        .reduce((sum, w) => sum + (w.timeSpent || 0), 0),
      averageProductivityScore: windowActivity.length > 0
        ? Math.round(windowActivity.reduce((sum, w) => sum + (w.productivityScore || 0), 0) / windowActivity.length)
        : 0,
      screenshotCount: screenshots.length,
      topApps: getTopApps(windowActivity)
    };

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: targetEmployee._id,
          name: `${targetEmployee.firstName} ${targetEmployee.lastName}`,
          department: targetEmployee.department?.name,
          designation: targetEmployee.designation
        },
        dateRange: { startDate, endDate },
        stats: productivityStats,
        keystrokes: keystrokes,
        windowActivity: windowActivity,
        screenshots: screenshots
      }
    });

  } catch (error) {
    console.error('❌ Get employee activity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data', details: error.message },
      { status: 500 }
    );
  }
}

// Helper to get top apps by time spent
function getTopApps(windowActivity) {
  const appTime = {};
  for (const w of windowActivity) {
    const app = w.applicationName || 'Unknown';
    appTime[app] = (appTime[app] || 0) + (w.timeSpent || 0);
  }
  
  return Object.entries(appTime)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, time]) => ({ name, time }));
}
