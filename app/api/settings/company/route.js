import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import CompanySettings from '@/models/CompanySettings'
import { verifyToken } from '@/lib/auth'

// GET - Fetch company settings
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

    // Get company settings (there should only be one document)
    let settings = await CompanySettings.findOne()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await CompanySettings.create({
        companyName: 'My Company',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        geofence: {
          enabled: false,
          radius: 100,
          strictMode: false,
          notifyOnExit: true,
          requireApproval: true,
        },
      })
    }

    console.log('GET company settings - notifications:', settings.notifications)

    return NextResponse.json({
      success: true,
      data: settings
    })

  } catch (error) {
    console.error('Get company settings error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch company settings' },
      { status: 500 }
    )
  }
}

// PUT - Update company settings (Admin/HR only)
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

    // Check if user is admin or hr
    if (decoded.role !== 'admin' && decoded.role !== 'hr') {
      return NextResponse.json(
        { success: false, message: 'Only admin and HR can update company settings' },
        { status: 403 }
      )
    }

    await connectDB()

    const body = await request.json()

    // Get existing settings or create new
    let settings = await CompanySettings.findOne()

    if (settings) {
      // Update existing settings
      Object.keys(body).forEach(key => {
        if (key === 'geofence' && body.geofence) {
          // Merge geofence settings, filtering out undefined and null values
          const newGeofence = Object.fromEntries(
            Object.entries(body.geofence).filter(([_, v]) => v !== undefined && v !== null)
          )

          // Update each field individually to avoid undefined values
          Object.keys(newGeofence).forEach(geoKey => {
            settings.geofence[geoKey] = newGeofence[geoKey]
          })

          // Don't set center or radius if they're not provided (we're using multiple locations now)
          // This prevents validation errors for legacy fields
        } else if (key === 'attendance' && body.attendance) {
          settings.attendance = {
            ...settings.attendance,
            ...body.attendance,
          }
        } else if (key === 'leave' && body.leave) {
          settings.leave = {
            ...settings.leave,
            ...body.leave,
          }
        } else if (key === 'notifications' && body.notifications) {
          // Deep merge notifications to preserve nested emailEvents
          console.log('Updating notifications:', {
            current: settings.notifications,
            incoming: body.notifications
          })

          settings.notifications = {
            ...settings.notifications,
            ...body.notifications,
            emailEvents: {
              ...(settings.notifications?.emailEvents || {}),
              ...(body.notifications?.emailEvents || {}),
            },
          }

          console.log('Updated notifications:', settings.notifications)
        } else if (key === 'companyAddress' && body.companyAddress) {
          settings.companyAddress = {
            ...settings.companyAddress,
            ...body.companyAddress,
          }
        } else {
          settings[key] = body[key]
        }
      })

      await settings.save()
    } else {
      // Create new settings
      settings = await CompanySettings.create(body)
    }

    return NextResponse.json({
      success: true,
      message: 'Company settings updated successfully',
      data: settings
    })

  } catch (error) {
    console.error('Update company settings error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update company settings' },
      { status: 500 }
    )
  }
}

