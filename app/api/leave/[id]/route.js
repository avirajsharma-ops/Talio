import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Leave from '@/models/Leave'
import LeaveBalance from '@/models/LeaveBalance'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { sendLeaveApprovedNotification, sendLeaveRejectedNotification } from '@/lib/notificationService'

// PUT - Update leave status (Approve/Reject)
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()
    const { status, approvedBy, rejectionReason } = data

    const leave = await Leave.findById(params.id)
    if (!leave) {
      return NextResponse.json(
        { success: false, message: 'Leave request not found' },
        { status: 404 }
      )
    }

    if (leave.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Leave request already processed' },
        { status: 400 }
      )
    }

    leave.status = status
    leave.approvedBy = approvedBy
    leave.approvalDate = new Date()

    if (status === 'rejected') {
      leave.rejectionReason = rejectionReason
    }

    if (status === 'approved') {
      // Deduct from leave balance
      const leaveBalance = await LeaveBalance.findOne({
        employee: leave.employee,
        leaveType: leave.leaveType,
      })

      if (leaveBalance) {
        leaveBalance.used += leave.numberOfDays
        leaveBalance.available -= leave.numberOfDays
        await leaveBalance.save()
      }
    }

    await leave.save()

    const populatedLeave = await Leave.findById(leave._id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('leaveType', 'name')
      .populate('approvedBy', 'firstName lastName')

    // Send notification to employee
    try {
      const employee = await Employee.findById(leave.employee).select('userId')
      const employeeUserId = employee?.userId

      if (employeeUserId) {
        const leaveTypeName = populatedLeave.leaveType?.name || 'Leave'
        const startDate = new Date(leave.startDate).toLocaleDateString()
        const endDate = new Date(leave.endDate).toLocaleDateString()

        if (status === 'approved') {
          await sendLeaveApprovedNotification({
            leaveId: leave._id.toString(),
            employeeId: employeeUserId,
            leaveType: leaveTypeName,
            startDate,
            endDate,
            approvedBy: approvedBy
          })
        } else if (status === 'rejected') {
          await sendLeaveRejectedNotification({
            leaveId: leave._id.toString(),
            employeeId: employeeUserId,
            leaveType: leaveTypeName,
            startDate,
            endDate,
            rejectedBy: approvedBy,
            reason: rejectionReason
          })
        }
      }
    } catch (notifError) {
      console.error('Failed to send leave status notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${status} successfully`,
      data: populatedLeave,
    })
  } catch (error) {
    console.error('Update leave error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update leave' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel leave request
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const leave = await Leave.findById(params.id)
    if (!leave) {
      return NextResponse.json(
        { success: false, message: 'Leave request not found' },
        { status: 404 }
      )
    }

    if (leave.status === 'approved') {
      // Restore leave balance
      const leaveBalance = await LeaveBalance.findOne({
        employee: leave.employee,
        leaveType: leave.leaveType,
      })

      if (leaveBalance) {
        leaveBalance.used -= leave.numberOfDays
        leaveBalance.available += leave.numberOfDays
        await leaveBalance.save()
      }
    }

    await Leave.findByIdAndDelete(params.id)

    return NextResponse.json({
      success: true,
      message: 'Leave request cancelled successfully',
    })
  } catch (error) {
    console.error('Delete leave error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to cancel leave request' },
      { status: 500 }
    )
  }
}

