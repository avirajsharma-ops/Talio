import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// GET - Fetch performance goals
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page')) || 1
    const limit = parseInt(searchParams.get('limit')) || 10

    // Mock data for now - replace with actual database queries
    const mockGoals = [
      {
        _id: '1',
        employee: { 
          _id: 'emp1',
          firstName: 'John', 
          lastName: 'Doe', 
          employeeCode: 'EMP001',
          department: 'Engineering'
        },
        title: 'Complete Project Alpha',
        description: 'Lead the development of Project Alpha and deliver on time with high quality standards.',
        category: 'Project Management',
        priority: 'high',
        status: 'in-progress',
        progress: 75,
        startDate: '2024-01-01T00:00:00.000Z',
        dueDate: '2025-03-31T00:00:00.000Z',
        createdBy: { 
          _id: 'mgr1',
          firstName: 'Jane', 
          lastName: 'Smith' 
        },
        milestones: [
          { title: 'Requirements gathering', completed: true, dueDate: '2024-02-01' },
          { title: 'Development phase', completed: true, dueDate: '2024-06-01' },
          { title: 'Testing phase', completed: false, dueDate: '2024-12-01' },
          { title: 'Deployment', completed: false, dueDate: '2025-03-31' }
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-12-01T00:00:00.000Z'
      },
      {
        _id: '2',
        employee: { 
          _id: 'emp2',
          firstName: 'Alice', 
          lastName: 'Johnson', 
          employeeCode: 'EMP002',
          department: 'Marketing'
        },
        title: 'Improve Technical Skills',
        description: 'Complete advanced JavaScript and React certification to enhance technical capabilities.',
        category: 'Skill Development',
        priority: 'medium',
        status: 'not-started',
        progress: 0,
        startDate: '2024-02-01T00:00:00.000Z',
        dueDate: '2025-06-30T00:00:00.000Z',
        createdBy: { 
          _id: 'mgr2',
          firstName: 'Bob', 
          lastName: 'Wilson' 
        },
        milestones: [
          { title: 'Enroll in course', completed: false, dueDate: '2024-02-15' },
          { title: 'Complete modules 1-5', completed: false, dueDate: '2024-04-30' },
          { title: 'Complete final project', completed: false, dueDate: '2024-06-15' },
          { title: 'Get certification', completed: false, dueDate: '2024-06-30' }
        ],
        createdAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z'
      },
      {
        _id: '3',
        employee: { 
          _id: 'emp3',
          firstName: 'Mike', 
          lastName: 'Brown', 
          employeeCode: 'EMP003',
          department: 'Engineering'
        },
        title: 'Team Leadership Excellence',
        description: 'Successfully lead a team of 5 developers and improve team productivity by 20%.',
        category: 'Leadership',
        priority: 'high',
        status: 'completed',
        progress: 100,
        startDate: '2024-01-15T00:00:00.000Z',
        dueDate: '2024-12-31T00:00:00.000Z',
        createdBy: { 
          _id: 'mgr3',
          firstName: 'Sarah', 
          lastName: 'Davis' 
        },
        milestones: [
          { title: 'Team formation', completed: true, dueDate: '2024-02-01' },
          { title: 'Process optimization', completed: true, dueDate: '2024-06-01' },
          { title: 'Performance improvement', completed: true, dueDate: '2024-10-01' },
          { title: 'Final evaluation', completed: true, dueDate: '2024-12-31' }
        ],
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-12-31T00:00:00.000Z'
      }
    ]

    // Filter based on role and parameters
    let filteredGoals = mockGoals

    // Role-based filtering
    if (decoded.role === 'employee') {
      // Employees can only see their own goals
      filteredGoals = mockGoals.filter(goal => goal.employee._id === decoded.employeeId)
    } else if (decoded.role === 'manager') {
      // Managers can see goals for their team members
      // For now, show all goals (in real implementation, filter by department/team)
      filteredGoals = mockGoals
    }
    // Admin and HR can see all goals

    // Apply filters
    if (employeeId) {
      filteredGoals = filteredGoals.filter(goal => goal.employee._id === employeeId)
    }

    if (status) {
      filteredGoals = filteredGoals.filter(goal => goal.status === status)
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedGoals = filteredGoals.slice(startIndex, endIndex)

    return NextResponse.json({
      success: true,
      data: paginatedGoals,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredGoals.length / limit),
        totalItems: filteredGoals.length,
        itemsPerPage: limit
      }
    })

  } catch (error) {
    console.error('Get performance goals error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new performance goal
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin, hr, and managers can create goals
    if (!['admin', 'hr', 'manager'].includes(decoded.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      employeeId,
      title,
      description,
      category,
      priority,
      startDate,
      dueDate,
      milestones
    } = body

    // Validate required fields
    if (!employeeId || !title || !dueDate) {
      return NextResponse.json(
        { success: false, message: 'Employee ID, title, and due date are required' },
        { status: 400 }
      )
    }

    // Mock creation - replace with actual database save
    const newGoal = {
      _id: Date.now().toString(),
      employee: {
        _id: employeeId,
        firstName: 'Mock',
        lastName: 'Employee',
        employeeCode: 'EMP999',
        department: 'Mock Department'
      },
      title,
      description: description || '',
      category: category || 'General',
      priority: priority || 'medium',
      status: 'not-started',
      progress: 0,
      startDate: startDate || new Date().toISOString(),
      dueDate,
      createdBy: {
        _id: decoded.employeeId,
        firstName: decoded.firstName || 'Manager',
        lastName: decoded.lastName || 'Name'
      },
      milestones: milestones || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Performance goal created successfully',
      data: newGoal
    }, { status: 201 })

  } catch (error) {
    console.error('Create performance goal error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update performance goal
export async function PUT(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { goalId, ...originalUpdateData } = body

    if (!goalId) {
      return NextResponse.json(
        { success: false, message: 'Goal ID is required' },
        { status: 400 }
      )
    }

    // Employees can update their own goal progress, managers can update all fields
    const canUpdateAll = ['admin', 'hr', 'manager'].includes(decoded.role)

    let updateData = originalUpdateData
    if (!canUpdateAll && decoded.role === 'employee') {
      // Employees can only update progress and status
      const allowedFields = ['progress', 'status']
      const filteredUpdateData = {}
      allowedFields.forEach(field => {
        if (originalUpdateData[field] !== undefined) {
          filteredUpdateData[field] = originalUpdateData[field]
        }
      })
      updateData = filteredUpdateData
    }

    // Mock update - replace with actual database update
    const updatedGoal = {
      _id: goalId,
      ...updateData,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Performance goal updated successfully',
      data: updatedGoal
    })

  } catch (error) {
    console.error('Update performance goal error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete performance goal
export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    const decoded = await verifyToken(token)
    
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    // Only admin, hr, and managers can delete goals
    if (!['admin', 'hr', 'manager'].includes(decoded.role)) {
      return NextResponse.json({ success: false, message: 'Access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('goalId')

    if (!goalId) {
      return NextResponse.json(
        { success: false, message: 'Goal ID is required' },
        { status: 400 }
      )
    }

    // Mock deletion - replace with actual database deletion
    return NextResponse.json({
      success: true,
      message: 'Performance goal deleted successfully'
    })

  } catch (error) {
    console.error('Delete performance goal error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
