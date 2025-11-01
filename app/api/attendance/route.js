import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'

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
    const { employeeId, type } = data // type: 'clock-in' or 'clock-out'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Check if attendance already exists for today
    let attendance = await Attendance.findOne({
      employee: employeeId,
      date: { $gte: today, $lt: tomorrow },
    })

    if (type === 'clock-in') {
      if (attendance && attendance.checkIn) {
        return NextResponse.json(
          { success: false, message: 'Already clocked in today' },
          { status: 400 }
        )
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

      if (!attendance) {
        attendance = await Attendance.create({
          employee: employeeId,
          date: new Date(),
          checkIn: checkInTime,
          checkInStatus: checkInStatus,
          status: 'in-progress', // Status will be determined on checkout
        })
      } else {
        attendance.checkIn = checkInTime
        attendance.checkInStatus = checkInStatus
        attendance.status = 'in-progress' // Status will be determined on checkout
        await attendance.save()
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

      const checkOutTime = new Date()
      attendance.checkOut = checkOutTime

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

