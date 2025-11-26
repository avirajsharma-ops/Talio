import mongoose from 'mongoose';

const CompanySettingsSchema = new mongoose.Schema({
  // Company Basic Information
  companyName: {
    type: String,
    required: true,
  },
  companyLogo: {
    type: String, // URL to uploaded logo
  },
  companyEmail: {
    type: String,
  },
  companyPhone: {
    type: String,
  },
  companyAddress: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  companyWebsite: {
    type: String,
  },
  
  // Working Hours
  checkInTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    default: "09:00",
  },
  checkOutTime: {
    type: String, // Format: "HH:MM" (24-hour format)
    default: "18:00",
  },
  workingDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
  }],

  // Attendance Thresholds
  lateThreshold: {
    type: Number, // Minutes of grace period before marking as late
    default: 15,
  },
  halfDayHours: {
    type: Number, // Minimum hours for half day
    default: 4,
  },
  fullDayHours: {
    type: Number, // Minimum hours for full day
    default: 8,
  },
  
  // Geofencing Settings
  geofence: {
    enabled: {
      type: Boolean,
      default: false,
    },
    // Legacy single location support (kept for backward compatibility)
    // Optional - only used when useMultipleLocations is false
    center: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    radius: {
      type: Number, // Radius in meters
      default: 100,
      required: false,
    },
    strictMode: {
      type: Boolean,
      default: false, // If true, employees must be within geofence to check in
    },
    notifyOnExit: {
      type: Boolean,
      default: true, // Notify when employee exits geofence during work hours
    },
    requireApproval: {
      type: Boolean,
      default: true, // Require manager approval when outside geofence
    },
    // Multiple locations support
    useMultipleLocations: {
      type: Boolean,
      default: true, // Always use GeofenceLocation collection for multiple locations
    },
  },

  // Break Timings (when geofencing is paused)
  breakTimings: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    startTime: {
      type: String, // Format: "HH:MM"
      required: true,
    },
    endTime: {
      type: String, // Format: "HH:MM"
      required: true,
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  
  // Attendance Settings
  attendance: {
    allowLateCheckIn: {
      type: Boolean,
      default: true,
    },
    lateCheckInGracePeriod: {
      type: Number, // Minutes
      default: 15,
    },
    allowEarlyCheckOut: {
      type: Boolean,
      default: false,
    },
    requireCheckOutPhoto: {
      type: Boolean,
      default: false,
    },
  },
  
  // Leave Settings
  leave: {
    carryForwardDays: {
      type: Number,
      default: 5,
    },
    maxCarryForward: {
      type: Number,
      default: 10,
    },
  },
  
  // Notification Settings
  notifications: {
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    pushNotifications: {
      type: Boolean,
      default: true,
    },
    smsNotifications: {
      type: Boolean,
      default: false,
    },
    emailEvents: {
      login: {
        type: Boolean,
        default: true,
      },
      attendanceClockIn: {
        type: Boolean,
        default: true,
      },
      attendanceStatusPresent: {
        type: Boolean,
        default: true,
      },
      attendanceStatusHalfDay: {
        type: Boolean,
        default: true,
      },
      attendanceStatusAbsent: {
        type: Boolean,
        default: true,
      },
    },
    pushEvents: {
      login: {
        type: Boolean,
        default: true,
      },
      attendanceClockIn: {
        type: Boolean,
        default: true,
      },
      attendanceClockOut: {
        type: Boolean,
        default: true,
      },
      taskAssigned: {
        type: Boolean,
        default: true,
      },
      taskCompleted: {
        type: Boolean,
        default: true,
      },
      leaveApplied: {
        type: Boolean,
        default: true,
      },
      leaveApproved: {
        type: Boolean,
        default: true,
      },
      leaveRejected: {
        type: Boolean,
        default: true,
      },
      announcement: {
        type: Boolean,
        default: true,
      },
    },
  },
  
  // System Settings
  timezone: {
    type: String,
    default: 'Asia/Kolkata',
  },
  currency: {
    type: String,
    default: 'INR',
  },
  dateFormat: {
    type: String,
    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
    default: 'DD/MM/YYYY',
  },
  
  // Single instance flag
  isSingleton: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Ensure only one company settings document exists
CompanySettingsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.models.CompanySettings.countDocuments();
    if (count > 0) {
      throw new Error('Company settings already exist. Please update the existing settings.');
    }
  }
  next();
});

export default mongoose.models.CompanySettings || mongoose.model('CompanySettings', CompanySettingsSchema);

