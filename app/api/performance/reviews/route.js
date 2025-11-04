import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Performance from '@/models/Performance'
import Employee from '@/models/Employee'

// GET - Fetch performance reviews
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10

    // Build query based on role
    let query = {}

    if (decoded.role === 'employee') {
      // Employees can only see their own reviews
      query.employee = decoded.employeeId
    } else if (decoded.role === 'manager') {
      // Managers can see reviews for their team members
      const teamMembers = await Employee.find({
        reportingManager: decoded.employeeId,
        status: 'active'
      }).select('_id')

      const teamMemberIds = teamMembers.map(member => member._id)
      query.employee = { $in: [...teamMemberIds, decoded.employeeId] }
    }
    // Admin and HR can see all reviews (no filter)

    // Apply additional filters
    if (employeeId) {
      query.employee = employeeId
    }

    if (status) {
      query.status = status
    }

    // Fetch reviews from database
    const totalReviews = await Performance.countDocuments(query)
    const reviews = await Performance.find(query)
      .populate('employee', 'firstName lastName employeeCode department designation')
      .populate('reviewer', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Transform data to match frontend expectations
    const transformedReviews = reviews.map(review => ({
      _id: review._id,
      employee: review.employee,
      reviewer: review.reviewer,
      reviewPeriod: `${new Date(review.reviewPeriod.startDate).toLocaleDateString()} - ${new Date(review.reviewPeriod.endDate).toLocaleDateString()}`,
      reviewType: review.reviewType,
      overallRating: review.overallRating || 0,
      status: review.status,
      reviewDate: review.submittedDate || review.createdAt,
      summary: review.strengths || '',
      strengths: review.strengths ? [review.strengths] : [],
      areasOfImprovement: review.areasOfImprovement ? [review.areasOfImprovement] : [],
      goals: review.goals || [],
      comments: review.employeeComments || '',
      kras: review.kras || [],
      kpis: review.kpis || [],
      competencies: review.competencies || [],
      createdAt: review.createdAt,
      updatedAt: review.updatedAt
    }))

    return NextResponse.json({
      success: true,
      data: transformedReviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / limit),
        totalItems: totalReviews,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Get performance reviews error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new performance review
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin, hr, and managers can create reviews
    if (!['admin', 'hr', 'manager'].includes(decoded.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const {
      employeeId,
      reviewType,
      reviewPeriodStart,
      reviewPeriodEnd,
      overallRating,
      strengths,
      areasOfImprovement,
      goals,
      kras,
      kpis,
      competencies,
      trainingRecommendations,
      employeeComments
    } = body

    // Validate required fields
    if (!employeeId || !reviewType || !reviewPeriodStart || !reviewPeriodEnd) {
      return NextResponse.json(
        { success: false, message: 'Employee ID, review type, and review period are required' },
        { status: 400 }
      )
    }

    // Create new performance review
    const newReview = await Performance.create({
      employee: employeeId,
      reviewPeriod: {
        startDate: new Date(reviewPeriodStart),
        endDate: new Date(reviewPeriodEnd)
      },
      reviewType,
      reviewer: decoded.employeeId,
      kras: kras || [],
      kpis: kpis || [],
      competencies: competencies || [],
      overallRating: parseFloat(overallRating) || 0,
      strengths: strengths || '',
      areasOfImprovement: areasOfImprovement || '',
      trainingRecommendations: trainingRecommendations || [],
      goals: goals || [],
      employeeComments: employeeComments || '',
      status: 'submitted',
      submittedDate: new Date()
    })

    // Populate the review
    await newReview.populate('employee', 'firstName lastName employeeCode department')
    await newReview.populate('reviewer', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Performance review created successfully',
      data: newReview
    }, { status: 201 })

  } catch (error) {
    console.error('Create performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update performance review
export async function PUT(request) {
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

    const body = await request.json()
    const { reviewId, ...updateData } = body

    if (!reviewId) {
      return NextResponse.json(
        { success: false, message: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Mock update - replace with actual database update
    const updatedReview = {
      _id: reviewId,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Performance review updated successfully',
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
export async function DELETE(request) {
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

    const { searchParams } = new URL(request.url)
    const reviewId = searchParams.get('reviewId')

    if (!reviewId) {
      return NextResponse.json(
        { success: false, message: 'Review ID is required' },
        { status: 400 }
      )
    }

    // Mock deletion - replace with actual database deletion
    return NextResponse.json({
      success: true,
      message: 'Performance review deleted successfully'
    })

  } catch (error) {
    console.error('Delete performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
