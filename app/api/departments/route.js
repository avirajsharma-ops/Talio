import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Department from '@/models/Department'
import Employee from '@/models/Employee'

// GET - List all departments
export async function GET(request) {
  try {
    await connectDB()

    const departments = await Department.find({ isActive: true })
      .populate('head', 'firstName lastName employeeCode email')
      .sort({ name: 1 })
      .lean()

    // Add employee count for each department
    const departmentsWithCount = await Promise.all(
      departments.map(async (dept) => {
        const employeeCount = await Employee.countDocuments({
          department: dept._id,
          status: 'active'
        })
        return {
          ...dept,
          employeeCount
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: departmentsWithCount,
    })
  } catch (error) {
    console.error('Get departments error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch departments' },
      { status: 500 }
    )
  }
}

// POST - Create new department
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const department = await Department.create(data)

    return NextResponse.json({
      success: true,
      message: 'Department created successfully',
      data: department,
    }, { status: 201 })
  } catch (error) {
    console.error('Create department error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create department' },
      { status: 500 }
    )
  }
}

