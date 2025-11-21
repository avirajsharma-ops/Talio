/**
 * Quick script to check if Android and Backend are using the same Firebase project
 */

const fs = require('fs')
require('dotenv').config()

console.log('\n' + '='.repeat(80))
console.log('🔍 FIREBASE PROJECT VERIFICATION')
console.log('='.repeat(80) + '\n')

try {
  // Check Android Firebase Project
  console.log('📱 Checking Android App Firebase Project...')
  const googleServicesPath = 'android/app/google-services.json'
  
  if (!fs.existsSync(googleServicesPath)) {
    console.log('❌ ERROR: google-services.json not found at:', googleServicesPath)
    process.exit(1)
  }
  
  const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf8'))
  const androidProjectId = googleServices.project_info.project_id
  const androidProjectNumber = googleServices.project_info.project_number
  const androidPackageName = googleServices.client[0].client_info.android_client_info.package_name
  
  console.log(`   Project ID: ${androidProjectId}`)
  console.log(`   Project Number: ${androidProjectNumber}`)
  console.log(`   Package Name: ${androidPackageName}`)
  console.log('')
  
  // Check Backend Firebase Project
  console.log('🖥️  Checking Backend Firebase Project...')

  let backendProjectId, backendClientEmail

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Option 1: Using service account JSON
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    backendProjectId = serviceAccount.project_id
    backendClientEmail = serviceAccount.client_email
  } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL) {
    // Option 2: Using individual environment variables
    backendProjectId = process.env.FIREBASE_PROJECT_ID
    backendClientEmail = process.env.FIREBASE_CLIENT_EMAIL
  } else {
    console.log('❌ ERROR: Firebase credentials not found in .env file')
    console.log('   Please add either:')
    console.log('   - FIREBASE_SERVICE_ACCOUNT_KEY (full JSON)')
    console.log('   - OR: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY')
    process.exit(1)
  }
  
  console.log(`   Project ID: ${backendProjectId}`)
  console.log(`   Client Email: ${backendClientEmail}`)
  console.log('')
  
  // Compare
  console.log('='.repeat(80))
  console.log('📊 COMPARISON RESULT')
  console.log('='.repeat(80))
  console.log(`Android Project:  ${androidProjectId}`)
  console.log(`Backend Project:  ${backendProjectId}`)
  console.log('='.repeat(80))
  
  if (androidProjectId === backendProjectId) {
    console.log('\n✅ SUCCESS! Both are using the SAME Firebase project!')
    console.log('   Your Firebase configuration is correct.')
    console.log('')
    console.log('If notifications are still failing, check:')
    console.log('   1. FCM tokens are valid (logout/login on Android app)')
    console.log('   2. Cloud Messaging is enabled in Firebase Console')
    console.log('   3. Android app has notification permissions')
    console.log('')
  } else {
    console.log('\n❌ MISMATCH DETECTED! This is why notifications are failing!')
    console.log('')
    console.log('🔧 HOW TO FIX:')
    console.log('')
    console.log('Option A: Update Backend to match Android (RECOMMENDED)')
    console.log('   1. Go to: https://console.firebase.google.com/')
    console.log(`   2. Select project: ${androidProjectId}`)
    console.log('   3. Go to: Project Settings → Service Accounts')
    console.log('   4. Click: "Generate New Private Key"')
    console.log('   5. Copy the JSON content to FIREBASE_SERVICE_ACCOUNT_KEY in .env')
    console.log('   6. Restart backend: npm run dev')
    console.log('')
    console.log('Option B: Update Android to match Backend')
    console.log('   1. Go to: https://console.firebase.google.com/')
    console.log(`   2. Select project: ${backendProjectId}`)
    console.log('   3. Add Android app with package: sbs.zenova.twa')
    console.log('   4. Download google-services.json')
    console.log('   5. Replace android/app/google-services.json')
    console.log('   6. Rebuild Android app')
    console.log('   7. Logout/login on Android to generate new tokens')
    console.log('')
    console.log('📖 See FIREBASE_SENDER_ID_MISMATCH_FIX.md for detailed instructions')
    console.log('')
  }
  
  // Additional checks
  console.log('='.repeat(80))
  console.log('📋 ADDITIONAL INFORMATION')
  console.log('='.repeat(80))
  console.log(`Package Name: ${androidPackageName}`)
  console.log(`Expected: sbs.zenova.twa`)
  
  if (androidPackageName !== 'sbs.zenova.twa') {
    console.log('⚠️  WARNING: Package name mismatch!')
  } else {
    console.log('✅ Package name is correct')
  }
  
  console.log('')
  console.log('Firebase Console Links:')
  console.log(`   Android Project: https://console.firebase.google.com/project/${androidProjectId}`)
  console.log(`   Backend Project: https://console.firebase.google.com/project/${backendProjectId}`)
  console.log('')
  
} catch (error) {
  console.error('\n❌ ERROR:', error.message)
  console.error('')
  console.error('Please check:')
  console.error('   1. android/app/google-services.json exists and is valid JSON')
  console.error('   2. FIREBASE_SERVICE_ACCOUNT_KEY in .env is valid JSON')
  console.error('')
  process.exit(1)
}

console.log('='.repeat(80))
console.log('✅ Check complete!')
console.log('='.repeat(80) + '\n')

