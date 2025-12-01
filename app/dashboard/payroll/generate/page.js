'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { 
  FaMoneyBillWave, FaArrowLeft, FaCalculator, FaEye, FaDownload, 
  FaFilter, FaSync, FaExclamationTriangle, FaCheckCircle, FaClock,
  FaUserClock, FaCalendarCheck, FaInfoCircle
} from 'react-icons/fa'

export default function GeneratePayrollPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState([])
  const [attendanceData, setAttendanceData] = useState({})
  const [companySettings, setCompanySettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [selectedEmployees, setSelectedEmployees] = useState([])
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    paymentDate: new Date().toISOString().split('T')[0],
  })

  // Format currency in Indian Rupees
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0)
  }

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return '--:--'
    const [hours, mins] = timeStr.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return h12 + ':' + mins + ' ' + ampm
  }

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (employees.length > 0 && companySettings) {
      fetchAttendanceData()
    }
  }, [formData.month, formData.year, employees, companySettings])

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch employees and company settings in parallel
      const [employeesRes, settingsRes] = await Promise.all([
        fetch('/api/employees?limit=1000&status=active', {
          headers: { 'Authorization': 'Bearer ' + token },
        }),
        fetch('/api/settings/company', {
          headers: { 'Authorization': 'Bearer ' + token },
        }),
      ])

      const employeesData = await employeesRes.json()
      const settingsData = await settingsRes.json()

      if (employeesData.success) {
        setEmployees(employeesData.data.filter(emp => emp.status === 'active'))
      }

      if (settingsData.success) {
        setCompanySettings(settingsData.data || getDefaultSettings())
      } else {
        setCompanySettings(getDefaultSettings())
      }
    } catch (error) {
      console.error('Fetch initial data error:', error)
      toast.error('Failed to fetch data')
      setCompanySettings(getDefaultSettings())
    } finally {
      setLoading(false)
    }
  }

  const getDefaultSettings = () => ({
    checkInTime: '09:00',
    checkOutTime: '18:00',
    lateThreshold: 15,
    halfDayHours: 4,
    fullDayHours: 8,
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    payroll: {
      workingDaysPerMonth: 26,
      lateDeduction: { enabled: true, type: 'fixed', value: 100, graceLatesPerMonth: 3 },
      halfDayDeduction: { enabled: true, type: 'half-day-salary', value: 50 },
      absentDeduction: { enabled: true, type: 'full-day-salary', value: 100 },
      overtime: { enabled: true, rateMultiplier: 1.5, minHoursForOvertime: 1 },
      pfEnabled: true,
      pfPercentage: 12,
      esiEnabled: true,
      esiPercentage: 0.75,
      professionalTax: { enabled: true, amount: 200 },
      tdsEnabled: true,
      tdsPercentage: 10,
    },
  })

  const fetchAttendanceData = async () => {
    try {
      const token = localStorage.getItem('token')
      const attendanceMap = {}

      // Fetch attendance for the selected month
      const response = await fetch(
        '/api/attendance?month=' + formData.month + '&year=' + formData.year + '&limit=5000',
        { headers: { 'Authorization': 'Bearer ' + token } }
      )

      const data = await response.json()
      
      if (data.success && data.data) {
        // Process attendance data per employee with detailed tracking
        data.data.forEach(record => {
          const empId = record.employee?._id || record.employee
          if (!empId) return

          if (!attendanceMap[empId]) {
            attendanceMap[empId] = {
              presentDays: 0,
              absentDays: 0,
              halfDays: 0,
              lateDays: 0,
              earlyCheckIns: 0,
              earlyCheckOuts: 0,
              onTimeCheckIns: 0,
              overtimeHours: 0,
              overtimeDays: 0,
              leaveDays: 0,
              totalWorkHours: 0,
              records: [],
            }
          }

          attendanceMap[empId].records.push(record)

          const status = record.status?.toLowerCase() || ''
          const checkInStatus = record.checkInStatus?.toLowerCase() || ''
          const checkOutStatus = record.checkOutStatus?.toLowerCase() || ''
          
          if (status === 'present' || status === 'approved' || status === 'in-progress') {
            attendanceMap[empId].presentDays++
            attendanceMap[empId].totalWorkHours += record.workHours || 0
            
            if (checkInStatus === 'early') {
              attendanceMap[empId].earlyCheckIns++
            } else if (checkInStatus === 'late') {
              attendanceMap[empId].lateDays++
            } else if (checkInStatus === 'on-time') {
              attendanceMap[empId].onTimeCheckIns++
            }
            
            if (checkOutStatus === 'early') {
              attendanceMap[empId].earlyCheckOuts++
            } else if (checkOutStatus === 'late') {
              if (record.overtime && record.overtime > 0) {
                attendanceMap[empId].overtimeHours += record.overtime
                attendanceMap[empId].overtimeDays++
              }
            }
          } else if (status === 'half-day' || status === 'halfday') {
            attendanceMap[empId].halfDays++
            attendanceMap[empId].totalWorkHours += record.workHours || 0
          } else if (status === 'absent') {
            attendanceMap[empId].absentDays++
          } else if (status === 'leave' || status === 'on-leave') {
            attendanceMap[empId].leaveDays++
          }
        })
      }

      setAttendanceData(attendanceMap)
    } catch (error) {
      console.error('Fetch attendance error:', error)
    }
  }

  const calculateEmployeePayroll = (employee) => {
    const settings = companySettings || getDefaultSettings()
    const payrollSettings = settings.payroll || getDefaultSettings().payroll
    const attendance = attendanceData[employee._id] || {
      presentDays: payrollSettings.workingDaysPerMonth,
      absentDays: 0,
      halfDays: 0,
      lateDays: 0,
      earlyCheckIns: 0,
      earlyCheckOuts: 0,
      overtimeHours: 0,
      overtimeDays: 0,
      leaveDays: 0,
      totalWorkHours: 0,
    }

    const basicSalary = employee.salary || 50000
    const workingDays = payrollSettings.workingDaysPerMonth || 26
    const perDaySalary = basicSalary / workingDays
    const perHourSalary = perDaySalary / (settings.fullDayHours || 8)

    const hra = basicSalary * 0.4
    const conveyanceAllowance = 1600
    const medicalAllowance = 1250
    const specialAllowance = basicSalary * 0.1

    let overtimeEarnings = 0
    if (payrollSettings.overtime?.enabled && attendance.overtimeHours > 0) {
      const minHours = payrollSettings.overtime.minHoursForOvertime || 1
      if (attendance.overtimeHours >= minHours) {
        const rateMultiplier = payrollSettings.overtime.rateMultiplier || 1.5
        overtimeEarnings = perHourSalary * attendance.overtimeHours * rateMultiplier
      }
    }

    const grossSalary = basicSalary + hra + conveyanceAllowance + medicalAllowance + specialAllowance

    let pf = 0
    if (payrollSettings.pfEnabled) {
      pf = basicSalary * (payrollSettings.pfPercentage || 12) / 100
    }

    let esi = 0
    if (payrollSettings.esiEnabled && grossSalary <= 21000) {
      esi = grossSalary * (payrollSettings.esiPercentage || 0.75) / 100
    }

    let professionalTax = 0
    if (payrollSettings.professionalTax?.enabled) {
      professionalTax = payrollSettings.professionalTax.amount || 200
    }

    let tds = 0
    if (payrollSettings.tdsEnabled) {
      const annualSalary = grossSalary * 12
      if (annualSalary > 1000000) {
        tds = grossSalary * 0.2
      } else if (annualSalary > 500000) {
        tds = grossSalary * 0.1
      } else if (annualSalary > 250000) {
        tds = grossSalary * 0.05
      }
    }

    let lateDeduction = 0
    let chargeableLates = 0
    if (payrollSettings.lateDeduction?.enabled) {
      const graceLates = payrollSettings.lateDeduction.graceLatesPerMonth || 0
      chargeableLates = Math.max(0, attendance.lateDays - graceLates)
      
      if (chargeableLates > 0) {
        const deductionType = payrollSettings.lateDeduction.type
        const deductionValue = payrollSettings.lateDeduction.value || 0
        
        if (deductionType === 'fixed') {
          lateDeduction = chargeableLates * deductionValue
        } else if (deductionType === 'percentage' || deductionType === 'per-day-salary') {
          lateDeduction = perDaySalary * chargeableLates * (deductionValue / 100)
        }
      }
    }

    let halfDayDeduction = 0
    if (payrollSettings.halfDayDeduction?.enabled && attendance.halfDays > 0) {
      const deductionType = payrollSettings.halfDayDeduction.type
      const deductionValue = payrollSettings.halfDayDeduction.value || 50
      
      if (deductionType === 'fixed') {
        halfDayDeduction = attendance.halfDays * deductionValue
      } else if (deductionType === 'percentage' || deductionType === 'half-day-salary') {
        halfDayDeduction = perDaySalary * attendance.halfDays * (deductionValue / 100)
      }
    }

    let absentDeduction = 0
    if (payrollSettings.absentDeduction?.enabled && attendance.absentDays > 0) {
      const deductionType = payrollSettings.absentDeduction.type
      const deductionValue = payrollSettings.absentDeduction.value || 100
      
      if (deductionType === 'fixed') {
        absentDeduction = attendance.absentDays * deductionValue
      } else if (deductionType === 'percentage' || deductionType === 'full-day-salary') {
        absentDeduction = perDaySalary * attendance.absentDays * (deductionValue / 100)
      }
    }

    let earlyCheckOutDeduction = 0

    const attendanceDeductions = lateDeduction + halfDayDeduction + absentDeduction + earlyCheckOutDeduction
    const totalDeductions = pf + esi + professionalTax + tds + attendanceDeductions
    const netSalary = grossSalary + overtimeEarnings - totalDeductions

    return {
      employee,
      attendance: { ...attendance, chargeableLates },
      basicSalary,
      perDaySalary,
      perHourSalary,
      hra,
      conveyanceAllowance,
      medicalAllowance,
      specialAllowance,
      overtimeEarnings,
      grossSalary,
      pf,
      esi,
      professionalTax,
      tds,
      lateDeduction,
      halfDayDeduction,
      absentDeduction,
      earlyCheckOutDeduction,
      attendanceDeductions,
      totalDeductions,
      netSalary,
    }
  }

  const calculatedPayrollData = useMemo(() => {
    if (!showPreview) return []
    return selectedEmployees.map(empId => {
      const employee = employees.find(e => e._id === empId)
      if (!employee) return null
      return calculateEmployeePayroll(employee)
    }).filter(Boolean)
  }, [selectedEmployees, showPreview, employees, attendanceData, companySettings])

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedEmployees(employees.map(emp => emp._id))
    } else {
      setSelectedEmployees([])
    }
  }

  const handleSelectEmployee = (empId) => {
    if (selectedEmployees.includes(empId)) {
      setSelectedEmployees(selectedEmployees.filter(id => id !== empId))
    } else {
      setSelectedEmployees([...selectedEmployees, empId])
    }
  }

  const handlePreviewPayroll = () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee')
      return
    }
    setShowPreview(true)
  }

  const handleGeneratePayroll = async () => {
    if (selectedEmployees.length === 0) {
      toast.error('Please select at least one employee')
      return
    }

    setGenerating(true)

    try {
      const token = localStorage.getItem('token')
      
      const promises = calculatedPayrollData.map(async (payroll) => {
        const payrollData = {
          employee: payroll.employee._id,
          month: formData.month,
          year: formData.year,
          basicSalary: payroll.basicSalary,
          allowances: {
            hra: payroll.hra,
            transport: payroll.conveyanceAllowance,
            medical: payroll.medicalAllowance,
            special: payroll.specialAllowance,
            overtime: payroll.overtimeEarnings,
          },
          deductions: {
            pf: payroll.pf,
            esi: payroll.esi,
            professionalTax: payroll.professionalTax,
            tax: payroll.tds,
            late: payroll.lateDeduction,
            halfDay: payroll.halfDayDeduction,
            absent: payroll.absentDeduction,
            earlyCheckout: payroll.earlyCheckOutDeduction,
          },
          attendanceSummary: {
            presentDays: payroll.attendance.presentDays,
            absentDays: payroll.attendance.absentDays,
            halfDays: payroll.attendance.halfDays,
            lateDays: payroll.attendance.lateDays,
            chargeableLates: payroll.attendance.chargeableLates,
            earlyCheckIns: payroll.attendance.earlyCheckIns,
            earlyCheckOuts: payroll.attendance.earlyCheckOuts,
            overtimeHours: payroll.attendance.overtimeHours,
            overtimeDays: payroll.attendance.overtimeDays,
            leaveDays: payroll.attendance.leaveDays,
            totalWorkHours: payroll.attendance.totalWorkHours,
          },
          grossSalary: payroll.grossSalary,
          totalDeductions: payroll.totalDeductions,
          netSalary: payroll.netSalary,
          paymentDate: formData.paymentDate,
          status: 'pending',
        }

        return fetch('/api/payroll', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token,
          },
          body: JSON.stringify(payrollData),
        })
      })

      await Promise.all(promises)
      
      toast.success('Payroll generated for ' + selectedEmployees.length + ' employees!')
      router.push('/dashboard/payroll')
    } catch (error) {
      console.error('Generate payroll error:', error)
      toast.error('Failed to generate payroll')
    } finally {
      setGenerating(false)
    }
  }

  const summaryTotals = useMemo(() => {
    return calculatedPayrollData.reduce((acc, p) => ({
      grossSalary: acc.grossSalary + p.grossSalary,
      totalDeductions: acc.totalDeductions + p.totalDeductions,
      netSalary: acc.netSalary + p.netSalary,
      pf: acc.pf + p.pf,
      esi: acc.esi + p.esi,
      tds: acc.tds + p.tds,
      overtimeEarnings: acc.overtimeEarnings + p.overtimeEarnings,
      attendanceDeductions: acc.attendanceDeductions + p.attendanceDeductions,
    }), {
      grossSalary: 0,
      totalDeductions: 0,
      netSalary: 0,
      pf: 0,
      esi: 0,
      tds: 0,
      overtimeEarnings: 0,
      attendanceDeductions: 0,
    })
  }, [calculatedPayrollData])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const payrollConfig = companySettings?.payroll || {}

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Generate Payroll</h1>
          <p className="text-gray-600 mt-1">Generate salary with attendance-based calculations</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/payroll')}
          className="btn-secondary flex items-center space-x-2"
        >
          <FaArrowLeft />
          <span>Back</span>
        </button>
      </div>

      {/* Company Settings Info Card */}
      {companySettings && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-md p-6 mb-6 border border-blue-100">
          <div className="flex items-center mb-4">
            <FaInfoCircle className="text-blue-600 mr-2" />
            <h2 className="text-lg font-bold text-gray-800">Synced Company Settings</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Check-In Time</p>
              <p className="font-semibold text-gray-800">{formatTime(companySettings.checkInTime)}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Check-Out Time</p>
              <p className="font-semibold text-gray-800">{formatTime(companySettings.checkOutTime)}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Late Threshold</p>
              <p className="font-semibold text-gray-800">{companySettings.lateThreshold || 15} mins</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Full Day Hours</p>
              <p className="font-semibold text-gray-800">{companySettings.fullDayHours || 8} hrs</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Half Day Hours</p>
              <p className="font-semibold text-gray-800">{companySettings.halfDayHours || 4} hrs</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase mb-1">Working Days/Month</p>
              <p className="font-semibold text-gray-800">{payrollConfig.workingDaysPerMonth || 26}</p>
            </div>
          </div>

          {/* Attendance Timing Rules */}
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Attendance Status Rules:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full flex items-center">
                <FaClock className="mr-1" /> Early Check-in: Before {formatTime(companySettings.checkInTime)}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center">
                <FaClock className="mr-1" /> On-Time: Within {companySettings.lateThreshold || 15} mins grace
              </span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full flex items-center">
                <FaClock className="mr-1" /> Late: After {companySettings.lateThreshold || 15} mins grace
              </span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full flex items-center">
                <FaClock className="mr-1" /> Early Checkout: Before {formatTime(companySettings.checkOutTime)}
              </span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center">
                <FaClock className="mr-1" /> Overtime: After {formatTime(companySettings.checkOutTime)}
              </span>
            </div>
          </div>

          {/* Active Deduction Rules */}
          <div className="mt-4 p-3 bg-white rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Active Deduction Rules:</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {payrollConfig.lateDeduction?.enabled && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                  Late: {payrollConfig.lateDeduction.type === 'fixed' 
                    ? formatCurrency(payrollConfig.lateDeduction.value) 
                    : payrollConfig.lateDeduction.value + '% per day'}
                  {(payrollConfig.lateDeduction.graceLatesPerMonth || 0) > 0 && 
                    ' (' + payrollConfig.lateDeduction.graceLatesPerMonth + ' grace/month)'}
                </span>
              )}
              {payrollConfig.halfDayDeduction?.enabled && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">
                  Half-Day: {payrollConfig.halfDayDeduction.type === 'fixed' 
                    ? formatCurrency(payrollConfig.halfDayDeduction.value) 
                    : payrollConfig.halfDayDeduction.value + '% per day'}
                </span>
              )}
              {payrollConfig.absentDeduction?.enabled && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                  Absent: {payrollConfig.absentDeduction.type === 'fixed' 
                    ? formatCurrency(payrollConfig.absentDeduction.value) 
                    : payrollConfig.absentDeduction.value + '% per day'}
                </span>
              )}
              {payrollConfig.overtime?.enabled && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  Overtime: {payrollConfig.overtime.rateMultiplier || 1.5}x hourly rate
                </span>
              )}
              {payrollConfig.pfEnabled && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  PF: {payrollConfig.pfPercentage || 12}%
                </span>
              )}
              {payrollConfig.professionalTax?.enabled && (
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                  PT: {formatCurrency(payrollConfig.professionalTax.amount || 200)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payroll Period */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Payroll Period</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Month *</label>
            <select
              value={formData.month}
              onChange={(e) => {
                setFormData({ ...formData, month: parseInt(e.target.value) })
                setShowPreview(false)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
            <select
              value={formData.year}
              onChange={(e) => {
                setFormData({ ...formData, year: parseInt(e.target.value) })
                setShowPreview(false)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const year = new Date().getFullYear() - 2 + i
                return <option key={year} value={year}>{year}</option>
              })}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Employee Selection or Payroll Preview */}
      {!showPreview ? (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Select Employees</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedEmployees.length} of {employees.length} selected
              </span>
              <button
                onClick={fetchAttendanceData}
                className="text-primary-600 hover:text-primary-700 flex items-center space-x-1 text-sm"
              >
                <FaSync className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEmployees.length === employees.length && employees.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Basic Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Present</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-green-50">Early In</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-yellow-50">Late</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-orange-50">Early Out</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-purple-50">Overtime</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-blue-50">Half-Day</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-red-50">Absent</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase bg-gray-100">Leave</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.map((employee) => {
                  const attendance = attendanceData[employee._id] || {}
                  return (
                    <tr key={employee._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(employee._id)}
                          onChange={() => handleSelectEmployee(employee._id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{employee.firstName} {employee.lastName}</div>
                        <div className="text-xs text-gray-500">{employee.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">{employee.department?.name || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-semibold text-gray-900">{formatCurrency(employee.salary)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-green-50">
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">{attendance.presentDays || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-green-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.earlyCheckIns > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500')}>{attendance.earlyCheckIns || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-yellow-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.lateDays > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500')}>{attendance.lateDays || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-orange-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.earlyCheckOuts > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-500')}>{attendance.earlyCheckOuts || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-purple-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.overtimeHours > 0 ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500')}>{attendance.overtimeHours ? attendance.overtimeHours.toFixed(1) + 'h' : '0'}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-blue-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.halfDays > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500')}>{attendance.halfDays || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-red-50">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.absentDays > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500')}>{attendance.absentDays || 0}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center bg-gray-100">
                        <span className={'px-2 py-1 text-xs font-medium rounded-full ' + (attendance.leaveDays > 0 ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500')}>{attendance.leaveDays || 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handlePreviewPayroll}
              disabled={selectedEmployees.length === 0}
              className="btn-primary flex items-center space-x-2"
            >
              <FaEye />
              <span>Preview Payroll for {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? 's' : ''}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              Payroll Preview - {new Date(formData.year, formData.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <button onClick={() => setShowPreview(false)} className="text-gray-600 hover:text-gray-800 text-sm">← Back to Selection</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Total Gross</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(summaryTotals.grossSalary)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Overtime Earnings</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summaryTotals.overtimeEarnings)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Attendance Ded.</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(summaryTotals.attendanceDeductions)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Total Deductions</p>
              <p className="text-xl font-bold text-red-600">{formatCurrency(summaryTotals.totalDeductions)}</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Net Payable</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summaryTotals.netSalary)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700 sticky left-0 bg-gray-100 min-w-[180px]">Employee</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">Basic</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">HRA</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-blue-50">Allowances</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-green-100">Gross</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-purple-50">Overtime</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">PF</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">ESI</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">PT</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">TDS</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-yellow-50">Late</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-orange-50">Half-Day</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-red-50">Absent</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-red-100">Total Ded.</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700 bg-green-100">Net Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {calculatedPayrollData.map((payroll, idx) => (
                  <tr key={payroll.employee._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-inherit min-w-[180px]">
                      <div className="font-medium text-gray-900">{payroll.employee.firstName} {payroll.employee.lastName}</div>
                      <div className="text-gray-500">{payroll.employee.employeeCode}</div>
                      <div className="text-gray-400 text-[10px] mt-1">
                        P:{payroll.attendance.presentDays} | L:{payroll.attendance.lateDays}
                        {payroll.attendance.chargeableLates > 0 && <span className="text-yellow-600"> ({payroll.attendance.chargeableLates} charged)</span>}
                        {payroll.attendance.overtimeHours > 0 && <span className="text-purple-600"> | OT:{payroll.attendance.overtimeHours.toFixed(1)}h</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-900 bg-blue-50">{formatCurrency(payroll.basicSalary)}</td>
                    <td className="px-3 py-3 text-right text-gray-900 bg-blue-50">{formatCurrency(payroll.hra)}</td>
                    <td className="px-3 py-3 text-right text-gray-900 bg-blue-50">{formatCurrency(payroll.conveyanceAllowance + payroll.medicalAllowance + payroll.specialAllowance)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-gray-900 bg-green-100">{formatCurrency(payroll.grossSalary)}</td>
                    <td className="px-3 py-3 text-right bg-purple-50">
                      {payroll.overtimeEarnings > 0 ? <span className="text-purple-700 font-medium">+{formatCurrency(payroll.overtimeEarnings)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-red-600">{formatCurrency(payroll.pf)}</td>
                    <td className="px-3 py-3 text-right text-red-600">{formatCurrency(payroll.esi)}</td>
                    <td className="px-3 py-3 text-right text-red-600">{formatCurrency(payroll.professionalTax)}</td>
                    <td className="px-3 py-3 text-right text-red-600">{formatCurrency(payroll.tds)}</td>
                    <td className="px-3 py-3 text-right bg-yellow-50">
                      {payroll.lateDeduction > 0 ? <span className="text-yellow-700 font-medium">{formatCurrency(payroll.lateDeduction)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-right bg-orange-50">
                      {payroll.halfDayDeduction > 0 ? <span className="text-orange-700 font-medium">{formatCurrency(payroll.halfDayDeduction)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-right bg-red-50">
                      {payroll.absentDeduction > 0 ? <span className="text-red-700 font-medium">{formatCurrency(payroll.absentDeduction)}</span> : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-red-700 bg-red-100">{formatCurrency(payroll.totalDeductions)}</td>
                    <td className="px-3 py-3 text-right font-bold text-green-700 bg-green-100">{formatCurrency(payroll.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-200 border-t-2 border-gray-400">
                <tr>
                  <td className="px-3 py-3 font-bold text-gray-800 sticky left-0 bg-gray-200">TOTAL ({calculatedPayrollData.length} employees)</td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800 bg-blue-100" colSpan={3}></td>
                  <td className="px-3 py-3 text-right font-bold text-gray-800 bg-green-200">{formatCurrency(summaryTotals.grossSalary)}</td>
                  <td className="px-3 py-3 text-right font-bold text-purple-700 bg-purple-100">{formatCurrency(summaryTotals.overtimeEarnings)}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-700">{formatCurrency(summaryTotals.pf)}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-700">{formatCurrency(summaryTotals.esi)}</td>
                  <td className="px-3 py-3" colSpan={2}></td>
                  <td className="px-3 py-3 text-right font-bold text-orange-700 bg-orange-100" colSpan={3}>{formatCurrency(summaryTotals.attendanceDeductions)}</td>
                  <td className="px-3 py-3 text-right font-bold text-red-700 bg-red-200">{formatCurrency(summaryTotals.totalDeductions)}</td>
                  <td className="px-3 py-3 text-right font-bold text-green-700 bg-green-200">{formatCurrency(summaryTotals.netSalary)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <FaExclamationTriangle className="inline-block w-4 h-4 text-yellow-500 mr-1" />
              Review the calculated salaries before generating.
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={() => setShowPreview(false)} className="btn-secondary">Back</button>
              <button
                onClick={handleGeneratePayroll}
                disabled={generating}
                className="btn-primary flex items-center space-x-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FaCheckCircle />
                    <span>Generate Payroll</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
