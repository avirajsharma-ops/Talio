import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import connectDB from '@/lib/mongodb'
import fs from 'fs'
import path from 'path'

// GET - Check if API key is configured and get current config
// Non-admins can check if configured (but can't see the actual keys)
// Only admins can see the masked keys
export async function GET(request) {
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

    // Check if API key is configured by reading from .env.local file
    let appId = process.env.ONESIGNAL_APP_ID
    let restApiKey = process.env.ONESIGNAL_REST_API_KEY

    // Try to read from .env.local file for most up-to-date values
    try {
      const envPath = path.join(process.cwd(), '.env.local')
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8')
        const appIdMatch = envContent.match(/ONESIGNAL_APP_ID=(.*)/)
        const apiKeyMatch = envContent.match(/ONESIGNAL_REST_API_KEY=(.*)/)

        if (appIdMatch && appIdMatch[1]) {
          appId = appIdMatch[1].trim()
        }
        if (apiKeyMatch && apiKeyMatch[1]) {
          restApiKey = apiKeyMatch[1].trim()
        }
      }
    } catch (fileError) {
      console.error('Error reading .env.local:', fileError)
      // Continue with process.env values
    }

    const configured = !!(
      appId &&
      restApiKey &&
      restApiKey !== 'your-onesignal-rest-api-key-here' &&
      restApiKey.length > 20
    )

    // Only admins can see the masked API key
    if (decoded.role === 'admin') {
      const maskedApiKey = restApiKey && restApiKey !== 'your-onesignal-rest-api-key-here'
        ? restApiKey.substring(0, 8) + '...' + restApiKey.substring(restApiKey.length - 4)
        : ''

      return NextResponse.json({
        success: true,
        configured,
        config: {
          appId: appId || '',
          restApiKey: maskedApiKey
        }
      })
    } else {
      // Non-admins only get the configured status
      return NextResponse.json({
        success: true,
        configured
      })
    }
  } catch (error) {
    console.error('Get config error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to get configuration' },
      { status: 500 }
    )
  }
}

// POST - Save OneSignal configuration (admin only)
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

    // Only admin can update configuration
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only administrators can update configuration' },
        { status: 403 }
      )
    }

    const { appId, restApiKey } = await request.json()

    // Validate inputs
    if (!appId || !restApiKey) {
      return NextResponse.json(
        { success: false, message: 'App ID and REST API Key are required' },
        { status: 400 }
      )
    }

    // Validate App ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(appId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid App ID format. Should be a UUID.' },
        { status: 400 }
      )
    }

    // Validate REST API Key (should be a long string)
    if (restApiKey.length < 20) {
      return NextResponse.json(
        { success: false, message: 'Invalid REST API Key. Key seems too short.' },
        { status: 400 }
      )
    }

    // Update environment variables in .env.local and .env.production
    const envFiles = ['.env.local', '.env.production']
    
    for (const envFile of envFiles) {
      const envPath = path.join(process.cwd(), envFile)
      
      try {
        let envContent = ''
        
        // Read existing content if file exists
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8')
        }

        // Update or add ONESIGNAL_APP_ID
        if (envContent.includes('ONESIGNAL_APP_ID=')) {
          envContent = envContent.replace(
            /ONESIGNAL_APP_ID=.*/,
            `ONESIGNAL_APP_ID=${appId}`
          )
        } else {
          envContent += `\nONESIGNAL_APP_ID=${appId}`
        }

        // Update or add ONESIGNAL_REST_API_KEY
        if (envContent.includes('ONESIGNAL_REST_API_KEY=')) {
          envContent = envContent.replace(
            /ONESIGNAL_REST_API_KEY=.*/,
            `ONESIGNAL_REST_API_KEY=${restApiKey}`
          )
        } else {
          envContent += `\nONESIGNAL_REST_API_KEY=${restApiKey}`
        }

        // Write updated content
        fs.writeFileSync(envPath, envContent, 'utf8')
        console.log(`Updated ${envFile} with OneSignal credentials`)
      } catch (fileError) {
        console.error(`Error updating ${envFile}:`, fileError)
        // Continue with other files even if one fails
      }
    }

    // Update process.env for immediate effect (requires server restart for full effect)
    process.env.ONESIGNAL_APP_ID = appId
    process.env.ONESIGNAL_REST_API_KEY = restApiKey

    return NextResponse.json({
      success: true,
      message: 'OneSignal configuration saved successfully. Please restart the server for changes to take full effect.',
      requiresRestart: true
    })
  } catch (error) {
    console.error('Save config error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save configuration' },
      { status: 500 }
    )
  }
}

