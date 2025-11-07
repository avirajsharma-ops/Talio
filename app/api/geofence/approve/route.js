import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import GeofenceLog from '@/models/GeofenceLog'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { sendPushNotification } from '@/lib/pushNotifications'
import { getIO } from '@/lib/socket'

// POST - Approve or reject out-of-premises request
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { logId, action, comments } = await request.json()

    if (!logId || !action) {
      return NextResponse.json(
        { success: false, message: 'Log ID and action are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Must be "approved" or "rejected"' },
        { status: 400 }
      )
    }

    // Get user and employee data
    const user = await User.findById(decoded.userId).populate('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    const reviewer = await Employee.findById(user.employeeId)

    // Get the geofence log
    const log = await GeofenceLog.findById(logId)
      .populate('employee', 'firstName lastName')
      .populate('user')

    if (!log) {
      return NextResponse.json(
        { success: false, message: 'Geofence log not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to approve/reject
    // Only managers, department heads, admin, and HR can approve
    const canApprove = 
      decoded.role === 'admin' ||
      decoded.role === 'hr' ||
      (decoded.role === 'manager' && log.reportingManager?.toString() === reviewer._id.toString())

    if (!canApprove) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to approve/reject this request' },
        { status: 403 }
      )
    }

    // Update the log
    log.outOfPremisesRequest.status = action
    log.outOfPremisesRequest.reviewedBy = reviewer._id
    log.outOfPremisesRequest.reviewedAt = new Date()
    log.outOfPremisesRequest.reviewerComments = comments || ''

    await log.save()

    // Send notification to employee
    try {
      const employeeUser = log.user
      if (employeeUser) {
        const notificationData = {
          title: `Out-of-Premises Request ${action === 'approved' ? 'Approved ✅' : 'Rejected ❌'}`,
          body: `Your request to be outside office premises has been ${action} by ${reviewer.firstName} ${reviewer.lastName}`,
          url: '/dashboard/geofence',
          data: {
            type: 'geofence_approval',
            logId: log._id.toString(),
            action,
          }
        }

        // Send push notification
        await sendPushNotification({
          userIds: [employeeUser._id.toString()],
          ...notificationData,
          adminToken: token,
        })

        // Send Socket.IO event for real-time notification
        try {
          const io = getIO()
          if (io) {
            io.to(`user:${employeeUser._id.toString()}`).emit('geofence-approval', {
              action,
              log: {
                _id: log._id,
                reason: log.outOfPremisesRequest.reason,
                status: action,
                reviewedBy: {
                  firstName: reviewer.firstName,
                  lastName: reviewer.lastName
                },
                reviewedAt: log.outOfPremisesRequest.reviewedAt,
                reviewerComments: log.outOfPremisesRequest.reviewerComments
              },
              notification: notificationData
            })
            console.log(`[Socket.IO] Sent geofence-approval event to user:${employeeUser._id}`)
          }
        } catch (socketError) {
          console.error('Failed to send Socket.IO event:', socketError)
        }
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: `Request ${action} successfully`,
      data: log
    })

  } catch (error) {
    console.error('Approve geofence request error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    )
  }
}

