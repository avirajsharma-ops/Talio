import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import User from '@/models/User'

export async function GET() {
  try {
    console.log('🔍 Testing API endpoint...')
    
    // Test environment variables
    const mongoUri = process.env.MONGODB_URI
    const jwtSecret = process.env.JWT_SECRET
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    
    console.log('Environment check:')
    console.log('- MONGODB_URI exists:', !!mongoUri)
    console.log('- JWT_SECRET exists:', !!jwtSecret)
    console.log('- NEXTAUTH_SECRET exists:', !!nextAuthSecret)
    
    if (mongoUri) {
      console.log('- MongoDB URI starts with:', mongoUri.substring(0, 20) + '...')
    }
    
    // Test database connection
    console.log('🔄 Testing database connection...')
    await connectDB()
    console.log('✅ Database connected successfully')
    
    // Test user query
    console.log('🔍 Testing user query...')
    const userCount = await User.countDocuments()
    console.log('✅ Users found:', userCount)
    
    if (userCount > 0) {
      const sampleUser = await User.findOne().select('email role')
      console.log('✅ Sample user:', sampleUser)
    }
    
    return NextResponse.json({
      success: true,
      message: 'API is working correctly',
      environment: {
        hasMongoUri: !!mongoUri,
        hasJwtSecret: !!jwtSecret,
        hasNextAuthSecret: !!nextAuthSecret,
        mongoUriPrefix: mongoUri ? mongoUri.substring(0, 20) + '...' : 'Not set'
      },
      database: {
        connected: true,
        userCount: userCount
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ API Test Error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'API test failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
