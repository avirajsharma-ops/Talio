import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Announcement from '@/models/Announcement'

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

