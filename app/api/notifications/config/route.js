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

    // Check if Firebase is configured
    const firebaseProjectId = process.env.FIREBASE_PROJECT_ID
    const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL
    const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    const firebaseVapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    const configured = !!(
      firebaseProjectId &&
      firebaseClientEmail &&
      firebasePrivateKey &&
      firebaseApiKey &&
      firebaseVapidKey &&
      firebaseProjectId !== 'YOUR_PROJECT_ID' &&
      firebasePrivateKey.includes('BEGIN PRIVATE KEY')
    )

    // Only admins can see the masked Firebase config
    if (decoded.role === 'admin') {
      const maskedPrivateKey = firebasePrivateKey && firebasePrivateKey.includes('BEGIN PRIVATE KEY')
        ? '***CONFIGURED***'
        : ''

      return NextResponse.json({
        success: true,
        configured,
        config: {
          projectId: firebaseProjectId || '',
          clientEmail: firebaseClientEmail || '',
          privateKey: maskedPrivateKey,
          apiKey: firebaseApiKey ? firebaseApiKey.substring(0, 10) + '...' : '',
          vapidKey: firebaseVapidKey ? firebaseVapidKey.substring(0, 10) + '...' : ''
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

// POST - Firebase configuration is managed via .env.local file
// This endpoint is kept for compatibility but returns info message
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

    // Only admin can access configuration
    if (decoded.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only administrators can access configuration' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Firebase is configured via environment variables in .env.local file. No UI configuration needed.',
      configured: true
    })
  } catch (error) {
    console.error('Config endpoint error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to access configuration' },
      { status: 500 }
    )
  }
}

