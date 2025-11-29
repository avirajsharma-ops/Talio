import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
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

// Helper function to check if user is a department head (via Department.head field)
async function getDepartmentIfHead(userId) {
  // First get the employee ID for this user
  const user = await User.findById(userId).select('employeeId');
  if (!user || !user.employeeId) {
    // Try to find employee by userId
    const employee = await Employee.findOne({ userId }).select('_id');
    if (!employee) return null;
    
    // Check if this employee is head of any department
    const department = await Department.findOne({ head: employee._id, isActive: true });
    return department;
  }
  
  // Check if this employee is head of any department
  const department = await Department.findOne({ head: user.employeeId, isActive: true });
  return department;
}

// Helper function to check if user can monitor target user
async function canMonitorUser(requesterId, requesterRole, targetUserId) {
  // god_admin and admin can monitor everyone
  if (requesterRole === 'god_admin' || requesterRole === 'admin') {
    return true;
  }

  // Check if user is department head via Department model
  const department = await getDepartmentIfHead(requesterId);
  
  if (department) {
    // Get target employee's department
    const targetEmployee = await Employee.findOne({ userId: targetUserId }).select('department');
    
    if (targetEmployee && targetEmployee.department && 
        targetEmployee.department.toString() === department._id.toString()) {
      return true;
    }
  }

  // User can always monitor themselves
  if (requesterId.toString() === targetUserId.toString()) {
    return true;
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
    const includeScreenshot = searchParams.get('includeScreenshot') === 'true';
    const limit = parseInt(searchParams.get('limit')) || 50;
    const skip = parseInt(searchParams.get('skip')) || 0;
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
    
    console.log('[Monitor API] User check:', { userId, role: user.role, isHead: !!headOfDepartment, departmentId: headOfDepartment?._id });
    
    // Determine which users' data to fetch based on role and permissions
    if (targetUserId) {
      // Specific user requested - check permission
      const canMonitor = await canMonitorUser(userId, user.role, targetUserId);
      if (!canMonitor) {
        return NextResponse.json({ 
          success: false, 
          error: 'You do not have permission to view this user\'s data' 
        }, { status: 403 });
      }
      query.monitoredUserId = targetUserId;
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
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
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

    // Fetch from both old MayaScreenSummary and new ProductivityData
    const [legacyData, productivityData] = await Promise.all([
      // Legacy data
      MayaScreenSummary.find(query)
        .select(includeScreenshot ? '-domSnapshot' : '-domSnapshot -screenshotUrl')
        .populate('monitoredUserId', 'email profilePicture employeeId')
        .populate('monitoredEmployeeId', 'firstName lastName employeeCode department designation profilePicture')
        .populate('requestedByUserId', 'email')
        .sort({ createdAt: -1 })
        .skip(Math.floor(skip / 2))
        .limit(Math.floor(limit / 2)),
      // New ProductivityData - also populate userId as User to get employee reference
      ProductivityData.find(productivityQuery)
        .populate('userId', 'email profilePicture employeeId')
        .populate('employeeId', 'firstName lastName employeeCode department designation profilePicture')
        .sort({ createdAt: -1 })
        .skip(Math.floor(skip / 2))
        .limit(Math.floor(limit / 2))
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
      }).select('userId firstName lastName employeeCode department designation profilePicture');
      
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
      
      // Get screenshot - prefer url, fallback to base64 data
      let screenshotData = null;
      if (pd.screenshot?.url) {
        screenshotData = pd.screenshot.url;
      } else if (pd.screenshot?.data) {
        // Ensure base64 data has proper data URI prefix
        const data = pd.screenshot.data;
        screenshotData = data.startsWith('data:') ? data : `data:image/png;base64,${data}`;
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

    console.log('[Monitor API] Returning', allData.length, 'records. Sample names:', 
      allData.slice(0, 3).map(d => d.monitoredUserId?.name || 'no-name').join(', '));

    return NextResponse.json({
      success: true,
      data: allData,
      count: allData.length
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
