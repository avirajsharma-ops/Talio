import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Payroll from '@/models/Payroll'

// GET - List payroll records
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const query = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (month && year) {
      query.month = parseInt(month)
      query.year = parseInt(year)
    }

    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .sort({ year: -1, month: -1 })

    return NextResponse.json({
      success: true,
      data: payrolls,
    })
  } catch (error) {
    console.error('Get payroll error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payroll' },
      { status: 500 }
    )
  }
}

// POST - Generate payroll
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Check if payroll already exists for this employee and month
    const existingPayroll = await Payroll.findOne({
      employee: data.employee,
      month: data.month,
      year: data.year,
    })

    if (existingPayroll) {
      return NextResponse.json(
        { success: false, message: 'Payroll already exists for this month' },
        { status: 400 }
      )
    }

    // Calculate totals
    const earnings = data.earnings || {}
    const deductions = data.deductions || {}

    const totalEarnings = Object.values(earnings).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0)
    const netSalary = totalEarnings - totalDeductions

    const payroll = await Payroll.create({
      ...data,
      totalEarnings,
      totalDeductions,
      netSalary,
      status: 'pending',
    })

    const populatedPayroll = await Payroll.findById(payroll._id)
      .populate('employee', 'firstName lastName employeeCode')

    // Emit Socket.IO event for payroll generation
    try {
      const io = global.io
      if (io) {
        const Employee = require('@/models/Employee').default
        const employeeDoc = await Employee.findById(data.employee).select('userId')
        const employeeUserId = employeeDoc?.userId

        if (employeeUserId) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          const monthName = monthNames[data.month - 1]

          io.to(`user:${employeeUserId}`).emit('payroll-update', {
            payroll: populatedPayroll,
            action: 'generated',
            message: `Your payroll for ${monthName} ${data.year} has been generated`,
            timestamp: new Date()
          })
          console.log(`✅ [Socket.IO] Payroll generation sent to user:${employeeUserId}`)
        }
      }
    } catch (socketError) {
      console.error('Failed to send payroll socket notification:', socketError)
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll generated successfully',
      data: populatedPayroll,
    }, { status: 201 })
  } catch (error) {
    console.error('Generate payroll error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to generate payroll' },
      { status: 500 }
    )
  }
}

