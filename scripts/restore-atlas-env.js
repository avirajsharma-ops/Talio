const fs = require('fs');
const path = require('path');

// Restore .env to Atlas configuration
const envPath = path.join(process.cwd(), '.env');
const backupPath = path.join(process.cwd(), '.env.backup');

console.log('🔄 Restoring Atlas configuration...\n');

// Restore from backup if exists
if (fs.existsSync(backupPath)) {
  fs.copyFileSync(backupPath, envPath);
  fs.unlinkSync(backupPath); // Remove backup file
  console.log('✅ Restored .env from backup');
} else {
  // Create Atlas configuration
  const atlasEnvContent = `# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=

# JWT Secret
JWT_SECRET=1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=

# App Configuration
NEXT_PUBLIC_APP_NAME=HRMS System
NEXT_PUBLIC_APP_URL=http://localhost:3000

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
`;

  fs.writeFileSync(envPath, atlasEnvContent);
  console.log('✅ Created new .env with Atlas configuration');
}

console.log('☁️  MongoDB URI: mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db');
console.log('🔑 Using secure generated secrets');
console.log('\n🎯 Ready for deployment!');
