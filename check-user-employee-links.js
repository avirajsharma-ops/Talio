#!/usr/bin/env node

/**
 * User-Employee Link Checker
 * Verifies that users have properly linked employee profiles
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

async function checkUserEmployeeLinks() {
  try {
    console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════`);
    console.log(`  User-Employee Profile Link Checker`);
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
      department: mongoose.Schema.Types.ObjectId,
    });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

    // Get all active users
    const users = await User.find({ isActive: true }).select('email role employeeId');
    console.log(`${colors.bold}Found ${users.length} active users${colors.reset}\n`);

    let linkedCount = 0;
    let unlinkedCount = 0;
    const unlinkedUsers = [];

    for (const user of users) {
      // Check if employee profile exists
      let employee = await Employee.findOne({ userId: user._id });
      
      // If not found by userId, try employeeId reference
      if (!employee && user.employeeId) {
        employee = await Employee.findById(user.employeeId);
      }

      if (employee) {
        linkedCount++;
        console.log(`${colors.green}✓${colors.reset} ${user.email} (${user.role})`);
        console.log(`  └─ Linked to: ${employee.firstName} ${employee.lastName}`);
        
        // Check if both-way linking exists
        if (!employee.userId && !user.employeeId) {
          console.log(`  ${colors.yellow}⚠ Warning: No two-way link (both userId and employeeId are missing)${colors.reset}`);
        } else if (!employee.userId) {
          console.log(`  ${colors.yellow}⚠ Warning: Employee.userId is not set${colors.reset}`);
        } else if (!user.employeeId) {
          console.log(`  ${colors.yellow}⚠ Warning: User.employeeId is not set${colors.reset}`);
        }
      } else {
        unlinkedCount++;
        unlinkedUsers.push(user);
        console.log(`${colors.red}✗${colors.reset} ${user.email} (${user.role})`);
        console.log(`  └─ ${colors.red}No employee profile found${colors.reset}`);
      }
    }

    console.log(`\n${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  ${colors.green}Linked:${colors.reset} ${linkedCount}`);
    console.log(`  ${colors.red}Unlinked:${colors.reset} ${unlinkedCount}`);

    if (unlinkedCount > 0) {
      console.log(`\n${colors.yellow}${colors.bold}Users without employee profiles:${colors.reset}`);
      unlinkedUsers.forEach(user => {
        console.log(`  • ${user.email} (${user.role})`);
      });

      console.log(`\n${colors.yellow}${colors.bold}To fix this issue:${colors.reset}`);
      console.log(`  1. Create employee profiles for these users in the admin panel`);
      console.log(`  2. Or link existing employee profiles using MongoDB:`);
      console.log(`     ${colors.cyan}db.employees.updateOne({email: "user@example.com"}, {$set: {userId: ObjectId("userId")}})${colors.reset}`);
      console.log(`     ${colors.cyan}db.users.updateOne({email: "user@example.com"}, {$set: {employeeId: ObjectId("employeeId")}})${colors.reset}\n`);
    } else {
      console.log(`\n${colors.green}${colors.bold}✅ All users have linked employee profiles!${colors.reset}\n`);
    }

    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

checkUserEmployeeLinks();
