#!/usr/bin/env node
/**
 * One-time Migration Script: Compile existing ProductivityData into ProductivitySessions
 * 
 * This script processes all existing ProductivityData records that haven't been 
 * compiled into sessions yet. It groups them by user and time intervals, then 
 * creates aggregated session records.
 * 
 * Usage: node scripts/migrate-productivity-to-sessions.js
 * 
 * Options:
 *   --dry-run     Preview what would be migrated without making changes
 *   --user=ID     Only process a specific user ID
 *   --since=DATE  Only process data since a specific date (ISO format)
 *   --batch=N     Process N users at a time (default: 10)
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import models
import ProductivityData from '../models/ProductivityData.js';
import ProductivitySession from '../models/ProductivitySession.js';
import ProductivitySettings from '../models/ProductivitySettings.js';

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const userArg = args.find(a => a.startsWith('--user='));
const specificUserId = userArg ? userArg.split('=')[1] : null;
const sinceArg = args.find(a => a.startsWith('--since='));
const sinceDate = sinceArg ? new Date(sinceArg.split('=')[1]) : null;
const batchArg = args.find(a => a.startsWith('--batch='));
const batchSize = batchArg ? parseInt(batchArg.split('=')[1]) : 10;

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║   ProductivityData → ProductivitySession Migration Script     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');
console.log('');

if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Connect to MongoDB
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

// Get session interval from settings
async function getSessionInterval() {
  try {
    const settings = await ProductivitySettings.findOne();
    return settings?.screenshotInterval || 30; // Default 30 minutes
  } catch (error) {
    console.log('⚠️  Could not fetch settings, using default 30 min interval');
    return 30;
  }
}

// Categorize app as productive, neutral, or distracting
function categorizeApp(appName) {
  const name = (appName || '').toLowerCase();
  
  const productivePatterns = [
    'code', 'visual studio', 'intellij', 'xcode', 'android studio', 'sublime',
    'terminal', 'iterm', 'powershell', 'cmd',
    'slack', 'teams', 'zoom', 'meet',
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator',
    'excel', 'word', 'powerpoint', 'numbers', 'pages', 'keynote',
    'notion', 'obsidian', 'evernote', 'onenote',
    'jira', 'asana', 'trello', 'monday', 'clickup',
    'postman', 'insomnia', 'docker', 'kubernetes',
    'github', 'gitlab', 'bitbucket',
    'mail', 'outlook', 'gmail'
  ];

  const distractingPatterns = [
    'youtube', 'netflix', 'spotify', 'music',
    'twitter', 'facebook', 'instagram', 'tiktok', 'snapchat',
    'reddit', 'discord',
    'game', 'steam', 'epic games',
    'whatsapp', 'telegram', 'messenger'
  ];

  if (productivePatterns.some(p => name.includes(p))) return 'productive';
  if (distractingPatterns.some(p => name.includes(p))) return 'distracting';
  return 'neutral';
}

// Categorize website
function categorizeWebsite(domain) {
  const d = (domain || '').toLowerCase();
  
  const productiveDomains = [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'stackoverflow.com', 'developer.', 'docs.',
    'notion.so', 'figma.com', 'miro.com',
    'atlassian.', 'jira.', 'confluence.',
    'slack.com', 'teams.microsoft.com',
    'aws.amazon.com', 'console.cloud.google.com', 'portal.azure.com',
    'vercel.com', 'netlify.com', 'heroku.com'
  ];

  const distractingDomains = [
    'youtube.com', 'netflix.com', 'twitch.tv',
    'twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com',
    'reddit.com', 'discord.com',
    'spotify.com', 'soundcloud.com'
  ];

  if (productiveDomains.some(p => d.includes(p))) return 'productive';
  if (distractingDomains.some(p => d.includes(p))) return 'distracting';
  return 'neutral';
}

// Calculate focus score
function calculateFocusScore(appUsage) {
  if (!appUsage || appUsage.length === 0) return 50;
  
  const totalApps = appUsage.length;
  const topAppPercentage = appUsage[0]?.percentage || 0;
  
  if (totalApps <= 3 && topAppPercentage >= 50) return 90;
  if (totalApps <= 5 && topAppPercentage >= 30) return 70;
  if (totalApps <= 8) return 50;
  return 30;
}

// Calculate efficiency score
function calculateEfficiencyScore(keystrokes, clicks, minutes) {
  const totalActions = (keystrokes || 0) + (clicks || 0);
  const actionsPerMinute = minutes > 0 ? totalActions / minutes : 0;
  
  if (actionsPerMinute >= 20 && actionsPerMinute <= 100) return 85;
  if (actionsPerMinute >= 10 && actionsPerMinute < 20) return 70;
  if (actionsPerMinute > 100 && actionsPerMinute <= 150) return 75;
  if (actionsPerMinute >= 5 && actionsPerMinute < 10) return 50;
  if (actionsPerMinute > 150) return 60;
  return 30;
}

// Generate session summary
function generateSessionSummary(appUsage, websiteVisits, screenshotCount, intervalMinutes, productivityScore) {
  if (!appUsage || appUsage.length === 0) {
    return 'No significant activity detected during this session.';
  }

  const topApp = appUsage[0];
  const topApps = appUsage.slice(0, 3).map(a => a.appName).join(', ');
  
  let summary = `${intervalMinutes}-minute session with ${productivityScore}% productivity. `;
  summary += `Primary focus on ${topApp.appName} (${topApp.percentage}% of time). `;
  
  if (appUsage.length > 1) {
    summary += `Also used: ${topApps}. `;
  }

  if (websiteVisits && websiteVisits.length > 0) {
    summary += `Visited ${websiteVisits.length} websites. `;
  }

  if (screenshotCount > 0) {
    summary += `${screenshotCount} screenshots captured.`;
  }

  return summary;
}

// Aggregate data points into a session
function aggregateSessionData(session, dataPoints, intervalMinutes) {
  const screenshots = [];
  const appUsageMap = new Map();
  const websiteUsageMap = new Map();
  let totalKeystrokes = 0;
  let totalMouseClicks = 0;
  let totalScrollDistance = 0;
  let totalMovementDistance = 0;
  let totalActiveTime = 0;
  let productiveTime = 0;
  let neutralTime = 0;
  let unproductiveTime = 0;

  for (const data of dataPoints) {
    // Collect screenshots
    if (data.screenshot?.data || data.screenshot?.url) {
      screenshots.push({
        capturedAt: data.screenshot.capturedAt || data.createdAt || data.periodStart,
        thumbnail: data.screenshot.data || data.screenshot.url,
        fullData: data.screenshot.data || data.screenshot.url,
        captureType: data.screenshot.captureType || 'periodic',
        linkedDataId: data._id
      });
    }

    // Aggregate app usage
    if (data.appUsage && Array.isArray(data.appUsage)) {
      for (const app of data.appUsage) {
        const appName = app.appName || 'Unknown';
        const existing = appUsageMap.get(appName) || { 
          duration: 0, 
          count: 0,
          category: app.category || categorizeApp(appName)
        };
        existing.duration += app.duration || 0;
        existing.count += 1;
        if (app.category && app.category !== 'unknown') {
          existing.category = app.category;
        }
        appUsageMap.set(appName, existing);
      }
    }

    // Also use topApps if appUsage is empty
    if ((!data.appUsage || data.appUsage.length === 0) && data.topApps) {
      for (const app of data.topApps) {
        const appName = app.appName || 'Unknown';
        const existing = appUsageMap.get(appName) || { 
          duration: 0, 
          count: 0,
          category: categorizeApp(appName)
        };
        existing.duration += app.duration || 0;
        existing.count += 1;
        appUsageMap.set(appName, existing);
      }
    }

    // Aggregate website visits
    if (data.websiteVisits && Array.isArray(data.websiteVisits)) {
      for (const site of data.websiteVisits) {
        const domain = site.domain || site.url || 'Unknown';
        const existing = websiteUsageMap.get(domain) || { 
          duration: 0, 
          visitCount: 0, 
          url: site.url,
          category: site.category || categorizeWebsite(domain)
        };
        existing.duration += site.duration || 0;
        existing.visitCount += 1;
        if (site.category && site.category !== 'unknown') {
          existing.category = site.category;
        }
        websiteUsageMap.set(domain, existing);
      }
    }

    // Also use topWebsites if websiteVisits is empty
    if ((!data.websiteVisits || data.websiteVisits.length === 0) && data.topWebsites) {
      for (const site of data.topWebsites) {
        const domain = site.domain || 'Unknown';
        const existing = websiteUsageMap.get(domain) || { 
          duration: 0, 
          visitCount: 0, 
          url: domain,
          category: categorizeWebsite(domain)
        };
        existing.duration += site.duration || 0;
        existing.visitCount += site.visits || 1;
        websiteUsageMap.set(domain, existing);
      }
    }

    // Aggregate time stats
    totalActiveTime += data.totalActiveTime || 0;
    productiveTime += data.productiveTime || 0;
    neutralTime += data.neutralTime || 0;
    unproductiveTime += data.unproductiveTime || 0;

    // Aggregate keystrokes
    if (data.keystrokes) {
      totalKeystrokes += data.keystrokes.totalCount || 0;
    }

    // Aggregate mouse activity
    if (data.mouseActivity) {
      totalMouseClicks += data.mouseActivity.clicks || 0;
      totalScrollDistance += data.mouseActivity.scrollDistance || 0;
      totalMovementDistance += data.mouseActivity.movementDistance || 0;
    }
  }

  // Convert maps to arrays and calculate percentages
  const appUsage = Array.from(appUsageMap.entries()).map(([appName, data]) => ({
    appName,
    category: data.category,
    duration: data.duration,
    percentage: 0
  }));

  const totalAppDuration = appUsage.reduce((sum, app) => sum + app.duration, 0);
  appUsage.forEach(app => {
    app.percentage = totalAppDuration > 0 ? Math.round((app.duration / totalAppDuration) * 100) : 0;
  });
  appUsage.sort((a, b) => b.duration - a.duration);

  // Convert website map to array
  const websiteVisits = Array.from(websiteUsageMap.entries()).map(([domain, data]) => ({
    domain,
    url: data.url,
    category: data.category,
    duration: data.duration,
    visitCount: data.visitCount
  }));
  websiteVisits.sort((a, b) => b.duration - a.duration);

  // Format for ProductivitySession model
  const appUsageSummary = appUsage.slice(0, 20).map(app => ({
    appName: app.appName,
    totalDuration: app.duration,
    category: app.category === 'distracting' ? 'unproductive' : app.category,
    percentage: app.percentage
  }));

  const totalWebDuration = websiteVisits.reduce((sum, w) => sum + w.duration, 0);
  const websiteVisitSummary = websiteVisits.slice(0, 20).map(site => ({
    domain: site.domain,
    totalDuration: site.duration,
    visitCount: site.visitCount,
    category: site.category === 'distracting' ? 'unproductive' : site.category,
    percentage: totalWebDuration > 0 ? Math.round((site.duration / totalWebDuration) * 100) : 0
  }));

  // Calculate productivity score
  const effectiveTotalTime = totalActiveTime || totalAppDuration || 1;
  const productivityScore = effectiveTotalTime > 0 
    ? Math.round((productiveTime / effectiveTotalTime) * 100) 
    : 0;

  return {
    userId: session.userId,
    employeeId: session.employeeId,
    sessionStart: session.sessionStart,
    sessionEnd: session.sessionEnd,
    sessionDuration: intervalMinutes,
    status: 'completed',
    
    screenshots: screenshots.slice(0, Math.min(screenshots.length, intervalMinutes)),
    
    appUsageSummary,
    websiteVisitSummary,
    
    keystrokeSummary: {
      totalCount: totalKeystrokes,
      averagePerMinute: intervalMinutes > 0 ? Math.round(totalKeystrokes / intervalMinutes) : 0,
      peakMinute: 0
    },
    
    mouseActivitySummary: {
      totalClicks: totalMouseClicks,
      totalScrollDistance,
      totalMovementDistance
    },
    
    totalActiveTime: totalActiveTime || totalAppDuration,
    productiveTime,
    neutralTime,
    unproductiveTime,
    idleTime: 0,
    
    topApps: appUsage.slice(0, 5).map(a => ({
      appName: a.appName,
      duration: a.duration,
      percentage: a.percentage
    })),
    
    topWebsites: websiteVisits.slice(0, 5).map(w => ({
      domain: w.domain,
      duration: w.duration,
      visits: w.visitCount,
      percentage: totalWebDuration > 0 ? Math.round((w.duration / totalWebDuration) * 100) : 0
    })),
    
    aiAnalysis: {
      summary: generateSessionSummary(appUsage, websiteVisits, screenshots.length, intervalMinutes, productivityScore),
      productivityScore,
      focusScore: calculateFocusScore(appUsage),
      efficiencyScore: calculateEfficiencyScore(totalKeystrokes, totalMouseClicks, intervalMinutes),
      insights: [
        appUsage.length > 0 ? `Most used: ${appUsage[0].appName} (${appUsage[0].percentage}%)` : null,
        websiteVisits.length > 0 ? `Top website: ${websiteVisits[0].domain}` : null,
        productivityScore >= 70 ? 'High productivity session' : null
      ].filter(Boolean),
      recommendations: productivityScore < 50 ? ['Consider using focus mode'] : [],
      areasOfImprovement: [],
      topAchievements: productivityScore >= 70 ? ['High productivity session'] : [],
      analyzedAt: new Date()
    },
    
    captureCount: dataPoints.length,
    sourceDataIds: dataPoints.map(d => d._id).filter(Boolean),
    
    // Mark as migrated
    isMigrated: true,
    migratedAt: new Date()
  };
}

// Process a single user's data
async function processUser(userId, sessionIntervalMinutes, startDate = null) {
  // Build query
  const query = {
    userId: new mongoose.Types.ObjectId(userId),
    status: { $in: ['synced', 'analyzed'] }
  };
  
  if (startDate) {
    query.createdAt = { $gte: startDate };
  }

  // Get raw data
  const rawData = await ProductivityData.find(query)
    .sort({ createdAt: 1 })
    .lean();

  if (rawData.length === 0) {
    return { userId, sessionsCreated: 0, dataProcessed: 0, skipped: true };
  }

  // Group data into sessions
  const sessions = [];
  let currentSession = null;
  let sessionData = [];

  for (const data of rawData) {
    const dataTime = new Date(data.createdAt || data.periodStart);
    
    const sessionStartTime = new Date(
      Math.floor(dataTime.getTime() / (sessionIntervalMinutes * 60 * 1000)) * (sessionIntervalMinutes * 60 * 1000)
    );
    const sessionEndTime = new Date(sessionStartTime.getTime() + sessionIntervalMinutes * 60 * 1000);

    if (!currentSession || sessionStartTime.getTime() !== currentSession.sessionStart.getTime()) {
      if (currentSession && sessionData.length > 0) {
        const aggregated = aggregateSessionData(currentSession, sessionData, sessionIntervalMinutes);
        sessions.push(aggregated);
      }

      currentSession = {
        userId: new mongoose.Types.ObjectId(userId),
        employeeId: data.employeeId || rawData[0].employeeId,
        sessionStart: sessionStartTime,
        sessionEnd: sessionEndTime
      };
      sessionData = [data];
    } else {
      sessionData.push(data);
    }
  }

  // Don't forget the last session
  if (currentSession && sessionData.length > 0) {
    const aggregated = aggregateSessionData(currentSession, sessionData, sessionIntervalMinutes);
    sessions.push(aggregated);
  }

  // Check for existing sessions and skip duplicates
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const session of sessions) {
    const existing = await ProductivitySession.findOne({
      userId: session.userId,
      sessionStart: session.sessionStart
    });

    if (existing) {
      if (!isDryRun) {
        // Update existing session with any additional data
        await ProductivitySession.updateOne(
          { _id: existing._id },
          { $set: session }
        );
        updated++;
      } else {
        skipped++;
      }
    } else {
      if (!isDryRun) {
        await ProductivitySession.create(session);
        created++;
      } else {
        created++; // Count what would be created in dry run
      }
    }
  }

  return {
    userId,
    sessionsCreated: created,
    sessionsUpdated: updated,
    sessionsSkipped: skipped,
    dataProcessed: rawData.length
  };
}

// Main migration function
async function runMigration() {
  await connectDB();
  
  const sessionIntervalMinutes = await getSessionInterval();
  console.log(`📊 Session interval: ${sessionIntervalMinutes} minutes\n`);

  // Build user query
  const userQuery = {
    status: { $in: ['synced', 'analyzed'] }
  };
  
  if (sinceDate) {
    userQuery.createdAt = { $gte: sinceDate };
    console.log(`📅 Processing data since: ${sinceDate.toISOString()}\n`);
  }

  // Get users with data
  let userIds;
  if (specificUserId) {
    userIds = [specificUserId];
    console.log(`👤 Processing specific user: ${specificUserId}\n`);
  } else {
    userIds = await ProductivityData.distinct('userId', userQuery);
    console.log(`👥 Found ${userIds.length} users with productivity data\n`);
  }

  if (userIds.length === 0) {
    console.log('❌ No users found with matching data');
    process.exit(0);
  }

  // Process in batches
  const results = {
    totalUsers: userIds.length,
    processedUsers: 0,
    totalSessionsCreated: 0,
    totalSessionsUpdated: 0,
    totalDataProcessed: 0,
    errors: []
  };

  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ Processing Users...                                           │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  for (let i = 0; i < userIds.length; i += batchSize) {
    const batch = userIds.slice(i, i + batchSize);
    
    for (const userId of batch) {
      try {
        const result = await processUser(userId, sessionIntervalMinutes, sinceDate);
        
        if (!result.skipped) {
          results.processedUsers++;
          results.totalSessionsCreated += result.sessionsCreated;
          results.totalSessionsUpdated += result.sessionsUpdated || 0;
          results.totalDataProcessed += result.dataProcessed;
          
          console.log(`  ✅ User ${userId}: ${result.sessionsCreated} sessions from ${result.dataProcessed} data points`);
        } else {
          console.log(`  ⏭️  User ${userId}: No data to process`);
        }
      } catch (error) {
        console.log(`  ❌ User ${userId}: Error - ${error.message}`);
        results.errors.push({ userId, error: error.message });
      }
    }

    // Progress indicator
    const progress = Math.min(i + batchSize, userIds.length);
    console.log(`\n  📈 Progress: ${progress}/${userIds.length} users (${Math.round(progress/userIds.length*100)}%)\n`);
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      MIGRATION SUMMARY                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN - No actual changes were made\n');
  }
  
  console.log(`  📊 Total Users Processed:    ${results.processedUsers} / ${results.totalUsers}`);
  console.log(`  📁 Sessions Created:         ${results.totalSessionsCreated}`);
  console.log(`  🔄 Sessions Updated:         ${results.totalSessionsUpdated}`);
  console.log(`  📈 Data Points Processed:    ${results.totalDataProcessed}`);
  
  if (results.errors.length > 0) {
    console.log(`\n  ⚠️  Errors: ${results.errors.length}`);
    results.errors.forEach(e => console.log(`     - ${e.userId}: ${e.error}`));
  }
  
  console.log('\n✅ Migration complete!\n');
  
  // Disconnect
  await mongoose.disconnect();
  process.exit(0);
}

// Run the migration
runMigration().catch(error => {
  console.error('❌ Migration failed:', error);
  mongoose.disconnect();
  process.exit(1);
});
