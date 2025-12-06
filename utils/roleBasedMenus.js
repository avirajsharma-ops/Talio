import {
  HiOutlineSquares2X2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineEnvelope,
  HiOutlineRectangleGroup,
  HiOutlineClipboardDocumentList,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineBanknotes,
  HiOutlineTrophy,
  HiOutlineBriefcase,
  HiOutlineUserPlus,
  HiOutlineArrowRightOnRectangle,
  HiOutlineDocumentText,
  HiOutlineCube,
  HiOutlineReceiptPercent,
  HiOutlineLifebuoy,
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineMegaphone,
  HiOutlineCalendarDays,
  HiOutlineChartBar
} from 'react-icons/hi2'

// Define menu items for each role
// NOTE: MAYA AI Assistant is only available in the desktop apps (Mac/Windows) via floating widget
// It has been removed from the web version entirely
export const roleBasedMenus = {
  // ADMIN - Full access to everything
  admin: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'All Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    { 
      name: 'Employees', 
      icon: HiOutlineUserGroup, 
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
        { name: 'Companies', path: '/dashboard/companies' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: HiOutlineClock,
      path: '/dashboard/attendance',
      submenu: [
        { name: 'Attendance Report', path: '/dashboard/attendance/report' },
        { name: 'Employee Check-ins', path: '/dashboard/attendance/checkins' },
        { name: 'Attendance Regularisation', path: '/dashboard/team/regularisation' },
        { name: 'Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
        { name: 'Leave Types', path: '/dashboard/leave-types' },
        { name: 'Leave Allocations', path: '/dashboard/leave/allocations' },
      ]
    },
    { 
      name: 'Payroll', 
      icon: HiOutlineBanknotes, 
      path: '/dashboard/payroll',
      submenu: [
        { name: 'Process Payroll', path: '/dashboard/payroll' },
        { name: 'Generate Payroll', path: '/dashboard/payroll/generate' },
        { name: 'Payslips', path: '/dashboard/payroll/payslips' },
        { name: 'Salary Structure', path: '/dashboard/payroll/structure' },
      ]
    },
    {
      name: 'Performance',
      icon: HiOutlineTrophy,
      path: '/dashboard/performance',
      submenu: [
        { name: 'Performance Reviews', path: '/dashboard/performance/reviews' },
        { name: 'Goals & Objectives', path: '/dashboard/performance/goals' },
        { name: 'Performance Reports', path: '/dashboard/performance/reports' },
        { name: 'Employee Ratings', path: '/dashboard/performance/ratings' },
      ]
    },
    { 
      name: 'Recruitment', 
      icon: HiOutlineBriefcase, 
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: HiOutlineUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: HiOutlineArrowRightOnRectangle, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Assets', icon: HiOutlineCube, path: '/dashboard/assets' },
    { name: 'Expenses', icon: HiOutlineReceiptPercent, path: '/dashboard/expenses' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Policies', icon: HiOutlineBookOpen, path: '/dashboard/policies' },
    { 
      name: 'Learning (LMS)', 
      icon: HiOutlineAcademicCap, 
      path: '/dashboard/learning',
      submenu: [
        { name: 'Courses', path: '/dashboard/learning/courses' },
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    {
      name: 'Announcements',
      icon: HiOutlineMegaphone,
      path: '/dashboard/announcements',
      submenu: [
        { name: 'All Announcements', path: '/dashboard/announcements' },
        { name: 'Create Announcement', path: '/dashboard/announcements/create' },
      ]
    },
    { name: 'Holidays', icon: HiOutlineCalendarDays, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],

  // HR - HR management focused
  hr: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'All Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    { 
      name: 'Employees', 
      icon: HiOutlineUserGroup, 
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
        { name: 'Companies', path: '/dashboard/companies' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: HiOutlineClock,
      path: '/dashboard/attendance',
      submenu: [
        { name: 'Attendance Report', path: '/dashboard/attendance/report' },
        { name: 'Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
        { name: 'Leave Types', path: '/dashboard/leave-types' },
        { name: 'Leave Allocations', path: '/dashboard/leave/allocations' },
      ]
    },
    { 
      name: 'Payroll', 
      icon: HiOutlineBanknotes, 
      path: '/dashboard/payroll',
      submenu: [
        { name: 'Generate Payroll', path: '/dashboard/payroll/generate' },
        { name: 'Payslips', path: '/dashboard/payroll/payslips' },
        { name: 'Salary Structure', path: '/dashboard/payroll/structure' },
      ]
    },
    {
      name: 'Performance',
      icon: HiOutlineTrophy,
      path: '/dashboard/performance',
      submenu: [
        { name: 'Performance Reviews', path: '/dashboard/performance/reviews' },
        { name: 'Goals & Objectives', path: '/dashboard/performance/goals' },
        { name: 'Performance Reports', path: '/dashboard/performance/reports' },
      ]
    },
    { 
      name: 'Recruitment', 
      icon: HiOutlineBriefcase, 
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: HiOutlineUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: HiOutlineArrowRightOnRectangle, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Policies', icon: HiOutlineBookOpen, path: '/dashboard/policies' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Announcements', icon: HiOutlineMegaphone, path: '/dashboard/announcements' },
    { name: 'Holidays', icon: HiOutlineCalendarDays, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],

  // MANAGER - Team management focused
  manager: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'All Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    { 
      name: 'Attendance & Leaves', 
      icon: HiOutlineClock, 
      path: '/dashboard/attendance',
      submenu: [
        { name: 'My Attendance', path: '/dashboard/attendance' },
        { name: 'Apply Leave', path: '/dashboard/leave/apply' },
        { name: 'My Leave Balance', path: '/dashboard/leave/balance' },
        { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
      ]
    },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Expenses', icon: HiOutlineReceiptPercent, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: HiOutlineAcademicCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: HiOutlineMegaphone, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],

  // EMPLOYEE - Personal focused
  employee: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'My Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    { 
      name: 'Attendance & Leaves', 
      icon: HiOutlineClock, 
      path: '/dashboard/attendance',
      submenu: [
        { name: 'My Attendance', path: '/dashboard/attendance' },
        { name: 'Apply Leave', path: '/dashboard/leave/apply' },
        { name: 'Leave Balance', path: '/dashboard/leave/balance' },
        { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
      ]
    },
    { name: 'Payslips', icon: HiOutlineBanknotes, path: '/dashboard/payroll/payslips' },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Expenses', icon: HiOutlineReceiptPercent, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: HiOutlineAcademicCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: HiOutlineMegaphone, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],

  // DEPARTMENT HEAD - Department management focused (inherits from manager with department oversight)
  department_head: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'All Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    { 
      name: 'Attendance & Leaves', 
      icon: HiOutlineClock, 
      path: '/dashboard/attendance',
      submenu: [
        { name: 'My Attendance', path: '/dashboard/attendance' },
        { name: 'Team Attendance', path: '/dashboard/attendance/team' },
        { name: 'Attendance Regularisation', path: '/dashboard/team/regularisation' },
        { name: 'Apply Leave', path: '/dashboard/leave/apply' },
        { name: 'My Leave Balance', path: '/dashboard/leave/balance' },
        { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
      ]
    },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Expenses', icon: HiOutlineReceiptPercent, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: HiOutlineAcademicCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: HiOutlineMegaphone, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],

  // GOD ADMIN - Supreme access
  god_admin: [
    { name: 'Dashboard', icon: HiOutlineSquares2X2, path: '/dashboard' },
    { name: 'Chat', icon: HiOutlineChatBubbleLeftRight, path: '/dashboard/chat' },
    { name: 'Mail', icon: HiOutlineEnvelope, path: '/dashboard/mail' },
    { name: 'TalioBoard', icon: HiOutlineRectangleGroup, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: HiOutlineClipboardDocumentList,
      path: '/dashboard/projects',
      submenu: [
        { name: 'All Projects', path: '/dashboard/projects' },
        { name: 'My Tasks', path: '/dashboard/projects/my-tasks' },
        { name: 'Pending Approvals', path: '/dashboard/projects/approvals' },
        { name: 'Create Project', path: '/dashboard/projects/create' },
      ]
    },
    {
      name: 'Employees',
      icon: HiOutlineUserGroup,
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
        { name: 'Companies', path: '/dashboard/companies' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: HiOutlineClock,
      path: '/dashboard/attendance',
      submenu: [
        { name: 'Attendance Report', path: '/dashboard/attendance/report' },
        { name: 'Employee Check-ins', path: '/dashboard/attendance/checkins' },
        { name: 'Attendance Regularisation', path: '/dashboard/team/regularisation' },
        { name: 'Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
        { name: 'Leave Types', path: '/dashboard/leave-types' },
        { name: 'Leave Allocations', path: '/dashboard/leave/allocations' },
      ]
    },
    {
      name: 'Payroll',
      icon: HiOutlineBanknotes,
      path: '/dashboard/payroll',
      submenu: [
        { name: 'Process Payroll', path: '/dashboard/payroll' },
        { name: 'Generate Payroll', path: '/dashboard/payroll/generate' },
        { name: 'Payslips', path: '/dashboard/payroll/payslips' },
        { name: 'Salary Structure', path: '/dashboard/payroll/structure' },
      ]
    },
    {
      name: 'Performance',
      icon: HiOutlineTrophy,
      path: '/dashboard/performance',
      submenu: [
        { name: 'Performance Reviews', path: '/dashboard/performance/reviews' },
        { name: 'Goals & Objectives', path: '/dashboard/performance/goals' },
        { name: 'Performance Reports', path: '/dashboard/performance/reports' },
        { name: 'Employee Ratings', path: '/dashboard/performance/ratings' },
      ]
    },
    {
      name: 'Recruitment',
      icon: HiOutlineBriefcase,
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: HiOutlineUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: HiOutlineArrowRightOnRectangle, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: HiOutlineDocumentText, path: '/dashboard/documents' },
    { name: 'Assets', icon: HiOutlineCube, path: '/dashboard/assets' },
    { name: 'Expenses', icon: HiOutlineReceiptPercent, path: '/dashboard/expenses' },
    { name: 'Helpdesk', icon: HiOutlineLifebuoy, path: '/dashboard/helpdesk' },
    { name: 'Policies', icon: HiOutlineBookOpen, path: '/dashboard/policies' },
    {
      name: 'Learning (LMS)',
      icon: HiOutlineAcademicCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'Courses', path: '/dashboard/learning/courses' },
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    {
      name: 'Announcements',
      icon: HiOutlineMegaphone,
      path: '/dashboard/announcements',
      submenu: [
        { name: 'All Announcements', path: '/dashboard/announcements' },
        { name: 'Create Announcement', path: '/dashboard/announcements/create' },
      ]
    },
    { name: 'Holidays', icon: HiOutlineCalendarDays, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: HiOutlineChartBar, path: '/dashboard/productivity' },
  ],
}

// Helper function to get menu items based on user role
export const getMenuItemsForRole = (role) => {
  return roleBasedMenus[role] || roleBasedMenus.employee
}
