import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Helpdesk from '@/models/Helpdesk'

// GET - List helpdesk tickets
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')

    const query = {}

    if (employeeId) {
      query.createdBy = employeeId
    }

    if (status) {
      query.status = status
    }

    if (priority) {
      query.priority = priority
    }

    const tickets = await Helpdesk.find(query)
      .populate('createdBy', 'firstName lastName employeeCode')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: tickets,
    })
  } catch (error) {
    console.error('Get helpdesk error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch helpdesk tickets' },
      { status: 500 }
    )
  }
}

// POST - Create helpdesk ticket
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const ticket = await Helpdesk.create({
      ...data,
      ticketNumber: `TKT-${Date.now()}`,
      status: 'open',
    })

    const populatedTicket = await Helpdesk.findById(ticket._id)
      .populate('createdBy', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      message: 'Ticket created successfully',
      data: populatedTicket,
    }, { status: 201 })
  } catch (error) {
    console.error('Create helpdesk error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create ticket' },
      { status: 500 }
    )
  }
}

