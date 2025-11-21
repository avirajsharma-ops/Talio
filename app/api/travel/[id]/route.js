import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Travel from '@/models/Travel'

// PUT - Update/Approve travel
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const travel = await Travel.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')

    if (!travel) {
      return NextResponse.json(
        { success: false, message: 'Travel request not found' },
        { status: 404 }
      )
    }

    // Emit Socket.IO event for realtime notification with sound
    try {
      if (data.status && (data.status === 'approved' || data.status === 'rejected')) {
        const Employee = require('@/models/Employee').default
        const employeeDoc = await Employee.findById(travel.employee._id || travel.employee).select('userId')
        const employeeUserId = employeeDoc?.userId

        if (employeeUserId) {
          const io = global.io
          if (io) {
            io.to(`user:${employeeUserId}`).emit('travel-status-update', {
              travel,
              action: data.status,
              message: `Your travel request to ${travel.destination} has been ${data.status}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Travel status update sent to user:${employeeUserId}`)
          }

          // Send FCM push notification
          try {
            const { sendPushToUser } = require('@/lib/pushNotification')
            const icon = data.status === 'approved' ? '✅' : '❌'
            await sendPushToUser(
              employeeUserId,
              {
                title: `${icon} Travel ${data.status === 'approved' ? 'Approved' : 'Rejected'}`,
                body: `Your travel request to ${travel.destination} has been ${data.status}`,
              },
              {
                clickAction: '/dashboard/travel',
                eventType: 'travel_status',
                data: {
                  travelId: travel._id.toString(),
                  status: data.status,
                  type: 'travel_status_update'
                }
              }
            )
            console.log(`📲 [FCM] Travel notification sent to user:${employeeUserId}`)
          } catch (fcmError) {
            console.error('Failed to send travel FCM notification:', fcmError)
          }
        }
      }
    } catch (socketError) {
      console.error('Failed to send travel socket notification:', socketError)
    }

    return NextResponse.json({
      success: true,
      message: 'Travel request updated successfully',
      data: travel,
    })
  } catch (error) {
    console.error('Update travel error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update travel request' },
      { status: 500 }
    )
  }
}

// DELETE - Delete travel
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const travel = await Travel.findByIdAndDelete(params.id)

    if (!travel) {
      return NextResponse.json(
        { success: false, message: 'Travel request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Travel request deleted successfully',
    })
  } catch (error) {
    console.error('Delete travel error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete travel request' },
      { status: 500 }
    )
  }
}

