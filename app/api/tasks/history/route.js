import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Project from '@/models/Project'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { verifyToken } from '@/lib/auth'

// GET - Fetch task history (including deleted tasks)

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const currentUser = await User.findById(decoded.userId).select('employeeId role')
    const currentEmployeeId = currentUser?.employeeId

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 50
    const skip = (page - 1) * limit

    // Build query based on user role and hierarchy
    let query = {}

    if (decoded.role === 'admin') {
      // Admin can see all task history
      // No filter needed - will see everything
    } else if (decoded.role === 'hr') {
      // HR can see department task history
      const empDoc = await Employee.findById(currentEmployeeId)
      const deptEmployees = await Employee.find({
        department: empDoc?.department
      }).select('_id')

      const deptEmployeeIds = deptEmployees.map(emp => emp._id)

      query.$or = [
        { 'assignedTo.employee': { $in: deptEmployeeIds } },
        { assignedBy: { $in: deptEmployeeIds } }
      ]
    } else if (decoded.role === 'manager') {
      // Manager can see their team's task history (department-wise)
      const empDoc = await Employee.findById(currentEmployeeId)

      // Get all team members reporting to this manager
      const teamMembers = await Employee.find({
        reportingManager: currentEmployeeId
      }).select('_id')

      const teamMemberIds = teamMembers.map(member => member._id)
      teamMemberIds.push(currentEmployeeId) // Include manager's own tasks

      query.$or = [
        { 'assignedTo.employee': { $in: teamMemberIds } },
        { assignedBy: { $in: teamMemberIds } }
      ]
    } else {
      // Employee can only see their own task history
      query.$or = [
        { 'assignedTo.employee': currentEmployeeId },
        { assignedBy: currentEmployeeId }
      ]
    }

    // Apply additional filters
    const status = searchParams.get('status')
    if (status) {
      query.status = status
    }

    const deletedOnly = searchParams.get('deletedOnly')
    if (deletedOnly === 'true') {
      query.isDeleted = true
    }

    const search = searchParams.get('search')
    if (search) {
      const searchQuery = {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { taskNumber: { $regex: search, $options: 'i' } }
        ]
      }

      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            searchQuery
          ]
        }
      } else {
        Object.assign(query, searchQuery)
      }
    }

    // Fetch tasks with pagination
    const tasks = await Project.find(query)
      .populate('assignedBy', 'firstName lastName employeeCode')
      .populate('assignedTo.employee', 'firstName lastName employeeCode department')
      .populate('deletedBy', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Project.countDocuments(query)

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get task history error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch task history' },
      { status: 500 }
    )
  }
}

