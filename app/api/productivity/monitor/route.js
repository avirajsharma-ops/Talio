import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Helper function to check if user is a department head (via Department.head or Department.heads[] field)
async function getDepartmentIfHead(userId) {
  // Convert userId to ObjectId if needed
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;

  // First get the employee ID for this user
  const user = await User.findById(userObjId).select('employeeId').lean();
  let employeeId = user?.employeeId;

  if (!employeeId) {
    // Try to find employee by userId
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

// Helper function to get employee for a user (bidirectional lookup)
async function getEmployeeForUser(userId) {
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;

  // First try: Employee.userId
  let employee = await Employee.findOne({ userId: userObjId }).select('_id department').lean();
  if (employee) return employee;

  // Second try: User.employeeId (reverse relationship)
  const user = await User.findById(userObjId).select('employeeId').lean();
  if (user?.employeeId) {
    employee = await Employee.findById(user.employeeId).select('_id department').lean();
    if (employee) return employee;
  }

  return null;
}

// Helper function to check if user can monitor target user
async function canMonitorUser(requesterId, requesterRole, targetUserId) {
  // god_admin and admin can monitor everyone
  if (requesterRole === 'god_admin' || requesterRole === 'admin') {
    return true;
  }

  // User can always monitor themselves
  if (requesterId.toString() === targetUserId.toString()) {
    return true;
  }

  // Check if user is department head via Department model
  const department = await getDepartmentIfHead(requesterId);

  if (department) {
    // Get target employee's department using bidirectional lookup
    const targetEmployee = await getEmployeeForUser(targetUserId);

    if (targetEmployee && targetEmployee.department &&
      targetEmployee.department.toString() === department._id.toString()) {
      return true;
    }
  }

  return false;
}

// GET: Retrieve screen monitoring/productivity data
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
    const captureId = searchParams.get('captureId'); // For fetching single capture with screenshot
    const includeScreenshot = searchParams.get('includeScreenshot') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const afterDate = searchParams.get('after'); // For fetching only new records

    await connectDB();

    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Handle single capture fetch by ID (for sequential screenshot loading)
    if (captureId) {
      const captureObjId = toObjectId(captureId);
      if (!captureObjId) {
        return NextResponse.json({ success: false, error: 'Invalid capture ID' }, { status: 400 });
      }

      // Try to find in ProductivityData first, then MayaScreenSummary
      let capture = await ProductivityData.findById(captureObjId)
        .populate('userId', 'email profilePicture employeeId')
        .populate('employeeId', 'firstName lastName employeeCode department designation profilePicture')
        .lean();

      if (!capture) {
        capture = await MayaScreenSummary.findById(captureObjId)
          .populate('monitoredUserId', 'email profilePicture employeeId')
          .populate('monitoredEmployeeId', 'firstName lastName employeeCode department designation profilePicture')
          .lean();
      }

      if (!capture) {
        return NextResponse.json({ success: false, error: 'Capture not found' }, { status: 404 });
      }

      // Get screenshot data with proper data URI prefix
      let screenshotData = null;
      // Check for file path first (file-based storage from desktop app)
      if (capture.screenshot?.path) {
        screenshotData = capture.screenshot.path;
      } else if (capture.screenshot?.url) {
        screenshotData = capture.screenshot.url;
      } else if (capture.screenshot?.data) {
        const data = capture.screenshot.data;
        if (data.startsWith('data:')) {
          screenshotData = data;
        } else {
          // Detect format from data or default to webp (our compression format)
          const mimeType = data.startsWith('/9j/') ? 'image/jpeg' :
            data.startsWith('iVBOR') ? 'image/png' : 'image/webp';
          screenshotData = `data:${mimeType};base64,${data}`;
        }
      } else if (capture.screenshotUrl) {
        const url = capture.screenshotUrl;
        screenshotData = url.startsWith('data:') ? url :
          (url.startsWith('http') ? url : `data:image/webp;base64,${url}`);
      }

      return NextResponse.json({
        success: true,
        data: [{
          ...capture,
          screenshotUrl: screenshotData,
          screenshot: capture.screenshot // Include full screenshot object with path
        }]
      });
    }

    let query = {};

    // Check if user is a department head (via Department.head field)
    const headOfDepartment = await getDepartmentIfHead(userId);

    console.log('[Monitor API] User check:', { userId, role: user.role, isHead: !!headOfDepartment, departmentId: headOfDepartment?._id });

    // Determine which users' data to fetch based on role and permissions
    if (targetUserId) {
      // Specific user requested - check permission
      const canMonitor = await canMonitorUser(userId, user.role, targetUserId);
      if (!canMonitor) {
        return NextResponse.json({
          success: false,
          error: "You do not have permission to view this user's data"
        }, { status: 403 });
      }
      // Convert string to ObjectId for proper querying
      const targetObjId = toObjectId(targetUserId);
      if (!targetObjId) {
        return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
      }
      query.monitoredUserId = targetObjId;
      console.log('[Monitor API] Query for specific user:', { targetUserId, targetObjId });
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

        query.monitoredUserId = { $in: departmentUserIds };
        console.log('[Monitor API] Department head query - department:', headOfDepartment.name, 'users:', departmentUserIds.length);
      } else {
        // Regular employees see only their own data
        query.monitoredUserId = userId;
      }
    }

    // Apply date filters if provided
    if (startDate || endDate || afterDate) {
      query.createdAt = {};
      if (afterDate) {
        // When 'after' is provided, fetch only records newer than this date
        query.createdAt.$gt = new Date(afterDate);
      } else {
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }
    }

    // Exclude pending captures (waiting for desktop app upload)
    // Only show completed captures with actual screenshots
    query.status = { $ne: 'pending' };

    // Build query for new ProductivityData model
    const productivityQuery = {};
    if (query.monitoredUserId) {
      productivityQuery.userId = query.monitoredUserId;
    }
    if (query.createdAt) {
      productivityQuery.createdAt = query.createdAt;
    }
    productivityQuery.status = { $in: ['synced', 'analyzed'] };

    // Get counts in parallel with data fetch for speed
    // For initial loads, we can skip count and estimate from results
    const skipCounting = skip === 0 && limit <= 20;

    // Fetch from both old MayaScreenSummary and new ProductivityData
    const [legacyData, productivityData, legacyCount, productivityCount] = await Promise.all([
      // Legacy data
      MayaScreenSummary.find(query)
        .select(includeScreenshot ? '-domSnapshot' : '-domSnapshot -screenshotUrl')
        .populate('monitoredUserId', 'email profilePicture employeeId')
        .populate('monitoredEmployeeId', 'firstName lastName employeeCode department designation profilePicture')
        .populate('requestedByUserId', 'email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      // New ProductivityData - fetch with proper offset
      ProductivityData.find(productivityQuery)
        .select(includeScreenshot ? '' : '-screenshot.data -screenshot.thumbnail')
        .populate('userId', 'email profilePicture employeeId')
        .populate('employeeId', 'firstName lastName employeeCode department designation profilePicture')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      // Counts (skip if initial load to speed up)
      skipCounting ? 0 : MayaScreenSummary.countDocuments(query),
      skipCounting ? 0 : ProductivityData.countDocuments(productivityQuery)
    ]);

    // For productivity data without employeeId, try to look up by userId
    const userIdsNeedingEmployee = productivityData
      .filter(pd => !pd.employeeId && pd.userId)
      .map(pd => pd.userId._id || pd.userId);

    // Batch lookup employees by userId for records missing employeeId
    let employeeByUserId = {};
    if (userIdsNeedingEmployee.length > 0) {
      const employees = await Employee.find({
        userId: { $in: userIdsNeedingEmployee }
      }).select('userId firstName lastName employeeCode department designation designationLevel designationLevelName profilePicture').lean();

      employees.forEach(emp => {
        if (emp.userId) {
          employeeByUserId[emp.userId.toString()] = emp;
        }
      });
    }

    // Transform ProductivityData to match the expected format
    const transformedProductivityData = productivityData.map(pd => {
      // Build user name from multiple sources
      let userName = 'Unknown User';
      let userEmail = '';
      let userProfilePic = '';

      // Get employee info - first from employeeId, then from lookup
      let employeeInfo = pd.employeeId;
      if (!employeeInfo && pd.userId) {
        const userIdStr = (pd.userId._id || pd.userId).toString();
        employeeInfo = employeeByUserId[userIdStr];
      }

      // Priority 1: Employee data (firstName + lastName)
      if (employeeInfo?.firstName) {
        userName = `${employeeInfo.firstName} ${employeeInfo.lastName || ''}`.trim();
        userProfilePic = employeeInfo.profilePicture || '';
      }
      // Priority 2: User email as fallback name
      else if (pd.userId?.email) {
        userName = pd.userId.email.split('@')[0]; // Use email prefix as name fallback
        userEmail = pd.userId.email || '';
        userProfilePic = pd.userId.profilePicture || '';
      }

      // Get email from userId if we have it
      if (pd.userId?.email && !userEmail) {
        userEmail = pd.userId.email;
      }

      // Get screenshot - prefer url, fallback to base64 data with proper format detection
      let screenshotData = null;
      if (pd.screenshot?.url) {
        screenshotData = pd.screenshot.url;
      } else if (pd.screenshot?.data) {
        const data = pd.screenshot.data;
        if (data.startsWith('data:')) {
          screenshotData = data;
        } else {
          // Detect image format from base64 data header
          // JPEG: /9j/, PNG: iVBOR, WebP: UklGR (our compression format)
          const mimeType = data.startsWith('/9j/') ? 'image/jpeg' :
            data.startsWith('iVBOR') ? 'image/png' : 'image/webp';
          screenshotData = `data:${mimeType};base64,${data}`;
        }
      }

      // Generate dynamic summary if AI analysis is missing
      let summary = pd.aiAnalysis?.summary;
      if (!summary || summary === 'Productivity data captured') {
        // Create a meaningful summary from the data
        const topApp = pd.topApps?.[0];
        const totalMins = Math.round((pd.totalActiveTime || 0) / 60000);
        const productivePercent = pd.totalActiveTime > 0
          ? Math.round((pd.productiveTime / pd.totalActiveTime) * 100)
          : 0;

        if (topApp) {
          summary = `Worked for ${totalMins} minutes with ${productivePercent}% productive time. Primary focus: ${topApp.appName} (${topApp.percentage || 0}% of time).`;
        } else {
          summary = `Activity captured for ${totalMins} minutes with ${productivePercent}% productive time.`;
        }
      }

      return {
        _id: pd._id,
        monitoredUserId: {
          _id: pd.userId?._id || pd.userId,
          name: userName,
          email: userEmail,
          profilePicture: userProfilePic
        },
        monitoredEmployeeId: employeeInfo || pd.employeeId,
        captureType: 'screenshot',
        captureMode: pd.isInstantCapture ? 'instant' : 'automatic',
        summary: summary,
        productivityScore: pd.aiAnalysis?.productivityScore || (pd.totalActiveTime > 0
          ? Math.round((pd.productiveTime / pd.totalActiveTime) * 100)
          : 0),
        productivityTips: pd.aiAnalysis?.recommendations?.join('. ') || '',
        productivityInsights: pd.aiAnalysis?.insights || [],
        screenshotUrl: screenshotData,
        status: pd.status,
        createdAt: pd.createdAt,
        // Rich productivity data
        appUsage: pd.appUsage,
        topApps: pd.topApps,
        websiteVisits: pd.websiteVisits,
        topWebsites: pd.topWebsites,
        keystrokes: pd.keystrokes,
        mouseActivity: pd.mouseActivity,
        productiveTime: pd.productiveTime,
        neutralTime: pd.neutralTime,
        unproductiveTime: pd.unproductiveTime,
        totalActiveTime: pd.totalActiveTime,
        focusScore: pd.aiAnalysis?.focusScore,
        efficiencyScore: pd.aiAnalysis?.efficiencyScore,
        areasOfImprovement: pd.aiAnalysis?.areasOfImprovement || [],
        topAchievements: pd.aiAnalysis?.topAchievements || [],
        periodStart: pd.periodStart,
        periodEnd: pd.periodEnd
      };
    });

    // Combine and sort by date
    const allData = [...legacyData, ...transformedProductivityData]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    // Calculate total - use counts if available, otherwise estimate from results
    const totalAvailable = skipCounting
      ? (allData.length >= limit ? allData.length + 100 : allData.length) // Estimate more if full page
      : (legacyCount + productivityCount);

    console.log('[Monitor API] Returning', allData.length, 'of', totalAvailable, 'total records. Sample names:',
      allData.slice(0, 3).map(d => d.monitoredUserId?.name || 'no-name').join(', '));

    return NextResponse.json({
      success: true,
      data: allData,
      count: allData.length,
      total: totalAvailable,
      hasMore: (skip + allData.length) < totalAvailable
    });

  } catch (error) {
    console.error('Screen Monitor Fetch Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch monitoring data'
    }, { status: 500 });
  }
}

