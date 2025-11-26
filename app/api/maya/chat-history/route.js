import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import MayaChatHistory from '@/models/MayaChatHistory';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

export async function GET(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    let targetUserId = user._id;

    // If a specific userId is requested, verify permission
    if (requestedUserId && requestedUserId !== user._id.toString()) {
      // Check if current user has permission to view other users' chat history
      const currentUserDoc = await User.findById(user._id).select('role employeeId').lean();

      if (!currentUserDoc) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const allowedRoles = ['admin', 'god_admin', 'hr', 'department_head', 'manager'];

      if (!allowedRoles.includes(currentUserDoc.role)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to view other users\' chat history' },
          { status: 403 }
        );
      }

      // For department heads and managers, verify the requested user is in their department
      if (currentUserDoc.role === 'department_head' || currentUserDoc.role === 'manager') {
        // Find the department where current user is head OR get user's department
        let headDepartment = await Department.findOne({
          head: currentUserDoc.employeeId,
          isActive: true
        }).lean();

        // If not a formal department head, get their department
        if (!headDepartment && currentUserDoc.employeeId) {
          const userEmployee = await Employee.findById(currentUserDoc.employeeId).select('department').lean();
          if (userEmployee?.department) {
            headDepartment = { _id: userEmployee.department };
          }
        }

        if (headDepartment) {
          // Get the requested user's employee info
          const requestedUserDoc = await User.findById(requestedUserId).select('employeeId').lean();

          if (requestedUserDoc && requestedUserDoc.employeeId) {
            const requestedEmployee = await Employee.findById(requestedUserDoc.employeeId)
              .select('department')
              .lean();

            // Allow if it's the department head's own history OR if employee is in their department
            if (requestedUserId !== user._id.toString() &&
                (!requestedEmployee ||
                 requestedEmployee.department?.toString() !== headDepartment._id.toString())) {
              return NextResponse.json(
                { success: false, error: 'You can only view chat history of employees in your department' },
                { status: 403 }
              );
            }
          }
        }
      }

      targetUserId = requestedUserId;
    }

    // Fetch chat history for the target user
    const history = await MayaChatHistory.find({ userId: targetUserId })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      success: true,
      history,
      total: history.length
    });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chat history', details: error.message },
      { status: 500 }
    );
  }
}

