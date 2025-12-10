import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Payroll from '@/models/Payroll'
import Employee from '@/models/Employee'
import CompanySettings from '@/models/CompanySettings'
import { sendEmail } from '@/lib/mailer'

// POST - Bulk update payroll status and optionally send emails
export async function POST(request) {
  try {
    await connectDB()

    const { payrollIds, action, sendEmails } = await request.json()

    if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No payroll IDs provided' },
        { status: 400 }
      )
    }

    let newStatus
    switch (action) {
      case 'process':
        newStatus = 'processed'
        break
      case 'pay':
        newStatus = 'paid'
        break
      case 'hold':
        newStatus = 'on-hold'
        break
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        )
    }

    // Bulk update status
    const updateResult = await Payroll.updateMany(
      { _id: { $in: payrollIds } },
      { $set: { status: newStatus, processedDate: new Date() } }
    )

    // If sendEmails is true and action is 'process', send salary slip emails
    let emailsSent = 0
    let emailsFailed = 0

    if (sendEmails && (action === 'process' || action === 'pay')) {
      // Get company settings for logo and company info
      const companySettings = await CompanySettings.findOne().lean()
      
      // Get all updated payrolls with employee info
      const payrolls = await Payroll.find({ _id: { $in: payrollIds } })
        .populate({
          path: 'employee',
          select: 'firstName lastName email employeeCode department designation',
          populate: [
            { path: 'department', select: 'name' },
            { path: 'designation', select: 'title' }
          ]
        })
        .lean()

      // Send emails in parallel (with limit)
      const emailPromises = payrolls.map(async (payroll) => {
        try {
          const employee = payroll.employee
          if (!employee?.email) {
            console.log(`No email for employee: ${employee?.firstName} ${employee?.lastName}`)
            return { success: false, reason: 'No email' }
          }

          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December']
          const monthName = monthNames[payroll.month - 1]

          // Format currency
          const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(amount || 0)
          }

          // Generate email HTML
          const emailHtml = generatePayslipEmailHtml({
            payroll,
            employee,
            monthName,
            companySettings,
            formatCurrency,
            action
          })

          await sendEmail({
            to: employee.email,
            subject: `${companySettings?.companyName || 'Company'} - Salary Slip for ${monthName} ${payroll.year}`,
            html: emailHtml,
          })

          emailsSent++
          return { success: true }
        } catch (error) {
          console.error(`Failed to send email to ${payroll.employee?.email}:`, error)
          emailsFailed++
          return { success: false, reason: error.message }
        }
      })

      await Promise.allSettled(emailPromises)
    }

    return NextResponse.json({
      success: true,
      message: `${updateResult.modifiedCount} payroll(s) updated to ${newStatus}`,
      data: {
        updated: updateResult.modifiedCount,
        emailsSent,
        emailsFailed,
      }
    })
  } catch (error) {
    console.error('Bulk payroll update error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to process bulk update' },
      { status: 500 }
    )
  }
}

// DELETE - Bulk delete payrolls
export async function DELETE(request) {
  try {
    await connectDB()

    const { payrollIds } = await request.json()

    if (!payrollIds || !Array.isArray(payrollIds) || payrollIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No payroll IDs provided' },
        { status: 400 }
      )
    }

    const deleteResult = await Payroll.deleteMany({ _id: { $in: payrollIds } })

    return NextResponse.json({
      success: true,
      message: `${deleteResult.deletedCount} payroll(s) deleted successfully`,
      data: {
        deleted: deleteResult.deletedCount,
      }
    })
  } catch (error) {
    console.error('Bulk payroll delete error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to delete payrolls' },
      { status: 500 }
    )
  }
}

