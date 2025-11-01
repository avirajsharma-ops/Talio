import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Fetch performance reviews
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10

    // Mock data for now - replace with actual database queries
    const mockReviews = [
      {
        _id: '1',
        employee: { 
          _id: 'emp1',
          firstName: 'John', 
          lastName: 'Doe', 
          employeeCode: 'EMP001',
          department: 'Engineering'
        },
        reviewer: { 
          _id: 'rev1',
          firstName: 'Jane', 
          lastName: 'Smith' 
        },
        reviewPeriod: 'Q4 2024',
        overallRating: 4.2,
        status: 'completed',
        reviewDate: '2024-12-15T00:00:00.000Z',
        summary: 'Excellent performance with strong leadership skills and consistent delivery.',
        strengths: ['Leadership', 'Problem Solving', 'Communication'],
        areasOfImprovement: ['Time Management', 'Delegation'],
        goals: [
          { title: 'Improve team collaboration', status: 'achieved' },
          { title: 'Complete certification', status: 'in-progress' }
        ],
        comments: 'John has shown exceptional growth this quarter.',
        createdAt: '2024-12-15T00:00:00.000Z',
        updatedAt: '2024-12-15T00:00:00.000Z'
      },
      {
        _id: '2',
        employee: { 
          _id: 'emp2',
          firstName: 'Alice', 
          lastName: 'Johnson', 
          employeeCode: 'EMP002',
          department: 'Marketing'
        },
        reviewer: { 
          _id: 'rev2',
          firstName: 'Bob', 
          lastName: 'Wilson' 
        },
        reviewPeriod: 'Q4 2024',
        overallRating: 3.8,
        status: 'pending',
        reviewDate: '2024-12-20T00:00:00.000Z',
        summary: 'Good performance with room for improvement in technical skills.',
        strengths: ['Teamwork', 'Reliability'],
        areasOfImprovement: ['Technical Skills', 'Initiative'],
        goals: [
          { title: 'Learn new marketing tools', status: 'not-started' },
          { title: 'Increase campaign ROI', status: 'in-progress' }
        ],
        comments: 'Alice is a reliable team member with potential for growth.',
        createdAt: '2024-12-20T00:00:00.000Z',
        updatedAt: '2024-12-20T00:00:00.000Z'
      }
    ]

    // Filter based on role and parameters
    let filteredReviews = mockReviews

    // Role-based filtering
    if (decoded.role === 'employee') {
      // Employees can only see their own reviews
      filteredReviews = mockReviews.filter(review => review.employee._id === decoded.employeeId)
    } else if (decoded.role === 'manager') {
      // Managers can see reviews for their team members
      // For now, show all reviews (in real implementation, filter by department/team)
      filteredReviews = mockReviews
    }
    // Admin and HR can see all reviews

    // Apply filters
    if (employeeId) {
      filteredReviews = filteredReviews.filter(review => review.employee._id === employeeId)
    }

    if (status) {
      filteredReviews = filteredReviews.filter(review => review.status === status)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedReviews = filteredReviews.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedReviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredReviews.length / limit),
        totalItems: filteredReviews.length,
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

    const body = await request.json()
    const {
      employeeId,
      reviewPeriod,
      overallRating,
      summary,
      strengths,
      areasOfImprovement,
      goals,
      comments
    } = body

    // Validate required fields
    if (!employeeId || !reviewPeriod || !overallRating) {
      return NextResponse.json(
        { success: false, message: 'Employee ID, review period, and overall rating are required' },
        { status: 400 }
      )
    }

    // Mock creation - replace with actual database save
    const newReview = {
      _id: Date.now().toString(),
      employee: {
        _id: employeeId,
        firstName: 'Mock',
        lastName: 'Employee',
        employeeCode: 'EMP999',
        department: 'Mock Department'
      },
      reviewer: {
        _id: decoded.employeeId,
        firstName: decoded.firstName || 'Reviewer',
        lastName: decoded.lastName || 'Name'
      },
      reviewPeriod,
      overallRating: parseFloat(overallRating),
      status: 'completed',
      reviewDate: new Date().toISOString(),
      summary: summary || '',
      strengths: strengths || [],
      areasOfImprovement: areasOfImprovement || [],
      goals: goals || [],
      comments: comments || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Performance review created successfully',
      data: newReview
    }, { status: 201 })

  } catch (error) {
    console.error('Create performance review error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
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
