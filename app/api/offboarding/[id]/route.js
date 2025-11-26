import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Offboarding from '@/models/Offboarding'

// PUT - Update offboarding
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const offboarding = await Offboarding.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('exitInterviewBy', 'firstName lastName')

    if (!offboarding) {
      return NextResponse.json(
        { success: false, message: 'Offboarding record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Offboarding updated successfully',
      data: offboarding,
    })
  } catch (error) {
    console.error('Update offboarding error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update offboarding' },
      { status: 500 }
    )
  }
}

// DELETE - Delete offboarding
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const offboarding = await Offboarding.findByIdAndDelete(params.id)

    if (!offboarding) {
      return NextResponse.json(
        { success: false, message: 'Offboarding record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Offboarding deleted successfully',
    })
  } catch (error) {
    console.error('Delete offboarding error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete offboarding' },
      { status: 500 }
    )
  }
}

