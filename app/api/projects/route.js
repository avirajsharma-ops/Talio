import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Project from '@/models/ProjectNew'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Department from '@/models/Department'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// GET - List projects
export async function GET(request) {
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
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const myProjects = searchParams.get('myProjects') === 'true'

    let query = {}

    // Filter by status
    if (status) {
      query.status = status
    }

    // Filter by department
    if (department) {
      query.department = department
    }

    // For non-admin users, show only their projects or department projects
    if (user.role !== 'admin') {
      if (myProjects) {
        // Show projects where user is a team member or project manager
        query.$or = [
          { projectManager: user.employeeId },
          { 'team.member': user.employeeId, 'team.isActive': true },
          { 'crossDepartmentCollaboration.collaborators.employee': user.employeeId }
        ]
      } else {
        // Show department projects
        const employee = await Employee.findById(user.employeeId).select('department')
        if (employee && employee.department) {
          query.$or = [
            { department: employee.department },
            { 'crossDepartmentCollaboration.departments': employee.department },
            { projectManager: user.employeeId },
            { 'team.member': user.employeeId, 'team.isActive': true }
          ]
        }
      }
    }

    const projects = await Project.find(query)
      .populate('projectManager', 'firstName lastName employeeCode email')
      .populate('projectOwner', 'firstName lastName employeeCode')
      .populate('department', 'name code')
      .populate('team.member', 'firstName lastName employeeCode email designation')
      .populate('crossDepartmentCollaboration.departments', 'name code')
      .populate('crossDepartmentCollaboration.collaborators.employee', 'firstName lastName employeeCode')
      .populate('crossDepartmentCollaboration.collaborators.department', 'name')
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: projects,
    })
  } catch (error) {
    console.error('Get projects error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST - Create project
export async function POST(request) {
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

    // Validate department exists
    const department = await Department.findById(data.department)
    if (!department) {
      return NextResponse.json(
        { success: false, message: 'Department not found' },
        { status: 404 }
      )
    }

    // Process team members to add assignedBy field
    if (data.team && Array.isArray(data.team)) {
      data.team = data.team.map(member => ({
        ...member,
        assignedBy: user.employeeId, // Track who assigned each member
        assignmentStatus: member.member?.toString() === user.employeeId?.toString() 
          ? 'accepted'  // Creator auto-accepts
          : (member.assignmentStatus || 'pending')
      }))
    }

    // Create project
    const project = await Project.create({
      ...data,
      // Ensure project manager is set
      projectManager: data.projectManager || user.employeeId,
    })

    const populatedProject = await Project.findById(project._id)
      .populate('projectManager', 'firstName lastName employeeCode email')
      .populate('projectOwner', 'firstName lastName employeeCode')
      .populate('department', 'name code')
      .populate('team.member', 'firstName lastName employeeCode email')
      .populate('crossDepartmentCollaboration.departments', 'name code')
      .populate('crossDepartmentCollaboration.collaborators.employee', 'firstName lastName employeeCode')
      .populate('crossDepartmentCollaboration.collaborators.department', 'name')

    // Emit Socket.IO events for project team members
    try {
      const io = global.io
      if (io && data.team && Array.isArray(data.team)) {
        const { sendPushToUser } = require('@/lib/pushNotification')
        const creatorEmployee = await Employee.findById(user.employeeId).select('firstName lastName')

        for (const teamMember of data.team) {
          // Skip notifications for the creator (they already know)
          if (teamMember.member?.toString() === user.employeeId?.toString()) continue
          
          const employeeDoc = await Employee.findById(teamMember.member).populate('userId')
          const employeeUserId = employeeDoc?.userId?._id || employeeDoc?.userId

          if (employeeUserId) {
            // Socket.IO event
            io.to(`user:${employeeUserId}`).emit('project-invitation', {
              project: populatedProject,
              action: 'invited',
              assignedBy: user.employeeId,
              assignedByName: `${creatorEmployee?.firstName || ''} ${creatorEmployee?.lastName || ''}`.trim(),
              message: `${creatorEmployee?.firstName || 'Someone'} invited you to join project: ${project.name}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Project invitation sent to user:${employeeUserId}`)

            // Push notification
            try {
              await sendPushToUser(
                employeeUserId,
                {
                  title: '📋 Project Invitation',
                  body: `${creatorEmployee?.firstName || 'Someone'} invited you to join project: ${project.name}`,
                },
                {
                  clickAction: '/dashboard/projects',
                  eventType: 'project_invitation',
                  data: {
                    projectId: project._id.toString(),
                    type: 'project_invitation'
                  }
                }
              )
              console.log(`📲 [Push] Project invitation sent to user:${employeeUserId}`)
            } catch (pushError) {
              console.error('Failed to send project push notification:', pushError)
            }
          }
        }
      }
    } catch (socketError) {
      console.error('Failed to send project invitation socket notification:', socketError)
    }

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      data: populatedProject,
    }, { status: 201 })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create project' },
      { status: 500 }
    )
  }
}

