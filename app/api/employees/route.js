import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import User from '@/models/User'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import queryCache from '@/lib/queryCache'
import bcrypt from 'bcryptjs'

// GET - List all employees with filters
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10
    const search = searchParams.get('search') || ''
    const department = searchParams.get('department')
    const status = searchParams.get('status')

    // Generate cache key
    const cacheKey = queryCache.generateKey('employees', page, limit, search, department, status)
    const cached = queryCache.get(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Build query
    const query = {}

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } },
      ]
    }

    if (department) {
      query.department = department
    }

    if (status) {
      query.status = status
    }

    const skip = (page - 1) * limit

    // Optimized: Use select() to fetch only needed fields and lean() for plain objects
    const employees = await Employee.find(query)
      .select('employeeCode firstName lastName email phone department designation reportingManager dateOfJoining status profilePicture')
      .populate({
        path: 'department',
        select: 'name _id',
        options: { strictPopulate: false, lean: true }
      })
      .populate({
        path: 'designation',
        select: 'title levelName level',
        options: { strictPopulate: false, lean: true }
      })
      .populate({
        path: 'reportingManager',
        select: 'firstName lastName',
        options: { strictPopulate: false, lean: true }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    // Optimized: Single query to get all user data
    const employeeIds = employees.map(emp => emp._id)
    const users = await User.find({ employeeId: { $in: employeeIds } })
      .select('_id email role employeeId')
      .lean()

    // Create a map of employeeId to user data
    const userMap = {}
    users.forEach(user => {
      if (user.employeeId) {
        userMap[user.employeeId.toString()] = {
          _id: user._id,
          email: user.email,
          role: user.role
        }
      }
    })

    // Add user data to employees
    const employeesWithUsers = employees.map(emp => ({
      ...emp,
      userId: userMap[emp._id.toString()] || null
    }))

    const total = await Employee.countDocuments(query)

    const response = {
      success: true,
      data: employeesWithUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }

    // Cache for 30 seconds
    queryCache.set(cacheKey, response, 30000)

    return NextResponse.json(response)
  } catch (error) {
    console.error('Get employees error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch employees', error: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new employee
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Optimized: Check both in parallel
    const [existingEmployee, existingEmail, existingUser] = await Promise.all([
      Employee.findOne({ employeeCode: data.employeeCode }).lean(),
      Employee.findOne({ email: data.email }).lean(),
      User.findOne({ email: data.email }).lean()
    ])

    if (existingEmployee) {
      return NextResponse.json(
        { success: false, message: 'Employee code already exists' },
        { status: 400 }
      )
    }

    if (existingEmail) {
      return NextResponse.json(
        { success: false, message: 'Email already exists' },
        { status: 400 }
      )
    }

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'User account with this email already exists' },
        { status: 400 }
      )
    }

    // Create employee first
    const employee = await Employee.create(data)

    // Create user account for the employee
    const password = data.password || 'employee123' // Default password if not provided

    const user = await User.create({
      email: data.email,
      password: password, // Let the pre-save hook handle hashing
      role: data.role || 'employee', // Default role is employee
      employeeId: employee._id,
    })

    const populatedEmployee = await Employee.findById(employee._id)
      .select('employeeCode firstName lastName email phone department designation reportingManager dateOfJoining status')
      .populate('department', 'name')
      .populate('designation', 'title levelName')
      .populate('reportingManager', 'firstName lastName')
      .lean()

    // Clear employee list cache
    queryCache.clearPattern('employees')

    return NextResponse.json({
      success: true,
      message: 'Employee and user account created successfully',
      data: populatedEmployee,
      credentials: {
        email: data.email,
        password: data.password || 'employee123',
        message: 'Please share these credentials with the employee'
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Create employee error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create employee' },
      { status: 500 }
    )
  }
}

