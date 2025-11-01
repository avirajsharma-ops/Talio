import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Leave from '@/models/Leave'
import LeaveBalance from '@/models/LeaveBalance'
import LeaveType from '@/models/LeaveType'

// GET - List leave requests
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const query = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (status) {
      query.status = status
    }

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('leaveType', 'name')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: leaves,
    })
  } catch (error) {
    console.error('Get leaves error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaves' },
      { status: 500 }
    )
  }
}

// POST - Apply for leave
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Calculate number of days
    const startDate = new Date(data.startDate)
    const endDate = new Date(data.endDate)
    const diffTime = Math.abs(endDate - startDate)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

    // Check leave balance
    const leaveBalance = await LeaveBalance.findOne({
      employee: data.employee,
      leaveType: data.leaveType,
    })

    if (!leaveBalance || leaveBalance.available < diffDays) {
      return NextResponse.json(
        { success: false, message: 'Insufficient leave balance' },
        { status: 400 }
      )
    }

    // Create leave request
    const leave = await Leave.create({
      ...data,
      numberOfDays: diffDays,
      status: 'pending',
    })

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('leaveType', 'name')

    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: populatedLeave,
    }, { status: 201 })
  } catch (error) {
    console.error('Apply leave error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to apply for leave' },
      { status: 500 }
    )
  }
}

