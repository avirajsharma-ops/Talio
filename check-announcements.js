#!/usr/bin/env node

/**
 * Announcement Data Checker
 * Checks what announcements exist in the database and their properties
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
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
};

async function checkAnnouncements() {
  try {
    console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════`);
    console.log(`  Announcement Database Checker`);
    console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}\n`);

    // Define minimal schemas
    const AnnouncementSchema = new mongoose.Schema({
      title: String,
      content: String,
      status: String,
      targetAudience: String,
      isDepartmentAnnouncement: Boolean,
      departments: [mongoose.Schema.Types.ObjectId],
      publishDate: Date,
      expiryDate: Date,
      createdBy: mongoose.Schema.Types.ObjectId,
      createdByRole: String,
    }, { strict: false });

    const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);

    // Get all announcements
    const allAnnouncements = await Announcement.find({});
    console.log(`${colors.bold}Total announcements in database: ${allAnnouncements.length}${colors.reset}\n`);

    if (allAnnouncements.length === 0) {
      console.log(`${colors.yellow}No announcements found in the database.${colors.reset}\n`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Group by status
    const byStatus = {};
    allAnnouncements.forEach(ann => {
      const status = ann.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    console.log(`${colors.bold}Announcements by Status:${colors.reset}`);
    Object.keys(byStatus).forEach(status => {
      console.log(`  ${colors.cyan}${status}:${colors.reset} ${byStatus[status]}`);
    });
    console.log('');

    // Show each announcement
    console.log(`${colors.bold}${colors.magenta}Announcement Details:${colors.reset}`);
    console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}\n`);

    allAnnouncements.forEach((ann, index) => {
      console.log(`${colors.bold}${index + 1}. ${ann.title}${colors.reset}`);
      console.log(`   Status: ${ann.status || 'N/A'}`);
      console.log(`   Target Audience: ${ann.targetAudience || 'N/A'}`);
      console.log(`   Is Department Announcement: ${ann.isDepartmentAnnouncement ? 'Yes' : 'No'}`);
      console.log(`   Departments: ${ann.departments && ann.departments.length > 0 ? ann.departments.length + ' department(s)' : 'None'}`);
      console.log(`   Created By: ${ann.createdBy ? ann.createdBy.toString() : 'N/A'}`);
      console.log(`   Created By Role: ${ann.createdByRole || 'N/A'}`);
      console.log(`   Publish Date: ${ann.publishDate ? new Date(ann.publishDate).toLocaleString() : 'N/A'}`);
      console.log(`   Expiry Date: ${ann.expiryDate ? new Date(ann.expiryDate).toLocaleString() : 'None (never expires)'}`);
      
      // Check if expired
      if (ann.expiryDate && new Date(ann.expiryDate) < new Date()) {
        console.log(`   ${colors.red}⚠ EXPIRED${colors.reset}`);
      } else {
        console.log(`   ${colors.green}✓ Active${colors.reset}`);
      }
      
      console.log('');
    });

    // Check for common issues
    console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}Potential Issues:${colors.reset}\n`);

    let issuesFound = false;

    // Check for announcements without status
    const noStatus = allAnnouncements.filter(ann => !ann.status);
    if (noStatus.length > 0) {
      console.log(`${colors.yellow}⚠${colors.reset} ${noStatus.length} announcement(s) without status`);
      issuesFound = true;
    }

    // Check for announcements with status 'draft'
    const drafts = allAnnouncements.filter(ann => ann.status === 'draft');
    if (drafts.length > 0) {
      console.log(`${colors.yellow}⚠${colors.reset} ${drafts.length} announcement(s) in 'draft' status (won't show on dashboard)`);
      issuesFound = true;
    }

    // Check for expired announcements
    const now = new Date();
    const expired = allAnnouncements.filter(ann => ann.expiryDate && new Date(ann.expiryDate) < now);
    if (expired.length > 0) {
      console.log(`${colors.yellow}⚠${colors.reset} ${expired.length} announcement(s) expired (won't show on dashboard)`);
      issuesFound = true;
    }

    // Check for department announcements without departments
    const deptAnnWithoutDepts = allAnnouncements.filter(ann => 
      ann.isDepartmentAnnouncement && (!ann.departments || ann.departments.length === 0)
    );
    if (deptAnnWithoutDepts.length > 0) {
      console.log(`${colors.yellow}⚠${colors.reset} ${deptAnnWithoutDepts.length} department announcement(s) without departments assigned`);
      issuesFound = true;
    }

    if (!issuesFound) {
      console.log(`${colors.green}✓ No obvious issues found${colors.reset}`);
    }

    console.log('');
    console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

checkAnnouncements();
