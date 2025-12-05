import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Company from '@/models/Company'
import { verifyToken } from '@/lib/auth'

// GET - Get single company
export async function GET(request, { params }) {
  try {
    await connectDB()

    const company = await Company.findById(params.id)
      .populate('createdBy', 'email')
      .lean()

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: company,
    })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch company' },
      { status: 500 }
    )
  }
}

// PUT - Update company
export async function PUT(request, { params }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check role - only admin, hr, or god_admin can update companies
    const allowedRoles = ['god_admin', 'admin', 'hr']
    if (!allowedRoles.includes(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update companies' },
        { status: 403 }
      )
    }

    await connectDB()

    const data = await request.json()
    
    // Check if company exists
    const existingCompany = await Company.findById(params.id)
    if (!existingCompany) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      )
    }

    // Check if name or code conflicts with another company
    if (data.name || data.code) {
      const conflictingCompany = await Company.findOne({
        _id: { $ne: params.id },
        $or: [
          ...(data.name ? [{ name: data.name }] : []),
          ...(data.code ? [{ code: data.code.toUpperCase() }] : [])
        ]
      })

      if (conflictingCompany) {
        return NextResponse.json(
          { success: false, message: 'Another company with this name or code already exists' },
          { status: 400 }
        )
      }
    }

    // Update company
    const updateData = {}
    if (data.name) updateData.name = data.name.trim()
    if (data.code) updateData.code = data.code.trim().toUpperCase()
    if (data.description !== undefined) updateData.description = data.description.trim()
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    const company = await Company.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update company' },
      { status: 500 }
    )
  }
}

// DELETE - Delete company
export async function DELETE(request, { params }) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check role - only admin, hr, or god_admin can delete companies
    const allowedRoles = ['god_admin', 'admin', 'hr']
    if (!allowedRoles.includes(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to delete companies' },
        { status: 403 }
      )
    }

    await connectDB()

    // Soft delete by setting isActive to false
    const company = await Company.findByIdAndUpdate(
      params.id,
      { isActive: false },
      { new: true }
    )

    if (!company) {
      return NextResponse.json(
        { success: false, message: 'Company not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Company deleted successfully',
    })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete company' },
      { status: 500 }
    )
  }
}
