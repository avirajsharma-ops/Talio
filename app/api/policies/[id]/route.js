import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Policy from '@/models/Policy'

// PUT - Update policy
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const policy = await Policy.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Policy updated successfully',
      data: policy,
    })
  } catch (error) {
    console.error('Update policy error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update policy' },
      { status: 500 }
    )
  }
}

// DELETE - Delete policy
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const policy = await Policy.findByIdAndDelete(params.id)

    if (!policy) {
      return NextResponse.json(
        { success: false, message: 'Policy not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Policy deleted successfully',
    })
  } catch (error) {
    console.error('Delete policy error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete policy' },
      { status: 500 }
    )
  }
}

