import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Get comprehensive task dashboard data
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const currentUser = await User.findById(decoded.userId).select('employeeId role')
    const currentEmployeeId = currentUser?.employeeId

    const { searchParams } = new URL(request.url)
    const view = searchParams.get('view') || 'personal' // personal, team, department, organization
    const timeframe = searchParams.get('timeframe') || '30' // days

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(timeframe))

    let taskQuery = {}
    let teamMemberIds = [currentEmployeeId]

    // Build query based on view and user role
    if (view === 'personal') {
      taskQuery.$or = [
        { 'assignedTo.employee': currentEmployeeId },
        { assignedBy: { $in: [currentEmployeeId, decoded.userId] } }
      ]
    } else if (view === 'team' && ['manager', 'hr', 'admin'].includes(decoded.role)) {
      // Get team members
      const teamMembers = await Employee.find({
        reportingManager: currentEmployeeId,
        status: 'active'
      }).select('_id')

      teamMemberIds = teamMembers.map(member => member._id)
      teamMemberIds.push(currentEmployeeId)

      taskQuery.$or = [
        { 'assignedTo.employee': { $in: teamMemberIds } },
        { assignedBy: { $in: teamMemberIds } }
      ]
    } else if (view === 'department' && ['hr', 'admin'].includes(decoded.role)) {
      const userEmp = await Employee.findById(currentEmployeeId)
      const deptEmployees = await Employee.find({
        department: userEmp?.department,
        status: 'active'
      }).select('_id')

      teamMemberIds = deptEmployees.map(emp => emp._id)

      taskQuery.$or = [
        { 'assignedTo.employee': { $in: teamMemberIds } },
        { assignedBy: { $in: teamMemberIds } }
      ]
    } else if (view === 'organization' && ['admin'].includes(decoded.role)) {
      // No additional filter for organization view
    } else {
      // Default to personal view if user doesn't have permission
      taskQuery.$or = [
        { 'assignedTo.employee': currentEmployeeId },
        { assignedBy: { $in: [currentEmployeeId, decoded.userId] } }
      ]
    }

    // Get task statistics
    const taskStats = await Project.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $nin: ['$status', ['completed', 'cancelled']] }
                  ]
                },
                1,
                0
              ]
            }
          },
          highPriorityTasks: {
            $sum: { $cond: [{ $in: ['$priority', ['high', 'urgent', 'critical']] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress' },
          totalEstimatedHours: { $sum: '$estimatedHours' },
          totalActualHours: { $sum: '$actualHours' }
        }
      }
    ])

    const stats = taskStats[0] || {
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      avgProgress: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0
    }

    // Calculate completion rate and efficiency
    stats.completionRate = stats.totalTasks > 0 ?
      ((stats.completedTasks / stats.totalTasks) * 100).toFixed(1) : 0

    stats.efficiency = stats.totalEstimatedHours > 0 ?
      ((stats.totalEstimatedHours / stats.totalActualHours) * 100).toFixed(1) : 0

    // Get tasks by status for charts
    const tasksByStatus = await Project.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    // Get tasks by priority
    const tasksByPriority = await Project.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ])

    // Get tasks by category
    const tasksByCategory = await Project.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ])

    // Get recent tasks
    const recentTasks = await Project.find(taskQuery)
      .populate('assignedBy', 'firstName lastName')
      .populate('assignedTo.employee', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(10)

    // Get upcoming deadlines
    const upcomingDeadlines = await Project.find({
      ...taskQuery,
      dueDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      },
      status: { $nin: ['completed', 'cancelled'] }
    })
      .populate('assignedTo.employee', 'firstName lastName')
      .sort({ dueDate: 1 })
      .limit(10)

    // Get productivity trends (last 30 days)
    const productivityTrend = await Project.aggregate([
      {
        $match: {
          ...taskQuery,
          completedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' }
          },
          tasksCompleted: { $sum: 1 },
          hoursLogged: { $sum: '$actualHours' }
        }
      },
      { $sort: { '_id': 1 } }
    ])

    // Get team performance (if viewing team/department/organization)
    let teamPerformance = []
    if (view !== 'personal' && teamMemberIds.length > 1) {
      teamPerformance = await Project.aggregate([
        {
          $match: {
            'assignedTo.employee': { $in: teamMemberIds },
            createdAt: { $gte: startDate }
          }
        },
        { $unwind: '$assignedTo' },
        {
          $match: {
            'assignedTo.employee': { $in: teamMemberIds }
          }
        },
        {
          $group: {
            _id: '$assignedTo.employee',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            avgProgress: { $avg: '$progress' },
            totalHours: { $sum: '$actualHours' },
            overdueCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ['$dueDate', new Date()] },
                      { $nin: ['$status', ['completed', 'cancelled']] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: '$employee' },
        {
          $project: {
            employeeId: '$_id',
            name: { $concat: ['$employee.firstName', ' ', '$employee.lastName'] },
            employeeCode: '$employee.employeeCode',
            totalTasks: 1,
            completedTasks: 1,
            completionRate: {
              $cond: [
                { $gt: ['$totalTasks', 0] },
                { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
                0
              ]
            },
            avgProgress: { $round: ['$avgProgress', 1] },
            totalHours: { $round: ['$totalHours', 1] },
            overdueCount: 1,
            productivity: {
              $cond: [
                { $gt: ['$totalHours', 0] },
                { $divide: ['$completedTasks', '$totalHours'] },
                0
              ]
            }
          }
        },
        { $sort: { completionRate: -1 } }
      ])
    }

    // Get project progress (if user has projects)
    const projectProgress = await Project.aggregate([
      {
        $match: {
          $or: [
            { projectManager: decoded.userId },
            { 'team.member': decoded.userId }
          ],
          status: { $in: ['planning', 'active'] }
        }
      },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'project',
          as: 'tasks'
        }
      },
      {
        $project: {
          name: 1,
          projectCode: 1,
          progress: 1,
          status: 1,
          daysRemaining: {
            $ceil: {
              $divide: [
                { $subtract: ['$endDate', new Date()] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          totalTasks: { $size: '$tasks' },
          completedTasks: {
            $size: {
              $filter: {
                input: '$tasks',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          }
        }
      },
      { $sort: { progress: -1 } },
      { $limit: 5 }
    ])

    return NextResponse.json({
      success: true,
      data: {
        overview: stats,
        charts: {
          tasksByStatus,
          tasksByPriority,
          tasksByCategory,
          productivityTrend
        },
        recentTasks,
        upcomingDeadlines,
        teamPerformance,
        projectProgress,
        view,
        timeframe: parseInt(timeframe)
      }
    })

  } catch (error) {
    console.error('Task dashboard error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
