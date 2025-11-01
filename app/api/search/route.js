import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import Employee from '@/models/Employee'
import Task from '@/models/Task'
import Leave from '@/models/Leave'
import Attendance from '@/models/Attendance'
import Department from '@/models/Department'
import Designation from '@/models/Designation'
import Document from '@/models/Document'
import Asset from '@/models/Asset'
import Announcement from '@/models/Announcement'
import Policy from '@/models/Policy'
import Fuse from 'fuse.js'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

// Synonym dictionary for better word matching
const synonyms = {
  'leave': ['vacation', 'holiday', 'time off', 'pto', 'absence', 'off', 'break'],
  'vacation': ['leave', 'holiday', 'time off', 'pto', 'break'],
  'holiday': ['leave', 'vacation', 'time off', 'festival', 'day off'],
  'attendance': ['presence', 'check in', 'check out', 'clock in', 'clock out', 'punch', 'timesheet'],
  'salary': ['pay', 'payroll', 'compensation', 'wage', 'payment', 'payslip', 'earnings'],
  'pay': ['salary', 'payroll', 'compensation', 'wage', 'payment'],
  'payroll': ['salary', 'pay', 'compensation', 'wage', 'payslip'],
  'task': ['work', 'assignment', 'project', 'todo', 'job', 'activity'],
  'work': ['task', 'assignment', 'project', 'job', 'activity'],
  'employee': ['staff', 'worker', 'team member', 'colleague', 'personnel'],
  'staff': ['employee', 'worker', 'team member', 'personnel'],
  'department': ['division', 'team', 'unit', 'section', 'group'],
  'profile': ['account', 'settings', 'personal', 'my profile', 'user'],
  'document': ['file', 'paper', 'form', 'record', 'certificate'],
  'announcement': ['news', 'notice', 'update', 'information', 'alert', 'notification'],
  'policy': ['rule', 'guideline', 'regulation', 'procedure', 'protocol'],
  'performance': ['review', 'appraisal', 'evaluation', 'assessment', 'rating', 'kpi'],
  'asset': ['equipment', 'device', 'resource', 'inventory', 'property'],
  'expense': ['claim', 'reimbursement', 'bill', 'receipt', 'cost'],
  'travel': ['trip', 'journey', 'business travel', 'tour'],
  'help': ['support', 'helpdesk', 'assistance', 'ticket', 'issue'],
  'recruitment': ['hiring', 'job', 'career', 'opening', 'position', 'vacancy'],
  'onboarding': ['joining', 'new hire', 'orientation', 'induction'],
  'offboarding': ['exit', 'resignation', 'leaving', 'separation', 'termination'],
  'chat': ['message', 'messaging', 'communication', 'talk', 'conversation'],
  'home': ['dashboard', 'main', 'overview', 'home page'],
  'dashboard': ['home', 'main', 'overview']
}

