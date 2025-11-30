import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { 
  getUserProjectsSummaryForMaya, 
  getProjectSummaryForMaya,
  getTodaysTasks 
} from '@/lib/projectService'

// GET - Get project data for MAYA
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(decoded.userId).select('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const summaryType = searchParams.get('type') || 'overview' // overview, detailed, daily

    let data

    if (projectId) {
      // Get specific project summary
      data = await getProjectSummaryForMaya(projectId)
      if (!data) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
      }
    } else if (summaryType === 'daily') {
      // Get today's tasks summary for daily briefing
      const todaysTasks = await getTodaysTasks(user.employeeId)
      const projectsSummary = await getUserProjectsSummaryForMaya(user.employeeId)
      
      data = {
        date: new Date().toISOString(),
        todaysTasks: todaysTasks.map(t => ({
          id: t._id.toString(),
          title: t.title,
          projectName: t.project?.name || 'Unknown',
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          isOverdue: t.dueDate && new Date() > t.dueDate
        })),
        taskCount: todaysTasks.length,
        overdueTasks: todaysTasks.filter(t => t.dueDate && new Date() > t.dueDate).length,
        projectsSummary: {
          totalActive: projectsSummary.activeProjects,
          totalOverdue: projectsSummary.overdueProjects,
          projects: projectsSummary.projects.slice(0, 5).map(p => ({
            name: p.projectName,
            status: p.status,
            completion: p.completionPercentage,
            userTasksCount: p.userTasks.length
          }))
        }
      }
    } else {
      // Get all user projects summary
      data = await getUserProjectsSummaryForMaya(user.employeeId)
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Get MAYA projects data error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST - Let MAYA perform project actions
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await connectDB()

    const user = await User.findById(decoded.userId).select('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    const body = await request.json()
    const { action } = body

    // MAYA can request various project-related summaries
    switch (action) {
      case 'getDailySummary':
        const todaysTasks = await getTodaysTasks(user.employeeId)
        const projectsSummary = await getUserProjectsSummaryForMaya(user.employeeId)
        
        // Generate natural language summary
        let summary = ''
        
        if (todaysTasks.length === 0) {
          summary = "You have no tasks due today. "
        } else {
          const overdueTasks = todaysTasks.filter(t => t.dueDate && new Date() > t.dueDate)
          summary = `You have ${todaysTasks.length} task${todaysTasks.length > 1 ? 's' : ''} requiring attention. `
          
          if (overdueTasks.length > 0) {
            summary += `⚠️ ${overdueTasks.length} task${overdueTasks.length > 1 ? 's are' : ' is'} overdue. `
          }
          
          const highPriorityTasks = todaysTasks.filter(t => t.priority === 'high' || t.priority === 'critical')
          if (highPriorityTasks.length > 0) {
            summary += `${highPriorityTasks.length} high-priority task${highPriorityTasks.length > 1 ? 's' : ''} need${highPriorityTasks.length === 1 ? 's' : ''} your focus. `
          }
        }
        
        if (projectsSummary.activeProjects > 0) {
          summary += `You're working on ${projectsSummary.activeProjects} active project${projectsSummary.activeProjects > 1 ? 's' : ''}. `
          
          if (projectsSummary.overdueProjects > 0) {
            summary += `${projectsSummary.overdueProjects} project${projectsSummary.overdueProjects > 1 ? 's are' : ' is'} past the deadline. `
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            summary,
            tasks: todaysTasks.map(t => ({
              title: t.title,
              project: t.project?.name,
              priority: t.priority,
              status: t.status,
              isOverdue: t.dueDate && new Date() > t.dueDate
            })),
            projectStats: {
              active: projectsSummary.activeProjects,
              overdue: projectsSummary.overdueProjects,
              total: projectsSummary.totalProjects
            }
          }
        })

      case 'getProjectStatus':
        if (!body.projectId) {
          return NextResponse.json({ success: false, message: 'Project ID required' }, { status: 400 })
        }
        const projectData = await getProjectSummaryForMaya(body.projectId)
        return NextResponse.json({ success: true, data: projectData })

      default:
        return NextResponse.json({ 
          success: false, 
          message: 'Unknown action' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('MAYA project action error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
