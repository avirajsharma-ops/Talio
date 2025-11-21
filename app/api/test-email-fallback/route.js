import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'
import { sendEmail } from '@/lib/mailer'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key')

/**
 * Test email fallback functionality
 * POST /api/test-email-fallback
 */
export async function POST(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decoded = await jwtVerify(token, JWT_SECRET)

    await connectDB()

    const body = await request.json()
    const { 
      userId, 
      testType = 'direct',
      title = '🧪 Email Fallback Test',
      message = 'This is a test email notification sent as fallback for failed push notification.'
    } = body

    const targetUserId = userId || decoded.payload.userId

    // Get user
    const user = await User.findById(targetUserId)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'User has no email address' },
        { status: 400 }
      )
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`📧 EMAIL FALLBACK TEST`)
    console.log('='.repeat(80))
    console.log(`Test Type: ${testType}`)
    console.log(`User: ${user.email} (${user._id})`)
    console.log(`Title: ${title}`)
    console.log(`Message: ${message}`)
    console.log('='.repeat(80) + '\n')

    if (testType === 'direct') {
      // Test direct email sending
      const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Talio HRMS'
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenova.sbs'
      const url = '/dashboard'
      const fullUrl = `${appUrl}${url}`
      const userName = user.firstName || user.lastName 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
        : 'there'

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .notification-box { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
            .badge { display: inline-block; padding: 4px 8px; background: #fef3c7; color: #92400e; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 10px; }
            .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 ${appName}</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <div class="notification-box">
                <span class="badge">📧 EMAIL FALLBACK TEST</span>
                <h2 style="margin-top: 0; color: #667eea;">${title}</h2>
                <p style="margin: 0;">${message}</p>
              </div>
              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                <strong>Why am I receiving this email?</strong><br>
                This is a test of the email fallback system. In production, you would receive this email only when push notifications cannot be delivered to your device.
              </p>
              <p style="margin-top: 10px; font-size: 14px; color: #10b981;">
                ✅ If you can see this email, the fallback system is working correctly!
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p>This is an automated test message.</p>
            </div>
          </div>
        </body>
        </html>
      `

      const text = `
Hi ${userName},

📧 EMAIL FALLBACK TEST

${title}

${message}

Why am I receiving this email?
This is a test of the email fallback system. In production, you would receive this email only when push notifications cannot be delivered to your device.

✅ If you can see this email, the fallback system is working correctly!

---
© ${new Date().getFullYear()} ${appName}
This is an automated test message.
      `.trim()

      await sendEmail({
        to: user.email,
        subject: `🔔 ${title}`,
        text,
        html
      })

      console.log(`✅ Test email sent to ${user.email}`)

      return NextResponse.json({
        success: true,
        message: `✅ Test email sent successfully to ${user.email}`,
        details: {
          testType: 'direct',
          recipient: user.email,
          userName,
          title,
          message
        }
      })

    } else if (testType === 'onesignal') {
      // Test via OneSignal with forced failure to trigger email fallback
      const { sendOneSignalNotification } = await import('@/lib/onesignal')
      
      // This will fail because we're using an invalid user ID format
      // which will trigger the email fallback
      const result = await sendOneSignalNotification({
        userIds: [targetUserId.toString()],
        title,
        message,
        url: '/dashboard',
        emailFallback: true
      })

      return NextResponse.json({
        success: true,
        message: result.emailFallbackUsed 
          ? `✅ Email fallback triggered and sent to ${user.email}` 
          : `⚠️ OneSignal succeeded or email fallback disabled`,
        details: {
          testType: 'onesignal',
          recipient: user.email,
          oneSignalSuccess: result.success,
          emailFallbackUsed: result.emailFallbackUsed,
          emailFallbackMessage: result.emailFallbackMessage,
          result
        }
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid test type. Use "direct" or "onesignal"'
    }, { status: 400 })

  } catch (error) {
    console.error('❌ Email fallback test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Get email configuration status
 * GET /api/test-email-fallback
 */
export async function GET(request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const emailConfigured = !!(
      process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD
    )

    return NextResponse.json({
      success: true,
      emailConfigured,
      config: {
        host: process.env.EMAIL_HOST || 'Not configured',
        user: process.env.EMAIL_USER || 'Not configured',
        port: process.env.EMAIL_PORT || '465',
        secure: process.env.EMAIL_SECURE || 'true',
        fromName: process.env.EMAIL_FROM_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Talio HRMS',
        fromEmail: process.env.EMAIL_FROM_EMAIL || process.env.EMAIL_USER || 'Not configured'
      },
      message: emailConfigured 
        ? '✅ Email is properly configured' 
        : '❌ Email configuration is incomplete'
    })

  } catch (error) {
    console.error('❌ Error checking email config:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    )
  }
}
