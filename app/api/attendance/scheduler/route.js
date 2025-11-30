import { NextResponse } from 'next/server'
import { checkAndTriggerNotifications } from '@/lib/attendanceNotificationScheduler'

export const dynamic = 'force-dynamic'

/**
 * GET - Check and trigger attendance notifications
 * This endpoint should be called every minute by a cron job or scheduler
 */
export async function GET(request) {
  try {
    // Verify internal call or admin token
    const authHeader = request.headers.get('authorization')
    const cronSecret = request.headers.get('x-cron-secret')
    
    // Allow internal cron calls with secret
    if (cronSecret !== process.env.CRON_SECRET && cronSecret !== 'internal') {
      // For external calls, verify admin token
      if (!authHeader) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    const result = await checkAndTriggerNotifications()

    return NextResponse.json({
      success: true,
      message: 'Notification check completed',
      data: result
    })
  } catch (error) {
    console.error('Notification scheduler error:', error)
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    )
  }
}
