
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Define Schemas (simplified for script usage)
const CompanySettingsSchema = new mongoose.Schema({
  checkInTime: { type: String, default: "09:00" },
  checkOutTime: { type: String, default: "18:00" },
  workingDays: [{ type: String }],
  fullDayHours: { type: Number, default: 8 },
  halfDayHours: { type: Number, default: 4 },
  breakTimings: [{
    name: String,
    startTime: String,
    endTime: String,
    isActive: Boolean,
    days: [String]
  }]
}, { strict: false });

const EmployeeSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  status: { type: String, default: 'active' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateOfJoining: Date
}, { strict: false });

const AttendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  date: Date,
  checkIn: Date,
  checkOut: Date,
  status: String,
  checkOutStatus: String,
  workHours: Number,
  totalLoggedHours: Number,
  breakMinutes: Number,
  shrinkagePercentage: Number,
  statusReason: String,
  remarks: String
}, { strict: false });

const LeaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  startDate: Date,
  endDate: Date,
  status: String
}, { strict: false });

const HolidaySchema = new mongoose.Schema({
  name: String,
  date: Date,
  endDate: Date,
  isActive: Boolean
}, { strict: false });

// Models
const CompanySettings = mongoose.models.CompanySettings || mongoose.model('CompanySettings', CompanySettingsSchema);
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', AttendanceSchema);
const Leave = mongoose.models.Leave || mongoose.model('Leave', LeaveSchema);
const Holiday = mongoose.models.Holiday || mongoose.model('Holiday', HolidaySchema);

// Helper functions from attendanceShrinkage.js (simplified)
function calculateBreakDuration(breakTimings, checkInTime, checkOutTime) {
  if (!breakTimings || breakTimings.length === 0) return 0;
  
  const checkIn = new Date(checkInTime);
  const checkOut = new Date(checkOutTime);
  const dayOfWeek = checkIn.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  let totalBreakMinutes = 0;
  
  for (const breakTiming of breakTimings) {
    if (!breakTiming.isActive) continue;
    if (breakTiming.days && breakTiming.days.length > 0 && !breakTiming.days.includes(dayOfWeek)) continue;
    
    const [startHour, startMin] = breakTiming.startTime.split(':').map(Number);
    const [endHour, endMin] = breakTiming.endTime.split(':').map(Number);
    
    const breakStart = new Date(checkIn);
    breakStart.setHours(startHour, startMin, 0, 0);
    
    const breakEnd = new Date(checkIn);
    breakEnd.setHours(endHour, endMin, 0, 0);
    
    const effectiveBreakStart = breakStart < checkIn ? checkIn : breakStart;
    const effectiveBreakEnd = breakEnd > checkOut ? checkOut : breakEnd;
    
    if (effectiveBreakEnd > effectiveBreakStart) {
      const duration = (effectiveBreakEnd - effectiveBreakStart) / (1000 * 60);
      totalBreakMinutes += duration;
    }
  }
  return Math.round(totalBreakMinutes);
}

function calculateEffectiveWorkHours(checkIn, checkOut, breakTimings) {
  const totalDurationMs = checkOut - checkIn;
  const totalLoggedHours = parseFloat((totalDurationMs / (1000 * 60 * 60)).toFixed(2));
  
  const breakMinutes = calculateBreakDuration(breakTimings, checkIn, checkOut);
  const breakHours = breakMinutes / 60;
  
  const effectiveWorkHours = Math.max(0, parseFloat((totalLoggedHours - breakHours).toFixed(2)));
  const shrinkagePercentage = totalLoggedHours > 0 
    ? parseFloat(((breakHours / totalLoggedHours) * 100).toFixed(2)) 
    : 0;
    
  return {
    totalLoggedHours,
    effectiveWorkHours,
    breakMinutes,
    shrinkagePercentage
  };
}

function determineAttendanceStatus(workHours, settings) {
  const fullDayHours = settings.fullDayHours || 8;
  const halfDayHours = settings.halfDayHours || 4;
  
  if (workHours >= fullDayHours) return { status: 'present', reason: 'Full day completed' };
  if (workHours >= halfDayHours) return { status: 'half-day', reason: 'Half day completed' };
  return { status: 'absent', reason: 'Less than half day hours' };
}

