import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import ProjectOld from '@/models/ProjectOld'
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

    const projects = await ProjectOld.find(query)
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

    // Create project
    const project = await ProjectOld.create({
      ...data,
      // Ensure project manager is set
      projectManager: data.projectManager || user.employeeId,
    })

    const populatedProject = await ProjectOld.findById(project._id)
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

        for (const teamMember of data.team) {
          const Employee = require('@/models/Employee').default
          const employeeDoc = await Employee.findById(teamMember.member).populate('userId')
          const employeeUserId = employeeDoc?.userId?._id || employeeDoc?.userId

          if (employeeUserId) {
            // Socket.IO event
            io.to(`user:${employeeUserId}`).emit('project-assignment', {
              project: populatedProject,
              action: 'assigned',
              assignedBy: user.employeeId,
              message: `You have been assigned to project: ${project.name}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Project assignment sent to user:${employeeUserId}`)

            // FCM push notification
            try {
              await sendPushToUser(
                employeeUserId,
                {
                  title: '📊Prior Project Assigned',
                  body: `You have been assigned to project: ${project.name}`,
                },
                {
                  clickAction: '/dashboard/projects',
                  eventType: 'project_assignment',
                  data: {
                    projectId: project._id.toString(),
                    type: 'project_assignment'
                  }
                }
              )
              console.log(`📲 [FCM] Project assignment notification sent to user:${employeeUserId}`)
            } catch (fcmError) {
              console.error('Failed to send project FCM notification:', fcmError)
            }
          }
        }
      }
    } catch (socketError) {
      console.error('Failed to send project assignment socket notification:', socketError)
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

