import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Onboarding from '@/models/Onboarding'

// GET - List onboarding records
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

    const onboardings = await Onboarding.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: onboardings,
    })
  } catch (error) {
    console.error('Get onboarding error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch onboarding records' },
      { status: 500 }
    )
  }
}

// POST - Create onboarding record
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const onboarding = await Onboarding.create(data)

    const populatedOnboarding = await Onboarding.findById(onboarding._id)
      .populate('employee', 'firstName lastName employeeCode')
      .populate('assignedTo', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Onboarding record created successfully',
      data: populatedOnboarding,
    }, { status: 201 })
  } catch (error) {
    console.error('Create onboarding error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create onboarding record' },
      { status: 500 }
    )
  }
}

