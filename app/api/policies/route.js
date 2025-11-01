import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Policy from '@/models/Policy'

// GET - List policies
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    const query = {}

    if (category) {
      query.category = category
    }

    const policies = await Policy.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: policies,
    })
  } catch (error) {
    console.error('Get policies error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}

// POST - Create policy
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const policy = await Policy.create(data)

    const populatedPolicy = await Policy.findById(policy._id)
      .populate('createdBy', 'firstName lastName')

    return NextResponse.json({
      success: true,
      message: 'Policy created successfully',
      data: populatedPolicy,
    }, { status: 201 })
  } catch (error) {
    console.error('Create policy error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create policy' },
      { status: 500 }
    )
  }
}

