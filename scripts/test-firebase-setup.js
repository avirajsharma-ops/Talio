/**
 * Test Firebase Setup
 * Verifies that all Firebase credentials are properly configured
 */

require('dotenv').config()

console.log('\n🔥 Firebase Configuration Test\n')
console.log('=' .repeat(60))

// Check Web Credentials (Public)
console.log('\n📱 Web Credentials (Public):')
console.log('─'.repeat(60))

const webCredentials = {
  'API Key': process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  'Auth Domain': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  'Project ID': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  'Storage Bucket': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  'Messaging Sender ID': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  'App ID': process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  'Measurement ID': process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  'VAPID Key': process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
}

let webComplete = true
for (const [key, value] of Object.entries(webCredentials)) {
  const status = value ? '✅' : '❌'
  const displayValue = value ? (value.length > 50 ? value.substring(0, 50) + '...' : value) : 'NOT SET'
  console.log(`${status} ${key}: ${displayValue}`)
  if (!value) webComplete = false
}

// Check Backend Credentials (Private)
console.log('\n🔐 Backend Credentials (Private):')
console.log('─'.repeat(60))

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
const projectId = process.env.FIREBASE_PROJECT_ID
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
const privateKey = process.env.FIREBASE_PRIVATE_KEY

let backendComplete = false

if (serviceAccountKey) {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey)
    console.log('✅ Service Account JSON: Valid')
    console.log(`   Project ID: ${serviceAccount.project_id}`)
    console.log(`   Client Email: ${serviceAccount.client_email}`)
    backendComplete = true
  } catch (error) {
    console.log('❌ Service Account JSON: Invalid (parse error)')
  }
} else if (projectId && clientEmail && privateKey) {
  console.log('✅ Individual credentials provided:')
  console.log(`   Project ID: ${projectId}`)
  console.log(`   Client Email: ${clientEmail}`)
  console.log(`   Private Key: ${privateKey.substring(0, 50)}...`)
  backendComplete = true
} else {
  console.log('❌ No backend credentials found')
  console.log('   Need either:')
  console.log('   - FIREBASE_SERVICE_ACCOUNT_KEY (full JSON)')
  console.log('   - OR: FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY')
}

// Check Android Configuration
console.log('\n📱 Android Configuration:')
console.log('─'.repeat(60))

const fs = require('fs')
const path = require('path')
const googleServicesPath = path.join(__dirname, '..', 'android', 'app', 'google-services.json')

if (fs.existsSync(googleServicesPath)) {
  try {
    const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'))
    const projectInfo = googleServices.project_info
    const clientInfo = googleServices.client?.[0]?.client_info

    console.log('✅ google-services.json: Found')
    console.log(`   Project ID: ${projectInfo?.project_id}`)
    console.log(`   Project Number: ${projectInfo?.project_number}`)
    console.log(`   Package Name: ${clientInfo?.android_client_info?.package_name}`)

    // Verify project ID matches
    if (projectInfo?.project_id === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      console.log('✅ Project ID matches web configuration')
    } else {
      console.log('⚠️  Project ID does NOT match web configuration')
      console.log(`   Android: ${projectInfo?.project_id}`)
      console.log(`   Web: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}`)
    }
  } catch (error) {
    console.log('❌ google-services.json: Invalid (parse error)')
  }
} else {
  console.log('❌ google-services.json: NOT FOUND')
  console.log(`   Expected at: ${googleServicesPath}`)
}

// Summary
console.log('\n📊 Summary:')
console.log('─'.repeat(60))

if (webComplete && backendComplete) {
  console.log('✅ All credentials configured correctly!')
  console.log('\n🚀 Next steps:')
  console.log('   1. Restart your backend server')
  console.log('   2. Login to the web app')
  console.log('   3. Check browser console for Firebase initialization')
  console.log('   4. Test notifications using /api/fcm/send-notification')
} else {
  console.log('⚠️  Some credentials are missing:')
  if (!webComplete) {
    console.log('   - Web credentials incomplete')
  }
  if (!backendComplete) {
    console.log('   - Backend credentials incomplete')
  }
  console.log('\n📖 See FIREBASE_CREDENTIALS_REQUIRED.md for instructions')
}

console.log('\n' + '='.repeat(60) + '\n')

