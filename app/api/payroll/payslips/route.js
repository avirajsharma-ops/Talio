import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Payroll from '@/models/Payroll'

// GET - Get payslips for employee
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const query = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (year) {
      query.year = parseInt(year)
    }

    if (month) {
      query.month = parseInt(month)
    }

    const payslips = await Payroll.find(query)
      .populate('employee', 'firstName lastName employeeCode department designation')
      .sort({ year: -1, month: -1 })

    return NextResponse.json({
      success: true,
      data: payslips,
    })
  } catch (error) {
    console.error('Get payslips error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payslips' },
      { status: 500 }
    )
  }
}

// POST - Generate payslip
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()
    const { 
      employee, 
      month, 
      year, 
      basicSalary, 
      hra, 
      allowances, 
      overtime, 
      bonus,
      tax,
      pf,
      esi,
      otherDeductions 
    } = data

    // Calculate totals
    const grossSalary = (basicSalary || 0) + (hra || 0) + (allowances || 0) + (overtime || 0) + (bonus || 0)
    const totalDeductions = (tax || 0) + (pf || 0) + (esi || 0) + (otherDeductions || 0)
    const netSalary = grossSalary - totalDeductions

    // Check if payslip already exists
    const existingPayslip = await Payroll.findOne({
      employee,
      month,
      year,
    })

    if (existingPayslip) {
      return NextResponse.json(
        { success: false, message: 'Payslip already exists for this month' },
        { status: 400 }
      )
    }

    // Create payslip
    const payslip = await Payroll.create({
      employee,
      month,
      year,
      basicSalary: basicSalary || 0,
      hra: hra || 0,
      allowances: allowances || 0,
      overtime: overtime || 0,
      bonus: bonus || 0,
      grossSalary,
      tax: tax || 0,
      pf: pf || 0,
      esi: esi || 0,
      otherDeductions: otherDeductions || 0,
      totalDeductions,
      netSalary,
      status: 'generated',
      generatedDate: new Date(),
    })

    const populatedPayslip = await Payroll.findById(payslip._id)
      .populate('employee', 'firstName lastName employeeCode department designation')

    return NextResponse.json({
      success: true,
      message: 'Payslip generated successfully',
      data: populatedPayslip,
    }, { status: 201 })
  } catch (error) {
    console.error('Generate payslip error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to generate payslip' },
      { status: 500 }
    )
  }
}
