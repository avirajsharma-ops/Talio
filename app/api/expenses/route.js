import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Expense from '@/models/Expense'

// GET - List expenses
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const query = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (status) {
      query.status = status
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: expenses,
    })
  } catch (error) {
    console.error('Get expenses error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}

// POST - Create expense
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Set status to 'submitted' for approval instead of 'draft'
    const expense = await Expense.create({
      ...data,
      status: 'submitted',
      submittedDate: new Date()
    })

    const populatedExpense = await Expense.findById(expense._id)
      .populate('employee', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      message: 'Expense submitted for approval',
      data: populatedExpense,
    }, { status: 201 })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create expense' },
      { status: 500 }
    )
  }
}

