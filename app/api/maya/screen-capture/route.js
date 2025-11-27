import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import User from '@/models/User';
import Employee from '@/models/Employee';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * Screen Capture Endpoint for Desktop Apps
 * This endpoint receives screen captures from MAYA desktop widgets
 */
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
      screenshot, // Base64 encoded screenshot
      currentPage,
      activities,
      applications,
      metadata
    } = body;

    if (!screenshot) {
      return NextResponse.json({ 
        success: false, 
        error: 'Screenshot data is required' 
      }, { status: 400 });
    }

    await connectDB();

    const user = await User.findById(userId).select('employeeId');
    if (!user || !user.employeeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found or not associated with an employee' 
      }, { status: 404 });
    }

    // Generate AI summary using OpenAI
    let summary = 'Productivity snapshot captured from desktop';
    let detailedAnalysis = '';

    const openaiApiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (openaiApiKey && (activities?.length || currentPage)) {
      try {
        const promptData = {
          page: currentPage?.title || currentPage?.url || 'Desktop application',
          activities: activities || ['Screen monitoring active'],
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
                content: 'You are analyzing employee productivity from their desktop activity. Provide a brief, professional 2-3 sentence summary of what the employee is currently working on. Be positive and constructive.'
              },
              {
                role: 'user',
                content: `Activity Analysis:
Page/Application: ${promptData.page}
Recent Activities: ${promptData.activities.join(', ')}
Active Applications: ${promptData.apps.map(a => a.name || a).join(', ') || 'Desktop environment'}

Please summarize what the employee appears to be working on.`
              }
            ],
            temperature: 0.6,
            max_tokens: 200
          })
        });

        if (openaiResponse.ok) {
          const data = await openaiResponse.json();
          summary = data.choices[0]?.message?.content || summary;
          
          // Generate detailed analysis if needed
          detailedAnalysis = `Activities: ${(activities || []).join(', ')}. Applications: ${(applications || []).map(a => a.name || a).join(', ') || 'Desktop'}`;
        }
      } catch (err) {
        console.error('OpenAI summary error:', err);
        // Continue with default summary
      }
    }

    // Create screen summary record with screenshot
    const screenSummary = await MayaScreenSummary.create({
      monitoredUserId: userId,
      monitoredEmployeeId: user.employeeId,
      requestedByUserId: userId, // Self-monitoring from desktop
      requestedByEmployeeId: user.employeeId,
      captureType: 'screenshot',
      summary,
      detailedAnalysis,
      currentPage: currentPage || { 
        url: 'desktop-app', 
        title: 'Desktop Application' 
      },
      activities: activities || ['Desktop activity monitored'],
      applications: applications || [],
      screenshotUrl: screenshot, // Store base64 screenshot
      metadata: {
        browserInfo: metadata?.browserInfo || 'Desktop App',
        deviceInfo: metadata?.deviceInfo || 'Desktop Device',
        timestamp: new Date(),
        source: 'maya-desktop-widget'
      },
      status: 'captured',
      consentGiven: true, // Desktop app user has consented
      consentTimestamp: new Date(),
      deliveredAt: new Date()
    });

    // Emit socket event to notify admins/managers (if applicable)
    if (global.io) {
      // Get employee details for notifications
      const employee = await Employee.findById(user.employeeId)
        .select('department')
        .populate('department', 'name');

      // Notify department heads and admins
      global.io.emit('productivity-update', {
        userId,
        employeeId: user.employeeId,
        department: employee?.department,
        summary,
        timestamp: new Date(),
        captureId: screenSummary._id
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Screen capture saved successfully',
      data: {
        id: screenSummary._id,
        summary,
        timestamp: screenSummary.createdAt
      }
    });

  } catch (error) {
    console.error('Screen Capture Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save screen capture',
      details: error.message 
    }, { status: 500 });
  }
}
