/**
 * Legacy Push Notifications API
 * Redirects to OneSignal-based notification system
 */

import { NextResponse } from 'next/server'

export async function POST(request) {
  return NextResponse.json({
    success: false,
    message: 'This endpoint is deprecated. Push notifications are now handled by OneSignal. Please use the /api/notifications/send endpoint instead.',
    redirect: '/api/notifications/send'
  }, { status: 410 })
}
