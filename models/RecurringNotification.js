import mongoose from 'mongoose'

const RecurringNotificationSchema = new mongoose.Schema({
  // Notification content
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  url: {
    type: String,
    default: '/dashboard'
  },
  icon: {
    type: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Targeting
  targetType: {
    type: String,
    enum: ['all', 'department', 'specific', 'role'],
    required: true
  },
  targetDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  targetRoles: [{
    type: String,
    enum: ['admin', 'hr', 'manager', 'employee', 'department_head']
  }],

  // Recurrence settings
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom'],
    required: true
  },
  
  // For daily frequency
  dailyTime: {
    type: String, // Format: "HH:MM" (24-hour)
  },
  
  // For weekly frequency
  weeklyDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  weeklyTime: {
    type: String, // Format: "HH:MM" (24-hour)
  },
  
  // For monthly frequency
  monthlyDay: {
    type: Number, // Day of month (1-31)
    min: 1,
    max: 31
  },
  monthlyTime: {
    type: String, // Format: "HH:MM" (24-hour)
  },
  
  // For custom frequency (cron-like)
  customDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  customTimes: [{
    type: String // Format: "HH:MM" (24-hour)
  }],

  // Schedule period
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  lastSentAt: {
    type: Date
  },
  nextScheduledAt: {
    type: Date
  },
  totalSent: {
    type: Number,
    default: 0
  },
  totalSuccess: {
    type: Number,
    default: 0
  },
  totalFailure: {
    type: Number,
    default: 0
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  createdByRole: {
    type: String,
    enum: ['admin', 'hr', 'department_head']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
})

// Index for efficient querying
RecurringNotificationSchema.index({ nextScheduledAt: 1, isActive: 1 })
RecurringNotificationSchema.index({ createdBy: 1 })
RecurringNotificationSchema.index({ isActive: 1 })

// Method to calculate next scheduled time
RecurringNotificationSchema.methods.calculateNextSchedule = function() {
  const now = new Date()
  
  // If end date is passed, deactivate
  if (this.endDate && now > this.endDate) {
    this.isActive = false
    return null
  }
  
  // If start date is in future, use start date
  if (this.startDate > now) {
    return this.startDate
  }
  
  let nextDate = new Date(now)
  
  switch (this.frequency) {
    case 'daily':
      if (this.dailyTime) {
        const [hours, minutes] = this.dailyTime.split(':')
        nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        
        // If time has passed today, schedule for tomorrow
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1)
        }
      }
      break
      
    case 'weekly':
      if (this.weeklyDays && this.weeklyDays.length > 0 && this.weeklyTime) {
        const [hours, minutes] = this.weeklyTime.split(':')
        const dayMap = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        }
        
        // Find next occurrence
        const currentDay = nextDate.getDay()
        const targetDays = this.weeklyDays.map(d => dayMap[d]).sort((a, b) => a - b)
        
        let daysToAdd = null
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            daysToAdd = targetDay - currentDay
            break
          }
        }
        
        // If no day found this week, use first day of next week
        if (daysToAdd === null) {
          daysToAdd = 7 - currentDay + targetDays[0]
        }
        
        nextDate.setDate(nextDate.getDate() + daysToAdd)
        nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      }
      break
      
    case 'monthly':
      if (this.monthlyDay && this.monthlyTime) {
        const [hours, minutes] = this.monthlyTime.split(':')
        nextDate.setDate(this.monthlyDay)
        nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
        
        // If date has passed this month, schedule for next month
        if (nextDate <= now) {
          nextDate.setMonth(nextDate.getMonth() + 1)
        }
      }
      break
      
    case 'custom':
      if (this.customDays && this.customDays.length > 0 && this.customTimes && this.customTimes.length > 0) {
        // Similar to weekly but with multiple times
        const [hours, minutes] = this.customTimes[0].split(':')
        const dayMap = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        }
        
        const currentDay = nextDate.getDay()
        const targetDays = this.customDays.map(d => dayMap[d]).sort((a, b) => a - b)
        
        let daysToAdd = null
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            daysToAdd = targetDay - currentDay
            break
          }
        }
        
        if (daysToAdd === null) {
          daysToAdd = 7 - currentDay + targetDays[0]
        }
        
        nextDate.setDate(nextDate.getDate() + daysToAdd)
        nextDate.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      }
      break
  }
  
  return nextDate
}

export default mongoose.models.RecurringNotification || mongoose.model('RecurringNotification', RecurringNotificationSchema)

