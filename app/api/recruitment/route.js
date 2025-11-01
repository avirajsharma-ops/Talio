import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Recruitment from '@/models/Recruitment'

// GET - List job postings
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const query = {}

    if (status) {
      query.status = status
    }

    const jobs = await Recruitment.find(query)
      .populate('department', 'name')
      .populate('hiringManager', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: jobs,
    })
  } catch (error) {
    console.error('Get recruitment error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch job postings' },
      { status: 500 }
    )
  }
}

// POST - Create job posting
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const job = await Recruitment.create(data)

    const populatedJob = await Recruitment.findById(job._id)
      .populate('department', 'name')
      .populate('hiringManager', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Job posting created successfully',
      data: populatedJob,
    }, { status: 201 })
  } catch (error) {
    console.error('Create recruitment error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create job posting' },
      { status: 500 }
    )
  }
}