// Function to expand search query with synonyms
function expandQueryWithSynonyms(query) {
  const words = query.toLowerCase().split(' ')
  const expandedWords = new Set(words)

  words.forEach(word => {
    if (synonyms[word]) {
      synonyms[word].forEach(synonym => expandedWords.add(synonym))
    }
  })

  return Array.from(expandedWords)
}

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const { payload: decoded } = await jwtVerify(token, secret)
    await connectDB()

    const user = await User.findById(decoded.userId).populate('employeeId')
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Search query too short' }, { status: 400 })
    }

    const searchRegex = new RegExp(query, 'i')
    const results = {
      pages: [],
      tasks: [],
      leaves: [],
      announcements: [],
      policies: []
    }

    // Define app pages and views for navigation search
    const appPages = [
      { title: 'Dashboard', description: 'View your dashboard and overview', link: '/dashboard', icon: '🏠', keywords: ['home', 'overview', 'main', 'dashboard'] },
      { title: 'My Profile', description: 'View and edit your profile', link: '/dashboard/profile', icon: '👤', keywords: ['profile', 'my profile', 'personal', 'account', 'settings'] },
      { title: 'Tasks', description: 'Manage your tasks and assignments', link: '/dashboard/tasks', icon: '📋', keywords: ['tasks', 'assignments', 'work', 'todo', 'projects'] },
      { title: 'Leave Management', description: 'Apply for leave and view leave balance', link: '/dashboard/leave', icon: '🏖️', keywords: ['leave', 'vacation', 'time off', 'absence', 'pto', 'holiday'] },
      { title: 'Apply for Leave', description: 'Submit a new leave application', link: '/dashboard/leave/apply', icon: '📝', keywords: ['apply leave', 'request leave', 'new leave', 'leave application'] },
      { title: 'Attendance', description: 'View attendance records and check-in/out', link: '/dashboard/attendance', icon: '⏰', keywords: ['attendance', 'check in', 'check out', 'clock in', 'clock out', 'presence'] },
      { title: 'Chat & Messages', description: 'Chat with colleagues and teams', link: '/dashboard/chat', icon: '💬', keywords: ['chat', 'messages', 'messaging', 'communication', 'talk'] },
      { title: 'Documents', description: 'Access and manage documents', link: '/dashboard/documents', icon: '📄', keywords: ['documents', 'files', 'papers', 'forms', 'downloads'] },
      { title: 'Employees', description: 'View employee directory', link: '/dashboard/employees', icon: '👥', keywords: ['employees', 'staff', 'team', 'colleagues', 'people', 'directory'] },
      { title: 'Departments', description: 'View departments and organization structure', link: '/dashboard/organization/departments', icon: '🏢', keywords: ['departments', 'organization', 'structure', 'teams', 'divisions'] },
      { title: 'Designations', description: 'View job designations and roles', link: '/dashboard/organization/designations', icon: '🎯', keywords: ['designations', 'roles', 'positions', 'job titles'] },
      { title: 'Announcements', description: 'View company announcements', link: '/dashboard/announcements', icon: '📢', keywords: ['announcements', 'news', 'updates', 'notices', 'information'] },
      { title: 'Policies', description: 'View company policies', link: '/dashboard/policies', icon: '📜', keywords: ['policies', 'rules', 'guidelines', 'regulations', 'procedures'] },
      { title: 'Payroll', description: 'View payroll and salary information', link: '/dashboard/payroll', icon: '💰', keywords: ['payroll', 'salary', 'pay', 'compensation', 'wages', 'payslip'] },
      { title: 'Performance', description: 'View performance reviews and goals', link: '/dashboard/performance', icon: '📊', keywords: ['performance', 'reviews', 'appraisal', 'goals', 'objectives', 'kpi'] },
      { title: 'Assets', description: 'View assigned assets and equipment', link: '/dashboard/assets', icon: '💻', keywords: ['assets', 'equipment', 'devices', 'inventory', 'resources'] },
      { title: 'Expenses', description: 'Submit and track expense claims', link: '/dashboard/expenses', icon: '💳', keywords: ['expenses', 'claims', 'reimbursement', 'bills', 'receipts'] },
      { title: 'Travel', description: 'Manage travel requests', link: '/dashboard/travel', icon: '✈️', keywords: ['travel', 'trips', 'business travel', 'journey'] },
      { title: 'Helpdesk', description: 'Submit support tickets', link: '/dashboard/helpdesk', icon: '🎫', keywords: ['helpdesk', 'support', 'tickets', 'help', 'issues', 'problems'] },
      { title: 'Recruitment', description: 'View job openings and recruitment', link: '/dashboard/recruitment', icon: '🔍', keywords: ['recruitment', 'hiring', 'jobs', 'careers', 'openings', 'positions'] },
      { title: 'Onboarding', description: 'View onboarding information', link: '/dashboard/onboarding', icon: '🚀', keywords: ['onboarding', 'new hire', 'joining', 'orientation'] },
      { title: 'Offboarding', description: 'Manage offboarding process', link: '/dashboard/offboarding', icon: '👋', keywords: ['offboarding', 'exit', 'resignation', 'leaving', 'separation'] },
      { title: 'Holidays', description: 'View holiday calendar', link: '/dashboard/holidays', icon: '📅', keywords: ['holidays', 'calendar', 'public holidays', 'festivals', 'days off'] },
      { title: 'Ideas & Sandbox', description: 'Share ideas and suggestions', link: '/dashboard/sandbox', icon: '💡', keywords: ['ideas', 'sandbox', 'suggestions', 'innovation', 'feedback'] },
    ]

    // Expand query with synonyms
    const expandedTerms = expandQueryWithSynonyms(query)

    // Configure Fuse.js for fuzzy search
    const fuseOptions = {
      keys: [
        { name: 'title', weight: 0.4 },
        { name: 'description', weight: 0.3 },
        { name: 'keywords', weight: 0.3 }
      ],
      threshold: 0.4, // 0.0 = perfect match, 1.0 = match anything
      distance: 100,
      minMatchCharLength: 2,
      includeScore: true,
      ignoreLocation: true
    }

    const fuse = new Fuse(appPages, fuseOptions)

    // Search with original query
    let fuseResults = fuse.search(query)

    // Also search with expanded terms (synonyms)
    expandedTerms.forEach(term => {
      if (term !== query.toLowerCase()) {
        const synonymResults = fuse.search(term)
        fuseResults = [...fuseResults, ...synonymResults]
      }
    })

    // Remove duplicates and sort by score
    const uniqueResults = Array.from(
      new Map(fuseResults.map(item => [item.item.link, item])).values()
    ).sort((a, b) => a.score - b.score).slice(0, 10)

    results.pages = uniqueResults.map(result => ({
      type: 'page',
      title: result.item.title,
      subtitle: 'Navigate to',
      description: result.item.description,
      meta: result.item.icon,
      link: result.item.link,
      score: result.score
    }))

    // Search Tasks (only user's tasks or tasks they're involved in)
    const tasks = await Task.find({
      $and: [
        {
          $or: [
            { assignedTo: user.employeeId._id },
            { createdBy: user.employeeId._id },
            { 'watchers.employee': user.employeeId._id }
          ]
        },
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { taskNumber: searchRegex },
            { tags: searchRegex }
          ]
        }
      ]
    })
      .select('title description status priority dueDate taskNumber')
      .limit(10)

    results.tasks = tasks.map(task => ({
      _id: task._id,
      type: 'task',
      title: task.title,
      subtitle: `Task #${task.taskNumber}`,
      description: task.description?.substring(0, 100),
      meta: `${task.status} • ${task.priority}`,
      link: `/dashboard/tasks/my-tasks`
    }))

    // Search Leaves (only user's leaves)
    const leaves = await Leave.find({
      employee: user.employeeId._id,
      $or: [
        { reason: searchRegex },
        { status: searchRegex },
        { applicationNumber: searchRegex }
      ]
    })
      .select('reason status startDate endDate numberOfDays applicationNumber')
      .populate('leaveType', 'name')
      .limit(10)

    results.leaves = leaves.map(leave => ({
      _id: leave._id,
      type: 'leave',
      title: leave.leaveType?.name || 'Leave',
      subtitle: `${leave.numberOfDays} days`,
      description: leave.reason,
      meta: `${leave.status} • ${new Date(leave.startDate).toLocaleDateString()}`,
      link: `/dashboard/leave`
    }))

    // Search Attendance (only user's attendance)
    const attendance = await Attendance.find({
      employee: user.employeeId._id,
      $or: [
        { status: searchRegex },
        { remarks: searchRegex }
      ]
    })
      .select('date status checkIn checkOut workHours')
      .sort({ date: -1 })
      .limit(10)

    results.attendance = attendance.map(att => ({
      _id: att._id,
      type: 'attendance',
      title: `Attendance - ${new Date(att.date).toLocaleDateString()}`,
      subtitle: att.status,
      description: `Work Hours: ${att.workHours || 0}`,
      meta: att.checkIn ? new Date(att.checkIn).toLocaleTimeString() : 'N/A',
      link: `/dashboard/attendance`
    }))

    // Search Departments (all departments)
    const departments = await Department.find({
      $or: [
        { name: searchRegex },
        { code: searchRegex },
        { description: searchRegex }
      ]
    })
      .select('name code description')
      .limit(10)

    results.departments = departments.map(dept => ({
      _id: dept._id,
      type: 'department',
      title: dept.name,
      subtitle: dept.code,
      description: dept.description,
      link: `/dashboard/organization/departments`
    }))

    // Search Designations (all designations)
    const designations = await Designation.find({
      title: searchRegex
    })
      .select('title level')
      .populate('department', 'name')
      .limit(10)

    results.designations = designations.map(des => ({
      _id: des._id,
      type: 'designation',
      title: des.title,
      subtitle: des.level || 'Designation',
      description: des.department?.name,
      link: `/dashboard/organization/designations`
    }))

    // Search Documents (accessible to user)
    const documents = await Document.find({
      $and: [
        {
          $or: [
            { accessLevel: 'public' },
            { uploadedBy: user.employeeId._id },
            { sharedWith: user.employeeId._id },
            { department: user.employeeId.department }
          ]
        },
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { fileName: searchRegex },
            { category: searchRegex }
          ]
        }
      ]
    })
      .select('title description category fileName fileType')
      .limit(10)

    results.documents = documents.map(doc => ({
      _id: doc._id,
      type: 'document',
      title: doc.title,
      subtitle: doc.category,
      description: doc.description,
      meta: doc.fileType,
      link: `/dashboard/documents`
    }))

    // Search Assets (assigned to user or available)
    const assets = await Asset.find({
      $and: [
        {
          $or: [
            { assignedTo: user.employeeId._id },
            { status: 'available' }
          ]
        },
        {
          $or: [
            { name: searchRegex },
            { assetCode: searchRegex },
            { category: searchRegex },
            { serialNumber: searchRegex }
          ]
        }
      ]
    })
      .select('name assetCode category status serialNumber')
      .limit(10)

    results.assets = assets.map(asset => ({
      _id: asset._id,
      type: 'asset',
      title: asset.name,
      subtitle: asset.assetCode,
      description: asset.category,
      meta: asset.status,
      link: `/dashboard/assets`
    }))

    // Search Announcements (all active announcements)
    const announcements = await Announcement.find({
      $or: [
        { title: searchRegex },
        { content: searchRegex }
      ]
    })
      .select('title content priority publishedAt')
      .sort({ publishedAt: -1 })
      .limit(10)

    results.announcements = announcements.map(ann => ({
      _id: ann._id,
      type: 'announcement',
      title: ann.title,
      subtitle: 'Announcement',
      description: ann.content?.substring(0, 100),
      meta: ann.priority,
      link: `/dashboard/announcements`
    }))

    // Search Policies (all active policies)
    const policies = await Policy.find({
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex }
      ]
    })
      .select('title description category version')
      .limit(10)

    results.policies = policies.map(policy => ({
      _id: policy._id,
      type: 'policy',
      title: policy.title,
      subtitle: `Policy v${policy.version}`,
      description: policy.description,
      meta: policy.category,
      link: `/dashboard/policies`
    }))

    // Count total results
    const totalResults = Object.values(results).reduce((sum, arr) => sum + arr.length, 0)

    return NextResponse.json({
      success: true,
      data: results,
      totalResults,
      query
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ success: false, message: 'Search failed', error: error.message }, { status: 500 })
  }
}