function generatePayslipEmailHtml({ payroll, employee, monthName, companySettings, formatCurrency, action }) {
  const companyName = companySettings?.companyName || 'Company'
  const companyLogo = companySettings?.companyLogo || ''
  const companyAddress = companySettings?.companyAddress || {}
  
  const addressLine = [
    companyAddress.street,
    companyAddress.city,
    companyAddress.state,
    companyAddress.zipCode,
    companyAddress.country
  ].filter(Boolean).join(', ')

  // Get earnings breakdown
  const earnings = payroll.earnings || {}
  const deductions = payroll.deductions || {}

  const statusText = action === 'pay' ? 'paid' : 'processed'
  const statusColor = action === 'pay' ? '#22c55e' : '#3b82f6'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Salary Slip - ${monthName} ${payroll.year}</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f3f4f6;">
  <div style="max-width: 650px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 24px; color: white;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" style="height: 50px; max-width: 150px;">` : `<h1 style="margin: 0; font-size: 24px;">${companyName}</h1>`}
          </td>
          <td style="text-align: right;">
            <h2 style="margin: 0; font-size: 20px;">SALARY SLIP</h2>
            <p style="margin: 5px 0 0; opacity: 0.9;">${monthName} ${payroll.year}</p>
          </td>
        </tr>
      </table>
    </div>

    <!-- Status Banner -->
    <div style="background-color: ${statusColor}; color: white; padding: 10px 24px; text-align: center;">
      <strong>✓ Your salary for ${monthName} ${payroll.year} has been ${statusText}</strong>
    </div>

    <!-- Employee Details -->
    <div style="padding: 24px;">
      <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; margin-bottom: 20px;">
        <tr>
          <td style="width: 50%;">
            <strong style="color: #6b7280; font-size: 12px;">EMPLOYEE NAME</strong><br>
            <span style="font-size: 14px;">${employee.firstName} ${employee.lastName}</span>
          </td>
          <td style="width: 50%;">
            <strong style="color: #6b7280; font-size: 12px;">EMPLOYEE ID</strong><br>
            <span style="font-size: 14px;">${employee.employeeCode || 'N/A'}</span>
          </td>
        </tr>
        <tr>
          <td>
            <strong style="color: #6b7280; font-size: 12px;">DEPARTMENT</strong><br>
            <span style="font-size: 14px;">${employee.department?.name || 'N/A'}</span>
          </td>
          <td>
            <strong style="color: #6b7280; font-size: 12px;">DESIGNATION</strong><br>
            <span style="font-size: 14px;">${employee.designation?.title || 'N/A'}</span>
          </td>
        </tr>
      </table>

      <!-- Earnings & Deductions -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <!-- Earnings -->
          <td style="width: 48%; vertical-align: top;">
            <div style="background-color: #ecfdf5; border-radius: 6px; padding: 16px;">
              <h3 style="margin: 0 0 12px; color: #059669; font-size: 14px;">EARNINGS</h3>
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px;">
                <tr><td>Basic Salary</td><td style="text-align: right;">${formatCurrency(earnings.basic || 0)}</td></tr>
                <tr><td>HRA</td><td style="text-align: right;">${formatCurrency(earnings.hra || 0)}</td></tr>
                <tr><td>Conveyance</td><td style="text-align: right;">${formatCurrency(earnings.conveyance || 0)}</td></tr>
                <tr><td>Medical</td><td style="text-align: right;">${formatCurrency(earnings.medicalAllowance || 0)}</td></tr>
                <tr><td>Special Allowance</td><td style="text-align: right;">${formatCurrency(earnings.specialAllowance || 0)}</td></tr>
                <tr><td>Overtime</td><td style="text-align: right;">${formatCurrency(earnings.overtime || 0)}</td></tr>
                <tr style="border-top: 1px solid #059669;">
                  <td style="padding-top: 8px;"><strong>Gross Salary</strong></td>
                  <td style="text-align: right; padding-top: 8px;"><strong>${formatCurrency(payroll.grossSalary)}</strong></td>
                </tr>
              </table>
            </div>
          </td>
          
          <td style="width: 4%;"></td>
          
          <!-- Deductions -->
          <td style="width: 48%; vertical-align: top;">
            <div style="background-color: #fef2f2; border-radius: 6px; padding: 16px;">
              <h3 style="margin: 0 0 12px; color: #dc2626; font-size: 14px;">DEDUCTIONS</h3>
              <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px;">
                <tr><td>Provident Fund</td><td style="text-align: right;">${formatCurrency(deductions.pf || 0)}</td></tr>
                <tr><td>ESI</td><td style="text-align: right;">${formatCurrency(deductions.esi || 0)}</td></tr>
                <tr><td>Professional Tax</td><td style="text-align: right;">${formatCurrency(deductions.professionalTax || 0)}</td></tr>
                <tr><td>TDS</td><td style="text-align: right;">${formatCurrency(deductions.tds || 0)}</td></tr>
                <tr><td>Late/Attendance</td><td style="text-align: right;">${formatCurrency(deductions.lateDeduction || 0)}</td></tr>
                <tr><td>Other</td><td style="text-align: right;">${formatCurrency(deductions.other || 0)}</td></tr>
                <tr style="border-top: 1px solid #dc2626;">
                  <td style="padding-top: 8px;"><strong>Total Deductions</strong></td>
                  <td style="text-align: right; padding-top: 8px;"><strong>${formatCurrency(payroll.totalDeductions)}</strong></td>
                </tr>
              </table>
            </div>
          </td>
        </tr>
      </table>

      <!-- Net Salary -->
      <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 6px; padding: 20px; margin-top: 20px; text-align: center; color: white;">
        <p style="margin: 0; font-size: 14px; opacity: 0.9;">NET SALARY</p>
        <h2 style="margin: 8px 0 0; font-size: 32px;">${formatCurrency(payroll.netSalary)}</h2>
      </div>

      <!-- Attendance Summary -->
      ${payroll.presentDays !== undefined ? `
      <div style="margin-top: 20px; padding: 16px; background-color: #f9fafb; border-radius: 6px;">
        <h3 style="margin: 0 0 12px; color: #374151; font-size: 14px;">ATTENDANCE SUMMARY</h3>
        <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 13px;">
          <tr>
            <td>Working Days: <strong>${payroll.workingDays || 26}</strong></td>
            <td>Present Days: <strong>${payroll.presentDays || 0}</strong></td>
            <td>Absent Days: <strong>${payroll.absentDays || 0}</strong></td>
            <td>Leave Days: <strong>${payroll.leaveDays || 0}</strong></td>
          </tr>
        </table>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This is a system-generated salary slip. For any queries, please contact HR.
      </p>
      ${addressLine ? `<p style="margin: 8px 0 0; font-size: 11px; color: #9ca3af;">${companyName} | ${addressLine}</p>` : ''}
    </div>
  </div>
</body>
</html>
  `
}
