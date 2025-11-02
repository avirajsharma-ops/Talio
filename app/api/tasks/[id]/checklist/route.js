import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Task from '@/models/Task'
import User from '@/models/User'
import Project from '@/models/Project'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// POST - Add checklist item to task
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

    const { title, description, required, dueDate, order } = await request.json()

    if (!title) {
      return NextResponse.json(
        { success: false, message: 'Checklist item title is required' },
        { status: 400 }
      )
    }

    // Get task
    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to add checklist items
    const isAssignedBy = task.assignedBy.toString() === user.employeeId.toString()
    const isAssignedTo = task.assignedTo.some(
      a => a.employee.toString() === user.employeeId.toString()
    )
    const isAdmin = user.role === 'admin'

    if (!isAssignedBy && !isAssignedTo && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to add checklist items' },
        { status: 403 }
      )
    }

    // Add checklist item
    task.checklist.push({
      title,
      description: description || '',
      completed: false,
      required: required || false,
      dueDate: dueDate || null,
      order: order !== undefined ? order : task.checklist.length
    })

    await task.save()

    // Recalculate progress based on checklist
    const completedItems = task.checklist.filter(item => item.completed).length
    const totalItems = task.checklist.length
    task.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    await task.save()

    const updatedTask = await Task.findById(params.id)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode')
      .populate('checklist.completedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Checklist item added successfully',
      data: updatedTask,
    })
  } catch (error) {
    console.error('Add checklist item error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to add checklist item' },
      { status: 500 }
    )
  }
}

// PATCH - Update checklist item (toggle completion)
export async function PATCH(request, { params }) {
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

    const { checklistItemId, completed } = await request.json()

    if (!checklistItemId) {
      return NextResponse.json(
        { success: false, message: 'Checklist item ID is required' },
        { status: 400 }
      )
    }

    // Get task
    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check if user has permission
    const isAssignedTo = task.assignedTo.some(
      a => a.employee.toString() === user.employeeId.toString()
    )
    const isAdmin = user.role === 'admin'

    if (!isAssignedTo && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update checklist items' },
        { status: 403 }
      )
    }

    // Find and update checklist item
    const checklistItem = task.checklist.id(checklistItemId)
    if (!checklistItem) {
      return NextResponse.json(
        { success: false, message: 'Checklist item not found' },
        { status: 404 }
      )
    }

    checklistItem.completed = completed
    if (completed) {
      checklistItem.completedBy = user.employeeId
      checklistItem.completedAt = new Date()
    } else {
      checklistItem.completedBy = null
      checklistItem.completedAt = null
    }

    // Recalculate progress based on checklist
    const completedItems = task.checklist.filter(item => item.completed).length
    const totalItems = task.checklist.length
    task.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    // Auto-update task status based on progress
    if (task.progress === 100 && task.status === 'in_progress') {
      task.status = 'review'
    } else if (task.progress > 0 && task.status === 'assigned') {
      task.status = 'in_progress'
    }

    await task.save()

    // Update project analytics if task is part of a project
    if (task.project) {
      const project = await Project.findById(task.project)
      if (project) {
        const projectTasks = await Task.find({ project: task.project })
        const completedTasks = projectTasks.filter(t => t.status === 'completed').length
        project.analytics.completedTasks = completedTasks
        
        // Calculate overall project progress
        const totalProgress = projectTasks.reduce((sum, t) => sum + (t.progress || 0), 0)
        project.progress = projectTasks.length > 0 
          ? Math.round(totalProgress / projectTasks.length) 
          : 0
        
        await project.save()
      }
    }

    const updatedTask = await Task.findById(params.id)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode')
      .populate('checklist.completedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Checklist item updated successfully',
      data: updatedTask,
    })
  } catch (error) {
    console.error('Update checklist item error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}

// DELETE - Remove checklist item
export async function DELETE(request, { params }) {
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

    const { searchParams } = new URL(request.url)
    const checklistItemId = searchParams.get('checklistItemId')

    if (!checklistItemId) {
      return NextResponse.json(
        { success: false, message: 'Checklist item ID is required' },
        { status: 400 }
      )
    }

    // Get task
    const task = await Task.findById(params.id)
    if (!task) {
      return NextResponse.json(
        { success: false, message: 'Task not found' },
        { status: 404 }
      )
    }

    // Check permission
    const isAssignedBy = task.assignedBy.toString() === user.employeeId.toString()
    const isAdmin = user.role === 'admin'

    if (!isAssignedBy && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to remove checklist items' },
        { status: 403 }
      )
    }

    // Remove checklist item
    task.checklist.pull(checklistItemId)

    // Recalculate progress
    const completedItems = task.checklist.filter(item => item.completed).length
    const totalItems = task.checklist.length
    task.progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

    await task.save()

    return NextResponse.json({
      success: true,
      message: 'Checklist item removed successfully',
    })
  } catch (error) {
    console.error('Remove checklist item error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove checklist item' },
      { status: 500 }
    )
  }
}

