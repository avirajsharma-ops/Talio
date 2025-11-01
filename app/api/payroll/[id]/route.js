import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Payroll from '@/models/Payroll'

// GET - Get single payroll
export async function GET(request, { params }) {
  try {
    await connectDB()

    const payroll = await Payroll.findById(params.id)
      .populate('employee', 'firstName lastName employeeCode')

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: 'Payroll record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: payroll,
    })
  } catch (error) {
    console.error('Get payroll error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payroll record' },
      { status: 500 }
    )
  }
}

// PUT - Update payroll
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const payroll = await Payroll.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName employeeCode')

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: 'Payroll record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll updated successfully',
      data: payroll,
    })
  } catch (error) {
    console.error('Update payroll error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update payroll' },
      { status: 500 }
    )
  }
}

// DELETE - Delete payroll
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const payroll = await Payroll.findByIdAndDelete(params.id)

    if (!payroll) {
      return NextResponse.json(
        { success: false, message: 'Payroll record not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payroll deleted successfully',
    })
  } catch (error) {
    console.error('Delete payroll error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete payroll' },
      { status: 500 }
    )
  }
}

