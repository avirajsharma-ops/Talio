import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import User from '@/models/User';
import Employee from '@/models/Employee';
import { analyzeProductivityWithMAYA } from '@/lib/mayaProductivityAnalyzer';

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

    // Get employee details for context
    const employee = await Employee.findById(user.employeeId)
      .select('name designation designationLevel designationLevelName department');

    // Perform MAYA AI productivity analysis
    const analysis = await analyzeProductivityWithMAYA(
      { currentPage, activities, applications },
      {
        designation: employee?.designation,
        department: employee?.department
      }
    );

    // Determine capture mode from metadata
    const captureMode = metadata?.captureMode || 'automatic';

    // Create screen summary record with MAYA analysis
    const screenSummary = await MayaScreenSummary.create({
      monitoredUserId: userId,
      monitoredEmployeeId: user.employeeId,
      requestedByUserId: userId, // Self-monitoring from desktop
      requestedByEmployeeId: user.employeeId,
      captureType: 'screenshot',
      captureMode,
      summary: analysis.summary,
      detailedAnalysis: `Activities: ${(activities || []).join(', ')}. Applications: ${(applications || []).map(a => a.name || a).join(', ') || 'Desktop'}`,
      productivityScore: analysis.productivityScore,
      productivityTips: analysis.productivityTips,
      productivityInsights: analysis.productivityInsights,
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
