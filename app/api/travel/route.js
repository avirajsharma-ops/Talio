import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Travel from '@/models/Travel'

// GET - List travel requests
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

    const travels = await Travel.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('approvedBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: travels,
    })
  } catch (error) {
    console.error('Get travel error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch travel requests' },
      { status: 500 }
    )
  }
}

// POST - Create travel request
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const travel = await Travel.create(data)

    const populatedTravel = await Travel.findById(travel._id)
      .populate('employee', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      message: 'Travel request submitted successfully',
      data: populatedTravel,
    }, { status: 201 })
  } catch (error) {
    console.error('Create travel error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create travel request' },
      { status: 500 }
    )
  }
}

