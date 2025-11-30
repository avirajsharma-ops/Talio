import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Project from '@/models/ProjectNew'
import User from '@/models/User'
import Employee from '@/models/Employee'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// POST - Respond to project assignment (accept/decline)
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

    const { id: projectId } = await params
    const { action, reason } = await request.json()

    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid action. Must be "accept" or "decline"' 
      }, { status: 400 })
    }

    // Find the project
    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Find the user's team membership
    const teamMemberIndex = project.team.findIndex(
      t => t.member.toString() === user.employeeId.toString()
    )

    if (teamMemberIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        message: 'You are not assigned to this project' 
      }, { status: 403 })
    }

    const teamMember = project.team[teamMemberIndex]

    // Check if already responded
    if (teamMember.assignmentStatus !== 'pending') {
      return NextResponse.json({ 
        success: false, 
        message: `You have already ${teamMember.assignmentStatus} this assignment` 
      }, { status: 400 })
    }

    // Update the assignment status
    project.team[teamMemberIndex].assignmentStatus = action === 'accept' ? 'accepted' : 'declined'
    project.team[teamMemberIndex].respondedAt = new Date()
    
    if (action === 'decline') {
      project.team[teamMemberIndex].declineReason = reason || ''
      project.team[teamMemberIndex].isActive = false
    }

    await project.save()

    // Notify project manager via Socket.IO
    try {
      const io = global.io
      if (io && project.projectManager) {
        const projectManager = await Employee.findById(project.projectManager).populate('userId')
        const currentEmployee = await Employee.findById(user.employeeId).select('firstName lastName')
        
        if (projectManager?.userId?._id) {
          io.to(`user:${projectManager.userId._id}`).emit('project-assignment-response', {
            projectId: project._id,
            projectName: project.name,
            employeeName: `${currentEmployee.firstName} ${currentEmployee.lastName}`,
            action: action,
            reason: reason,
            timestamp: new Date()
          })
        }
      }
    } catch (socketError) {
      console.error('Failed to send socket notification:', socketError)
    }

    return NextResponse.json({
      success: true,
      message: action === 'accept' 
        ? 'You have joined the project team!' 
        : 'You have declined the project assignment',
      data: {
        projectId: project._id,
        status: action === 'accept' ? 'accepted' : 'declined'
      }
    })

  } catch (error) {
    console.error('Assignment response error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to process assignment response' },
      { status: 500 }
    )
  }
}
