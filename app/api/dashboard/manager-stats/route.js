import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import Leave from '@/models/Leave'
import Attendance from '@/models/Attendance'
import Performance from '@/models/Performance'
import { verifyToken } from '@/lib/auth'

// GET - Get Manager dashboard statistics
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

    // Find the manager's employee record
    const manager = await Employee.findOne({ _id: decoded.userId })
    if (!manager) {
      return NextResponse.json({ success: false, message: 'Manager not found' }, { status: 404 })
    }

    // Date calculations
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Get team members (direct reportees)
    const teamMembers = await Employee.find({
      reportingManager: manager._id,
      status: 'active'
    })

    const teamMemberIds = teamMembers.map(member => member._id)

    // 1. Team Strength
    const teamStrength = teamMembers.length

    // 2. Who is absent/on leave today
    const onLeaveToday = await Leave.find({
      employee: { $in: teamMemberIds },
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    }).populate('employee', 'firstName lastName employeeCode')

    const absentToday = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'absent'
    }).populate('employee', 'firstName lastName employeeCode')

    // 3. Who came late today
    const lateToday = await Attendance.find({
      employee: { $in: teamMemberIds },
      date: { $gte: todayStart, $lte: todayEnd },
      status: 'late'
    }).populate('employee', 'firstName lastName employeeCode')

    // 4. Underperforming employees
    const underperforming = await Performance.find({
      employee: { $in: teamMemberIds },
      overallRating: { $lt: 3 }, // Rating below 3 out of 5
      isActive: true
    }).populate('employee', 'firstName lastName employeeCode')

    // 5. Pending approvals for manager
    const pendingLeaveApprovals = await Leave.find({
      employee: { $in: teamMemberIds },
      status: 'pending'
    }).populate('employee', 'firstName lastName employeeCode')
    .populate('leaveType', 'name')

    // 6. Team attendance summary
    const teamAttendanceToday = await Attendance.aggregate([
      {
        $match: {
          employee: { $in: teamMemberIds },
          date: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])

    const attendanceSummary = {
      present: 0,
      absent: 0,
      late: 0,
      halfDay: 0
    }

    teamAttendanceToday.forEach(item => {
      if (item._id === 'present') attendanceSummary.present = item.count
      else if (item._id === 'absent') attendanceSummary.absent = item.count
      else if (item._id === 'late') attendanceSummary.late = item.count
      else if (item._id === 'half-day') attendanceSummary.halfDay = item.count
    })

    // 7. Team performance overview
    const teamPerformance = await Performance.aggregate([
      {
        $match: {
          employee: { $in: teamMemberIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$overallRating' },
          totalReviews: { $sum: 1 },
          excellentPerformers: {
            $sum: { $cond: [{ $gte: ['$overallRating', 4] }, 1, 0] }
          },
          underPerformers: {
            $sum: { $cond: [{ $lt: ['$overallRating', 3] }, 1, 0] }
          }
        }
      }
    ])

    const performanceStats = teamPerformance[0] || {
      averageRating: 0,
      totalReviews: 0,
      excellentPerformers: 0,
      underPerformers: 0
    }

    // 8. Recent team activities
    const recentActivities = []

    // Add recent leave applications
    const recentLeaves = await Leave.find({
      employee: { $in: teamMemberIds },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('employee', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5)

    recentLeaves.forEach(leave => {
      recentActivities.push({
        type: 'leave',
        message: `${leave.employee.firstName} ${leave.employee.lastName} applied for leave`,
        status: leave.status,
        date: leave.createdAt
      })
    })

    // Add recent performance reviews
    const recentReviews = await Performance.find({
      employee: { $in: teamMemberIds },
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).populate('employee', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(3)

    recentReviews.forEach(review => {
      recentActivities.push({
        type: 'performance',
        message: `Performance review completed for ${review.employee.firstName} ${review.employee.lastName}`,
        status: 'completed',
        date: review.createdAt
      })
    })

    // Sort activities by date
    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date))

    const stats = {
      teamStrength: {
        value: teamStrength,
        active: teamStrength
      },
      attendanceToday: {
        ...attendanceSummary,
        total: teamStrength,
        attendanceRate: teamStrength > 0 ? 
          (((attendanceSummary.present + attendanceSummary.late + attendanceSummary.halfDay) / teamStrength) * 100).toFixed(1) : 0
      },
      onLeaveToday: {
        count: onLeaveToday.length,
        employees: onLeaveToday.map(leave => ({
          name: `${leave.employee.firstName} ${leave.employee.lastName}`,
          employeeCode: leave.employee.employeeCode,
          leaveType: leave.leaveType?.name || 'N/A',
          startDate: leave.startDate,
          endDate: leave.endDate
        }))
      },
      absentToday: {
        count: absentToday.length,
        employees: absentToday.map(att => ({
          name: `${att.employee.firstName} ${att.employee.lastName}`,
          employeeCode: att.employee.employeeCode
        }))
      },
      lateToday: {
        count: lateToday.length,
        employees: lateToday.map(att => ({
          name: `${att.employee.firstName} ${att.employee.lastName}`,
          employeeCode: att.employee.employeeCode,
          checkInTime: att.checkInTime
        }))
      },
      underperforming: {
        count: underperforming.length,
        employees: underperforming.map(perf => ({
          name: `${perf.employee.firstName} ${perf.employee.lastName}`,
          employeeCode: perf.employee.employeeCode,
          rating: perf.overallRating,
          reviewDate: perf.reviewDate
        }))
      },
      pendingApprovals: {
        leaves: {
          count: pendingLeaveApprovals.length,
          requests: pendingLeaveApprovals.map(leave => ({
            id: leave._id,
            employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
            employeeCode: leave.employee.employeeCode,
            leaveType: leave.leaveType?.name || 'N/A',
            startDate: leave.startDate,
            endDate: leave.endDate,
            reason: leave.reason,
            appliedDate: leave.createdAt
          }))
        }
      },
      teamPerformance: {
        averageRating: performanceStats.averageRating ? performanceStats.averageRating.toFixed(1) : 0,
        totalReviews: performanceStats.totalReviews,
        excellentPerformers: performanceStats.excellentPerformers,
        underPerformers: performanceStats.underPerformers
      },
      recentActivities: recentActivities.slice(0, 10)
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Manager stats error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch manager statistics' },
      { status: 500 }
    )
  }
}
