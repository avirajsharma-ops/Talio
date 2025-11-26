import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Offboarding from '@/models/Offboarding'

// GET - List offboarding records
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const query = {}

    if (status) {
      query.status = status
    }

    const offboardings = await Offboarding.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('exitInterviewBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: offboardings,
    })
  } catch (error) {
    console.error('Get offboarding error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch offboarding records' },
      { status: 500 }
    )
  }
}

// POST - Create offboarding record
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const offboarding = await Offboarding.create(data)

    const populatedOffboarding = await Offboarding.findById(offboarding._id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('exitInterviewBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Offboarding record created successfully',
      data: populatedOffboarding,
    }, { status: 201 })
  } catch (error) {
    console.error('Create offboarding error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create offboarding record' },
      { status: 500 }
    )
  }
}

