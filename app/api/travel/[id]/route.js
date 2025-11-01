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

