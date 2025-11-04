import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Performance from '@/models/Performance'
import Employee from '@/models/Employee'

// GET - Fetch single performance review
export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { id } = params

    const review = await Performance.findById(id)
      .populate('employee', 'firstName lastName employeeCode email department')
      .populate('reviewer', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')
      .lean()

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
    }

    // Check permissions
    if (decoded.role === 'employee' && review.employee._id.toString() !== decoded.employeeId) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: review
    })

  } catch (error) {
    console.error('Get performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update performance review
export async function PUT(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin, hr, and managers can update reviews
    if (!['admin', 'hr', 'manager'].includes(decoded.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    await connectDB()

    const { id } = params
    const body = await request.json()

    const review = await Performance.findById(id)

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
    }

    // Update allowed fields
    const allowedFields = [
      'reviewType',
      'reviewPeriodStart',
      'reviewPeriodEnd',
      'overallRating',
      'strengths',
      'areasOfImprovement',
      'goals',
      'kras',
      'kpis',
      'competencies',
      'trainingRecommendations',
      'employeeComments',
      'managerComments',
      'status'
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        review[field] = body[field]
      }
    })

    await review.save()

    const updatedReview = await Performance.findById(id)
      .populate('employee', 'firstName lastName employeeCode email')
      .populate('reviewer', 'firstName lastName employeeCode')
      .lean()

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    })

  } catch (error) {
    console.error('Update performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete performance review
export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin and hr can delete reviews
    if (!['admin', 'hr'].includes(decoded.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    await connectDB()

    const { id } = params

    const review = await Performance.findById(id)

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
    }

    await Performance.findByIdAndDelete(id)

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('Delete performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Partial update (for status changes, approvals, etc.)
export async function PATCH(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { id } = params
    const body = await request.json()
    const { action, ...updateData } = body

    const review = await Performance.findById(id)

    if (!review) {
      return NextResponse.json({ success: false, message: 'Review not found' }, { status: 404 })
    }

    // Handle different actions
    if (action === 'approve') {
      // Only admin and hr can approve
      if (!['admin', 'hr'].includes(decoded.role)) {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
      }

      review.status = 'approved'
      review.approvedBy = decoded.employeeId
      review.approvedAt = new Date()

    } else if (action === 'reject') {
      // Only admin and hr can reject
      if (!['admin', 'hr'].includes(decoded.role)) {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
      }

      review.status = 'rejected'
      if (updateData.rejectionReason) {
        review.rejectionReason = updateData.rejectionReason
      }

    } else if (action === 'submit') {
      // Reviewer can submit for approval
      if (review.reviewer.toString() !== decoded.employeeId && !['admin', 'hr'].includes(decoded.role)) {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
      }

      review.status = 'pending'
      review.submittedAt = new Date()

    } else if (action === 'addComment') {
      // Employee can add comments
      if (decoded.role === 'employee' && review.employee.toString() === decoded.employeeId) {
        review.employeeComments = updateData.comment
      } else if (['admin', 'hr', 'manager'].includes(decoded.role)) {
        review.managerComments = updateData.comment
      } else {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
      }

    } else {
      // Generic partial update
      if (!['admin', 'hr', 'manager'].includes(decoded.role)) {
        return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
      }

      Object.keys(updateData).forEach(key => {
        review[key] = updateData[key]
      })
    }

    await review.save()

    const updatedReview = await Performance.findById(id)
      .populate('employee', 'firstName lastName employeeCode email')
      .populate('reviewer', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')
      .lean()

    return NextResponse.json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview
    })

  } catch (error) {
    console.error('Patch performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

