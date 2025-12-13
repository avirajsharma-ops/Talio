import { NextResponse } from 'next/server'
import { verifyTokenFromRequest } from '@/lib/auth'
import { getEmployeeProjectSummaryForMaya } from '@/lib/projectPerformance'
import { generateSmartContent } from '@/lib/promptEngine'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  try {
    const user = await verifyTokenFromRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const employeeId = user.employeeId?._id || user.employeeId || user._id
    const summary = await getEmployeeProjectSummaryForMaya(employeeId)

    // Use AI to generate a natural language summary
    const prompt = `
    Generate a concise and encouraging daily project summary for an employee based on the following data:
    
    Active Projects: ${summary.activeProjects.length}
    Tasks Due Today: ${summary.todayTasks.length}
    Overdue Tasks: ${summary.overdueTasks.length}
    Pending Invitations: ${summary.pendingInvitations}
    
    Details:
    ${JSON.stringify(summary, null, 2)}
    
    Keep it professional but friendly. Highlight critical items.
    `
    
    const aiSummary = await generateSmartContent(prompt, {
      userId: user.userId,
      feature: 'project-summary',
      skipRefinement: true // Data-driven prompt, no need to refine
    });

    return NextResponse.json({
      success: true,
      data: summary,
      aiSummary
    })
  } catch (error) {
    console.error('Project Summary Error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
