import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Leave from '@/models/Leave'
import LeaveBalance from '@/models/LeaveBalance'

// PUT - Approve or reject leave request
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const { id } = params
    const { action, reason, approvedBy } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be approve or reject' },
        { status: 400 }
      )
    }

    // Find the leave request
    const leaveRequest = await Leave.findById(id)
    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, message: 'Leave request not found' },
        { status: 404 }
      )
    }

    if (leaveRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Leave request has already been processed' },
        { status: 400 }
      )
    }

    // Update leave request status
    const updateData = {
      status: action === 'approve' ? 'approved' : 'rejected',
      approvedBy,
      approvedDate: new Date(),
    }

    if (action === 'reject') {
      updateData.rejectionReason = reason
    } else if (reason) {
      updateData.approvalComments = reason
    }

    // If approving, update leave balance
    if (action === 'approve') {
      const leaveBalance = await LeaveBalance.findOne({
        employee: leaveRequest.employee,
        leaveType: leaveRequest.leaveType,
        year: new Date(leaveRequest.startDate).getFullYear(),
      })

      if (leaveBalance) {
        // Check if there's sufficient balance
        if (leaveBalance.remainingDays < leaveRequest.numberOfDays) {
          return NextResponse.json(
            { success: false, message: 'Insufficient leave balance' },
            { status: 400 }
          )
        }

        // Update leave balance
        leaveBalance.usedDays += leaveRequest.numberOfDays
        leaveBalance.remainingDays -= leaveRequest.numberOfDays
        await leaveBalance.save()
      }
    }

    // Update the leave request
    const updatedLeave = await Leave.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('leaveType', 'name code')
      .populate('approvedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: `Leave request ${action}d successfully`,
      data: updatedLeave,
    })
  } catch (error) {
    console.error('Leave action error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process leave request' },
      { status: 500 }
    )
  }
}
