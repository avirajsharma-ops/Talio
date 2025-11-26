import Activity from '@/models/Activity'

/**
 * Log an activity for an employee
 * @param {Object} params - Activity parameters
 * @param {String} params.employeeId - Employee ID
 * @param {String} params.type - Activity type
 * @param {String} params.action - Action description
 * @param {String} params.details - Additional details
 * @param {Object} params.metadata - Additional metadata
 * @param {String} params.relatedModel - Related model name
 * @param {String} params.relatedId - Related document ID
 * @param {String} params.ipAddress - IP address
 * @param {String} params.userAgent - User agent
 */
export async function logActivity({
  employeeId,
  type,
  action,
  details = '',
  metadata = {},
  relatedModel = null,
  relatedId = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    await Activity.create({
      employee: employeeId,
      type,
      action,
      details,
      metadata,
      relatedModel,
      relatedId,
      ipAddress,
      userAgent
    })
  } catch (error) {
    console.error('Activity logging error:', error)
    // Don't throw error - activity logging should not break the main flow
  }
}

/**
 * Get activity color based on type
 */
export function getActivityColor(type) {
  const colorMap = {
    'attendance_checkin': 'bg-green-100 text-green-800',
    'attendance_checkout': 'bg-blue-100 text-blue-800',
    'leave_apply': 'bg-yellow-100 text-yellow-800',
    'leave_approve': 'bg-green-100 text-green-800',
    'leave_reject': 'bg-red-100 text-red-800',
    'task_create': 'bg-purple-100 text-purple-800',
    'task_update': 'bg-blue-100 text-blue-800',
    'task_complete': 'bg-green-100 text-green-800',
    'task_review': 'bg-yellow-100 text-yellow-800',
    'task_approve': 'bg-green-100 text-green-800',
    'task_reject': 'bg-red-100 text-red-800',
    'milestone_create': 'bg-indigo-100 text-indigo-800',
    'milestone_complete': 'bg-green-100 text-green-800',
    'profile_update': 'bg-blue-100 text-blue-800',
    'password_change': 'bg-orange-100 text-orange-800',
    'document_upload': 'bg-purple-100 text-purple-800',
    'expense_submit': 'bg-yellow-100 text-yellow-800',
    'travel_request': 'bg-teal-100 text-teal-800',
    'goal_create': 'bg-indigo-100 text-indigo-800',
    'goal_complete': 'bg-green-100 text-green-800',
    'performance_review': 'bg-purple-100 text-purple-800',
    'training_enroll': 'bg-blue-100 text-blue-800',
    'training_complete': 'bg-green-100 text-green-800',
    'project_join': 'bg-teal-100 text-teal-800',
    'team_join': 'bg-blue-100 text-blue-800',
    'comment_add': 'bg-gray-100 text-gray-800',
    'file_upload': 'bg-purple-100 text-purple-800',
    'other': 'bg-gray-100 text-gray-800'
  }
  
  return colorMap[type] || 'bg-gray-100 text-gray-800'
}

/**
 * Format time ago
 */
export function formatTimeAgo(date) {
  const now = new Date()
  const activityDate = new Date(date)
  const diffMs = now - activityDate
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

