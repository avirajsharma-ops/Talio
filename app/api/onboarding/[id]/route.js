import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Onboarding from '@/models/Onboarding'

// PUT - Update onboarding
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const onboarding = await Onboarding.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('assignedTo', 'firstName lastName')

    if (!onboarding) {
      return NextResponse.json(
        { success: false, message: 'Onboarding record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding updated successfully',
      data: onboarding,
    })
  } catch (error) {
    console.error('Update onboarding error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update onboarding' },
      { status: 500 }
    )
  }
}

// DELETE - Delete onboarding
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const onboarding = await Onboarding.findByIdAndDelete(params.id)

    if (!onboarding) {
      return NextResponse.json(
        { success: false, message: 'Onboarding record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding deleted successfully',
    })
  } catch (error) {
    console.error('Delete onboarding error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete onboarding' },
      { status: 500 }
    )
  }
}