// Main Logic
async function rectifyAttendance() {
  await connectDB();
  
  const settings = await CompanySettings.findOne().lean();
  if (!settings) {
    console.error('Company settings not found');
    process.exit(1);
  }
  
  const [endHour, endMin] = (settings.checkOutTime || '18:00').split(':').map(Number);
  
  // 1. Fix "In Progress" records for past dates
  console.log('--- Fixing In-Progress Records ---');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const incompleteAttendance = await Attendance.find({
    status: 'in-progress',
    checkIn: { $exists: true },
    checkOut: { $exists: false },
    date: { $lt: todayStart }
  }).populate('employee');
  
  console.log(`Found ${incompleteAttendance.length} incomplete records.`);
  
  for (const record of incompleteAttendance) {
    try {
      const attendanceDate = new Date(record.date);
      
      // Construct scheduled checkout time in IST
      const year = attendanceDate.getFullYear();
      const month = String(attendanceDate.getMonth() + 1).padStart(2, '0');
      const day = String(attendanceDate.getDate()).padStart(2, '0');
      const hour = String(endHour).padStart(2, '0');
      const min = String(endMin).padStart(2, '0');
      
      const isoString = `${year}-${month}-${day}T${hour}:${min}:00.000+05:30`;
      const scheduledCheckoutTime = new Date(isoString);
      
      const checkInTime = new Date(record.checkIn);
      const autoCheckoutTime = checkInTime > scheduledCheckoutTime ? checkInTime : scheduledCheckoutTime;
      
      record.checkOut = autoCheckoutTime;
      record.checkOutStatus = 'auto-corrected';
      record.remarks = (record.remarks || '') + ' | Auto-corrected: Past day incomplete.';
      
      if (record.checkIn && settings.breakTimings) {
        const workCalc = calculateEffectiveWorkHours(
          new Date(record.checkIn),
          autoCheckoutTime,
          settings.breakTimings
        );
        
        record.workHours = workCalc.effectiveWorkHours;
        record.totalLoggedHours = workCalc.totalLoggedHours;
        record.breakMinutes = workCalc.breakMinutes;
        record.shrinkagePercentage = workCalc.shrinkagePercentage;
        
        const statusResult = determineAttendanceStatus(workCalc.effectiveWorkHours, settings);
        record.status = statusResult.status;
        record.statusReason = statusResult.reason + ' (Auto-corrected)';
      } else {
        const hoursWorked = (autoCheckoutTime - new Date(record.checkIn)) / (1000 * 60 * 60);
        record.workHours = parseFloat(hoursWorked.toFixed(2));
        record.status = hoursWorked >= 4 ? (hoursWorked >= 7 ? 'present' : 'half-day') : 'absent';
        record.statusReason = 'Auto-corrected: Past day incomplete';
      }
      
      await record.save();
      console.log(`Fixed record for ${record.employee?.email} on ${attendanceDate.toDateString()}`);
    } catch (err) {
      console.error(`Error fixing record ${record._id}:`, err.message);
    }
  }
  
  // 2. Backfill "Absent" records
  console.log('\n--- Backfilling Absent Records ---');
  
  // Define range: Start of current month to yesterday
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of current month
  // Or maybe last 30 days? Let's do last 30 days to be safe
  // const startDate = new Date();
  // startDate.setDate(startDate.getDate() - 30);
  
  const endDate = new Date(todayStart); // Up to yesterday (exclusive of today)
  
  console.log(`Checking range: ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  const allEmployees = await Employee.find({ status: 'active' }).lean();
  console.log(`Checking ${allEmployees.length} active employees.`);
  
  // Iterate through each day
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const currentDate = new Date(d);
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Check working day
    const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    if (settings.workingDays && !settings.workingDays.includes(dayOfWeek)) {
      console.log(`Skipping ${currentDate.toDateString()} (Not a working day: ${dayOfWeek})`);
      continue;
    }
    
    // Check holiday
    const holiday = await Holiday.findOne({
      isActive: true,
      $or: [
        { date: { $gte: currentDate, $lt: nextDay } },
        { date: { $lte: currentDate }, endDate: { $gte: currentDate } }
      ]
    });
    
    if (holiday) {
      console.log(`Skipping ${currentDate.toDateString()} (Holiday: ${holiday.name})`);
      continue;
    }
    
    // Check each employee
    for (const employee of allEmployees) {
      // Skip if employee joined after this date
      if (employee.dateOfJoining && new Date(employee.dateOfJoining) > currentDate) {
        continue;
      }
      
      // Check attendance
      const attendance = await Attendance.findOne({
        employee: employee._id,
        date: { $gte: currentDate, $lt: nextDay }
      });
      
      if (attendance) continue; // Already has record
      
      // Check leave
      const leave = await Leave.findOne({
        employee: employee._id,
        status: 'approved',
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
      });
      
      if (leave) continue; // On leave
      
      // Mark Absent
      try {
        await Attendance.create({
          employee: employee._id,
          date: currentDate,
          status: 'absent',
          workHours: 0,
          totalLoggedHours: 0,
          statusReason: 'No check-in recorded',
          remarks: 'Auto-marked absent (Rectification)'
        });
        console.log(`Marked Absent: ${employee.email} on ${currentDate.toDateString()}`);
      } catch (err) {
        if (err.code !== 11000) { // Ignore duplicate key errors
          console.error(`Error marking absent for ${employee.email}:`, err.message);
        }
      }
    }
  }
  
  console.log('\n--- Rectification Complete ---');
  process.exit(0);
}

rectifyAttendance();
