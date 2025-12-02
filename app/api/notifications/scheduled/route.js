import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import ScheduledNotification from '@/models/ScheduledNotification'
import Employee from '@/models/Employee'
import User from '@/models/User'

// GET - List scheduled notifications
export async function GET(request) {
  try {
    await connectDB()

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload: decoded } = await jwtVerify(token, secret)

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'sent', 'cancelled', 'failed'

    // Get current user employee
    const currentUser = await User.findById(decoded.userId).populate('employeeId')
    let currentEmployee = null
    if (currentUser && currentUser.employeeId) {
      currentEmployee = await Employee.findById(currentUser.employeeId)
    }

    const isDeptHead = decoded.role === 'department_head' || currentEmployee?.isDepartmentHead

    // Check if user has permission
    if (!['admin', 'hr', 'god_admin'].includes(decoded.role) && !isDeptHead) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to view scheduled notifications' },
        { status: 403 }
      )
    }

    // Build query based on role
    let query = {}
    
    // Add status filter if provided
    if (status) {
      query.status = status
    }
    
    if (isDeptHead && !['admin', 'hr', 'god_admin'].includes(decoded.role) && currentEmployee) {
      // Department heads can only see their own scheduled notifications
      query.createdBy = currentEmployee._id
    } else if (decoded.role === 'hr' && currentEmployee) {
      // HR can see their own and department-specific notifications
      query.$or = [
        { createdBy: currentEmployee._id },
        { targetDepartment: currentEmployee.department }
      ]
    }
    // Admin can see all (no role-based filter)

    const notifications = await ScheduledNotification.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('targetDepartment', 'name')
      .sort({ scheduledFor: status === 'sent' ? -1 : 1 }) // Sent: most recent first; Others: soonest first

    return NextResponse.json({
      success: true,
      data: notifications
    })
  } catch (error) {
    console.error('Get scheduled notifications error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch scheduled notifications' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel scheduled notification
export async function DELETE(request) {
  try {
    await connectDB()

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload: decoded } = await jwtVerify(token, secret)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Notification ID is required' },
        { status: 400 }
      )
    }

    const notification = await ScheduledNotification.findById(id)
    
    if (!notification) {
      return NextResponse.json(
        { success: false, message: 'Notification not found' },
        { status: 404 }
      )
    }

    // Check permission
    const currentUser = await User.findById(decoded.userId).populate('employeeId')
    const currentEmployee = await Employee.findById(currentUser.employeeId)

    if (decoded.role === 'department_head' && notification.createdBy.toString() !== currentEmployee._id.toString()) {
      return NextResponse.json(
        { success: false, message: 'You can only cancel your own scheduled notifications' },
        { status: 403 }
      )
    }

    // Update status to cancelled
    notification.status = 'cancelled'
    await notification.save()

    return NextResponse.json({
      success: true,
      message: 'Scheduled notification cancelled successfully'
    })
  } catch (error) {
    console.error('Cancel scheduled notification error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to cancel scheduled notification' },
      { status: 500 }
    )
  }
}

