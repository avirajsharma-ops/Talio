#!/usr/bin/env node

/**
 * Fix User-Employee Two-Way Links
 * Ensures both User.employeeId and Employee.userId are properly set
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

async function fixUserEmployeeLinks() {
  try {
    console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════`);
    console.log(`  User-Employee Link Fixer`);
    console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}\n`);

    // Define schemas
    const UserSchema = new mongoose.Schema({
      email: String,
      role: String,
      employeeId: mongoose.Schema.Types.ObjectId,
      isActive: Boolean,
    });

    const EmployeeSchema = new mongoose.Schema({
      firstName: String,
      lastName: String,
      email: String,
      userId: mongoose.Schema.Types.ObjectId,
      status: String,
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

    // Get all active users
    const users = await User.find({ isActive: true });
    console.log(`${colors.bold}Processing ${users.length} active users...${colors.reset}\n`);

    let fixedCount = 0;
    let alreadyLinkedCount = 0;

    for (const user of users) {
      // Find employee by userId or by matching email
      let employee = await Employee.findOne({ userId: user._id });
      
      if (!employee && user.employeeId) {
        employee = await Employee.findById(user.employeeId);
      }
      
      if (!employee) {
        employee = await Employee.findOne({ email: user.email });
      }

      if (employee) {
        let needsUpdate = false;
        let updates = [];

        // Check if User.employeeId needs to be set
        if (!user.employeeId || user.employeeId.toString() !== employee._id.toString()) {
          await User.findByIdAndUpdate(user._id, { employeeId: employee._id });
          updates.push('User.employeeId');
          needsUpdate = true;
        }

        // Check if Employee.userId needs to be set
        if (!employee.userId || employee.userId.toString() !== user._id.toString()) {
          await Employee.findByIdAndUpdate(employee._id, { userId: user._id });
          updates.push('Employee.userId');
          needsUpdate = true;
        }

        if (needsUpdate) {
          fixedCount++;
          console.log(`${colors.green}✓ Fixed${colors.reset} ${user.email}`);
          console.log(`  └─ Updated: ${updates.join(', ')}`);
        } else {
          alreadyLinkedCount++;
          console.log(`${colors.cyan}✓ OK${colors.reset} ${user.email}`);
        }
      } else {
        console.log(`${colors.yellow}⚠ Skipped${colors.reset} ${user.email} - No employee profile found`);
      }
    }

    console.log(`\n${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  ${colors.green}Fixed:${colors.reset} ${fixedCount}`);
    console.log(`  ${colors.cyan}Already linked:${colors.reset} ${alreadyLinkedCount}`);

    if (fixedCount > 0) {
      console.log(`\n${colors.green}${colors.bold}✅ Successfully fixed ${fixedCount} user-employee link(s)!${colors.reset}\n`);
    } else {
      console.log(`\n${colors.green}${colors.bold}✅ All links are already properly configured!${colors.reset}\n`);
    }

    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

fixUserEmployeeLinks();
