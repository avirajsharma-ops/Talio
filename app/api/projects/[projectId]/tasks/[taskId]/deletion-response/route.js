import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Task from '@/models/Task'
import TaskAssignee from '@/models/TaskAssignee'
import User from '@/models/User'
import { 
  calculateCompletionPercentage,
  createTimelineEvent 
} from '@/lib/projectService'

// POST - Respond to deletion request (approve/reject)
export async function POST(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const { projectId, taskId } = await params
    const { action, reason } = await request.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 })
    }

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const task = await Task.findById(taskId)
    if (!task || task.project.toString() !== projectId) {
      return NextResponse.json({ success: false, message: 'Task not found' }, { status: 404 })
    }

    // Check if there's a pending deletion request
    if (!task.deletionRequest || task.deletionRequest.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: 'No pending deletion request found' 
      }, { status: 400 })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Check permissions - only project head, admins, or assignees can respond
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const projectHeadIds = project.projectHeads && project.projectHeads.length > 0 
      ? project.projectHeads.map(h => h.toString())
      : project.projectHead 
        ? [project.projectHead.toString()] 
        : []
    const isProjectHead = projectHeadIds.includes(user.employeeId.toString())
    
    // Check if user is an assignee
    const isAssignee = await TaskAssignee.findOne({
      task: taskId,
      user: user.employeeId,
      assignmentStatus: 'accepted'
    })

    // Only project head, admin, or assignee (if not the requester) can respond
    const isRequester = task.deletionRequest.requestedBy.toString() === user.employeeId.toString()
    
    if (!isAdmin && !isProjectHead && (!isAssignee || isRequester)) {
      return NextResponse.json({ 
        success: false, 
        message: 'You do not have permission to respond to this deletion request' 
      }, { status: 403 })
    }

    if (action === 'approve') {
      const taskTitle = task.title

      // Delete the task and its assignees
      await TaskAssignee.deleteMany({ task: taskId })
      await Task.findByIdAndDelete(taskId)

      // Recalculate completion percentage
      calculateCompletionPercentage(projectId).catch(console.error)

      // Create timeline event
      await createTimelineEvent({
        project: projectId,
        type: 'task_deleted',
        createdBy: user.employeeId,
        description: `Task "${taskTitle}" was deleted (deletion approved)`,
        metadata: { taskTitle, approvedBy: user.employeeId }
      })

      return NextResponse.json({
        success: true,
        message: 'Deletion approved. Task has been deleted.'
      })
    } else {
      // Reject the deletion request
      task.deletionRequest = {
        ...task.deletionRequest,
        status: 'rejected',
        respondedBy: user.employeeId,
        respondedAt: new Date(),
        rejectionReason: reason || 'No reason provided'
      }
      await task.save()

      // Create timeline event
      await createTimelineEvent({
        project: projectId,
        type: 'task_deletion_rejected',
        createdBy: user.employeeId,
        relatedTask: taskId,
        description: `Deletion request for task "${task.title}" was rejected`,
        metadata: { taskTitle: task.title, reason }
      })

      return NextResponse.json({
        success: true,
        message: 'Deletion request rejected.'
      })
    }
  } catch (error) {
    console.error('Deletion response error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
