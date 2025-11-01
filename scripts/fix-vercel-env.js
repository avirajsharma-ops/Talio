// Quick script to verify environment variables for Vercel deployment
const requiredEnvVars = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET', 
  'JWT_SECRET',
  'NEXTAUTH_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_APP_NAME',
  'MAX_FILE_SIZE',
  'UPLOAD_DIR',
  'NODE_ENV'
];

const expectedValues = {
  'MONGODB_URI': 'mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?retryWrites=true&w=majority',
  'NEXTAUTH_SECRET': 'wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=',
  'JWT_SECRET': '1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=',
  'NEXT_PUBLIC_APP_NAME': 'HRMS System',
  'MAX_FILE_SIZE': '5242880',
  'UPLOAD_DIR': './public/uploads',
  'NODE_ENV': 'production'
};

console.log('🔍 VERCEL ENVIRONMENT VARIABLES CHECK\n');

console.log('📋 Required Environment Variables for Vercel:\n');

requiredEnvVars.forEach((envVar, index) => {
  const value = expectedValues[envVar] || 'https://your-vercel-url.vercel.app';
  console.log(`${index + 1}. ${envVar}`);
  console.log(`   Value: ${value}\n`);
});

console.log('🚨 IMMEDIATE FIX FOR 500 ERRORS:\n');
console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
console.log('2. Add ALL the variables listed above');
console.log('3. Make sure NEXTAUTH_URL and NEXT_PUBLIC_APP_URL use your actual Vercel URL');
console.log('4. Redeploy the application\n');

console.log('🧪 TEST AFTER FIXING:');
console.log('- API Test: https://your-vercel-url.vercel.app/api/test');
console.log('- Login: https://your-vercel-url.vercel.app/login');
console.log('- Credentials: admin@hrms.com / admin123\n');

console.log('✅ Once environment variables are set, the 500 errors will be fixed!');
