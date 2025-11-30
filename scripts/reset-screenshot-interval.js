/**
 * Reset Screenshot Interval Script
 * 
 * This script resets the screenshotInterval for all employees in the database
 * to the new default of 1 minute (60000ms).
 * 
 * Run this after updating the default interval to ensure all employees
 * get the new interval on their next app login.
 * 
 * Usage: node scripts/reset-screenshot-interval.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;
const NEW_INTERVAL_MS = 60 * 1000; // 1 minute in milliseconds

async function resetScreenshotIntervals() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env.local');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get Employee model
    const Employee = mongoose.model('Employee', new mongoose.Schema({
      firstName: String,
      lastName: String,
      screenshotInterval: Number
    }));

    // Count employees with custom intervals
    const employeesWithCustomInterval = await Employee.countDocuments({
      screenshotInterval: { $exists: true, $ne: null }
    });
    console.log(`📊 Found ${employeesWithCustomInterval} employees with custom screenshot intervals`);

    // Get some examples
    if (employeesWithCustomInterval > 0) {
      const examples = await Employee.find({
        screenshotInterval: { $exists: true, $ne: null }
      }).limit(5).select('firstName lastName screenshotInterval');
      
      console.log('\n📋 Examples of current intervals:');
      examples.forEach(emp => {
        const minutes = emp.screenshotInterval / 60000;
        console.log(`   - ${emp.firstName} ${emp.lastName}: ${minutes} minutes (${emp.screenshotInterval}ms)`);
      });
    }

    // Ask for confirmation
    console.log(`\n⚠️  This will reset ALL employees to ${NEW_INTERVAL_MS / 60000} minute interval`);
    console.log('   Desktop apps will update their interval on next login.\n');

    // In non-interactive mode, just do it
    if (process.argv.includes('--force')) {
      await performReset(Employee);
    } else {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Continue? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y') {
          await performReset(Employee);
        } else {
          console.log('❌ Aborted');
        }
        rl.close();
        await mongoose.disconnect();
        process.exit(0);
      });
      return; // Don't disconnect yet
    }

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

async function performReset(Employee) {
  // Option 1: Set all to new default
  console.log('\n🔄 Resetting all screenshot intervals...');
  const result = await Employee.updateMany(
    {},
    { $unset: { screenshotInterval: 1 } } // Remove the field so default is used
  );
  
  console.log(`✅ Reset ${result.modifiedCount} employee records`);
  console.log('\n📱 Desktop apps will now use the new 1-minute default on next login.');
  console.log('   Users can also use "Reset Cache & Settings" from the tray menu.');
}

resetScreenshotIntervals();
