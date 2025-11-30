import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper function to check if user is a department head (via Department.head or Department.heads[] field)
async function getDepartmentIfHead(userId) {
  // First get the employee ID for this user
  const user = await User.findById(userId).select('employeeId');
  if (!user || !user.employeeId) {
    // Try to find employee by userId
    const employee = await Employee.findOne({ userId }).select('_id');
    if (!employee) return null;
    
    // Check if this employee is head of any department (check both head and heads fields)
    const department = await Department.findOne({ 
      $or: [
        { head: employee._id },
        { heads: employee._id }
      ],
      isActive: true 
    });
    return department;
  }
  
  // Check if this employee is head of any department (check both head and heads fields)
  const department = await Department.findOne({ 
    $or: [
      { head: user.employeeId },
      { heads: user.employeeId }
    ],
    isActive: true 
  });
  return department;
}

// POST - Request instant screenshot capture from specific employee
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

    const requester = await User.findById(decoded.userId).select('role employeeId');
    if (!requester) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check permission: admin, god_admin, or department head (via Department model)
    const isAdmin = ['admin', 'god_admin'].includes(requester.role);
    const headOfDepartment = await getDepartmentIfHead(decoded.userId);
    
    console.log('[Instant Capture] Permission check:', { userId: decoded.userId, isAdmin, isHead: !!headOfDepartment });
    
    if (!isAdmin && !headOfDepartment) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only admins and department heads can request instant captures' 
      }, { status: 403 });
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Target user ID is required' 
      }, { status: 400 });
    }

    // Get target user
    const targetUser = await User.findById(targetUserId).select('employeeId');
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 });
    }

    // Department head can only capture their department employees
    if (!isAdmin && headOfDepartment) {
      const targetEmployee = await Employee.findById(targetUser.employeeId).select('department');
      
      if (!targetEmployee || 
          targetEmployee.department?.toString() !== headOfDepartment._id.toString()) {
        return NextResponse.json({ 
          success: false, 
          error: 'You can only capture screenshots from your department employees' 
        }, { status: 403 });
      }
    }

    // Create instant capture request
    const captureRequest = await MayaScreenSummary.create({
      monitoredUserId: targetUserId,
      monitoredEmployeeId: targetUser.employeeId,
      requestedByUserId: decoded.userId,
      requestedByEmployeeId: requester.employeeId,
      captureType: 'screenshot',
      captureMode: 'instant',
      summary: 'Instant capture requested - pending upload',
      status: 'pending',
      consentGiven: true, // Instant captures are authorized by admin/dept head
      consentTimestamp: new Date(),
    });

    // Emit Socket.IO event to desktop app to trigger immediate capture
    if (global.io) {
      const roomName = `user:${targetUserId}`;
      const socketsInRoom = await global.io.in(roomName).fetchSockets();
      console.log(`[Instant Capture] Emitting to room ${roomName}, sockets in room: ${socketsInRoom.length}`);
      
      if (socketsInRoom.length === 0) {
        console.log('[Instant Capture] WARNING: No desktop app connected for this user');
      }
      
      global.io.to(roomName).emit('instant-capture-request', {
        requestId: captureRequest._id.toString(),
        requestedBy: requester.role,
        timestamp: new Date().toISOString(),
      });
      
      console.log('[Instant Capture] Event emitted successfully');
    } else {
      console.log('[Instant Capture] WARNING: Socket.IO not available');
    }

    return NextResponse.json({
      success: true,
      message: 'Instant capture requested. Waiting for screenshot upload...',
      data: {
        requestId: captureRequest._id,
        status: 'pending',
      },
    });

  } catch (error) {
    console.error('Instant Capture Request Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to request instant capture' 
    }, { status: 500 });
  }
}

// GET - Check status of instant capture request
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

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Request ID is required' 
      }, { status: 400 });
    }

    await connectDB();

    const captureRequest = await MayaScreenSummary.findById(requestId)
      .populate('monitoredEmployeeId', 'name employeeCode designation')
      .populate('requestedByEmployeeId', 'name');

    if (!captureRequest) {
      return NextResponse.json({ success: false, error: 'Capture request not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: captureRequest,
    });

  } catch (error) {
    console.error('Check Capture Status Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check capture status' 
    }, { status: 500 });
  }
}
