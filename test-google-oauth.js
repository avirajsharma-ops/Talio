#!/usr/bin/env node

/**
 * Test Google OAuth Configuration
 * This script checks if your Google OAuth credentials are properly configured
 */

require('dotenv').config({ path: '.env' })

console.log('🔍 Testing Google OAuth Configuration\n')

// Check environment variables
console.log('1️⃣ Checking Environment Variables:')
console.log('-----------------------------------')

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const appUrl = process.env.NEXT_PUBLIC_APP_URL

console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID:', clientId ? '✅ Set' : '❌ Missing')
console.log('GOOGLE_CLIENT_SECRET:', clientSecret ? '✅ Set' : '❌ Missing')
console.log('NEXT_PUBLIC_APP_URL:', appUrl || 'http://localhost:3000')

if (!clientId || !clientSecret) {
  console.log('\n❌ Missing required environment variables!')
  console.log('\nAdd these to your .env file:')
  console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id')
  console.log('GOOGLE_CLIENT_SECRET=your-client-secret')
  process.exit(1)
}

console.log('\n2️⃣ Expected Redirect URIs:')
console.log('-----------------------------------')
console.log('For Local Development:')
console.log('  http://localhost:3000/api/auth/google/callback')
console.log('\nFor Production:')
console.log(`  ${appUrl}/api/auth/google/callback`)

console.log('\n3️⃣ Google OAuth URL:')
console.log('-----------------------------------')
const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
  `client_id=${clientId}&` +
  `redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/google/callback')}&` +
  `response_type=code&` +
  `scope=openid%20email%20profile&` +
  `access_type=offline&` +
  `prompt=consent`

console.log('Local Dev URL:')
console.log(googleAuthUrl)

console.log('\n4️⃣ Checklist:')
console.log('-----------------------------------')
console.log('[ ] Go to: https://console.cloud.google.com/')
console.log('[ ] Select your project: Talio HRMS')
console.log('[ ] Go to: APIs & Services → Credentials')
console.log('[ ] Click on your OAuth 2.0 Client ID')
console.log('[ ] Check "Authorized redirect URIs" includes:')
console.log('    - http://localhost:3000/api/auth/google/callback')
console.log(`    - ${appUrl}/api/auth/google/callback`)
console.log('[ ] Save if you made changes')

console.log('\n5️⃣ Test User:')
console.log('-----------------------------------')
console.log('Make sure you have a user in the database with one of these emails:')
console.log('  - aviraj.sharma@mushroomworldgroup.com')
console.log('  - avira.sharma@mushroomworlddnous.com')
console.log('\nTo create a user:')
console.log('  1. Login as admin')
console.log('  2. Go to Employees → Add Employee')
console.log('  3. Use the exact Google email address')
console.log('  4. Save')

console.log('\n✅ Configuration check complete!')
console.log('\nNext steps:')
console.log('  1. Run: npm run dev')
console.log('  2. Open: http://localhost:3000/login')
console.log('  3. Click "Sign in with Google"')
console.log('  4. Check terminal for detailed logs')

