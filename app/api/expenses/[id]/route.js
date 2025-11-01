import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Expense from '@/models/Expense'

// PUT - Update/Approve expense
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const expense = await Expense.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')

    if (!expense) {
      return NextResponse.json(
        { success: false, message: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      data: expense,
    })
  } catch (error) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update expense' },
      { status: 500 }
    )
  }
}

// DELETE - Delete expense
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const expense = await Expense.findByIdAndDelete(params.id)

    if (!expense) {
      return NextResponse.json(
        { success: false, message: 'Expense not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully',
    })
  } catch (error) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete expense' },
      { status: 500 }
    )
  }
}

