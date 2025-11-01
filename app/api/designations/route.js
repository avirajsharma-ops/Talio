import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Designation from '@/models/Designation'

// GET - List all designations
export async function GET(request) {
  try {
    await connectDB()

    const designations = await Designation.find({ isActive: true }).sort({ title: 1 })

    return NextResponse.json({
      success: true,
      data: designations,
    })
  } catch (error) {
    console.error('Get designations error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch designations' },
      { status: 500 }
    )
  }
}

// POST - Create new designation
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()

    // Remove department if present (no longer used)
    if ('department' in data) delete data.department

    // Map level string -> number (default to 1)
    const levelMap = { entry: 1, junior: 2, mid: 3, senior: 4, lead: 5, manager: 6, director: 7, executive: 8 }
    if (typeof data.level === 'string') {
      const lower = data.level.toLowerCase()
      data.level = levelMap[lower] || parseInt(data.level, 10) || 1
    } else if (typeof data.level !== 'number') {
      data.level = 1
    }

    // Auto-generate code from title if missing
    if (!data.code) {
      const base = (data.title || '').toString().trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'DESIG'
      let candidate = base
      const exists = await Designation.exists({ code: candidate })
      if (exists) {
        candidate = `${base}-2`
      }
      data.code = candidate
    }

    const designation = await Designation.create(data)

    return NextResponse.json({
      success: true,
      message: 'Designation created successfully',
      data: designation,
    }, { status: 201 })
  } catch (error) {
    console.error('Create designation error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create designation' },
      { status: 500 }
    )
  }
}

