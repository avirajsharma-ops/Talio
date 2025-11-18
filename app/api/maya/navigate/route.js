/**
 * Maya AI Navigation API
 * Allows Maya to navigate between HRMS pages and perform UI actions
 * 
 * Endpoint: POST /api/maya/navigate
 * 
 * Request body:
 * {
 *   action: 'navigate' | 'open_tab' | 'get_current_page' | 'get_available_pages',
 *   path: '/dashboard/employees',  // For navigate action
 *   tab: 'employees',               // For open_tab action
 * }
 */

import { NextResponse } from 'next/server';
import { verifyTokenFromRequest } from '@/lib/auth';
import { hasPermission } from '@/lib/mayaPermissions';

// Available pages and their required permissions
const AVAILABLE_PAGES = {
  '/dashboard': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Dashboard' },
  '/dashboard/employees': { roles: ['admin', 'hr', 'manager', 'department_head'], name: 'Employees' },
  '/dashboard/employees/add': { roles: ['admin', 'hr'], name: 'Add Employee' },
  '/dashboard/departments': { roles: ['admin', 'hr'], name: 'Departments' },
  '/dashboard/designations': { roles: ['admin', 'hr'], name: 'Designations' },
  '/dashboard/attendance': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Attendance' },
  '/dashboard/attendance/report': { roles: ['admin', 'hr', 'manager', 'department_head'], name: 'Attendance Report' },
  '/dashboard/leave': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Leave Management' },
  '/dashboard/leave/requests': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Leave Requests' },
  '/dashboard/leave/approvals': { roles: ['admin', 'hr', 'manager', 'department_head'], name: 'Leave Approvals' },
  '/dashboard/leave-types': { roles: ['admin', 'hr'], name: 'Leave Types' },
  '/dashboard/payroll': { roles: ['admin', 'hr'], name: 'Payroll' },
  '/dashboard/payroll/generate': { roles: ['admin', 'hr'], name: 'Generate Payroll' },
  '/dashboard/payroll/payslips': { roles: ['admin', 'hr', 'employee'], name: 'Payslips' },
  '/dashboard/performance': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Performance' },
  '/dashboard/performance/reviews': { roles: ['admin', 'hr', 'manager', 'department_head'], name: 'Performance Reviews' },
  '/dashboard/recruitment': { roles: ['admin', 'hr'], name: 'Recruitment' },
  '/dashboard/onboarding': { roles: ['admin', 'hr'], name: 'Onboarding' },
  '/dashboard/offboarding': { roles: ['admin', 'hr'], name: 'Offboarding' },
  '/dashboard/assets': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Assets' },
  '/dashboard/documents': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Documents' },
  '/dashboard/expenses': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Expenses' },
  '/dashboard/travel': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Travel' },
  '/dashboard/helpdesk': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Helpdesk' },
  '/dashboard/announcements': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Announcements' },
  '/dashboard/policies': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Policies' },
  '/dashboard/holidays': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Holidays' },
  '/dashboard/tasks': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Tasks' },
  '/dashboard/projects': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Projects' },
  '/dashboard/profile': { roles: ['admin', 'hr', 'manager', 'employee', 'department_head'], name: 'Profile' },
  '/dashboard/settings': { roles: ['admin'], name: 'Settings' },
  '/dashboard/reports': { roles: ['admin', 'hr', 'manager', 'department_head'], name: 'Reports' },
};

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: authResult.message 
        },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { action, path, tab } = body;

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'navigate':
        return handleNavigate(path, user);
      
      case 'open_tab':
        return handleOpenTab(tab, user);
      
      case 'get_current_page':
        return handleGetCurrentPage();
      
      case 'get_available_pages':
        return handleGetAvailablePages(user);
      
      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Maya navigation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

function handleNavigate(path, user) {
  if (!path) {
    return NextResponse.json(
      { success: false, error: 'Path is required for navigate action' },
      { status: 400 }
    );
  }

  // Check if user has access to this page
  const pageInfo = AVAILABLE_PAGES[path];
  if (!pageInfo) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Unknown page: ${path}`,
        suggestion: 'Use get_available_pages action to see available pages'
      },
      { status: 400 }
    );
  }

  if (!pageInfo.roles.includes(user.role)) {
    return NextResponse.json(
      { 
        success: false, 
        error: `You don't have permission to access ${pageInfo.name}`,
        userRole: user.role,
        requiredRoles: pageInfo.roles
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    action: 'navigate',
    path,
    pageName: pageInfo.name,
    message: `Navigating to ${pageInfo.name}`,
  });
}

function handleOpenTab(tab, user) {
  if (!tab) {
    return NextResponse.json(
      { success: false, error: 'Tab name is required for open_tab action' },
      { status: 400 }
    );
  }

  // Map tab names to paths
  const tabPaths = {
    dashboard: '/dashboard',
    employees: '/dashboard/employees',
    attendance: '/dashboard/attendance',
    leave: '/dashboard/leave',
    payroll: '/dashboard/payroll',
    performance: '/dashboard/performance',
    tasks: '/dashboard/tasks',
    projects: '/dashboard/projects',
    announcements: '/dashboard/announcements',
    profile: '/dashboard/profile',
  };

  const path = tabPaths[tab];
  if (!path) {
    return NextResponse.json(
      { success: false, error: `Unknown tab: ${tab}` },
      { status: 400 }
    );
  }

  return handleNavigate(path, user);
}

function handleGetCurrentPage() {
  return NextResponse.json({
    success: true,
    message: 'Current page information is tracked on the client side',
    note: 'Maya can ask the user which page they are on',
  });
}

function handleGetAvailablePages(user) {
  const availablePages = Object.entries(AVAILABLE_PAGES)
    .filter(([path, info]) => info.roles.includes(user.role))
    .map(([path, info]) => ({
      path,
      name: info.name,
    }));

  return NextResponse.json({
    success: true,
    userRole: user.role,
    availablePages,
    count: availablePages.length,
  });
}

// GET endpoint for documentation
export async function GET(request) {
  return NextResponse.json({
    message: 'Maya AI Navigation API',
    description: 'Allows Maya to navigate between HRMS pages and perform UI actions',
    usage: {
      method: 'POST',
      endpoint: '/api/maya/navigate',
      authentication: 'Required (JWT token)',
      body: {
        action: 'navigate | open_tab | get_current_page | get_available_pages',
        path: '/dashboard/employees',
        tab: 'employees',
      },
    },
    examples: {
      navigate: {
        action: 'navigate',
        path: '/dashboard/employees',
      },
      openTab: {
        action: 'open_tab',
        tab: 'attendance',
      },
      getAvailablePages: {
        action: 'get_available_pages',
      },
    },
    availablePages: Object.keys(AVAILABLE_PAGES),
  });
}

