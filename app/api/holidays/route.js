import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Holiday from '@/models/Holiday'

// GET - List holidays
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')

    const query = {}

    if (year) {
      const startDate = new Date(year, 0, 1)
      const endDate = new Date(year, 11, 31, 23, 59, 59)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const holidays = await Holiday.find(query)
      .sort({ date: 1 })

    return NextResponse.json({
      success: true,
      data: holidays,
    })
  } catch (error) {
    console.error('Get holidays error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch holidays' },
      { status: 500 }
    )
  }
}

// POST - Create holiday
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    const holiday = await Holiday.create(data)

    return NextResponse.json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday,
    }, { status: 201 })
  } catch (error) {
    console.error('Create holiday error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create holiday' },
      { status: 500 }
    )
  }
}

