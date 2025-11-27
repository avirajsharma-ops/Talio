import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivitySettings from '@/models/ProductivitySettings';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// GET - Fetch productivity settings
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

    const user = await User.findById(decoded.userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get or create settings
    let settings = await ProductivitySettings.findOne();
    
    if (!settings) {
      // Create default settings
      settings = await ProductivitySettings.create({
        screenshotInterval: 5,
        workHours: {
          enabled: true,
          start: '09:00',
          end: '18:00',
        },
        breakTimes: [
          { name: 'Lunch Break', start: '13:00', end: '14:00', enabled: true },
        ],
        aiAnalysis: {
          enabled: true,
          realtime: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: settings,
    });

  } catch (error) {
    console.error('Fetch Productivity Settings Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch settings' 
    }, { status: 500 });
  }
}

// POST - Update productivity settings (Admin/Dept Head only)
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

    await connectDB();

    const user = await User.findById(decoded.userId).select('role');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check permission: only admin, god_admin, department_head can update
    if (!['admin', 'god_admin', 'department_head'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only admins and department heads can update productivity settings' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { screenshotInterval, workHours, breakTimes, aiAnalysis } = body;

    // Validate interval
    if (screenshotInterval && (screenshotInterval < 1 || screenshotInterval > 1440)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Screenshot interval must be between 1 and 1440 minutes' 
      }, { status: 400 });
    }

    // Get or create settings
    let settings = await ProductivitySettings.findOne();
    
    if (!settings) {
      settings = new ProductivitySettings();
    }

    // Update fields
    if (screenshotInterval !== undefined) settings.screenshotInterval = screenshotInterval;
    if (workHours) settings.workHours = { ...settings.workHours, ...workHours };
    if (breakTimes) settings.breakTimes = breakTimes;
    if (aiAnalysis) settings.aiAnalysis = { ...settings.aiAnalysis, ...aiAnalysis };
    
    settings.updatedBy = decoded.userId;
    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'Productivity settings updated successfully',
      data: settings,
    });

  } catch (error) {
    console.error('Update Productivity Settings Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update settings' 
    }, { status: 500 });
  }
}
