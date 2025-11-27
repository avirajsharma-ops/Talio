import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import User from '@/models/User';
import Employee from '@/models/Employee';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper function to check if user can monitor target user
async function canMonitorUser(requesterId, requesterRole, targetUserId) {
  // god_admin and admin can monitor everyone
  if (requesterRole === 'god_admin' || requesterRole === 'admin') {
    return true;
  }

  // Department head can monitor their department members
  if (requesterRole === 'department_head') {
    const requester = await Employee.findOne({ userId: requesterId }).select('department');
    const target = await Employee.findOne({ userId: targetUserId }).select('department');
    
    if (requester && target && requester.department && 
        requester.department.toString() === target.department.toString()) {
      return true;
    }
  }

  // User can always monitor themselves
  if (requesterId === targetUserId) {
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    await connectDB();

    const user = await User.findById(userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let query = {};
    
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
      // No specific user - return based on role
      if (user.role === 'god_admin' || user.role === 'admin') {
        // Admin/god_admin can see all
        // No filter needed
      } else if (user.role === 'department_head') {
        // Department head sees their department
        const employee = await Employee.findOne({ userId }).select('department');
        if (employee && employee.department) {
          const departmentEmployees = await Employee.find({ 
            department: employee.department 
          }).select('userId');
          const departmentUserIds = departmentEmployees.map(e => e.userId);
          query.monitoredUserId = { $in: departmentUserIds };
        }
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

    // Select fields based on includeScreenshot
    const selectFields = includeScreenshot 
      ? '-domSnapshot' // Exclude large DOM snapshot
      : '-domSnapshot -screenshotUrl'; // Exclude both for performance

    const screenData = await MayaScreenSummary.find(query)
      .select(selectFields)
      .populate('monitoredUserId', 'name email')
      .populate('monitoredEmployeeId', 'name employeeCode department designation')
      .populate('requestedByUserId', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: screenData,
      count: screenData.length
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
