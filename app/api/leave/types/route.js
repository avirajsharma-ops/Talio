import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import LeaveType from '@/models/LeaveType'

// GET - List all leave types
export async function GET(request) {
  try {
    await connectDB()

    const leaveTypes = await LeaveType.find({ isActive: true })
      .sort({ name: 1 })

    return NextResponse.json({
      success: true,
      data: leaveTypes,
    })
  } catch (error) {
    console.error('Get leave types error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leave types' },
      { status: 500 }
    )
  }
}

// POST - Create leave type
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const leaveType = await LeaveType.create(data)

    return NextResponse.json({
      success: true,
      message: 'Leave type created successfully',
      data: leaveType,
    }, { status: 201 })
  } catch (error) {
    console.error('Create leave type error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create leave type' },
      { status: 500 }
    )
  }
}

