import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Asset from '@/models/Asset'

// GET - List assets
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')

    const query = {}

    if (employeeId) {
      query.assignedTo = employeeId
    }

    if (status) {
      query.status = status
    }

    const assets = await Asset.find(query)
      .populate('assignedTo', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: assets,
    })
  } catch (error) {
    console.error('Get assets error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

// POST - Create asset
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const asset = await Asset.create(data)

    const populatedAsset = await Asset.findById(asset._id)
      .populate('assignedTo', 'firstName lastName employeeCode')

    return NextResponse.json({
      success: true,
      message: 'Asset created successfully',
      data: populatedAsset,
    }, { status: 201 })
  } catch (error) {
    console.error('Create asset error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create asset' },
      { status: 500 }
    )
  }
}

