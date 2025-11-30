import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import Performance from '@/models/Performance'

export const dynamic = 'force-dynamic'


// GET - Calculate performance metrics based on reviews and remarks
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Build query based on role
    let employeeQuery = {}
    
    if (decoded.role === 'employee') {
      employeeQuery._id = decoded.employeeId
    } else if (decoded.role === 'manager') {
      const teamMembers = await Employee.find({ 
        reportingManager: decoded.employeeId,
        status: 'active'
      }).select('_id')
      
      const teamMemberIds = teamMembers.map(member => member._id)
      employeeQuery._id = { $in: [...teamMemberIds, decoded.employeeId] }
    }
    // Admin and HR can see all employees

    if (employeeId) {
      employeeQuery._id = employeeId
    }

    // Fetch employees with their reviews
    const employees = await Employee.find(employeeQuery)
      .populate('reviews.reviewedBy', 'firstName lastName')
      .populate('department', 'name')
      .select('firstName lastName employeeCode department reviews')
      .lean()

    // Calculate performance metrics for each employee
    const performanceMetrics = employees.map(employee => {
      let reviews = employee.reviews || []

      // Filter reviews by date range if provided
      if (startDate || endDate) {
        reviews = reviews.filter(review => {
          const reviewDate = new Date(review.createdAt)
          if (startDate && reviewDate < new Date(startDate)) return false
          if (endDate && reviewDate > new Date(endDate)) return false
          return true
        })
      }

      // Calculate review metrics
      const totalReviews = reviews.length
      const reviewsWithRating = reviews.filter(r => r.rating)
      const avgRating = reviewsWithRating.length > 0
        ? (reviewsWithRating.reduce((sum, r) => sum + r.rating, 0) / reviewsWithRating.length).toFixed(2)
        : 0

      // Count by type
      const reviewsByType = {
        review: reviews.filter(r => r.type === 'review').length,
        remark: reviews.filter(r => r.type === 'remark').length,
        feedback: reviews.filter(r => r.type === 'feedback').length,
        warning: reviews.filter(r => r.type === 'warning').length,
        appreciation: reviews.filter(r => r.type === 'appreciation').length
      }

      // Count by category
      const reviewsByCategory = {
        performance: reviews.filter(r => r.category === 'performance').length,
        behavior: reviews.filter(r => r.category === 'behavior').length,
        skills: reviews.filter(r => r.category === 'skills').length,
        general: reviews.filter(r => r.category === 'general').length
      }

      // Calculate performance score (0-100)
      // Based on:
      // - Review rating (50%)
      // - Appreciation/Warning balance (30%)
      // - Activity/Engagement (20%)
      let performanceScore = 0

      // Review score (50%)
      const reviewScore = (parseFloat(avgRating) / 5) * 50

      // Appreciation/Warning balance (30%)
      let balanceScore = 15 // Base score
      if (totalReviews > 0) {
        const appreciationRatio = reviewsByType.appreciation / totalReviews
        const warningRatio = reviewsByType.warning / totalReviews
        balanceScore = Math.max(0, Math.min(30, 15 + (appreciationRatio - warningRatio) * 30))
      }

      // Activity score (20%)
      const activityScore = Math.min((totalReviews) / 10 * 20, 20)

      performanceScore = Math.max(0, Math.min(100,
        reviewScore + balanceScore + activityScore
      ))

      // Determine performance level
      let performanceLevel = 'Not Rated'
      if (performanceScore >= 90) performanceLevel = 'Exceptional'
      else if (performanceScore >= 75) performanceLevel = 'Excellent'
      else if (performanceScore >= 60) performanceLevel = 'Good'
      else if (performanceScore >= 40) performanceLevel = 'Needs Improvement'
      else if (performanceScore > 0) performanceLevel = 'Poor'

      // Get recent reviews (last 5)
      const recentReviews = reviews
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)

      return {
        employee: {
          _id: employee._id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeCode: employee.employeeCode,
          department: employee.department
        },
        metrics: {
          // Review metrics
          totalReviews,
          avgRating: parseFloat(avgRating),
          reviewsByType,
          reviewsByCategory,

          // Overall performance
          performanceScore: Math.round(performanceScore),
          performanceLevel
        },
        recentReviews: recentReviews.map(r => ({
          type: r.type,
          category: r.category,
          rating: r.rating,
          content: r.content,
          reviewedBy: r.reviewedBy,
          createdAt: r.createdAt
        }))
      }
    })

    // Sort by performance score
    performanceMetrics.sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore)

    return NextResponse.json({
      success: true,
      data: performanceMetrics,
      summary: {
        totalEmployees: performanceMetrics.length,
        avgPerformanceScore: performanceMetrics.length > 0
          ? Math.round(performanceMetrics.reduce((sum, p) => sum + p.metrics.performanceScore, 0) / performanceMetrics.length)
          : 0,
        exceptional: performanceMetrics.filter(p => p.metrics.performanceLevel === 'Exceptional').length,
        excellent: performanceMetrics.filter(p => p.metrics.performanceLevel === 'Excellent').length,
        good: performanceMetrics.filter(p => p.metrics.performanceLevel === 'Good').length,
        needsImprovement: performanceMetrics.filter(p => p.metrics.performanceLevel === 'Needs Improvement').length,
        poor: performanceMetrics.filter(p => p.metrics.performanceLevel === 'Poor').length
      }
    })

  } catch (error) {
    console.error('Calculate performance error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

