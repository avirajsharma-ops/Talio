import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import ProjectApprovalRequest from '@/models/ProjectApprovalRequest'
import User from '@/models/User'
import Employee from '@/models/Employee'

// GET - Get all pending approval requests for projects where user is project head
export async function GET(request) {
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

    const user = await User.findById(decoded.userId).select('employeeId role')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Get all projects where user is project head
    const myProjects = await Project.find({ 
      projectHead: user.employeeId,
      status: { $ne: 'archived' }
    }).select('_id name')

    const projectIds = myProjects.map(p => p._id)

    if (projectIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'No projects where you are project head'
      })
    }

    // Build query
    const query = { project: { $in: projectIds } }
    if (status !== 'all') {
      query.status = status
    }

    // Get approval requests
    const requests = await ProjectApprovalRequest.find(query)
      .populate('project', 'name status')
      .populate('requestedBy', 'firstName lastName profilePicture employeeCode')
      .populate('reviewedBy', 'firstName lastName')
      .populate('relatedTask', 'title status priority')
      .populate('relatedMember', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: requests,
      stats: {
        pending: await ProjectApprovalRequest.countDocuments({ project: { $in: projectIds }, status: 'pending' }),
        approved: await ProjectApprovalRequest.countDocuments({ project: { $in: projectIds }, status: 'approved' }),
        rejected: await ProjectApprovalRequest.countDocuments({ project: { $in: projectIds }, status: 'rejected' })
      }
    })
  } catch (error) {
    console.error('Get approval requests error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
