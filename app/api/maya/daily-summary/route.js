import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';


export const dynamic = 'force-dynamic'

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

    const user = await User.findById(userId).select('employeeId email');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get user's name from Employee record
    let userName = 'there';
    if (user.employeeId) {
      const employee = await Employee.findById(user.employeeId).select('firstName lastName');
      if (employee) {
        userName = employee.firstName || 'there';
      }
    } else {
      // Fallback: try to get name from email
      userName = user.email?.split('@')[0] || 'there';
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch user's data for today
    const [attendance, pendingLeaves] = await Promise.all([
      Attendance.findOne({ 
        userId, 
        date: { $gte: today, $lt: tomorrow } 
      }),
      Leave.countDocuments({ 
        userId, 
        status: 'pending' 
      })
    ]);

    // Generate personalized greeting
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';

    let message = `${greeting}, ${userName}! `;

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

    message += `How can I assist you?`;

    return NextResponse.json({
      success: true,
      data: {
        message,
        stats: {
          checkedIn: !!attendance,
          pendingLeaves
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
