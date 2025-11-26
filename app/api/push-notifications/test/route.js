/**
 * Legacy Push Notifications Test API
 * Redirects to OneSignal-based notification system
 */

import { NextResponse } from 'next/server'

export async function POST(request) {
  return NextResponse.json({
    success: false,
    message: 'This endpoint is deprecated. Push notifications are now handled by OneSignal. Please use the /api/test-notification endpoint instead.',
    redirect: '/api/test-notification'
  }, { status: 410 })
}
