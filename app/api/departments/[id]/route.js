import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'

// GET - Get single department
export async function GET(request, { params }) {
  try {
    await connectDB()

    const department = await Department.findById(params.id)
      .populate('head', 'firstName lastName')

    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Department not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: department,
    })
  } catch (error) {
    console.error('Get department error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch department' },
      { status: 500 }
    )
  }
}

// PUT - Update department
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const department = await Department.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    ).populate('head', 'firstName lastName')

    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Department not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Department updated successfully',
      data: department,
    })
  } catch (error) {
    console.error('Update department error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update department' },
      { status: 500 }
    )
  }
}

// DELETE - Delete department
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const department = await Department.findByIdAndDelete(params.id)

    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Department not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    })
  } catch (error) {
    console.error('Delete department error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete department' },
      { status: 500 }
    )
  }
}

