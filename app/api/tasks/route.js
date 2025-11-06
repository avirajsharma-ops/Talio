import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Employee from '@/models/Employee'
import Project from '@/models/Project'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'
import { logActivity } from '@/lib/activityLogger'
import { sendTaskAssignedNotification, sendTaskStatusUpdateNotification, sendTaskCompletedNotification } from '@/lib/notificationService'

// GET - Fetch tasks with filters and pagination
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
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 20
    const skip = (page - 1) * limit

    // Check if user is a department head
    const Department = (await import('@/models/Department')).default
    const isDepartmentHead = await Department.findOne({
      head: currentEmployeeId,
      isActive: true
    })

    // Build query based on user role and view parameter
    let query = {}
    const view = searchParams.get('view') || 'personal'

    // Role-based filtering based on view
    if (view === 'personal' && decoded.role === 'employee' && !isDepartmentHead) {
      // Personal view for regular employees - tasks assigned to current employee or created by them
      query.$or = [
        { 'assignedTo.employee': currentEmployeeId },
        { assignedBy: { $in: [currentEmployeeId, decoded.userId] } }
      ]
    } else if ((view === 'personal' && isDepartmentHead) || (view === 'team' && ['manager', 'hr', 'admin'].includes(decoded.role)) || (view === 'department' && isDepartmentHead)) {
      // Department heads see ALL department tasks by default
      // Team view - manager's team tasks (same department)
      const empDoc = await Employee.findById(currentEmployeeId)
      const teamMembers = await Employee.find({
        department: empDoc?.department,
        status: 'active'
      }).select('_id')

      const teamMemberIds = teamMembers.map(member => member._id)

      query.$or = [
        { 'assignedTo.employee': { $in: teamMemberIds } },
        { assignedBy: { $in: teamMemberIds } }
      ]
    } else if (view === 'external' && ['manager', 'admin'].includes(decoded.role)) {
      // External view - tasks assigned by manager to people outside their department
      const empDoc = await Employee.findById(currentEmployeeId)

      // Find tasks created by this manager
      const managerTasks = await Task.find({
        assignedBy: currentEmployeeId
      }).populate('assignedTo.employee', 'department')

      // Filter tasks where assignees are outside manager's department
      const externalTaskIds = managerTasks
        .filter(task => {
          return task.assignedTo.some(assignment => {
            const assigneeDept = assignment.employee?.department
            return assigneeDept && assigneeDept.toString() !== empDoc?.department?.toString()
          })
        })
        .map(task => task._id)

      query._id = { $in: externalTaskIds }
    } else if (view === 'department' && ['hr', 'admin'].includes(decoded.role)) {
      // Department view - all tasks in user's department
      const empDoc = await Employee.findById(currentEmployeeId)
      const deptEmployees = await Employee.find({
        department: empDoc?.department,
        status: 'active'
      }).select('_id')

      const deptEmployeeIds = deptEmployees.map(emp => emp._id)

      query.$or = [
        { 'assignedTo.employee': { $in: deptEmployeeIds } },
        { assignedBy: { $in: deptEmployeeIds } }
      ]
    } else if (view === 'organization' && decoded.role === 'admin') {
      // Organization view - all tasks (no filter)
    } else {
      // Default to personal view if user doesn't have permission
      query.$or = [
        { 'assignedTo.employee': currentEmployeeId },
        { assignedBy: { $in: [currentEmployeeId, decoded.userId] } }
      ]
    }

    // Apply additional filters
    const status = searchParams.get('status')
    if (status) {
      query.status = status
    }

    const priority = searchParams.get('priority')
    if (priority) {
      query.priority = priority
    }

    const assignedTo = searchParams.get('assignedTo')
    if (assignedTo) {
      query['assignedTo.employee'] = assignedTo
    }

    const assignedBy = searchParams.get('assignedBy')
    if (assignedBy) {
      query.assignedBy = assignedBy
    }

    const project = searchParams.get('project')
    if (project) {
      query.project = project
    }

    const category = searchParams.get('category')
    if (category) {
      query.category = category
    }

    const dueDateFrom = searchParams.get('dueDateFrom')
    const dueDateTo = searchParams.get('dueDateTo')
    if (dueDateFrom || dueDateTo) {
      query.dueDate = {}
      if (dueDateFrom) query.dueDate.$gte = new Date(dueDateFrom)
      if (dueDateTo) query.dueDate.$lte = new Date(dueDateTo)
    }

    const search = searchParams.get('search')
    if (search) {
      // Combine search with existing role-based query
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { taskNumber: { $regex: search, $options: 'i' } }
        ]
      }

      if (query.$or) {
        // If we already have role-based $or, combine with $and
        query = {
          $and: [
            { $or: query.$or },
            searchQuery
          ]
        }
      } else {
        // If no role-based filter, just use search
        Object.assign(query, searchQuery)
      }
    }

    const overdue = searchParams.get('overdue')
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() }
      query.status = { $nin: ['completed', 'cancelled'] }
    }

    // Exclude deleted tasks by default (unless explicitly requested)
    const includeDeleted = searchParams.get('includeDeleted')
    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true }
    }

    // Sort options
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1
    const sort = { [sortBy]: sortOrder }

    // Execute query
    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode')
      .populate('project', 'name projectCode')
      .populate('parentTask', 'title taskNumber')
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const totalTasks = await Task.countDocuments(query)

    // Calculate summary statistics
    const summaryStats = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', new Date()] },
                    { $ne: ['$status', 'completed'] },
                    { $ne: ['$status', 'cancelled'] }
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
          avgProgress: { $avg: '$progress' }
        }
      }
    ])

    const stats = summaryStats[0] || {
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      avgProgress: 0
    }

    return NextResponse.json({
      success: true,
      data: {
        tasks,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalTasks / limit),
          totalTasks,
          hasNext: page * limit < totalTasks,
          hasPrev: page > 1
        },
        stats
      }
    })

  } catch (error) {
    console.error('Get tasks error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST - Create new task
export async function POST(request) {
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
    const assignerRole = currentUser?.role || decoded.role

    const taskData = await request.json()
    console.log('Task creation request:', taskData)

    // Validate required fields
    if (!taskData.title || !taskData.dueDate) {
      console.log('Validation failed: missing title or dueDate')
      return NextResponse.json(
        { success: false, message: 'Title and due date are required' },
        { status: 400 }
      )
    }

    // Validate assignees
    if (!taskData.assignedTo || taskData.assignedTo.length === 0) {
      console.log('Validation failed: no assignees')
      return NextResponse.json(
        { success: false, message: 'At least one assignee is required' },
        { status: 400 }
      )
    }

    // Check assignment permissions
    for (const assignment of taskData.assignedTo) {
      // Skip if employee ID is missing
      if (!assignment.employee) {
        console.log('Validation failed: assignment missing employee ID', assignment)
        return NextResponse.json(
          { success: false, message: 'Each assignment must have an employee ID' },
          { status: 400 }
        )
      }

      const canAssign = await checkAssignmentPermission(currentEmployeeId, assignment.employee, assignerRole)
      if (!canAssign.allowed) {
        return NextResponse.json(
          { success: false, message: `Cannot assign task to employee: ${canAssign.reason}` },
          { status: 403 }
        )
      }
    }

    // Determine assignment type
    let assignmentType = 'self_assigned'
    if (taskData.assignedTo.some(a => a.employee?.toString() !== currentEmployeeId?.toString())) {
      const assigner = await Employee.findById(currentEmployeeId)
      const assignees = await Employee.find({
        _id: { $in: taskData.assignedTo.map(a => a.employee) }
      })

      // Check if assigning to team members
      const teamMembers = assignees.filter(assignee =>
        assignee.reportingManager?.toString() === currentEmployeeId?.toString())

      if (teamMembers.length === assignees.length) {
        assignmentType = 'manager_assigned'
      } else if (assignees.some(assignee =>
        assignee.department?.toString() === assigner?.department?.toString())) {
        assignmentType = 'peer_assigned'
      } else {
        assignmentType = 'cross_department'
      }
    }

    // Create task
    const task = new Task({
      ...taskData,
      assignedBy: currentEmployeeId,
      assignmentType,
      status: 'assigned',
      assignedTo: taskData.assignedTo.map(assignment => ({
        ...assignment,
        assignedAt: new Date(),
        status: 'pending'
      }))
    })

    await task.save()

    // If this is a subtask, link it to the parent
    if (task.parentTask) {
      await Task.findByIdAndUpdate(task.parentTask, { $addToSet: { subtasks: task._id } })
    }

    // Populate the created task
    await task.populate([
      { path: 'assignedBy', select: 'firstName lastName employeeCode' },
      { path: 'assignedTo.employee', select: 'firstName lastName employeeCode' },
      { path: 'project', select: 'name projectCode' }
    ])

    // Add to assignment history
    task.assignmentHistory.push({
      action: 'assigned',
      to: taskData.assignedTo[0].employee, // Primary assignee
      performedBy: currentEmployeeId,
      timestamp: new Date(),
      reason: 'Initial task creation'
    })

    await task.save()

    // Log activity for task creation
    await logActivity({
      employeeId: currentEmployeeId,
      type: 'task_create',
      action: 'Created task',
      details: `"${task.title}" - Due: ${new Date(task.dueDate).toLocaleDateString()}`,
      metadata: {
        taskId: task._id,
        priority: task.priority,
        assignmentType: assignmentType
      },
      relatedModel: 'Task',
      relatedId: task._id
    })

    // Send push notifications to assigned employees and emit Socket.IO event
    try {
      const assignedEmployeeIds = taskData.assignedTo.map(a => a.employee)
      const assignedUsers = await User.find({ employeeId: { $in: assignedEmployeeIds } }).select('_id')
      const assignedUserIds = assignedUsers.map(u => u._id.toString())

      if (assignedUserIds.length > 0) {
        // Send Firebase notification to each assignee
        for (const assigneeUserId of assignedUserIds) {
          await sendTaskAssignedNotification({
            taskId: task._id.toString(),
            assigneeId: assigneeUserId,
            title: task.title,
            assignedBy: decoded.userId,
            dueDate: task.dueDate
          })
        }

        // Emit Socket.IO event for real-time notification
        try {
          const io = global.io
          if (io) {
            const assigner = await Employee.findById(currentEmployeeId).select('firstName lastName')
            const assignerName = assigner ? `${assigner.firstName} ${assigner.lastName}` : 'Manager'

            assignedUserIds.forEach(userId => {
              io.to(`user:${userId}`).emit('task-assigned', {
                _id: task._id.toString(),
                title: task.title,
                priority: task.priority,
                dueDate: task.dueDate,
                assignerName: assignerName
              })
            })
            console.log(`Socket.IO task-assigned event emitted to ${assignedUserIds.length} user(s)`)
          }
        } catch (socketError) {
          console.error('Failed to emit Socket.IO task-assigned event:', socketError)
        }

        console.log(`Firebase task assignment notifications sent to ${assignedUserIds.length} user(s)`)
      }
    } catch (notifError) {
      console.error('Failed to send task assignment notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      data: task
    })

  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create task' },
      { status: 500 }
    )
  }
}

