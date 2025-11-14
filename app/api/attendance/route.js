import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Leave from '@/models/Leave'
import CompanySettings from '@/models/CompanySettings'
import GeofenceLocation from '@/models/GeofenceLocation'
import { logActivity } from '@/lib/activityLogger'
import { sendEmail } from '@/lib/mailer'

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

  return R * c // Distance in meters
}

// Check employee against multiple geofence locations
async function checkGeofenceLocation(latitude, longitude, employeeId, departmentId) {
  const locations = await GeofenceLocation.find({ isActive: true })

  let closestLocation = null
  let minDistance = Infinity
  let isWithinAnyGeofence = false

  for (const location of locations) {
    // Check if employee is allowed at this location
    const isAllowed =
      location.allowedDepartments.length === 0 ||
      location.allowedDepartments.some(dept => dept.toString() === departmentId?.toString()) ||
      location.allowedEmployees.some(emp => emp.toString() === employeeId.toString())

    if (!isAllowed) continue

    const distance = calculateDistance(
      latitude,
      longitude,
      location.center.latitude,
      location.center.longitude
    )

    const isWithin = distance <= location.radius

    if (isWithin) {
      isWithinAnyGeofence = true
      if (distance < minDistance) {
        minDistance = distance
        closestLocation = location
      }
    } else if (!isWithinAnyGeofence && distance < minDistance) {
      // Track closest location even if not within
      minDistance = distance
      closestLocation = location
    }
  }

  return {
    isWithinGeofence: isWithinAnyGeofence,
    location: closestLocation,
    distance: Math.round(minDistance)
  }
}

// GET - List attendance records
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const employeeId = searchParams.get('employeeId')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    const query = {}

    if (employeeId) {
      query.employee = employeeId
    }

    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      query.date = { $gte: startDate, $lte: endDate }
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59, 999)
      query.date = { $gte: startDate, $lte: endDate }
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName employeeCode')
      .sort({ date: -1 })

    return NextResponse.json({
      success: true,
      data: attendance,
    })
  } catch (error) {
    console.error('Get attendance error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch attendance' },
      { status: 500 }
    )
  }
}

