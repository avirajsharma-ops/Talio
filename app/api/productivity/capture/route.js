import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import ProductivityData from '@/models/ProductivityData';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * Dedicated endpoint for desktop app screenshot captures
 * Saves screenshots to: uploads/captures/{employeeName}/{employeeId}/{timestamp}.webp
 */
export async function POST(request) {
  try {
    // Authenticate
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

    const body = await request.json();
    const {
      screenshot,       // Base64 screenshot data (data:image/webp;base64,...)
      employeeId,       // Employee ID
      employeeName,     // Employee name for folder
      employeeCode,     // Employee code
      capturedAt,       // ISO timestamp
      keystrokeCount,   // Number of keystrokes
      mouseClicks,      // Number of clicks
      mouseMovement,    // Mouse movement distance
      appUsage          // Array of app usage data
    } = body;

    if (!screenshot) {
      return NextResponse.json({ success: false, error: 'No screenshot provided' }, { status: 400 });
    }

    // Get user and employee info
    const user = await User.findById(decoded.userId).select('employeeId');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get employee data
    let employee = null;
    if (employeeId) {
      employee = await Employee.findById(employeeId).select('_id firstName lastName employeeCode department');
    }
    if (!employee && user.employeeId) {
      employee = await Employee.findById(user.employeeId).select('_id firstName lastName employeeCode department');
    }
    if (!employee) {
      employee = await Employee.findOne({ userId: decoded.userId }).select('_id firstName lastName employeeCode department');
    }

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    // Check if employee is checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: { $gte: today },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    });

    if (!attendance) {
      return NextResponse.json({ 
        success: false, 
        error: 'Employee not checked in',
        message: 'Screenshot capture requires active check-in'
      }, { status: 400 });
    }

    // Create folder path: uploads/captures/{employeeName}/{employeeId}/
    const safeName = `${employee.firstName}_${employee.lastName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeId = employee.employeeCode || employee._id.toString();
    
    const capturesDir = path.join(process.cwd(), 'public', 'uploads', 'captures', safeName, safeId);
    
    // Create directory if it doesn't exist
    await fs.mkdir(capturesDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date(capturedAt || Date.now());
    const dateStr = timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    
    // Determine file extension from data URI
    let extension = 'webp';
    if (screenshot.startsWith('data:image/jpeg')) {
      extension = 'jpg';
    } else if (screenshot.startsWith('data:image/png')) {
      extension = 'png';
    }
    
    const filename = `${dateStr}_${timeStr}.${extension}`;
    const filePath = path.join(capturesDir, filename);

    // Extract base64 data and save to file
    let imageData = screenshot;
    if (screenshot.startsWith('data:')) {
      const matches = screenshot.match(/^data:[^;]+;base64,(.+)$/);
      if (matches) {
        imageData = matches[1];
      }
    }

    const imageBuffer = Buffer.from(imageData, 'base64');
    await fs.writeFile(filePath, imageBuffer);

    // Calculate relative path for database
    const relativePath = `/uploads/captures/${safeName}/${safeId}/${filename}`;

    // Save metadata to ProductivityData
    const productivityData = new ProductivityData({
      userId: decoded.userId,
      employeeId: employee._id,
      screenshot: {
        path: relativePath,
        capturedAt: timestamp,
        captureType: 'periodic',
        fileSize: imageBuffer.length
      },
      keystrokes: {
        totalCount: keystrokeCount || 0
      },
      mouseActivity: {
        clicks: mouseClicks || 0,
        movementDistance: mouseMovement || 0
      },
      appUsage: (appUsage || []).map(app => ({
        appName: app.appName,
        duration: app.duration,
        endTime: app.endTime ? new Date(app.endTime) : new Date()
      })),
      periodStart: new Date(Date.now() - 60000), // 1 minute ago
      periodEnd: new Date(),
      deviceInfo: {
        platform: 'desktop',
        hostname: 'electron-app'
      }
    });

    await productivityData.save();

    console.log(`[Capture] Saved screenshot for ${employee.firstName} ${employee.lastName} at ${relativePath}`);

    return NextResponse.json({
      success: true,
      message: 'Screenshot captured successfully',
      data: {
        path: relativePath,
        timestamp: timestamp.toISOString(),
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode
      }
    });

  } catch (error) {
    console.error('[Capture] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
}

/**
 * GET - Retrieve captures for an employee
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

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const limit = parseInt(searchParams.get('limit')) || 50;

    // Build query
    const query = {};
    
    if (employeeId) {
      query.employeeId = employeeId;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      query['screenshot.capturedAt'] = { $gte: startDate, $lte: endDate };
    }

    // Get captures with employee info
    const captures = await ProductivityData.find(query)
      .select('screenshot employeeId periodStart periodEnd keystrokes mouseActivity appUsage')
      .populate('employeeId', 'firstName lastName employeeCode')
      .sort({ 'screenshot.capturedAt': -1 })
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: captures.map(c => ({
        id: c._id,
        screenshot: c.screenshot,
        employee: c.employeeId ? {
          id: c.employeeId._id,
          name: `${c.employeeId.firstName} ${c.employeeId.lastName}`,
          code: c.employeeId.employeeCode
        } : null,
        period: {
          start: c.periodStart,
          end: c.periodEnd
        },
        activity: {
          keystrokes: c.keystrokes?.totalCount || 0,
          mouseClicks: c.mouseActivity?.clicks || 0,
          mouseMovement: c.mouseActivity?.movementDistance || 0
        },
        appUsage: c.appUsage || []
      })),
      count: captures.length
    });

  } catch (error) {
    console.error('[Capture] GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
