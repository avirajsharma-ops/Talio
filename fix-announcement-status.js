#!/usr/bin/env node

/**
 * Fix Announcement Status
 * Changes all draft announcements to published status
 */

require('dotenv').config({ path: '.env' });
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

async function fixAnnouncementStatus() {
  try {
    console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════`);
    console.log(`  Fix Announcement Status`);
    console.log(`═══════════════════════════════════════════════════════════${colors.reset}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}\n`);

    // Define minimal schema
    const AnnouncementSchema = new mongoose.Schema({
      title: String,
      status: String,
    }, { strict: false });

    const Announcement = mongoose.models.Announcement || mongoose.model('Announcement', AnnouncementSchema);

    // Find all draft announcements
    const draftAnnouncements = await Announcement.find({ status: 'draft' });
    
    console.log(`${colors.bold}Found ${draftAnnouncements.length} draft announcement(s)${colors.reset}\n`);

    if (draftAnnouncements.length === 0) {
      console.log(`${colors.green}✓ No draft announcements to fix${colors.reset}\n`);
      await mongoose.disconnect();
      process.exit(0);
    }

    // Update all to published
    const result = await Announcement.updateMany(
      { status: 'draft' },
      { $set: { status: 'published' } }
    );

    console.log(`${colors.green}✓ Updated ${result.modifiedCount} announcement(s) to 'published' status${colors.reset}\n`);

    // Show updated announcements
    draftAnnouncements.forEach((ann, index) => {
      console.log(`  ${index + 1}. ${ann.title} → ${colors.green}published${colors.reset}`);
    });

    console.log(`\n${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    process.exit(1);
  }
}

fixAnnouncementStatus();
