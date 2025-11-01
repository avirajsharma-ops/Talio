import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'

// GET - Get single employee
export async function GET(request, { params }) {
  try {
    await connectDB()

    const employee = await Employee.findById(params.id)
      .populate('department', 'name')
      .populate('designation', 'title')
      .populate('reportingManager', 'firstName lastName email')

    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error('Get employee error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

// PUT - Update employee
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    // Check if employee exists
    const employee = await Employee.findById(params.id)
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check if employee code is being changed and already exists
    if (data.employeeCode && data.employeeCode !== employee.employeeCode) {
      const existingEmployee = await Employee.findOne({ employeeCode: data.employeeCode })
      if (existingEmployee) {
        return NextResponse.json(
          { success: false, message: 'Employee code already exists' },
          { status: 400 }
        )
      }
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== employee.email) {
      const existingEmail = await Employee.findOne({ email: data.email })
      if (existingEmail) {
        return NextResponse.json(
          { success: false, message: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('department', 'name')
      .populate('designation', 'title')
      .populate('reportingManager', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: updatedEmployee,
    })
  } catch (error) {
    console.error('Update employee error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update employee' },
      { status: 500 }
    )
  }
}

// DELETE - Delete employee
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const employee = await Employee.findById(params.id)
    if (!employee) {
      return NextResponse.json(
        { success: false, message: 'Employee not found' },
        { status: 404 }
      )
    }

    // Soft delete - change status to terminated
    await Employee.findByIdAndUpdate(params.id, { status: 'terminated' })

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully',
    })
  } catch (error) {
    console.error('Delete employee error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}

