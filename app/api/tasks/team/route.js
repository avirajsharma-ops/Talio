import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'
import Department from '@/models/Department'
import { verifyToken } from '@/lib/auth'

// GET - Fetch team tasks for department members
export async function GET(request) {
  try {
    await connectDB()

    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get employee details
    const employee = await Employee.findOne({ user: decoded.userId })
      .populate('department')
      .lean()

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    if (!employee.department) {
      return NextResponse.json(
        { success: false, message: 'Employee not assigned to any department' },
        { status: 400 }
      )
    }

    // Get all employees in the same department
    const departmentEmployees = await Employee.find({
      department: employee.department._id,
      status: 'active'
    }).select('_id').lean()

    const employeeIds = departmentEmployees.map(emp => emp._id)

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedToId = searchParams.get('assignedTo')
    const sortBy = searchParams.get('sortBy') || 'dueDate'
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1

    // Build query
    const query = {
      'assignedTo.employee': { $in: employeeIds }
    }

    if (status) {
      query.status = status
    }

    if (priority) {
      query.priority = priority
    }

    if (assignedToId) {
      query['assignedTo.employee'] = assignedToId
    }

    // Fetch tasks
    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName employeeCode email designation')
      .populate('assignedTo.employee', 'firstName lastName employeeCode email designation department')
      .populate('assignedTo.delegatedTo', 'firstName lastName employeeCode')
      .populate('project', 'name projectCode')
      .populate('milestone', 'name')
      .populate('comments.author', 'firstName lastName employeeCode')
      .populate('comments.mentions', 'firstName lastName employeeCode')
      .populate('approvalWorkflow.approver', 'firstName lastName employeeCode')
      .populate('reviewers.reviewer', 'firstName lastName employeeCode')
      .populate('attachments.uploadedBy', 'firstName lastName employeeCode')
      .populate('timeEntries.employee', 'firstName lastName employeeCode')
      .populate('timeEntries.approvedBy', 'firstName lastName employeeCode')
      .sort({ [sortBy]: sortOrder })
      .lean()

    // Check if current employee is department head
    const department = await Department.findById(employee.department._id).lean()
    const isDepartmentHead = department?.head?.toString() === employee._id.toString()

    // Add additional metadata
    const tasksWithMetadata = tasks.map(task => {
      // Calculate timeline events
      const timeline = []

      // Task created
      timeline.push({
        type: 'created',
        date: task.createdAt,
        actor: task.assignedBy,
        description: 'Task created'
      })

      // Status changes from comments
      task.comments?.forEach(comment => {
        if (comment.type === 'status_update') {
          timeline.push({
            type: 'status_change',
            date: comment.createdAt,
            actor: comment.author,
            description: comment.content
          })
        }
      })

      // Approval workflow events
      task.approvalWorkflow?.forEach(approval => {
        if (approval.status !== 'pending') {
          timeline.push({
            type: approval.status === 'approved' ? 'approved' : 'rejected',
            date: approval.approvedAt,
            actor: approval.approver,
            description: approval.comments || `Task ${approval.status}`,
            level: approval.level
          })
        }
      })

      // Time entries
      task.timeEntries?.forEach(entry => {
        timeline.push({
          type: 'time_logged',
          date: entry.createdAt,
          actor: entry.employee,
          description: `Logged ${Math.round(entry.duration / 60)} hours`,
          duration: entry.duration
        })
      })

      // Checklist completions
      task.checklist?.forEach(item => {
        if (item.completed) {
          timeline.push({
            type: 'checklist_completed',
            date: item.completedAt,
            actor: item.completedBy,
            description: `Completed: ${item.title}`
          })
        }
      })

      // Sort timeline by date
      timeline.sort((a, b) => new Date(b.date) - new Date(a.date))

      return {
        ...task,
        timeline,
        isDepartmentHead,
        canAddComments: true,
        canViewTimeline: true
      }
    })

    return NextResponse.json({
      success: true,
      data: tasksWithMetadata,
      meta: {
        total: tasksWithMetadata.length,
        isDepartmentHead,
        department: employee.department
      }
    })

  } catch (error) {
    console.error('Error fetching team tasks:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch team tasks', error: error.message },
      { status: 500 }
    )
  }
}

// POST - Add comment/remark to team task (department head or team member)
export async function POST(request) {
  try {
    await connectDB()

    // Verify authentication
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { taskId, content, type, mentions, isInternal } = body

    if (!taskId || !content) {
      return NextResponse.json(
        { success: false, message: 'Task ID and content are required' },
        { status: 400 }
      )
    }

    // Get employee details
    const employee = await Employee.findOne({ user: decoded.userId })
      .populate('department')
      .lean()

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get task
    const task = await Task.findById(taskId)

    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if employee is in the same department as task assignees
    const taskEmployees = await Employee.find({
      _id: { $in: task.assignedTo.map(a => a.employee) }
    }).select('department').lean()

    const isInSameDepartment = taskEmployees.some(
      emp => emp.department?.toString() === employee.department._id.toString()
    )

    if (!isInSameDepartment) {
      return NextResponse.json(
        { success: false, message: 'You can only comment on tasks in your department' },
        { status: 403 }
      )
    }

    // Check if department head
    const department = await Department.findById(employee.department._id).lean()
    const isDepartmentHead = department?.head?.toString() === employee._id.toString()

    // Add comment
    const comment = {
      author: employee._id,
      content,
      type: type || 'comment',
      isInternal: isInternal || false,
      mentions: mentions || [],
      createdAt: new Date()
    }

    task.comments.push(comment)
    await task.save()

    // Populate the new comment
    await task.populate('comments.author', 'firstName lastName employeeCode')
    await task.populate('comments.mentions', 'firstName lastName employeeCode')

    const newComment = task.comments[task.comments.length - 1]

    return NextResponse.json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment: newComment,
        isDepartmentHead
      }
    })

  } catch (error) {
    console.error('Error adding comment:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to add comment', error: error.message },
      { status: 500 }
    )
  }
}

