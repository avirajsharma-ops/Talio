#!/usr/bin/env node

/**
 * Generate Secure Secrets for HRMS Deployment
 * Run: node generate-secrets.js
 */

const crypto = require('crypto');

console.log('🔐 HRMS System - Secure Secret Generator');
console.log('=====================================\n');

// Generate secure random strings
const generateSecret = (length = 32) => {
  return crypto.randomBytes(length).toString('base64');
};

const nextAuthSecret = generateSecret(32);
const jwtSecret = generateSecret(32);

console.log('📋 Copy these values to your Vercel Environment Variables:\n');

console.log('NEXTAUTH_SECRET=');
console.log(nextAuthSecret);
console.log('');

console.log('JWT_SECRET=');
console.log(jwtSecret);
console.log('');

console.log('🔒 These secrets are cryptographically secure and unique.');
console.log('💡 Keep them safe and never share them publicly!');
console.log('');

console.log('📝 Additional Environment Variables Template:');
console.log('==========================================');
console.log('');
console.log('# Database (Replace with your MongoDB Atlas connection string)');
console.log('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms_db?');
console.log('');
console.log('# Authentication & Security');
console.log(`NEXTAUTH_SECRET=${nextAuthSecret}`);
console.log(`JWT_SECRET=${jwtSecret}`);
console.log('');
console.log('# App Configuration (Replace with your actual Vercel URL)');
console.log('NEXTAUTH_URL=https://your-app-name.vercel.app');
console.log('NEXT_PUBLIC_APP_NAME=HRMS System');
console.log('NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app');
console.log('');
console.log('# File Upload');
console.log('MAX_FILE_SIZE=5242880');
console.log('UPLOAD_DIR=./public/uploads');
console.log('');
console.log('# Production Settings');
console.log('NODE_ENV=production');
console.log('');

console.log('✅ Secrets generated successfully!');
console.log('🚀 Ready for Vercel deployment!');
