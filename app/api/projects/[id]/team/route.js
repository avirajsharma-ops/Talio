import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Employee from '@/models/Employee'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// POST - Add team member to project
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

    const { employeeId, role, permissions, allocation, isCrossDepartment } = await request.json()

    // Get project
    const project = await Project.findById(params.id)
    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // Check permission
    const isProjectManager = project.projectManager.toString() === user.employeeId.toString()
    const isAdmin = user.role === 'admin'
    const teamMember = project.team.find(
      t => t.member.toString() === user.employeeId.toString() && t.isActive
    )
    const hasPermission = teamMember?.permissions?.includes('manage_team')

    if (!isProjectManager && !isAdmin && !hasPermission) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to add team members' },
        { status: 403 }
      )
    }

    // Get employee details
    const employee = await Employee.findById(employeeId).populate('department')
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee is already a team member
    const existingMember = project.team.find(
      t => t.member.toString() === employeeId && t.isActive
    )
    if (existingMember) {
      return NextResponse.json(
        { success: false, message: 'Employee is already a team member' },
        { status: 400 }
      )
    }

    // Add to team
    project.team.push({
      member: employeeId,
      role: role || 'developer',
      permissions: permissions || ['view'],
      allocation: allocation || 100,
      joinedAt: new Date(),
      isActive: true
    })

    // If cross-department, add to collaboration
    if (isCrossDepartment && employee.department) {
      const projectDept = project.department.toString()
      const employeeDept = employee.department._id.toString()

      if (projectDept !== employeeDept) {
        // Enable cross-department collaboration
        if (!project.crossDepartmentCollaboration) {
          project.crossDepartmentCollaboration = {
            enabled: true,
            departments: [],
            collaborators: []
          }
        } else {
          project.crossDepartmentCollaboration.enabled = true
        }

        // Add department if not already added
        if (!project.crossDepartmentCollaboration.departments.includes(employeeDept)) {
          project.crossDepartmentCollaboration.departments.push(employeeDept)
        }

        // Add collaborator
        project.crossDepartmentCollaboration.collaborators.push({
          employee: employeeId,
          department: employeeDept,
          role: role || 'developer',
          addedAt: new Date()
        })
      }
    }

    await project.save()

    const updatedProject = await Project.findById(params.id)
      .populate('team.member', 'firstName lastName employeeCode email designation department')
      .populate('crossDepartmentCollaboration.departments', 'name code')
      .populate('crossDepartmentCollaboration.collaborators.employee', 'firstName lastName employeeCode')
      .populate('crossDepartmentCollaboration.collaborators.department', 'name')

    return NextResponse.json({
      success: true,
      message: 'Team member added successfully',
      data: updatedProject,
    })
  } catch (error) {
    console.error('Add team member error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to add team member' },
      { status: 500 }
    )
  }
}

// DELETE - Remove team member from project
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
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { success: false, message: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get project
    const project = await Project.findById(params.id)
    if (!project) {
      return NextResponse.json(
        { success: false, message: 'Project not found' },
        { status: 404 }
      )
    }

    // Check permission
    const isProjectManager = project.projectManager.toString() === user.employeeId.toString()
    const isAdmin = user.role === 'admin'

    if (!isProjectManager && !isAdmin) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to remove team members' },
        { status: 403 }
      )
    }

    // Find and deactivate team member
    const teamMember = project.team.find(
      t => t.member.toString() === employeeId && t.isActive
    )

    if (!teamMember) {
      return NextResponse.json(
        { success: false, message: 'Team member not found' },
        { status: 404 }
      )
    }

    teamMember.isActive = false
    teamMember.leftAt = new Date()

    // Remove from cross-department collaborators if exists
    if (project.crossDepartmentCollaboration?.collaborators) {
      project.crossDepartmentCollaboration.collaborators = 
        project.crossDepartmentCollaboration.collaborators.filter(
          c => c.employee.toString() !== employeeId
        )
    }

    await project.save()

    return NextResponse.json({
      success: true,
      message: 'Team member removed successfully',
    })
  } catch (error) {
    console.error('Remove team member error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to remove team member' },
      { status: 500 }
    )
  }
}

