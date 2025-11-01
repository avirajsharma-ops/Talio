import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Document from '@/models/Document'

// GET - Get single document
export async function GET(request, { params }) {
  try {
    await connectDB()

    const document = await Document.findById(params.id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('uploadedBy', 'firstName lastName')

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: document,
    })
  } catch (error) {
    console.error('Get document error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

// PUT - Update document
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const document = await Document.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('uploadedBy', 'firstName lastName')

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document updated successfully',
      data: document,
    })
  } catch (error) {
    console.error('Update document error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update document' },
      { status: 500 }
    )
  }
}

// DELETE - Delete document
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const document = await Document.findByIdAndDelete(params.id)

    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

