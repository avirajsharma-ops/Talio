import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Asset from '@/models/Asset'

// PUT - Update asset
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const asset = await Asset.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'firstName lastName employeeCode')

    if (!asset) {
      return NextResponse.json(
        { success: false, message: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    })
  } catch (error) {
    console.error('Update asset error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update asset' },
      { status: 500 }
    )
  }
}

// DELETE - Delete asset
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const asset = await Asset.findByIdAndDelete(params.id)

    if (!asset) {
      return NextResponse.json(
        { success: false, message: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    })
  } catch (error) {
    console.error('Delete asset error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}

