import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import Project from '@/models/ProjectNew'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// GET - Get all tasks for a project
export async function GET(request, { params }) {
  try {
    await connectDB()

    // Verify JWT token
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { payload: decoded } = await jwtVerify(token, JWT_SECRET)

    // Verify project exists
    const project = await Project.findById(params.id)
    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = { project: params.id }

    if (status) {
      query.status = status
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode designation')
      .populate('parentTask', 'title taskNumber')
      .populate('approvedBy', 'firstName lastName')
      .populate('checklist.completedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .lean()

    // Calculate completion percentage for each task
    const tasksWithCompletion = tasks.map(task => {
      let completionPercentage = task.progress || 0

      // If task has checklist, calculate based on completed items
      if (task.checklist && task.checklist.length > 0) {
        const completedItems = task.checklist.filter(item => item.completed).length
        completionPercentage = Math.round((completedItems / task.checklist.length) * 100)
      }

      return {
        ...task,
        completionPercentage
      }
    })

    return NextResponse.json({
      success: true,
      data: tasksWithCompletion,
    })
  } catch (error) {
    console.error('Get project tasks error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch project tasks' },
      { status: 500 }
    )
  }
}

// POST - Create task for project
export async function POST(request, { params }) {
  try {
    await connectDB()

    // Verify JWT token
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { payload: decoded } = await jwtVerify(token, JWT_SECRET)
    
    // Get current user
    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Verify project exists
    const project = await Project.findById(params.id)
    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to create tasks
    const isProjectManager = project.projectManager.toString() === user.employeeId.toString()
    const isAdmin = user.role === 'admin'
    const teamMember = project.team.find(
      t => t.member.toString() === user.employeeId.toString() && t.isActive
    )
    const hasPermission = teamMember?.permissions?.includes('assign_tasks')

    if (!isProjectManager && !isAdmin && !hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create tasks for this project' },
        { status: 403 }
      )
    }

    const data = await request.json()

    // Create task with project reference
    const task = await Task.create({
      ...data,
      project: params.id,
      assignedBy: user.employeeId,
      assignmentType: data.assignmentType || 'manager_assigned'
    })

    // Update project analytics
    project.analytics.totalTasks = (project.analytics.totalTasks || 0) + 1
    await project.save()

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode designation')
      .populate('project', 'name projectCode')

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: populatedTask,
    }, { status: 201 })
  } catch (error) {
    console.error('Create project task error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create task' },
      { status: 500 }
    )
  }
}

