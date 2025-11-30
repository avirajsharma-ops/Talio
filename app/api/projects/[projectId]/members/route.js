import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import ProjectMember from '@/models/ProjectMember'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Chat from '@/models/Chat'
import { checkProjectAccess, createTimelineEvent } from '@/lib/projectService'
import {
  notifyProjectInvitation,
  notifyMemberAdded,
  notifyMemberRemoved,
  getProjectMemberUserIds
} from '@/lib/projectNotifications'

// GET - Get project members
export async function GET(request, { params }) {
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

    const { projectId } = await params

    const user = await User.findById(decoded.userId).select('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const members = await ProjectMember.find({ project: projectId })
      .populate({
        path: 'user',
        select: 'firstName lastName profilePicture email employeeCode department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('invitedBy', 'firstName lastName')
      .populate('sourceDepartment', 'name')
      .sort({ role: 1, createdAt: 1 })

    return NextResponse.json({
      success: true,
      data: members,
      currentEmployeeId: user.employeeId.toString()
    })
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST - Add/Invite member to project
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

    const { projectId } = await params

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    // Check if user can invite members
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const isHead = project.projectHead.toString() === user.employeeId.toString()
    const isCreator = project.createdBy.toString() === user.employeeId.toString()
    
    // Check member permissions
    const currentMembership = await ProjectMember.findOne({
      project: projectId,
      user: user.employeeId,
      invitationStatus: 'accepted'
    })
    
    const canInvite = isAdmin || isHead || isCreator || currentMembership?.permissions?.canInviteMembers

    if (!canInvite) {
      return NextResponse.json({ 
        success: false, 
        message: 'You do not have permission to invite members' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role = 'member', isExternal = false, sourceDepartment } = body

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 })
    }

    // Check if already a member
    const existingMember = await ProjectMember.findOne({
      project: projectId,
      user: userId
    })

    if (existingMember) {
      return NextResponse.json({ 
        success: false, 
        message: 'User is already a member of this project' 
      }, { status: 400 })
    }

    // Verify the user exists
    const invitedEmployee = await Employee.findById(userId)
    if (!invitedEmployee) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    // Create membership
    const membership = await ProjectMember.create({
      project: projectId,
      user: userId,
      role,
      invitationStatus: 'invited',
      invitedBy: user.employeeId,
      isExternal,
      sourceDepartment: isExternal ? sourceDepartment : invitedEmployee.department
    })

    // Add to chat group
    if (project.chatGroup) {
      await Chat.findByIdAndUpdate(project.chatGroup, {
        $addToSet: { participants: userId }
      })
    }

    // Create timeline event
    const inviterEmployee = await Employee.findById(user.employeeId)
    await createTimelineEvent({
      project: projectId,
      type: 'member_invited',
      createdBy: user.employeeId,
      relatedMember: userId,
      description: `${invitedEmployee.firstName} ${invitedEmployee.lastName} was invited to the project`,
      metadata: { role, isExternal }
    })

    // Send notification
    await notifyProjectInvitation(project, invitedEmployee, inviterEmployee)

    const populatedMembership = await ProjectMember.findById(membership._id)
      .populate('user', 'firstName lastName profilePicture email employeeCode department')
      .populate('invitedBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Member invited successfully',
      data: populatedMembership
    }, { status: 201 })
  } catch (error) {
    console.error('Add member error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// DELETE - Remove member from project
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

    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json({ success: false, message: 'Member ID is required' }, { status: 400 })
    }

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const project = await Project.findById(projectId)
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    const membership = await ProjectMember.findById(memberId).populate('user')
    if (!membership || membership.project.toString() !== projectId) {
      return NextResponse.json({ success: false, message: 'Member not found' }, { status: 404 })
    }

    // Cannot remove the project head
    if (membership.role === 'head') {
      return NextResponse.json({ 
        success: false, 
        message: 'Cannot remove the project head' 
      }, { status: 400 })
    }

    // Check permission to remove
    const isAdmin = ['admin', 'god_admin'].includes(user.role)
    const isHead = project.projectHead.toString() === user.employeeId.toString()
    const isSelf = membership.user._id.toString() === user.employeeId.toString()

    if (!isAdmin && !isHead && !isSelf) {
      return NextResponse.json({ 
        success: false, 
        message: 'You do not have permission to remove this member' 
      }, { status: 403 })
    }

    // Remove from chat group
    if (project.chatGroup) {
      await Chat.findByIdAndUpdate(project.chatGroup, {
        $pull: { participants: membership.user._id }
      })
    }

    // Create timeline event
    await createTimelineEvent({
      project: projectId,
      type: 'member_removed',
      createdBy: user.employeeId,
      relatedMember: membership.user._id,
      description: `${membership.user.firstName} ${membership.user.lastName} was removed from the project`,
      metadata: { removedBy: isSelf ? 'self' : 'admin' }
    })

    // Send notification if not self-removal
    if (!isSelf) {
      const removerEmployee = await Employee.findById(user.employeeId)
      await notifyMemberRemoved(project, membership.user, removerEmployee)
    }

    await ProjectMember.findByIdAndDelete(memberId)

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
