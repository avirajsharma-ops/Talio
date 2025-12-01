import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import AutoScreenCapture from '@/models/AutoScreenCapture';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * GET /api/employees/[id]/activity/screenshot/[screenshotId]
 * Get a specific screenshot with full image data
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

    const { id: targetEmployeeId, screenshotId } = await params;

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
        error: 'You do not have permission to view this screenshot' 
      }, { status: 403 });
    }

    // Get screenshot
    const screenshot = await AutoScreenCapture.findOne({
      _id: screenshotId,
      employee: targetEmployeeId
    });

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
    }

    // Ensure screenshot data has proper data URI prefix
    let screenshotData = screenshot.screenshot;
    if (screenshotData && !screenshotData.startsWith('data:')) {
      // Default to webp if no prefix (our current compression format)
      screenshotData = `data:image/webp;base64,${screenshotData}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: screenshot._id,
        capturedAt: screenshot.capturedAt,
        screenshot: screenshotData, // Full base64 image with proper data URI
        analysis: screenshot.analysis,
        source: screenshot.source,
        deviceInfo: screenshot.deviceInfo
      }
    });

  } catch (error) {
    console.error('❌ Get screenshot error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch screenshot', details: error.message },
      { status: 500 }
    );
  }
}
