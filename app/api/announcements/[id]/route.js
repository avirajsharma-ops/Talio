import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'
import User from '@/models/User'
import { sendOneSignalNotification } from '@/lib/onesignal'

// PUT - Update announcement
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const announcement = await Announcement.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Send push notification about announcement update
    try {
      const allUsers = await User.find({ role: { $in: ['employee', 'manager', 'hr', 'admin', 'department_head'] } }).select('_id')
      const userIds = allUsers.map(u => u._id.toString())

      if (userIds.length > 0) {
        await sendOneSignalNotification({
          userIds,
          title: '📢 Announcement Updated',
          message: announcement.title,
          url: '/dashboard/announcements',
          data: {
            type: 'announcement_update',
            announcementId: announcement._id.toString()
          }
        })

        console.log(`Announcement update notification sent to ${userIds.length} user(s)`)
      }
    } catch (notifError) {
      console.error('Failed to send announcement update notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement updated successfully',
      data: announcement,
    })
  } catch (error) {
    console.error('Update announcement error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update announcement' },
      { status: 500 }
    )
  }
}

// DELETE - Delete announcement
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const announcement = await Announcement.findByIdAndDelete(params.id)

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: 'Announcement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully',
    })
  } catch (error) {
    console.error('Delete announcement error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete announcement' },
      { status: 500 }
    )
  }
}

