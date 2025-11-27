const fs = require('fs');
const path = require('path');

// Backup current .env
const envPath = path.join(process.cwd(), '.env');
const backupPath = path.join(process.cwd(), '.env.backup');

console.log('📋 Setting up environment for local data access...\n');

// Create backup
if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, backupPath);
  console.log('✅ Backed up .env to .env.backup');
}

// Create temporary .env for local MongoDB access
const localEnvContent = `# Temporary configuration for data migration
MONGODB_URI=mongodb://localhost:27017/hrms_db

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=hrms-nextauth-secret-key-2024-change-in-production

# JWT Secret
JWT_SECRET=hrms-jwt-secret-key-2024-change-in-production

# App Configuration
NEXT_PUBLIC_APP_NAME=HRMS System
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
`;

fs.writeFileSync(envPath, localEnvContent);
console.log('✅ Created temporary .env pointing to local MongoDB');
console.log('📍 Local MongoDB URI: mongodb://localhost:27017/hrms_db\n');

console.log('🎯 Next steps:');
console.log('1. Run: node scripts/migrate-to-atlas.js');
console.log('2. Run: node scripts/restore-atlas-env.js');
console.log('3. Deploy to Vercel\n');
