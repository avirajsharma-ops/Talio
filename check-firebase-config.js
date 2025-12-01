#!/usr/bin/env node

/**
 * Firebase Configuration Checker
 * Analyzes the project for Firebase integration and identifies missing keys
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

// Required Firebase environment variables
const REQUIRED_FIREBASE_KEYS = {
  'Client SDK (Public - for browser)': [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
    'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
    'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  ],
  'Admin SDK (Private - for server)': [
    'FIREBASE_SERVICE_ACCOUNT_KEY', // Preferred method
    // OR individual fields:
    // 'FIREBASE_PROJECT_ID',
    // 'FIREBASE_CLIENT_EMAIL',
    // 'FIREBASE_PRIVATE_KEY',
  ],
};

// Optional Firebase keys
const OPTIONAL_FIREBASE_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

function loadEnvFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    
    content.split('\n').forEach((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        
        // Remove quotes
        value = value.replace(/^["']|["']$/g, '');
        
        env[key] = value;
      }
    });
    
    return env;
  } catch (error) {
    return null;
  }
}

function isValidValue(value) {
  if (!value) return false;
  
  // Check for placeholder values
  const placeholders = [
    'your-',
    'YOUR_',
    'placeholder',
    'PLACEHOLDER',
    'xxx',
    'XXX',
    '...',
  ];
  
  const valueLower = value.toLowerCase();
  return !placeholders.some(p => valueLower.includes(p.toLowerCase()));
}

function validateServiceAccountKey(value) {
  if (!value) return { valid: false, reason: 'Not set' };
  
  try {
    const parsed = JSON.parse(value);
    
    const requiredFields = [
      'type',
      'project_id',
      'private_key_id',
      'private_key',
      'client_email',
      'client_id',
    ];
    
    const missing = requiredFields.filter(field => !parsed[field]);
    
    if (missing.length > 0) {
      return {
        valid: false,
        reason: `Missing fields: ${missing.join(', ')}`,
      };
    }
    
    if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
      return {
        valid: false,
        reason: 'Invalid private key format',
      };
    }
    
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      reason: 'Invalid JSON format',
    };
  }
}

function checkFirebaseIntegration() {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════`);
  console.log(`  Firebase Configuration Analysis for Talio HRMS`);
  console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Load environment files
  const envLocal = loadEnvFile('.env');
  const envExample = loadEnvFile('.env.example');
  const envFirebase = loadEnvFile('.env.firebase');
  
  if (!envLocal) {
    console.log(`${colors.red}❌ .env file not found!${colors.reset}`);
    console.log(`${colors.yellow}ℹ️  Create .env from .env.example${colors.reset}\n`);
    return;
  }
  
  console.log(`${colors.bold}📋 Environment Files Status:${colors.reset}`);
  console.log(`   ${colors.green}✓${colors.reset} .env (current config)`);
  if (envFirebase) {
    console.log(`   ${colors.green}✓${colors.reset} .env.firebase (reference config)`);
  }
  if (envExample) {
    console.log(`   ${colors.green}✓${colors.reset} .env.example (template)`);
  }
  console.log('');
  
  // Check each category
  let totalMissing = 0;
  let totalPresent = 0;
  const missingKeys = [];
  const presentKeys = [];
  
  Object.entries(REQUIRED_FIREBASE_KEYS).forEach(([category, keys]) => {
    console.log(`${colors.bold}${colors.magenta}${category}:${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
    
    keys.forEach((key) => {
      const value = envLocal[key];
      const isOptional = OPTIONAL_FIREBASE_KEYS.includes(key);
      
      if (key === 'FIREBASE_SERVICE_ACCOUNT_KEY') {
        const validation = validateServiceAccountKey(value);
        
        if (validation.valid) {
          console.log(`   ${colors.green}✓${colors.reset} ${key}`);
          console.log(`     ${colors.green}→ Valid service account JSON${colors.reset}`);
          totalPresent++;
          presentKeys.push(key);
        } else {
          console.log(`   ${colors.red}✗${colors.reset} ${key}`);
          console.log(`     ${colors.red}→ ${validation.reason}${colors.reset}`);
          totalMissing++;
          missingKeys.push({ key, reason: validation.reason });
        }
      } else if (value && isValidValue(value)) {
        console.log(`   ${colors.green}✓${colors.reset} ${key}`);
        
        // Show masked value
        if (key.includes('KEY') || key.includes('SECRET')) {
          console.log(`     ${colors.green}→ ${value.substring(0, 15)}...${colors.reset}`);
        } else {
          console.log(`     ${colors.green}→ ${value}${colors.reset}`);
        }
        
        totalPresent++;
        presentKeys.push(key);
      } else {
        const status = isOptional ? colors.yellow : colors.red;
        const symbol = isOptional ? '⚠' : '✗';
        const label = isOptional ? 'Optional' : 'Missing';
        
        console.log(`   ${status}${symbol}${colors.reset} ${key}`);
        console.log(`     ${status}→ ${label} (${value ? 'placeholder value' : 'not set'})${colors.reset}`);
        
        if (!isOptional) {
          totalMissing++;
          missingKeys.push({ key, reason: value ? 'Placeholder value' : 'Not set' });
        }
      }
    });
    
    console.log('');
  });
  
  // Check for alternative admin SDK configuration
  const hasIndividualKeys = 
    envLocal['FIREBASE_PROJECT_ID'] && 
    isValidValue(envLocal['FIREBASE_PROJECT_ID']) &&
    envLocal['FIREBASE_CLIENT_EMAIL'] && 
    isValidValue(envLocal['FIREBASE_CLIENT_EMAIL']) &&
    envLocal['FIREBASE_PRIVATE_KEY'] && 
    isValidValue(envLocal['FIREBASE_PRIVATE_KEY']);
  
  if (hasIndividualKeys) {
    console.log(`${colors.bold}${colors.magenta}Alternative Admin SDK Config (Individual Keys):${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
    console.log(`   ${colors.green}✓${colors.reset} FIREBASE_PROJECT_ID`);
    console.log(`   ${colors.green}✓${colors.reset} FIREBASE_CLIENT_EMAIL`);
    console.log(`   ${colors.green}✓${colors.reset} FIREBASE_PRIVATE_KEY`);
    console.log(`   ${colors.yellow}ℹ️  Using individual keys instead of service account JSON${colors.reset}\n`);
  }
  
  // Summary
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}📊 Configuration Summary:${colors.reset}\n`);
  
  const hasServiceAccount = 
    (envLocal['FIREBASE_SERVICE_ACCOUNT_KEY'] && 
     validateServiceAccountKey(envLocal['FIREBASE_SERVICE_ACCOUNT_KEY']).valid) ||
    hasIndividualKeys;
  
  const clientConfigComplete = 
    envLocal['NEXT_PUBLIC_FIREBASE_API_KEY'] && 
    isValidValue(envLocal['NEXT_PUBLIC_FIREBASE_API_KEY']) &&
    envLocal['NEXT_PUBLIC_FIREBASE_PROJECT_ID'] && 
    isValidValue(envLocal['NEXT_PUBLIC_FIREBASE_PROJECT_ID']) &&
    envLocal['NEXT_PUBLIC_FIREBASE_VAPID_KEY'] && 
    isValidValue(envLocal['NEXT_PUBLIC_FIREBASE_VAPID_KEY']);
  
  console.log(`   Client SDK:  ${clientConfigComplete ? colors.green + '✓ Configured' : colors.red + '✗ Incomplete'}${colors.reset}`);
  console.log(`   Admin SDK:   ${hasServiceAccount ? colors.green + '✓ Configured' : colors.red + '✗ Incomplete'}${colors.reset}`);
  console.log(`   Total Keys:  ${totalPresent} configured, ${totalMissing} missing\n`);
  
  const fullyConfigured = clientConfigComplete && hasServiceAccount;
  
  if (fullyConfigured) {
    console.log(`${colors.green}${colors.bold}✅ Firebase is fully configured!${colors.reset}`);
    console.log(`${colors.green}   Push notifications should work correctly.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}❌ Firebase configuration is incomplete!${colors.reset}\n`);
    
    if (missingKeys.length > 0) {
      console.log(`${colors.bold}Missing Keys:${colors.reset}`);
      missingKeys.forEach(({ key, reason }) => {
        console.log(`   ${colors.red}•${colors.reset} ${key} - ${reason}`);
      });
      console.log('');
    }
    
    console.log(`${colors.bold}${colors.yellow}📝 Next Steps:${colors.reset}`);
    console.log(`   1. Go to Firebase Console: ${colors.cyan}https://console.firebase.google.com/${colors.reset}`);
    console.log(`   2. Select your project or create a new one`);
    console.log(`   3. Get Client SDK keys from: Project Settings → General → Your apps`);
    console.log(`   4. Get VAPID key from: Project Settings → Cloud Messaging → Web Push certificates`);
    console.log(`   5. Get Admin SDK from: Project Settings → Service Accounts → Generate New Private Key`);
    console.log(`   6. Add all keys to .env file\n`);
    
    console.log(`${colors.bold}${colors.cyan}📚 Documentation:${colors.reset}`);
    console.log(`   • FIREBASE_CONFIGURATION.md`);
    console.log(`   • FCM_SETUP_GUIDE.md`);
    console.log(`   • FIREBASE_CREDENTIALS_SETUP.md\n`);
  }
  
  // Check if Firebase is actually being used
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}🔍 Firebase Usage in Project:${colors.reset}\n`);
  
  const firebaseFiles = [
    { file: 'lib/firebaseNotification.js', purpose: 'Server-side push notifications' },
    { file: 'lib/pushNotification.js', purpose: 'Push notification helper' },
    { file: 'lib/notificationService.js', purpose: 'Centralized notification service' },
    { file: 'app/api/notifications/config/route.js', purpose: 'Firebase config API' },
  ];
  
  firebaseFiles.forEach(({ file, purpose }) => {
    const exists = fs.existsSync(file);
    console.log(`   ${exists ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${file}`);
    console.log(`     ${colors.cyan}→ ${purpose}${colors.reset}`);
  });
  
  console.log(`\n${colors.bold}${colors.yellow}⚠️  Note:${colors.reset} This project also uses OneSignal for push notifications.`);
  console.log(`   Firebase and OneSignal can work together or independently.`);
  console.log(`   Current OneSignal status: ${envLocal['ONESIGNAL_APP_ID'] && isValidValue(envLocal['ONESIGNAL_APP_ID']) ? colors.green + '✓ Configured' : colors.red + '✗ Not configured'}${colors.reset}\n`);
  
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the check
checkFirebaseIntegration();
