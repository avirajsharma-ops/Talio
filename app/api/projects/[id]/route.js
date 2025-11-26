import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import ProjectOld from '@/models/ProjectOld'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// GET - Get single project
export async function GET(request, { params }) {
  try {
    await connectDB()

    // Verify JWT token
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { payload: decoded } = await jwtVerify(token, JWT_SECRET)

    const project = await ProjectOld.findById(params.id)
      .populate('projectManager', 'firstName lastName employeeCode email designation')
      .populate('projectOwner', 'firstName lastName employeeCode')
      .populate('sponsor', 'firstName lastName employeeCode')
      .populate('department', 'name code')
      .populate('team.member', 'firstName lastName employeeCode email designation department')
      .populate('crossDepartmentCollaboration.departments', 'name code')
      .populate('crossDepartmentCollaboration.collaborators.employee', 'firstName lastName employeeCode designation')
      .populate('crossDepartmentCollaboration.collaborators.department', 'name')
      .populate('milestones.responsible', 'firstName lastName')
      .populate('stakeholders.employee', 'firstName lastName employeeCode')

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: project,
    })
  } catch (error) {
    console.error('Get project error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PUT - Update project
export async function PUT(request, { params }) {
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

    const data = await request.json()

    // Check if user has permission to update
    const existingProject = await ProjectOld.findById(params.id)
    if (!existingProject) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // Only project manager, admin, or team members with manage_team permission can update
    const isProjectManager = existingProject.projectManager.toString() === user.employeeId.toString()
    const isAdmin = user.role === 'admin'
    const teamMember = existingProject.team.find(
      t => t.member.toString() === user.employeeId.toString() && t.isActive
    )
    const hasPermission = teamMember?.permissions?.includes('manage_team')

    if (!isProjectManager && !isAdmin && !hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to update this project' },
        { status: 403 }
      )
    }

    const project = await ProjectOld.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('projectManager', 'firstName lastName employeeCode email')
      .populate('projectOwner', 'firstName lastName employeeCode')
      .populate('department', 'name code')
      .populate('team.member', 'firstName lastName employeeCode email')
      .populate('crossDepartmentCollaboration.departments', 'name code')
      .populate('crossDepartmentCollaboration.collaborators.employee', 'firstName lastName employeeCode')
      .populate('crossDepartmentCollaboration.collaborators.department', 'name')

    // Emit Socket.IO events if team members were added/updated
    try {
      const io = global.io
      if (io && data.team) {
        // Get previous team members
        const previousTeamIds = existingProject.team.map(t => t.member.toString())
        const newTeamIds = data.team.map(t => (typeof t.member === 'object' ? t.member._id : t.member).toString())

        // Find newly added team members
        const addedMembers = newTeamIds.filter(id => !previousTeamIds.includes(id))

        // Notify newly added team members
        for (const memberId of addedMembers) {
          const Employee = require('@/models/Employee').default
          const employeeDoc = await Employee.findById(memberId).populate('userId')
          const employeeUserId = employeeDoc?.userId?._id || employeeDoc?.userId

          if (employeeUserId) {
            io.to(`user:${employeeUserId}`).emit('project-assignment', {
              project,
              action: 'assigned',
              assignedBy: user.employeeId,
              message: `You have been assigned to project: ${project.name}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Project assignment sent to user:${employeeUserId}`)
          }
        }
      }
    } catch (socketError) {
      console.error('Failed to send project assignment socket notification:', socketError)
    }

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully',
      data: project,
    })
  } catch (error) {
    console.error('Update project error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE - Delete project
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

    // Only admin can delete projects
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only admins can delete projects' },
        { status: 403 }
      )
    }

    // Archive instead of delete
    const project = await ProjectOld.findByIdAndUpdate(
      params.id,
      { status: 'archived' },
      { new: true }
    )

    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project archived successfully',
    })
  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to archive project' },
      { status: 500 }
    )
  }
}

