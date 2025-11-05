import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { sendAnnouncementNotification } from '@/lib/pushNotifications'
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

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.userId).select('role')
        const employee = await Employee.findOne({ userId: decoded.userId }).select('department isDepartmentHead')

        if (user) {
          creatorRole = user.role
        }

        if (employee) {
          creatorDepartment = employee.department

          // If user is department head, set department-specific fields
          if (employee.isDepartmentHead) {
            data.isDepartmentAnnouncement = true
            data.departments = [creatorDepartment]
            data.targetAudience = 'department'
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

    // Send push notification to targeted users
    try {
      let targetUsers = []

      if (announcement.isDepartmentAnnouncement && announcement.departments.length > 0) {
        // Send to department members only
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
        // Send to all users
        targetUsers = await User.find({
          role: { $in: ['employee', 'manager', 'hr', 'admin', 'department_head'] }
        }).select('_id')
      }

      const userIds = targetUsers.map(u => u._id.toString())

      if (userIds.length > 0) {
        const creator = await Employee.findById(data.createdBy).select('firstName lastName')
        const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Admin'

        await sendAnnouncementNotification(
          {
            _id: announcement._id,
            title: announcement.title,
            content: announcement.content,
            priority: announcement.priority || 'normal'
          },
          userIds,
          creatorName,
          null // No token needed for system notifications
        )

        console.log(`Announcement notification sent to ${userIds.length} user(s)`)
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

