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

    // Emit Socket.IO event for ticket updates
    try {
      const io = global.io
      if (io) {
        // Notify employee who created the ticket
        if (data.status || data.assignedTo) {
          const Employee = require('@/models/Employee').default
          const employeeDoc = await Employee.findById(ticket.employee._id || ticket.employee).select('userId')
          const employeeUserId = employeeDoc?.userId

          if (employeeUserId) {
            let action = 'updated'
            if (data.status === 'resolved') action = 'resolved'
            else if (data.status === 'closed') action = 'closed'
            else if (data.assignedTo) action = 'assigned'

            io.to(`user:${employeeUserId}`).emit('helpdesk-ticket', {
              ticket,
              action,
              message: `Ticket #${ticket.ticketNumber} has been ${action}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Helpdesk ticket update sent to user:${employeeUserId}`)
          }
        }

        // Notify assigned agent
        if (data.assignedTo) {
          const Employee = require('@/models/Employee').default
          const assignedDoc = await Employee.findById(data.assignedTo).select('userId')
          const assignedUserId = assignedDoc?.userId

          if (assignedUserId) {
            io.to(`user:${assignedUserId}`).emit('helpdesk-ticket', {
              ticket,
              action: 'assigned',
              message: `You have been assigned ticket #${ticket.ticketNumber}`,
              timestamp: new Date()
            })
            console.log(`✅ [Socket.IO] Helpdesk ticket assignment sent to user:${assignedUserId}`)
          }
        }
      }
    } catch (socketError) {
      console.error('Failed to send helpdesk socket notification:', socketError)
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