// Helper function to check assignment permissions
async function checkAssignmentPermission(assignerId, assigneeId, assignerRole) {
  try {
    // Validate input
    if (!assignerId || !assigneeId) {
      console.error('Invalid IDs provided:', { assignerId, assigneeId })
      return { allowed: false, reason: 'Invalid employee IDs' }
    }

    // Self assignment is always allowed
    if (assignerId.toString() === assigneeId.toString()) {
      return { allowed: true, reason: 'self_assignment' }
    }

    const assigner = await Employee.findById(assignerId)
    const assignee = await Employee.findById(assigneeId)

    if (!assigner) {
      console.error('Assigner not found:', assignerId)
      return { allowed: false, reason: 'Assigner not found' }
    }

    if (!assignee) {
      console.error('Assignee not found:', assigneeId)
      return { allowed: false, reason: 'Assignee not found' }
    }

    // Load assignee user role (if any)
    const assigneeUser = await User.findOne({ employeeId: assigneeId }).select('role')
    const assigneeRole = assigneeUser?.role

    // Admin and HR can assign to anyone
    if (['admin', 'hr'].includes(assignerRole)) {
      return { allowed: true, reason: 'admin_or_hr_privileges' }
    }

    // Managers CANNOT assign to HR or Admin
    if (assignerRole === 'manager') {
      if (['hr', 'admin'].includes(assigneeRole)) {
        return { allowed: false, reason: 'Managers cannot assign tasks to HR or Admin' }
      }

      // Check if manager of this employee (direct report)
      if (assignee.reportingManager?.toString() === assignerId.toString()) {
        return { allowed: true, reason: 'manager_to_direct_report' }
      }

      // Check if same department (peer assignment)
      if (assigner.department && assignee.department &&
          assigner.department.toString() === assignee.department.toString()) {
        return { allowed: true, reason: 'same_department_peer' }
      }

      return { allowed: false, reason: 'Manager can only assign to direct reports or same department' }
    }

    // Regular employees CANNOT assign to HR or Admin
    if (['hr', 'admin'].includes(assigneeRole)) {
      return { allowed: false, reason: 'Employees cannot assign tasks to HR or Admin' }
    }

    // Regular employees can only assign to same department colleagues
    if (assigner.department && assignee.department &&
        assigner.department.toString() === assignee.department.toString()) {
      return { allowed: true, reason: 'same_department_colleague' }
    }

    return { allowed: false, reason: 'Employees can only assign to same department colleagues' }

  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'permission_check_failed' }
  }
}
