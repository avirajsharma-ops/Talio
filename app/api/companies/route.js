import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Company from '@/models/Company'
import { verifyToken } from '@/lib/auth'

// GET - List all companies
export async function GET(request) {
  try {
    await connectDB()

    const companies = await Company.find({ isActive: true })
      .populate('createdBy', 'email')
      .sort({ name: 1 })
      .lean()

    return NextResponse.json({
      success: true,
      data: companies,
    })
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch companies' },
      { status: 500 }
    )
  }
}

// POST - Create new company
export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      )
    }

    // Check role - only admin, hr, or god_admin can create companies
    const allowedRoles = ['god_admin', 'admin', 'hr']
    if (!allowedRoles.includes(decoded.role)) {
      return NextResponse.json(
        { success: false, message: 'You do not have permission to create companies' },
        { status: 403 }
      )
    }

    await connectDB()

    const data = await request.json()
    
    // Validate required fields
    if (!data.name || !data.code) {
      return NextResponse.json(
        { success: false, message: 'Company name and code are required' },
        { status: 400 }
      )
    }

    // Check if company with same name or code exists
    const existingCompany = await Company.findOne({
      $or: [
        { name: data.name },
        { code: data.code.toUpperCase() }
      ]
    })

    if (existingCompany) {
      return NextResponse.json(
        { success: false, message: 'Company with this name or code already exists' },
        { status: 400 }
      )
    }

    const company = await Company.create({
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      description: data.description?.trim() || '',
      logo: data.logo || '',
      email: data.email?.trim() || '',
      phone: data.phone?.trim() || '',
      website: data.website?.trim() || '',
      timezone: data.timezone || 'Asia/Kolkata',
      address: data.address || {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      workingHours: data.workingHours || {
        checkInTime: '09:00',
        checkOutTime: '18:00',
        lateThresholdMinutes: 15,
        absentThresholdMinutes: 60,
        halfDayHours: 4,
        fullDayHours: 8,
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      },
      createdBy: decoded.userId
    })

    return NextResponse.json({
      success: true,
      message: 'Company created successfully',
      data: company,
    }, { status: 201 })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create company' },
      { status: 500 }
    )
  }
}
