import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import SystemPreferences from '@/models/SystemPreferences'
import { verifyToken } from '@/lib/auth'

// GET - Get system preferences
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    // Get system preferences (there should be only one document)
    let preferences = await SystemPreferences.findOne()
    
    if (!preferences) {
      // Create default preferences if none exist
      preferences = new SystemPreferences({
        currency: 'INR',
        currencySymbol: '₹',
        timeFormat: '12',
        timezone: 'Asia/Kolkata',
        workingDaysPerWeek: 5,
        workingHoursPerDay: 8,
        weekStartsOn: 'monday',
        defaultLeaveYear: new Date().getFullYear(),
        leaveCarryForward: true,
        maxCarryForwardDays: 10,
        lateThresholdMinutes: 15,
        halfDayThresholdHours: 4,
        autoMarkAbsent: true,
        emailNotifications: true,
        leaveApprovalNotifications: true,
        attendanceReminders: true,
        dateFormat: 'DD/MM/YYYY',
        companyName: 'Your Company',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
      })
      await preferences.save()
    }

    return NextResponse.json({
      success: true,
      data: preferences
    })
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

// PUT - Update system preferences (Admin only)
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin can update preferences
    if (decoded.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()

    // Find existing preferences or create new one
    let preferences = await SystemPreferences.findOne()
    
    if (preferences) {
      // Update existing preferences
      Object.keys(body).forEach(key => {
        if (body[key] !== undefined) {
          preferences[key] = body[key]
        }
      })
      await preferences.save()
    } else {
      // Create new preferences
      preferences = new SystemPreferences(body)
      await preferences.save()
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    })
  } catch (error) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
