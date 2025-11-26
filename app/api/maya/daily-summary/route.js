import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Task from '@/models/Task';
import Leave from '@/models/Leave';
import Attendance from '@/models/Attendance';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * GET /api/maya/daily-summary
 * Get daily summary based on user role
 */
export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.payload.userId;

    const user = await User.findById(userId).populate('employeeId');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const employee = user.employeeId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let summary = {};
    const userName = employee ? employee.firstName : user.email.split('@')[0];

    if (['employee', 'manager'].includes(user.role)) {
      // Employee summary: Today's tasks
      const tasks = await Task.find({
        assignedTo: employee?._id,
        $or: [
          { dueDate: { $gte: today, $lt: tomorrow } },
          { status: { $in: ['pending', 'in_progress'] } }
        ]
      }).limit(10).lean();

      const pendingTasks = tasks.filter(t => t.status === 'pending').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
      const dueTodayTasks = tasks.filter(t => {
        const due = new Date(t.dueDate);
        return due >= today && due < tomorrow;
      });

      summary = {
        type: 'employee',
        userName,
        greeting: getGreeting(),
        tasks: {
          pending: pendingTasks,
          inProgress: inProgressTasks,
          dueToday: dueTodayTasks.length,
          dueTodayList: dueTodayTasks.slice(0, 3).map(t => t.title)
        },
        message: generateEmployeeMessage(userName, pendingTasks, inProgressTasks, dueTodayTasks.length)
      };
    } else {
      // Admin/Department Head: KPI summary
      const departmentFilter = user.role === 'department_head' && employee?.department
        ? { department: employee.department }
        : {};

      const totalEmployees = await Employee.countDocuments({ ...departmentFilter, status: 'active' });
      const todayAttendance = await Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        ...departmentFilter
      });
      const pendingLeaves = await Leave.countDocuments({ status: 'pending', ...departmentFilter });
      const pendingTasksCount = await Task.countDocuments({ status: 'pending', ...departmentFilter });

      const attendanceRate = totalEmployees > 0 ? Math.round((todayAttendance / totalEmployees) * 100) : 0;

      summary = {
        type: 'admin',
        userName,
        greeting: getGreeting(),
        kpis: {
          totalEmployees,
          presentToday: todayAttendance,
          attendanceRate,
          pendingLeaves,
          pendingTasks: pendingTasksCount
        },
        message: generateAdminMessage(userName, totalEmployees, attendanceRate, pendingLeaves, pendingTasksCount)
      };
    }

    return NextResponse.json({ success: true, data: summary });

  } catch (error) {
    console.error('Daily summary error:', error);
    return NextResponse.json({ error: 'Failed to get daily summary' }, { status: 500 });
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function generateEmployeeMessage(name, pending, inProgress, dueToday) {
  const greeting = getGreeting();
  let msg = `${greeting}, ${name}! `;
  
  if (dueToday > 0) {
    msg += `You have ${dueToday} task${dueToday > 1 ? 's' : ''} due today. `;
  }
  if (pending > 0) {
    msg += `${pending} pending task${pending > 1 ? 's' : ''} awaiting your attention. `;
  }
  if (inProgress > 0) {
    msg += `${inProgress} task${inProgress > 1 ? 's are' : ' is'} in progress. `;
  }
  if (pending === 0 && dueToday === 0 && inProgress === 0) {
    msg += "You're all caught up! Great job keeping on top of things.";
  } else {
    msg += "Let's make today productive!";
  }
  return msg;
}

function generateAdminMessage(name, total, attendance, leaves, tasks) {
  const greeting = getGreeting();
  let msg = `${greeting}, ${name}! Here's your team overview: `;
  msg += `${attendance}% attendance rate today with ${total} team members. `;
  if (leaves > 0) msg += `${leaves} leave request${leaves > 1 ? 's' : ''} pending approval. `;
  if (tasks > 0) msg += `${tasks} task${tasks > 1 ? 's' : ''} need attention. `;
  msg += "Have a productive day!";
  return msg;
}

