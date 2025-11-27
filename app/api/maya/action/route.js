import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaActionLog from '@/models/MayaActionLog';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Task from '@/models/Task';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

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
    const { action, message } = await request.json();

    if (!action) {
      return NextResponse.json({ success: false, error: 'Action is required' }, { status: 400 });
    }

    await connectDB();

    // Get user to retrieve employeeId
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId).select('employeeId');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    let result = { success: false, message: 'Action not recognized' };

    // Handle different actions
    switch (action.toLowerCase()) {
      case 'check_in':
      case 'clock_in':
        result = await handleCheckIn(userId);
        break;

      case 'check_out':
      case 'clock_out':
        result = await handleCheckOut(userId);
        break;

      case 'view_attendance':
      case 'attendance_status':
        result = await handleViewAttendance(userId);
        break;

      case 'view_leaves':
      case 'leave_status':
        result = await handleViewLeaves(userId);
        break;

      case 'view_tasks':
      case 'my_tasks':
        result = await handleViewTasks(userId);
        break;

      default:
        result = {
          success: false,
          message: `I understand you want to "${action}", but I'm not sure how to help with that yet. Try asking me about attendance, leaves, or tasks.`
        };
    }

    // Log the action
    await MayaActionLog.create({
      userId,
      employeeId: user.employeeId,
      actionType: 'other',
      actionCategory: 'other',
      action,
      userMessage: message,
      result: result.message,
      success: result.success,
      timestamp: new Date(),
      source: 'desktop-app'
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('MAYA Action Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform action',
      message: 'Something went wrong. Please try again.'
    }, { status: 500 });
  }
}

// Action handlers
async function handleCheckIn(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (existingAttendance) {
      return {
        success: false,
        message: "You've already checked in today!"
      };
    }

    const attendance = await Attendance.create({
      userId,
      date: new Date(),
      checkIn: new Date(),
      status: 'present',
      source: 'maya-desktop'
    });

    return {
      success: true,
      message: `Checked in successfully at ${new Date().toLocaleTimeString()}!`,
      data: attendance
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to check in. Please try again.'
    };
  }
}

async function handleCheckOut(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return {
        success: false,
        message: "You haven't checked in today yet!"
      };
    }

    if (attendance.checkOut) {
      return {
        success: false,
        message: "You've already checked out today!"
      };
    }

    attendance.checkOut = new Date();
    
    // Calculate working hours
    const checkIn = new Date(attendance.checkIn);
    const checkOut = new Date(attendance.checkOut);
    const hoursWorked = (checkOut - checkIn) / (1000 * 60 * 60);
    attendance.hoursWorked = Math.round(hoursWorked * 100) / 100;

    await attendance.save();

    return {
      success: true,
      message: `Checked out successfully at ${new Date().toLocaleTimeString()}. You worked ${attendance.hoursWorked} hours today!`,
      data: attendance
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to check out. Please try again.'
    };
  }
}

async function handleViewAttendance(userId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await Attendance.findOne({
      userId,
      date: { $gte: today, $lt: tomorrow }
    });

    if (!attendance) {
      return {
        success: true,
        message: "You haven't checked in today yet."
      };
    }

    let message = `Today's attendance: Checked in at ${new Date(attendance.checkIn).toLocaleTimeString()}. `;
    
    if (attendance.checkOut) {
      message += `Checked out at ${new Date(attendance.checkOut).toLocaleTimeString()}. `;
      message += `Total hours worked: ${attendance.hoursWorked} hours.`;
    } else {
      message += `You haven't checked out yet.`;
    }

    return {
      success: true,
      message,
      data: attendance
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve attendance information.'
    };
  }
}

async function handleViewLeaves(userId) {
  try {
    const pendingLeaves = await Leave.find({
      userId,
      status: 'pending'
    }).sort({ createdAt: -1 }).limit(5);

    if (pendingLeaves.length === 0) {
      return {
        success: true,
        message: "You don't have any pending leave requests."
      };
    }

    let message = `You have ${pendingLeaves.length} pending leave ${pendingLeaves.length === 1 ? 'request' : 'requests'}:\n\n`;
    
    pendingLeaves.forEach((leave, index) => {
      message += `${index + 1}. ${leave.leaveType} from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()}\n`;
    });

    return {
      success: true,
      message,
      data: pendingLeaves
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve leave information.'
    };
  }
}

async function handleViewTasks(userId) {
  try {
    const tasks = await Task.find({
      assignedTo: userId,
      status: { $in: ['pending', 'in-progress'] }
    }).sort({ dueDate: 1 }).limit(5);

    if (tasks.length === 0) {
      return {
        success: true,
        message: "You don't have any pending tasks. Great job!"
      };
    }

    let message = `You have ${tasks.length} pending ${tasks.length === 1 ? 'task' : 'tasks'}:\n\n`;
    
    tasks.forEach((task, index) => {
      const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
      message += `${index + 1}. ${task.title} - Due: ${dueDate} (${task.status})\n`;
    });

    return {
      success: true,
      message,
      data: tasks
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to retrieve task information.'
    };
  }
}