// POST - Mark attendance (Clock in/out)
export async function POST(request) {
  try {
    await connectDB()

    const data = await request.json()
    const { employeeId, type, latitude, longitude, address } = data // type: 'clock-in' or 'clock-out'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get company settings and employee data
    const settings = await CompanySettings.findOne()
    const employee = await Employee.findById(employeeId).populate('department')

    // Check for approved leave or work from home for today
    const todayLeave = await Leave.findOne({
      employee: employeeId,
      status: 'approved',
      startDate: { $lte: new Date() },
      endDate: { $gte: today }
    })

    // Check if attendance already exists for today
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow },
    })

    // If no attendance record exists but there's an approved leave/WFH, create one
    if (!attendance && todayLeave) {
      attendance = await Attendance.create({
        employee: employeeId,
        date: today,
        status: todayLeave.workFromHome ? 'in-progress' : 'on-leave',
        workFromHome: todayLeave.workFromHome || false
      })
    }

    if (type === 'clock-in') {
      if (attendance && attendance.checkIn) {
        return NextResponse.json(
          { success: false, message: 'Already clocked in today' },
          { status: 400 }
        )
      }

      // Geofence validation
      let geofenceValidated = false
      let geofenceLocation = null
      let geofenceLocationName = null

      if (settings?.geofence?.enabled && latitude && longitude && !todayLeave?.workFromHome) {
        if (settings.geofence.useMultipleLocations) {
          const geofenceCheck = await checkGeofenceLocation(
            latitude,
            longitude,
            employeeId,
            employee?.department?._id
          )

          if (settings.geofence.strictMode && !geofenceCheck.isWithinGeofence) {
            return NextResponse.json(
              {
                success: false,
                message: `You must be within ${geofenceCheck.distance}m of an office location to check in. Closest location: ${geofenceCheck.location?.name || 'Unknown'}`,
                distance: geofenceCheck.distance,
                closestLocation: geofenceCheck.location?.name
              },
              { status: 403 }
            )
          }

          geofenceValidated = geofenceCheck.isWithinGeofence
          geofenceLocation = geofenceCheck.location?._id
          geofenceLocationName = geofenceCheck.location?.name
        }
      }

      const checkInTime = new Date()

      // Office timing: 11:00 AM to 7:00 PM
      const officeStartTime = new Date(checkInTime)
      officeStartTime.setHours(11, 0, 0, 0) // 11:00 AM

      const officeEndTime = new Date(checkInTime)
      officeEndTime.setHours(19, 0, 0, 0) // 7:00 PM

      // Determine check-in status
      let checkInStatus = 'on-time'
      if (checkInTime < officeStartTime) {
        checkInStatus = 'early'
      } else if (checkInTime > officeStartTime) {
        checkInStatus = 'late'
      }

      const attendanceData = {
        checkIn: checkInTime,
        checkInStatus: checkInStatus,
        status: 'in-progress',
        workFromHome: todayLeave?.workFromHome || false,
        geofenceValidated,
        'location.checkIn': {
          latitude,
          longitude,
          address,
          geofenceLocation,
          geofenceLocationName
        }
      }

      if (!attendance) {
        attendance = await Attendance.create({
          employee: employeeId,
          date: new Date(),
          ...attendanceData
        })
      } else {
        Object.assign(attendance, attendanceData)
        await attendance.save()
      }

      // Log activity
      await logActivity({
        employeeId: employeeId,
        type: 'attendance_checkin',
        action: 'Clocked in',
        details: `Started work at ${checkInTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        relatedModel: 'Attendance',
        relatedId: attendance._id
      })

      // Best-effort: send clock-in email if enabled in settings
      try {
        const emailNotificationsEnabled =
          settings?.notifications?.emailNotifications !== false

        const emailEvents = settings?.notifications?.emailEvents || {}
        const clockInEmailEnabled = emailEvents.attendanceClockIn !== false

        if (emailNotificationsEnabled && clockInEmailEnabled && employee?.email) {
          const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ')
          const greetingName = employeeName ? ` ${employeeName}` : ''
          const timeString = checkInTime.toLocaleString('en-IN', {
            timeZone: settings?.timezone || 'Asia/Kolkata',
          })

          const textLines = [
            `Hi${greetingName},`,
            '',
            `Your clock-in has been recorded on ${timeString}.`,
            `Status: ${checkInStatus}.`,
            '',
            'If this was not you, please contact your HR/administrator.',
            '',
            'Thanks,',
            'Talio HRMS',
          ]

          await sendEmail({
            to: employee.email,
            subject: 'Clock-in recorded',
            text: textLines.join('\n'),
          })
        }
      } catch (emailError) {
        console.error('Failed to send clock-in email:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Clocked in successfully',
        data: attendance,
      })
    } else if (type === 'clock-out') {
      if (!attendance || !attendance.checkIn) {
        return NextResponse.json(
          { success: false, message: 'Please clock in first' },
          { status: 400 }
        )
      }

      if (attendance.checkOut) {
        return NextResponse.json(
          { success: false, message: 'Already clocked out today' },
          { status: 400 }
        )
      }

      // Geofence validation for check-out
      let geofenceLocation = null
      let geofenceLocationName = null

      if (settings?.geofence?.enabled && latitude && longitude && !todayLeave?.workFromHome) {
        if (settings.geofence.useMultipleLocations) {
          const geofenceCheck = await checkGeofenceLocation(
            latitude,
            longitude,
            employeeId,
            employee?.department?._id
          )

          geofenceLocation = geofenceCheck.location?._id
          geofenceLocationName = geofenceCheck.location?.name
        }
      }

      const checkOutTime = new Date()
      attendance.checkOut = checkOutTime

      // Store check-out location
      if (!attendance.location) {
        attendance.location = {}
      }
      attendance.location.checkOut = {
        latitude,
        longitude,
        address,
        geofenceLocation,
        geofenceLocationName
      }

      // Office end time: 7:00 PM
      const officeEndTime = new Date(checkOutTime)
      officeEndTime.setHours(19, 0, 0, 0) // 7:00 PM

      // Determine check-out status
      let checkOutStatus = 'on-time'
      if (checkOutTime < officeEndTime) {
        checkOutStatus = 'early'
      } else if (checkOutTime > officeEndTime) {
        checkOutStatus = 'late'
      }

      attendance.checkOutStatus = checkOutStatus

      // Calculate work hours
      const checkIn = new Date(attendance.checkIn)
      const checkOut = new Date(attendance.checkOut)
      const diffMs = checkOut - checkIn
      const diffHrs = diffMs / (1000 * 60 * 60)
      attendance.workHours = parseFloat(diffHrs.toFixed(2))

      // Determine attendance status based on work hours
      // Shift: 11 AM to 7 PM (8 hours)
      // Present: 8+ hours, Half-day: 4-7.99 hours, Absent: <4 hours
      if (attendance.workHours >= 8) {
        attendance.status = 'present'
      } else if (attendance.workHours >= 4) {
        attendance.status = 'half-day'
      } else {
        attendance.status = 'absent'
      }

      await attendance.save()

      // Log activity
      await logActivity({
        employeeId: employeeId,
        type: 'attendance_checkout',
        action: 'Clocked out',
        details: `Worked for ${attendance.workHours} hours (${attendance.status})`,
        relatedModel: 'Attendance',
        relatedId: attendance._id
      })

      // Best-effort: send clock-out email if enabled in settings
      try {
        const emailNotificationsEnabled =
          settings?.notifications?.emailNotifications !== false

        const emailEvents = settings?.notifications?.emailEvents || {}

        let statusToggleKey = null
        if (attendance.status === 'present') statusToggleKey = 'attendanceStatusPresent'
        else if (attendance.status === 'half-day') statusToggleKey = 'attendanceStatusHalfDay'
        else if (attendance.status === 'absent') statusToggleKey = 'attendanceStatusAbsent'

        const statusEmailEnabled =
          statusToggleKey && emailEvents[statusToggleKey] !== false

        if (emailNotificationsEnabled && statusEmailEnabled && employee?.email) {
          const employeeName = [employee.firstName, employee.lastName].filter(Boolean).join(' ')
          const greetingName = employeeName ? ` ${employeeName}` : ''
          const timeString = checkOutTime.toLocaleString('en-IN', {
            timeZone: settings?.timezone || 'Asia/Kolkata',
          })

          let statusLabel = attendance.status
          if (attendance.status === 'present') statusLabel = 'Present'
          else if (attendance.status === 'half-day') statusLabel = 'Half day'
          else if (attendance.status === 'absent') statusLabel = 'Absent'

          const textLines = [
            `Hi${greetingName},`,
            '',
            `Your clock-out has been recorded on ${timeString}.`,
            `Todays attendance status: ${statusLabel}.`,
            `Total hours worked: ${attendance.workHours} hours.`,
            '',
            'If this was not you, please contact your HR/administrator.',
            '',
            'Thanks,',
            'Talio HRMS',
          ]

          await sendEmail({
            to: employee.email,
            subject: 'Clock-out recorded',
            text: textLines.join('\n'),
          })
        }
      } catch (emailError) {
        console.error('Failed to send clock-out email:', emailError)
      }

      return NextResponse.json({
        success: true,
        message: 'Clocked out successfully',
        data: attendance,
      })
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Mark attendance error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}

