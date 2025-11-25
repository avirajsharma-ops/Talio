import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { sendAnnouncementNotification } from '@/lib/notificationService'
import jwt from 'jsonwebtoken'

// GET - List announcements
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10
    const status = searchParams.get('status') || 'published'

    // Get user info from token to filter department announcements
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    let userDepartment = null

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const employee = await Employee.findOne({ userId: decoded.userId }).select('department')
        if (employee) {
          userDepartment = employee.department
        }
      } catch (err) {
        console.error('Token verification error:', err)
      }
    }

    const query = { status }

    // Only show non-expired announcements
    const now = new Date()
    query.$or = [
      { expiryDate: { $exists: false } },
      { expiryDate: null },
      { expiryDate: { $gte: now } }
    ]

    const announcements = await Announcement.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('departments', 'name')
      .sort({ publishDate: -1 })
      .limit(limit)

    // Filter announcements based on user's department
    const filteredAnnouncements = announcements.filter(announcement => {
      // Show all company-wide announcements
      if (!announcement.isDepartmentAnnouncement) return true

      // Show department announcements only to users in that department
      if (announcement.isDepartmentAnnouncement && userDepartment) {
        return announcement.departments.some(dept => dept._id.toString() === userDepartment.toString())
      }

      return false
    })

    return NextResponse.json({
      success: true,
      data: filteredAnnouncements,
    })
  } catch (error) {
    console.error('Get announcements error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch announcements' },
      { status: 500 }
    )
  }
}

// POST - Create announcement
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Get user info from token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    let creatorRole = null
    let creatorDepartment = null
    let creatorEmployeeId = null

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('role')
        const employee = await Employee.findOne({ userId: decoded.userId }).select('_id department isDepartmentHead')

        if (user) {
          creatorRole = user.role
        }

        if (employee) {
          creatorEmployeeId = employee._id
          creatorDepartment = employee.department

          // If user is department head, set department-specific fields
          if (employee.isDepartmentHead) {
            data.isDepartmentAnnouncement = true
            data.departments = [creatorDepartment]
            data.targetAudience = 'department'
          }

          // If user is manager, set team-specific fields
          if (user.role === 'manager') {
            data.isDepartmentAnnouncement = true
            data.targetAudience = 'department'
            // Department should already be set from frontend, but ensure it's set
            if (!data.departments || data.departments.length === 0) {
              data.departments = [creatorDepartment]
            }
          }
        }
      } catch (err) {
        console.error('Token verification error:', err)
      }
    }

    // Add creator role to announcement
    if (creatorRole) {
      data.createdByRole = creatorRole
    }

    const announcement = await Announcement.create(data)

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'firstName lastName')
      .populate('departments', 'name')

    // Send push notification to targeted users and emit Socket.IO event
    try {
      let targetUsers = []

      // Check if this is a manager announcement (sent to direct reports only)
      if (creatorRole === 'manager' && creatorEmployeeId) {
        // Send to manager's direct reports only
        const directReports = await Employee.find({
          reportingManager: creatorEmployeeId,
          status: 'active'
        }).select('userId')

        const userIds = directReports.map(emp => emp.userId).filter(Boolean)
        targetUsers = await User.find({
          _id: { $in: userIds }
        }).select('_id')
      } else if (announcement.isDepartmentAnnouncement && announcement.departments.length > 0) {
        // Send to department members only (for department heads)
        const deptEmployees = await Employee.find({
          department: { $in: announcement.departments },
          status: 'active'
        }).select('userId')

        const userIds = deptEmployees.map(emp => emp.userId).filter(Boolean)
        targetUsers = await User.find({
          _id: { $in: userIds },
          role: { $in: ['employee', 'manager', 'hr', 'admin', 'department_head'] }
        }).select('_id')
      } else {
        // Send to all users (for admin/hr)
        targetUsers = await User.find({
          role: { $in: ['employee', 'manager', 'hr', 'admin', 'department_head'] }
        }).select('_id')
      }

      const userIds = targetUsers.map(u => u._id.toString())

      if (userIds.length > 0) {
        // Get creator user ID
        const creatorEmployee = await Employee.findById(data.createdBy).select('userId')
        const creatorUserId = creatorEmployee?.userId

        // Send Firebase notification
        await sendAnnouncementNotification({
          announcementId: announcement._id.toString(),
          title: announcement.title,
          content: announcement.content,
          targetUserIds: userIds,
          createdBy: creatorUserId
        })

        // Emit Socket.IO event for real-time notification
        try {
          const io = global.io
          if (io) {
            const creator = await Employee.findById(data.createdBy).select('firstName lastName')
            const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Admin'

            userIds.forEach(userId => {
              io.to(`user:${userId}`).emit('new-announcement', {
                _id: announcement._id.toString(),
                title: announcement.title,
                content: announcement.content,
                priority: announcement.priority || 'normal',
                createdBy: creatorName
              })
            })
            console.log(`Socket.IO announcement event emitted to ${userIds.length} user(s)`)
          }
        } catch (socketError) {
          console.error('Failed to emit Socket.IO announcement event:', socketError)
        }

        console.log(`Firebase announcement notification sent to ${userIds.length} user(s)`)
      }
    } catch (notifError) {
      console.error('Failed to send announcement notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement created successfully',
      data: populatedAnnouncement,
    }, { status: 201 })
  } catch (error) {
    console.error('Create announcement error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create announcement' },
      { status: 500 }
    )
  }
}

