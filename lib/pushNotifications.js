/**
 * Push Notification Helper Library
 * Provides easy-to-use functions for sending push notifications from the backend
 */

/**
 * Send push notification to specific users
 * @param {Object} options - Notification options
 * @param {Array<string>} options.userIds - Array of user IDs to send notification to
 * @param {string} options.title - Notification title
 * @param {string} options.body - Notification body text
 * @param {string} [options.icon] - Notification icon URL
 * @param {string} [options.badge] - Notification badge URL
 * @param {string} [options.url] - URL to open when notification is clicked
 * @param {Object} [options.data] - Additional data to include
 * @param {string} [options.adminToken] - Admin token for authorization
 * @returns {Promise<Object>} Response from push notification API
 */
export async function sendPushNotification({
  userIds,
  title,
  body,
  icon = '/icons/icon-192x192.png',
  badge = '/icons/icon-96x96.png',
  url = '/dashboard',
  data = {},
  adminToken
}) {
  try {
    // Get admin token from environment if not provided
    const token = adminToken || process.env.ADMIN_TOKEN

    if (!token) {
      console.warn('[Push Notification] No admin token provided')
      return { success: false, message: 'No admin token' }
    }

    console.log(`[Push Notification] Sending to ${userIds.length} user(s): ${title}`)

    const apiUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push-notifications/send`
    console.log(`[Push Notification] API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        userIds,
        title,
        body,
        icon,
        badge,
        url,
        data
      })
    })

    const result = await response.json()
    console.log(`[Push Notification] Response:`, result)
    return result
  } catch (error) {
    console.error('[Push Notification] Error:', error)
    return { success: false, message: error.message }
  }
}

/**
 * Send notification when leave is approved/rejected
 */
export async function sendLeaveStatusNotification(leave, status, adminToken) {
  const title = status === 'approved' ? 'Leave Approved ✅' : 'Leave Rejected ❌'
  const body = status === 'approved'
    ? `Your leave request has been approved`
    : `Your leave request has been rejected`

  return sendPushNotification({
    userIds: [leave.employee],
    title,
    body,
    url: '/dashboard/leave',
    data: {
      type: 'leave_status',
      leaveId: leave._id,
      status
    },
    adminToken
  })
}

/**
 * Send notification when task is assigned
 */
export async function sendTaskAssignmentNotification(task, assignedUsers, adminToken) {
  return sendPushNotification({
    userIds: assignedUsers,
    title: 'New Task Assigned 📋',
    body: task.title || 'You have been assigned a new task',
    url: `/dashboard/tasks/${task._id}`,
    data: {
      type: 'task_assignment',
      taskId: task._id
    },
    adminToken
  })
}

/**
 * Send notification for attendance reminder
 */
export async function sendAttendanceReminderNotification(userIds, adminToken) {
  return sendPushNotification({
    userIds,
    title: 'Attendance Reminder ⏰',
    body: 'Don\'t forget to mark your attendance for today',
    url: '/dashboard/attendance',
    data: {
      type: 'attendance_reminder'
    },
    adminToken
  })
}

/**
 * Send notification for new announcement
 */
export async function sendAnnouncementNotification(announcement, userIds, adminToken) {
  return sendPushNotification({
    userIds,
    title: '📢 New Announcement',
    body: announcement.title,
    url: '/dashboard/announcements',
    data: {
      type: 'announcement',
      announcementId: announcement._id
    },
    adminToken
  })
}

/**
 * Send notification for payroll processed
 */
export async function sendPayrollNotification(payroll, userId, adminToken) {
  return sendPushNotification({
    userIds: [userId],
    title: 'Payroll Processed 💰',
    body: `Your salary for ${payroll.month} has been processed`,
    url: '/dashboard/payroll',
    data: {
      type: 'payroll',
      payrollId: payroll._id
    },
    adminToken
  })
}

/**
 * Send notification for performance review
 */
export async function sendPerformanceReviewNotification(review, userId, adminToken) {
  return sendPushNotification({
    userIds: [userId],
    title: 'Performance Review Available 📊',
    body: 'Your performance review is ready for viewing',
    url: '/dashboard/performance',
    data: {
      type: 'performance_review',
      reviewId: review._id
    },
    adminToken
  })
}

/**
 * Send notification for expense approval/rejection
 */
export async function sendExpenseStatusNotification(expense, status, adminToken) {
  const title = status === 'approved' ? 'Expense Approved ✅' : 'Expense Rejected ❌'
  const body = status === 'approved'
    ? `Your expense claim has been approved`
    : `Your expense claim has been rejected`

  return sendPushNotification({
    userIds: [expense.employee],
    title,
    body,
    url: '/dashboard/expenses',
    data: {
      type: 'expense_status',
      expenseId: expense._id,
      status
    },
    adminToken
  })
}

/**
 * Send notification for new message in chat
 */
export async function sendChatMessageNotification(message, recipientIds, senderName, userToken) {
  return sendPushNotification({
    userIds: recipientIds,
    title: `💬 ${senderName}`,
    body: message.content || 'Sent a file',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    url: `/dashboard/chat/${message.chatId}`,
    data: {
      type: 'chat_message',
      chatId: message.chatId,
      messageId: message._id,
      senderName
    },
    adminToken: userToken // Use the sender's token for authorization
  })
}

/**
 * Send notification for health score alert
 */
export async function sendHealthScoreAlertNotification(healthScore, userId, adminToken) {
  const title = healthScore.overallScore < 60 ? '⚠️ Critical Health Score Alert' : '⚠️ Health Score Warning'
  const body = `Your employee health score is ${healthScore.overallScore}/100. Improvement needed.`

  return sendPushNotification({
    userIds: [userId],
    title,
    body,
    url: '/dashboard/health-score',
    data: {
      type: 'health_score_alert',
      score: healthScore.overallScore,
      riskLevel: healthScore.riskLevel
    },
    adminToken
  })
}

/**
 * Send bulk notification to all users
 */
export async function sendBulkNotification(title, body, userIds, adminToken) {
  // Split into batches of 100 users to avoid overwhelming the server
  const batchSize = 100
  const batches = []
  
  for (let i = 0; i < userIds.length; i += batchSize) {
    batches.push(userIds.slice(i, i + batchSize))
  }

  const results = []
  for (const batch of batches) {
    const result = await sendPushNotification({
      userIds: batch,
      title,
      body,
      adminToken
    })
    results.push(result)
  }

  return {
    success: true,
    batches: batches.length,
    results
  }
}

export default {
  sendPushNotification,
  sendLeaveStatusNotification,
  sendTaskAssignmentNotification,
  sendAttendanceReminderNotification,
  sendAnnouncementNotification,
  sendPayrollNotification,
  sendPerformanceReviewNotification,
  sendExpenseStatusNotification,
  sendChatMessageNotification,
  sendHealthScoreAlertNotification,
  sendBulkNotification
}

