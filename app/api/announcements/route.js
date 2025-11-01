import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'

// GET - List announcements
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit')) || 10
    const status = searchParams.get('status') || 'published'

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
      .sort({ publishDate: -1 })
      .limit(limit)

    return NextResponse.json({
      success: true,
      data: announcements,
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

    const announcement = await Announcement.create(data)

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('createdBy', 'firstName lastName')

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

