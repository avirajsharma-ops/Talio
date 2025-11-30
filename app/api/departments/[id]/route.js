import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'

// GET - Get single department
export async function GET(request, { params }) {
  try {
    await connectDB()

    const department = await Department.findById(params.id)
      .populate('head', 'firstName lastName employeeCode designation')
      .populate('heads', 'firstName lastName employeeCode designation')

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
    
    // Handle multiple heads - ensure backwards compatibility
    if (data.heads && data.heads.length > 0) {
      // Set the first head as the legacy 'head' field for backwards compatibility
      data.head = data.heads[0]
    } else if (data.head && !data.heads) {
      // If only single head provided, also add to heads array
      data.heads = [data.head]
    }

    const department = await Department.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('head', 'firstName lastName employeeCode designation')
      .populate('heads', 'firstName lastName employeeCode designation')

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

