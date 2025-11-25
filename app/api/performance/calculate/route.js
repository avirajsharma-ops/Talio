import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import Performance from '@/models/Performance'
import Project from '@/models/Project'

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

    // Fetch tasks for all employees
    const employeeIds = employees.map(emp => emp._id)
    const taskQuery = {
      'assignedTo.employee': { $in: employeeIds },
      isDeleted: { $ne: true }
    }

    if (startDate || endDate) {
      taskQuery.createdAt = {}
      if (startDate) taskQuery.createdAt.$gte = new Date(startDate)
      if (endDate) taskQuery.createdAt.$lte = new Date(endDate)
    }

    const tasks = await Project.find(taskQuery)
      .select('title status progress dueDate completedAt assignedTo priority')
      .lean()

    // Group tasks by employee
    const tasksByEmployee = {}
    tasks.forEach(task => {
      task.assignedTo.forEach(assignment => {
        const empId = assignment.employee.toString()
        if (!tasksByEmployee[empId]) {
          tasksByEmployee[empId] = []
        }
        tasksByEmployee[empId].push(task)
      })
    })

    // Calculate performance metrics for each employee
    const performanceMetrics = employees.map(employee => {
      let reviews = employee.reviews || []
      const employeeTasks = tasksByEmployee[employee._id.toString()] || []

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

      // Calculate project/task metrics
      const totalTasks = employeeTasks.length
      const completedTasks = employeeTasks.filter(t => t.status === 'completed').length
      const inProgressTasks = employeeTasks.filter(t => t.status === 'in_progress').length
      const onTimeTasks = employeeTasks.filter(t => {
        if (t.status === 'completed' && t.completedAt && t.dueDate) {
          return new Date(t.completedAt) <= new Date(t.dueDate)
        }
        return false
      }).length
      const overdueTasks = employeeTasks.filter(t => {
        if (t.status !== 'completed' && t.dueDate) {
          return new Date() > new Date(t.dueDate)
        }
        return false
      }).length
      const avgProgress = totalTasks > 0
        ? (employeeTasks.reduce((sum, t) => sum + (t.progress || 0), 0) / totalTasks).toFixed(1)
        : 0

      // Calculate task completion rate
      const completionRate = totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0

      // Calculate on-time delivery rate
      const onTimeRate = completedTasks > 0 ? ((onTimeTasks / completedTasks) * 100).toFixed(1) : 0

      // Calculate performance score (0-100)
      // Based on:
      // - Review rating (25%)
      // - Task completion rate (30%)
      // - On-time delivery (25%)
      // - Appreciation/Warning balance (10%)
      // - Activity/Engagement (10%)
      let performanceScore = 0

      // Review score (25%)
      const reviewScore = (parseFloat(avgRating) / 5) * 25

      // Task completion score (30%)
      const taskCompletionScore = (parseFloat(completionRate) / 100) * 30

      // On-time delivery score (25%)
      const onTimeScore = (parseFloat(onTimeRate) / 100) * 25

      // Appreciation/Warning balance (10%)
      let balanceScore = 0
      if (totalReviews > 0) {
        const appreciationRatio = reviewsByType.appreciation / totalReviews
        const warningRatio = reviewsByType.warning / totalReviews
        balanceScore = Math.max(0, (appreciationRatio - warningRatio) * 10)
      }

      // Activity score (10%)
      const activityScore = Math.min((totalReviews + totalTasks) / 20 * 10, 10)

      performanceScore = Math.max(0, Math.min(100,
        reviewScore + taskCompletionScore + onTimeScore + balanceScore + activityScore
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

      // Get recent tasks (last 5)
      const recentTasks = employeeTasks
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

          // Task/Project metrics
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          completionRate: parseFloat(completionRate),
          onTimeRate: parseFloat(onTimeRate),
          avgProgress: parseFloat(avgProgress),

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
        })),
        recentTasks: recentTasks.map(t => ({
          _id: t._id,
          title: t.title,
          status: t.status,
          progress: t.progress,
          priority: t.priority,
          dueDate: t.dueDate,
          completedAt: t.completedAt
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

