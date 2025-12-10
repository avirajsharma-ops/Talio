import mongoose from 'mongoose';

const PayrollSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  year: {
    type: Number,
    required: true,
  },
  earnings: {
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    conveyance: { type: Number, default: 0 },
    medicalAllowance: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    incentives: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    loanRepayment: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  grossSalary: {
    type: Number,
    required: true,
  },
  totalDeductions: {
    type: Number,
    required: true,
  },
  netSalary: {
    type: Number,
    required: true,
  },
  workingDays: {
    type: Number,
    required: true,
  },
  presentDays: {
    type: Number,
    required: true,
  },
  absentDays: {
    type: Number,
    default: 0,
  },
  leaveDays: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['draft', 'processed', 'paid', 'on-hold'],
    default: 'draft',
  },
  paymentDate: {
    type: Date,
  },
  paymentMode: {
    type: String,
    enum: ['bank-transfer', 'cash', 'cheque'],
    default: 'bank-transfer',
  },
  transactionId: {
    type: String,
  },
  remarks: {
    type: String,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  processedDate: {
    type: Date,
  },
  // Enhanced fields
  payPeriod: {
    startDate: Date,
    endDate: Date
  },
  // Health score impact
  healthScoreImpact: {
    healthScore: { type: Number, default: 100 },
    attendanceScore: { type: Number, default: 100 },
    punctualityScore: { type: Number, default: 100 },
    deductionApplied: { type: Boolean, default: false },
    deductionAmount: { type: Number, default: 0 },
    deductionReason: String
  },
  // Additional attendance data
  attendanceDetails: {
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    holidaysWorked: { type: Number, default: 0 }
  },
  // Overtime grace - when deductions exceed earnings, overtime can compensate up to gross salary
  overtimeGrace: {
    enabled: { type: Boolean, default: false }, // HR/Admin can toggle this per payroll
    appliedAmount: { type: Number, default: 0 }, // Amount of overtime grace applied
    originalOvertimeEarnings: { type: Number, default: 0 }, // Original overtime before cap
    cappedOvertimeEarnings: { type: Number, default: 0 }, // Overtime after cap (cannot exceed gross)
    totalDeductionsBeforeGrace: { type: Number, default: 0 }, // Deductions before grace
    graceReason: String, // Explanation for grace application
  },
  // Salary cap enforcement
  salaryCap: {
    grossSalary: { type: Number, default: 0 }, // Employee's gross salary (max payable)
    netSalaryBeforeCap: { type: Number, default: 0 }, // Net before applying cap
    cappedToGross: { type: Boolean, default: false }, // Whether salary was capped
  },
  // Statutory compliance
  statutory: {
    pfNumber: String,
    esiNumber: String,
    uanNumber: String,
    panNumber: String,
    pfContribution: { type: Number, default: 0 },
    esiContribution: { type: Number, default: 0 },
    employerPfContribution: { type: Number, default: 0 },
    employerEsiContribution: { type: Number, default: 0 }
  },
  // Approval workflow
  approvalWorkflow: {
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    calculatedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approvedAt: Date,
    hrRemarks: String,
    accountsRemarks: String
  },
  // Payslip generation
  payslip: {
    generated: { type: Boolean, default: false },
    generatedAt: Date,
    filePath: String,
    downloadCount: { type: Number, default: 0 },
    lastDownloaded: Date
  }
}, {
  timestamps: true,
});

// Calculate payroll method
PayrollSchema.methods.calculatePayroll = function() {
  // Calculate gross salary
  const totalEarnings = Object.values(this.earnings).reduce((sum, val) => sum + (val || 0), 0)
  this.grossSalary = totalEarnings

  // Calculate total deductions
  const totalDeds = Object.values(this.deductions).reduce((sum, val) => sum + (val || 0), 0)

  // Add health score deduction if applicable
  if (this.healthScoreImpact.deductionApplied) {
    this.totalDeductions = totalDeds + this.healthScoreImpact.deductionAmount
  } else {
    this.totalDeductions = totalDeds
  }

  // Calculate net salary
  this.netSalary = this.grossSalary - this.totalDeductions

  return {
    grossSalary: this.grossSalary,
    totalDeductions: this.totalDeductions,
    netSalary: this.netSalary
  }
}

// Apply health score impact
PayrollSchema.methods.applyHealthScoreImpact = function(healthScore) {
  this.healthScoreImpact.healthScore = healthScore.overallScore
  this.healthScoreImpact.attendanceScore = healthScore.attendanceScore
  this.healthScoreImpact.punctualityScore = healthScore.punctualityScore

  // Apply deduction if health score is below threshold
  if (healthScore.salaryDeductionRisk) {
    this.healthScoreImpact.deductionApplied = true

    let deductionPercentage = 0
    if (healthScore.overallScore < 50) {
      deductionPercentage = 0.1 // 10% deduction
      this.healthScoreImpact.deductionReason = 'Critical health score - 10% salary deduction'
    } else if (healthScore.overallScore < 60) {
      deductionPercentage = 0.05 // 5% deduction
      this.healthScoreImpact.deductionReason = 'Poor health score - 5% salary deduction'
    } else if (healthScore.attendanceScore < 75) {
      deductionPercentage = 0.03 // 3% deduction
      this.healthScoreImpact.deductionReason = 'Poor attendance - 3% salary deduction'
    }

    this.healthScoreImpact.deductionAmount = this.earnings.basic * deductionPercentage
  } else {
    this.healthScoreImpact.deductionApplied = false
    this.healthScoreImpact.deductionAmount = 0
    this.healthScoreImpact.deductionReason = ''
  }
}

// Compound index
PayrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
PayrollSchema.index({ status: 1 });
PayrollSchema.index({ 'healthScoreImpact.deductionApplied': 1 });

export default mongoose.models.Payroll || mongoose.model('Payroll', PayrollSchema);

