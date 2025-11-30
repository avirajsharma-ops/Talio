import { NextResponse } from 'next/server'
import { verifyTokenFromRequest } from '@/lib/auth'
import { getEmployeeProjectSummaryForMaya } from '@/lib/projectPerformance'

export async function GET(request) {
  try {
    const user = await verifyTokenFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = user.employeeId?._id || user.employeeId || user._id

    const summary = await getEmployeeProjectSummaryForMaya(employeeId)

    // Build a natural language summary for Maya to read
    let greeting = ''

    // Active projects
    if (summary.activeProjects.length > 0) {
      greeting += `You have ${summary.activeProjects.length} active project${summary.activeProjects.length > 1 ? 's' : ''}. `
      const nearDeadline = summary.activeProjects.filter(p => {
        const days = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24))
        return days <= 7 && days >= 0
      })
      if (nearDeadline.length > 0) {
        greeting += `${nearDeadline.length} project${nearDeadline.length > 1 ? 's are' : ' is'} due within a week. `
      }
    }

    // Today's tasks
    if (summary.todayTasks.length > 0) {
      const critical = summary.todayTasks.filter(t => t.priority === 'critical' || t.priority === 'high')
      greeting += `You have ${summary.todayTasks.length} task${summary.todayTasks.length > 1 ? 's' : ''} due today`
      if (critical.length > 0) {
        greeting += `, including ${critical.length} high priority ${critical.length > 1 ? 'ones' : 'one'}`
      }
      greeting += '. '
    } else {
      greeting += 'No project tasks are due today. '
    }

    // Pending invitations
    if (summary.pendingInvitations > 0) {
      greeting += `You have ${summary.pendingInvitations} pending task assignment${summary.pendingInvitations > 1 ? 's' : ''} awaiting your response. `
    }

    // Overdue tasks
    if (summary.overdueTasks.length > 0) {
      greeting += `There ${summary.overdueTasks.length > 1 ? 'are' : 'is'} ${summary.overdueTasks.length} overdue task${summary.overdueTasks.length > 1 ? 's' : ''} that need${summary.overdueTasks.length > 1 ? '' : 's'} attention. `
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        greeting: greeting.trim() || 'No project updates for today.',
        hasActiveProjects: summary.activeProjects.length > 0,
        hasTodayTasks: summary.todayTasks.length > 0,
        hasOverdueTasks: summary.overdueTasks.length > 0,
        hasPendingInvitations: summary.pendingInvitations > 0
      }
    })
  } catch (error) {
    console.error('Get project summary for Maya error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get project summary' },
      { status: 500 }
    )
  }
}
