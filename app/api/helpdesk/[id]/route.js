import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Helpdesk from '@/models/Helpdesk'

// PUT - Update ticket
export async function PUT(request, { params }) {
  try {
    await connectDB()

    const data = await request.json()

    const ticket = await Helpdesk.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName employeeCode')
      .populate('assignedTo', 'firstName lastName')

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket updated successfully',
      data: ticket,
    })
  } catch (error) {
    console.error('Update ticket error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update ticket' },
      { status: 500 }
    )
  }
}

// DELETE - Delete ticket
export async function DELETE(request, { params }) {
  try {
    await connectDB()

    const ticket = await Helpdesk.findByIdAndDelete(params.id)

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: 'Ticket not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Ticket deleted successfully',
    })
  } catch (error) {
    console.error('Delete ticket error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete ticket' },
      { status: 500 }
    )
  }
}

