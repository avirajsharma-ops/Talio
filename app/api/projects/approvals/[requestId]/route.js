import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Task from '@/models/Task'
import TaskAssignee from '@/models/TaskAssignee'
import ProjectApprovalRequest from '@/models/ProjectApprovalRequest'
import User from '@/models/User'
import Employee from '@/models/Employee'
import { createTimelineEvent, calculateCompletionPercentage } from '@/lib/projectService'

// PUT - Approve or reject a request
export async function PUT(request, { params }) {
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

    const { requestId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const approvalRequest = await ProjectApprovalRequest.findById(requestId)
      .populate('relatedTask')
    
    if (!approvalRequest) {
      return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: 'This request has already been processed' 
      }, { status: 400 })
    }

    const project = await Project.findById(approvalRequest.project)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Only project head or admin can approve
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const isProjectHead = project.projectHead.toString() === user.employeeId.toString()

    if (!isAdmin && !isProjectHead) {
      return NextResponse.json({ 
        success: false, 
        message: 'Only project head can approve or reject requests' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { action, comment } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Valid action (approve/reject) is required' 
      }, { status: 400 })
    }

    const isApproved = action === 'approve'

    // Update the request
    approvalRequest.status = isApproved ? 'approved' : 'rejected'
    approvalRequest.reviewedBy = user.employeeId
    approvalRequest.reviewedAt = new Date()
    approvalRequest.reviewerComment = comment || ''
    await approvalRequest.save()

    // Handle the approval action
    if (isApproved) {
      switch (approvalRequest.type) {
        case 'task_deletion':
          if (approvalRequest.relatedTask) {
            const taskTitle = approvalRequest.relatedTask.title
            const taskId = approvalRequest.relatedTask._id
            
            // Delete the task and its assignees
            await TaskAssignee.deleteMany({ task: taskId })
            await Task.findByIdAndDelete(taskId)
            
            // Recalculate completion percentage
            calculateCompletionPercentage(approvalRequest.project).catch(console.error)

            // Create timeline event
            createTimelineEvent({
              project: approvalRequest.project,
              type: 'task_deleted',
              createdBy: user.employeeId,
              description: `Task "${taskTitle}" was deleted (approved by project head)`,
              metadata: { taskTitle, approvedBy: user.employeeId }
            }).catch(console.error)
          }
          break
          
        case 'project_completion':
          // Handle project completion approval
          await Project.findByIdAndUpdate(approvalRequest.project, {
            status: 'approved',
            completedAt: new Date()
          })
          
          createTimelineEvent({
            project: approvalRequest.project,
            type: 'project_approved',
            createdBy: user.employeeId,
            description: 'Project completion approved',
            metadata: { approvedBy: user.employeeId }
          }).catch(console.error)
          break
          
        case 'member_removal':
          // Handle member removal - to be implemented
          break
      }
    } else {
      // For rejection, create a timeline event
      createTimelineEvent({
        project: approvalRequest.project,
        type: 'comment_added',
        createdBy: user.employeeId,
        description: `Request rejected: ${approvalRequest.type.replace('_', ' ')}${comment ? ` - ${comment}` : ''}`,
        metadata: { requestType: approvalRequest.type, rejectionComment: comment }
      }).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      message: isApproved ? 'Request approved' : 'Request rejected'
    })
  } catch (error) {
    console.error('Process approval request error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE - Cancel a request (by requester)
export async function DELETE(request, { params }) {
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

    const { requestId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const approvalRequest = await ProjectApprovalRequest.findById(requestId)
    if (!approvalRequest) {
      return NextResponse.json({ success: false, message: 'Request not found' }, { status: 404 })
    }

    // Only requester, project head, or admin can cancel
    const isRequester = approvalRequest.requestedBy.toString() === user.employeeId.toString()
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    
    const project = await Project.findById(approvalRequest.project)
    const isProjectHead = project && project.projectHead.toString() === user.employeeId.toString()

    if (!isRequester && !isAdmin && !isProjectHead) {
      return NextResponse.json({ 
        success: false, 
        message: 'You can only cancel your own requests' 
      }, { status: 403 })
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: 'Only pending requests can be cancelled' 
      }, { status: 400 })
    }

    await ProjectApprovalRequest.findByIdAndDelete(requestId)

    return NextResponse.json({
      success: true,
      message: 'Request cancelled'
    })
  } catch (error) {
    console.error('Cancel approval request error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
