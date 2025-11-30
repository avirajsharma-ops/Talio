import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import Project from '@/models/ProjectNew'
import User from '@/models/User'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// GET - Get pending project invitations for current user
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

    // Find projects where user has pending invitations
    const pendingProjects = await Project.find({
      'team.member': user.employeeId,
      'team.assignmentStatus': 'pending'
    })
      .populate('projectManager', 'firstName lastName employeeCode email')
      .populate('department', 'name code')
      .populate({
        path: 'team.member',
        select: 'firstName lastName employeeCode'
      })
      .sort({ createdAt: -1 })
      .lean()

    // Filter to only include pending entries for this user
    const invitations = pendingProjects.map(project => {
      const myTeamEntry = project.team.find(
        t => t.member?._id?.toString() === user.employeeId.toString() && t.assignmentStatus === 'pending'
      )
      
      if (!myTeamEntry) return null

      return {
        _id: project._id,
        name: project.name,
        description: project.description,
        summary: project.summary,
        projectCode: project.projectCode,
        priority: project.priority,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        projectManager: project.projectManager,
        department: project.department,
        assignedRole: myTeamEntry.role,
        assignedAt: myTeamEntry.joinedAt,
        teamSize: project.team.filter(t => t.isActive).length
      }
    }).filter(Boolean)

    return NextResponse.json({
      success: true,
      data: invitations,
      count: invitations.length
    })

  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
