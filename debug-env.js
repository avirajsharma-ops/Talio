// Debug script to check environment variables inside the container
// Run with: docker-compose exec hrms-app node debug-env.js

console.log('='.repeat(60));
console.log('ENVIRONMENT VARIABLES DEBUG');
console.log('='.repeat(60));
console.log('');

console.log('1. NODE_ENV:', process.env.NODE_ENV);
console.log('');

console.log('2. MONGODB_URI:');
if (process.env.MONGODB_URI) {
  const uri = process.env.MONGODB_URI;
  if (uri.includes('dummy')) {
    console.log('   ❌ ERROR: Contains "dummy"!');
    console.log('   Value:', uri);
    console.log('   This means .env file is NOT being loaded!');
  } else {
    // Mask the password for security
    const masked = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***PASSWORD***@');
    console.log('   ✅ Set correctly');
    console.log('   Value:', masked);
  }
} else {
  console.log('   ❌ NOT SET!');
}
console.log('');

console.log('3. JWT_SECRET:');
if (process.env.JWT_SECRET) {
  if (process.env.JWT_SECRET.includes('dummy')) {
    console.log('   ❌ ERROR: Contains "dummy"!');
  } else {
    console.log('   ✅ Set correctly');
    console.log('   Length:', process.env.JWT_SECRET.length, 'characters');
  }
} else {
  console.log('   ❌ NOT SET!');
}
console.log('');

console.log('4. NEXTAUTH_SECRET:');
if (process.env.NEXTAUTH_SECRET) {
  if (process.env.NEXTAUTH_SECRET.includes('dummy')) {
    console.log('   ❌ ERROR: Contains "dummy"!');
  } else {
    console.log('   ✅ Set correctly');
    console.log('   Length:', process.env.NEXTAUTH_SECRET.length, 'characters');
  }
} else {
  console.log('   ❌ NOT SET!');
}
console.log('');

console.log('5. NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ NOT SET');
console.log('');

console.log('6. NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || '❌ NOT SET');
console.log('');

console.log('7. NEXT_PUBLIC_APP_NAME:', process.env.NEXT_PUBLIC_APP_NAME || '❌ NOT SET');
console.log('');

console.log('='.repeat(60));
console.log('MONGODB CONNECTION TEST');
console.log('='.repeat(60));
console.log('');

if (!process.env.MONGODB_URI) {
  console.log('❌ Cannot test MongoDB - MONGODB_URI not set');
  process.exit(1);
}

if (process.env.MONGODB_URI.includes('dummy')) {
  console.log('❌ Cannot test MongoDB - MONGODB_URI contains "dummy"');
  console.log('');
  console.log('SOLUTION:');
  console.log('1. Ensure .env file exists in project root');
  console.log('2. Run: docker-compose down');
  console.log('3. Run: docker-compose build --no-cache');
  console.log('4. Run: docker-compose up -d');
  process.exit(1);
}

// Test MongoDB connection
const mongoose = require('mongoose');

console.log('Attempting to connect to MongoDB...');
console.log('');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  bufferCommands: false,
})
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    console.log('');
    console.log('Connection details:');
    console.log('   Database:', mongoose.connection.name);
    console.log('   Host:', mongoose.connection.host);
    console.log('   Port:', mongoose.connection.port);
    console.log('');
    console.log('='.repeat(60));
    console.log('ALL CHECKS PASSED! ✅');
    console.log('='.repeat(60));
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ MongoDB connection failed!');
    console.log('');
    console.log('Error:', err.message);
    console.log('');
    console.log('Common causes:');
    console.log('1. MongoDB is not running');
    console.log('2. Wrong host/port in connection string');
    console.log('3. Firewall blocking connection');
    console.log('4. Wrong credentials');
    console.log('');
    console.log('='.repeat(60));
    process.exit(1);
  });