// POST: Submit screen capture/productivity data
export async function POST(request) {
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
    const body = await request.json();
    const {
      captureType,
      screenshot,
      currentPage,
      activities,
      applications,
      metadata,
      consentGiven
    } = body;

    await connectDB();

    const user = await User.findById(userId).select('employeeId');
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Generate AI summary using OpenAI (if available)
    let summary = 'Productivity snapshot captured';
    let detailedAnalysis = '';

    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (openaiApiKey && (activities?.length || currentPage)) {
      try {
        const promptData = {
          page: currentPage?.title || currentPage?.url || 'Unknown page',
          activities: activities || [],
          apps: applications || []
        };

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are analyzing employee productivity. Provide a brief, professional 2-sentence summary of their current activity.'
              },
              {
                role: 'user',
                content: `Current page: ${promptData.page}\nActivities: ${promptData.activities.join(', ')}\nApplications: ${promptData.apps.map(a => a.name).join(', ')}`
              }
            ],
            temperature: 0.5,
            max_tokens: 150
          })
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          summary = data.choices[0]?.message?.content || summary;
        }
      } catch (err) {
        console.error('OpenAI summary error:', err);
      }
    }

    // Create screen summary record
    const screenSummary = await MayaScreenSummary.create({
      monitoredUserId: userId,
      monitoredEmployeeId: user.employeeId,
      requestedByUserId: userId, // Self-monitoring
      requestedByEmployeeId: user.employeeId,
      captureType: captureType || 'screenshot',
      summary,
      detailedAnalysis,
      currentPage,
      activities: activities || [],
      applications: applications || [],
      screenshotUrl: screenshot, // Base64 or URL
      metadata: {
        ...metadata,
        timestamp: new Date()
      },
      status: 'captured',
      consentGiven: consentGiven !== false,
      consentTimestamp: new Date(),
      deliveredAt: new Date()
    });

    // Emit socket event if available
    if (global.io) {
      global.io.to(`user:${userId}`).emit('productivity-captured', {
        id: screenSummary._id,
        summary,
        timestamp: new Date()
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: screenSummary._id,
        summary,
        timestamp: screenSummary.createdAt
      }
    });

  } catch (error) {
    console.error('Screen Capture Submit Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save screen capture data'
    }, { status: 500 });
  }
}
