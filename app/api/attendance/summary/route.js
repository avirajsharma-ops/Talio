import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'

// GET - Get attendance summary for dashboard
export async function GET(request) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days')) || 7 // Default to last 7 days

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get total active employees
    const totalEmployees = await Employee.countDocuments({ status: 'active' })

    // Get attendance data for the date range
    const attendanceData = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" }
          },
          present: {
            $sum: {
              $cond: [{ $eq: ["$status", "present"] }, 1, 0]
            }
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "absent"] }, 1, 0]
            }
          },
          late: {
            $sum: {
              $cond: [{ $eq: ["$status", "late"] }, 1, 0]
            }
          },
          halfDay: {
            $sum: {
              $cond: [{ $eq: ["$status", "half-day"] }, 1, 0]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ])

    // Format data for charts
    const chartData = attendanceData.map(item => {
      const date = new Date(item._id)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      
      return {
        name: dayName,
        date: item._id,
        present: item.present,
        absent: item.absent,
        late: item.late,
        halfDay: item.halfDay,
        total: item.present + item.absent + item.late + item.halfDay
      }
    })

    // Calculate overall statistics
    const totalPresent = attendanceData.reduce((sum, item) => sum + item.present, 0)
    const totalAbsent = attendanceData.reduce((sum, item) => sum + item.absent, 0)
    const totalLate = attendanceData.reduce((sum, item) => sum + item.late, 0)
    const totalHalfDay = attendanceData.reduce((sum, item) => sum + item.halfDay, 0)
    const totalRecords = totalPresent + totalAbsent + totalLate + totalHalfDay

    const attendanceRate = totalRecords > 0 ? ((totalPresent + totalLate + totalHalfDay) / totalRecords * 100).toFixed(1) : 0

    // Get today's attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayAttendance = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: today,
            $lt: tomorrow
          }
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const todayStats = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0
    }

    todayAttendance.forEach(item => {
      if (item._id === 'present') todayStats.present = item.count
      else if (item._id === 'absent') todayStats.absent = item.count
      else if (item._id === 'late') todayStats.late = item.count
      else if (item._id === 'half-day') todayStats.halfDay = item.count
    })

    const todayTotal = todayStats.present + todayStats.absent + todayStats.late + todayStats.halfDay
    const todayAttendanceRate = todayTotal > 0 ? ((todayStats.present + todayStats.late + todayStats.halfDay) / todayTotal * 100).toFixed(1) : 0

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        summary: {
          totalEmployees,
          attendanceRate: parseFloat(attendanceRate),
          totalPresent,
          totalAbsent,
          totalLate,
          totalHalfDay,
          totalRecords
        },
        today: {
          ...todayStats,
          total: todayTotal,
          attendanceRate: parseFloat(todayAttendanceRate)
        },
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          days
        }
      }
    })
  } catch (error) {
    console.error('Get attendance summary error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch attendance summary' },
      { status: 500 }
    )
  }
}
