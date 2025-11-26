import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'

// POST - Test OneSignal configuration (admin only)
export async function POST(request) {
  try {
    await connectDB()

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload: decoded } = await jwtVerify(token, secret)

    // Only admin can test configuration
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only administrators can test configuration' },
        { status: 403 }
      )
    }

    // Check if credentials are configured
    const appId = process.env.ONESIGNAL_APP_ID
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY

    if (!appId || !restApiKey || restApiKey === 'your-onesignal-rest-api-key-here') {
      return NextResponse.json({
        success: false,
        message: 'OneSignal credentials not configured. Please configure them first.'
      }, { status: 400 })
    }

    // Test the API by making a simple request to OneSignal
    // We'll use the view apps endpoint which is a safe read-only operation
    const response = await fetch(`https://onesignal.com/api/v1/apps/${appId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${restApiKey}`
      }
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('OneSignal test failed:', result)
      
      // Provide helpful error messages
      let errorMessage = 'Configuration test failed. '
      
      if (response.status === 401 || response.status === 403) {
        errorMessage += 'Invalid REST API Key. Please check your credentials.'
      } else if (response.status === 404) {
        errorMessage += 'App ID not found. Please verify your App ID.'
      } else {
        errorMessage += result.errors ? result.errors.join(', ') : 'Unknown error occurred.'
      }

      return NextResponse.json({
        success: false,
        message: errorMessage,
        details: result
      }, { status: 400 })
    }

    // Success - credentials are valid
    return NextResponse.json({
      success: true,
      message: 'OneSignal configuration is valid and working!',
      appInfo: {
        name: result.name,
        players: result.players,
        messageable_players: result.messageable_players,
        updated_at: result.updated_at
      }
    })
  } catch (error) {
    console.error('Test config error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to test configuration: ' + error.message
    }, { status: 500 })
  }
}

