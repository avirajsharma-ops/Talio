import {
  FaTachometerAlt, FaUsers, FaClock, FaCalendarAlt, FaMoneyBillWave,
  FaChartLine, FaBriefcase, FaUserPlus, FaSignOutAlt, FaFileAlt,
  FaBox, FaReceipt, FaHeadset, FaBook, FaGraduationCap,
  FaBullhorn, FaUser, FaTrophy, FaBullseye, FaStar, FaAward,
  FaProjectDiagram, FaClipboardList, FaMapMarkerAlt, FaUserFriends,
  FaThLarge, FaTasks
} from 'react-icons/fa'

// Define menu items for each role
// NOTE: MAYA AI Assistant is only available in the desktop apps (Mac/Windows) via floating widget
// It has been removed from the web version entirely
export const roleBasedMenus = {
  // ADMIN - Full access to everything
  admin: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaUsers, 
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: FaClock,
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
      icon: FaMoneyBillWave, 
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
      icon: FaTrophy,
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
      icon: FaBriefcase, 
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: FaUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: FaSignOutAlt, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Assets', icon: FaBox, path: '/dashboard/assets' },
    { name: 'Expenses', icon: FaReceipt, path: '/dashboard/expenses' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Policies', icon: FaBook, path: '/dashboard/policies' },
    { 
      name: 'Learning (LMS)', 
      icon: FaGraduationCap, 
      path: '/dashboard/learning',
      submenu: [
        { name: 'Courses', path: '/dashboard/learning/courses' },
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    {
      name: 'Announcements',
      icon: FaBullhorn,
      path: '/dashboard/announcements',
      submenu: [
        { name: 'All Announcements', path: '/dashboard/announcements' },
        { name: 'Create Announcement', path: '/dashboard/announcements/create' },
      ]
    },
    { name: 'Holidays', icon: FaCalendarAlt, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],

  // HR - HR management focused
  hr: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaUsers, 
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: FaClock,
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
      icon: FaMoneyBillWave, 
      path: '/dashboard/payroll',
      submenu: [
        { name: 'Generate Payroll', path: '/dashboard/payroll/generate' },
        { name: 'Payslips', path: '/dashboard/payroll/payslips' },
        { name: 'Salary Structure', path: '/dashboard/payroll/structure' },
      ]
    },
    {
      name: 'Performance',
      icon: FaTrophy,
      path: '/dashboard/performance',
      submenu: [
        { name: 'Performance Reviews', path: '/dashboard/performance/reviews' },
        { name: 'Goals & Objectives', path: '/dashboard/performance/goals' },
        { name: 'Performance Reports', path: '/dashboard/performance/reports' },
      ]
    },
    { 
      name: 'Recruitment', 
      icon: FaBriefcase, 
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: FaUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: FaSignOutAlt, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Policies', icon: FaBook, path: '/dashboard/policies' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Announcements', icon: FaBullhorn, path: '/dashboard/announcements' },
    { name: 'Holidays', icon: FaCalendarAlt, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],

  // MANAGER - Team management focused
  manager: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaClock, 
      path: '/dashboard/attendance',
      submenu: [
        { name: 'My Attendance', path: '/dashboard/attendance' },
        { name: 'Apply Leave', path: '/dashboard/leave/apply' },
        { name: 'My Leave Balance', path: '/dashboard/leave/balance' },
        { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
        { name: 'Leave Approvals', path: '/dashboard/leave/approvals' },
      ]
    },
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Expenses', icon: FaReceipt, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: FaGraduationCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: FaBullhorn, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],

  // EMPLOYEE - Personal focused
  employee: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaClock, 
      path: '/dashboard/attendance',
      submenu: [
        { name: 'My Attendance', path: '/dashboard/attendance' },
        { name: 'Apply Leave', path: '/dashboard/leave/apply' },
        { name: 'Leave Balance', path: '/dashboard/leave/balance' },
        { name: 'My Leave Requests', path: '/dashboard/leave/requests' },
      ]
    },
    { name: 'Payslips', icon: FaMoneyBillWave, path: '/dashboard/payroll/payslips' },
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Expenses', icon: FaReceipt, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: FaGraduationCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: FaBullhorn, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],

  // DEPARTMENT HEAD - Department management focused (inherits from manager with department oversight)
  department_head: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaClock, 
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
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Expenses', icon: FaReceipt, path: '/dashboard/expenses' },
    {
      name: 'Learning',
      icon: FaGraduationCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    { name: 'Announcements', icon: FaBullhorn, path: '/dashboard/announcements' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],

  // GOD ADMIN - Supreme access
  god_admin: [
    { name: 'Dashboard', icon: FaTachometerAlt, path: '/dashboard' },
    { name: 'TalioBoard', icon: FaThLarge, path: '/dashboard/talioboard' },
    {
      name: 'Projects',
      icon: FaTasks,
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
      icon: FaUsers,
      path: '/dashboard/employees',
      submenu: [
        { name: 'All Employees', path: '/dashboard/employees' },
        { name: 'Add Employee', path: '/dashboard/employees/add' },
        { name: 'Departments', path: '/dashboard/departments' },
        { name: 'Designations', path: '/dashboard/designations' },
      ]
    },
    {
      name: 'Attendance & Leaves',
      icon: FaClock,
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
      icon: FaMoneyBillWave,
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
      icon: FaTrophy,
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
      icon: FaBriefcase,
      path: '/dashboard/recruitment',
      submenu: [
        { name: 'Job Openings', path: '/dashboard/recruitment/jobs' },
        { name: 'Candidates', path: '/dashboard/recruitment/candidates' },
        { name: 'Interviews', path: '/dashboard/recruitment/interviews' },
      ]
    },
    { name: 'Onboarding', icon: FaUserPlus, path: '/dashboard/onboarding' },
    { name: 'Offboarding', icon: FaSignOutAlt, path: '/dashboard/offboarding' },
    { name: 'Documents', icon: FaFileAlt, path: '/dashboard/documents' },
    { name: 'Assets', icon: FaBox, path: '/dashboard/assets' },
    { name: 'Expenses', icon: FaReceipt, path: '/dashboard/expenses' },
    { name: 'Helpdesk', icon: FaHeadset, path: '/dashboard/helpdesk' },
    { name: 'Policies', icon: FaBook, path: '/dashboard/policies' },
    {
      name: 'Learning (LMS)',
      icon: FaGraduationCap,
      path: '/dashboard/learning',
      submenu: [
        { name: 'Courses', path: '/dashboard/learning/courses' },
        { name: 'My Trainings', path: '/dashboard/learning/trainings' },
        { name: 'Certificates', path: '/dashboard/learning/certificates' },
      ]
    },
    {
      name: 'Announcements',
      icon: FaBullhorn,
      path: '/dashboard/announcements',
      submenu: [
        { name: 'All Announcements', path: '/dashboard/announcements' },
        { name: 'Create Announcement', path: '/dashboard/announcements/create' },
      ]
    },
    { name: 'Holidays', icon: FaCalendarAlt, path: '/dashboard/holidays' },
    { name: 'Productivity', icon: FaChartLine, path: '/dashboard/productivity' },
  ],
}

// Helper function to get menu items based on user role
export const getMenuItemsForRole = (role) => {
  return roleBasedMenus[role] || roleBasedMenus.employee
}
