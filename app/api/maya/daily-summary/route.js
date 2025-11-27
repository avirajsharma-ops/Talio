import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import Task from '@/models/Task';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

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
    await connectDB();

    const user = await User.findById(userId).select('name');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch user's data for today
    const [attendance, pendingLeaves, todayTasks] = await Promise.all([
      Attendance.findOne({ 
        userId, 
        date: { $gte: today, $lt: tomorrow } 
      }),
      Leave.countDocuments({ 
        userId, 
        status: 'pending' 
      }),
      Task.countDocuments({ 
        assignedTo: userId, 
        status: { $in: ['pending', 'in-progress'] },
        dueDate: { $gte: today, $lt: tomorrow }
      })
    ]);

    // Generate personalized greeting
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';

    let message = `${greeting}, ${user.name}! `;

    // Add attendance status
    if (attendance) {
      message += `You've already checked in today. `;
    } else {
      message += `Don't forget to check in for today. `;
    }

    // Add pending leaves info
    if (pendingLeaves > 0) {
      message += `You have ${pendingLeaves} pending leave ${pendingLeaves === 1 ? 'request' : 'requests'}. `;
    }

    // Add tasks info
    if (todayTasks > 0) {
      message += `You have ${todayTasks} ${todayTasks === 1 ? 'task' : 'tasks'} due today. `;
    } else {
      message += `No tasks due today. `;
    }

    message += `How can I assist you?`;

    return NextResponse.json({
      success: true,
      data: {
        message,
        stats: {
          checkedIn: !!attendance,
          pendingLeaves,
          todayTasks
        }
      }
    });

  } catch (error) {
    console.error('MAYA Daily Summary Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to generate daily summary' 
    }, { status: 500 });
  }
}
