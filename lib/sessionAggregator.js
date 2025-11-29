import connectDB from '@/lib/mongodb';
import ProductivityData from '@/models/ProductivityData';
import ProductivitySession from '@/models/ProductivitySession';
import ProductivitySettings from '@/models/ProductivitySettings';

/**
 * Get session interval from settings (defaults to 30 minutes)
 */
async function getSessionInterval() {
  try {
    const settings = await ProductivitySettings.findOne();
    // Use screenshot interval as session interval (in minutes)
    return settings?.screenshotInterval || 30;
  } catch (error) {
    console.error('[Session Aggregator] Error fetching settings:', error);
    return 30; // Default to 30 minutes
  }
}

/**
 * Aggregate raw productivity data into sessions for a user
 * @param {string} userId - The user ID to aggregate data for
 * @param {Date} startTime - Start time for aggregation window
 * @param {Date} endTime - End time for aggregation window
 */
export async function aggregateSessionsForUser(userId, startTime = null, endTime = null) {
  await connectDB();

  const sessionIntervalMinutes = await getSessionInterval();
  
  // Default to last 24 hours if no time range specified
  const now = new Date();
  if (!endTime) endTime = now;
  if (!startTime) {
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  console.log(`[Session Aggregator] Processing user ${userId} from ${startTime} to ${endTime}`);

  // Get raw productivity data for the time range
  const rawData = await ProductivityData.find({
    userId,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 }).lean();

  if (rawData.length === 0) {
    console.log(`[Session Aggregator] No data found for user ${userId}`);
    return [];
  }

  // Group data into session buckets
  const sessions = [];
  let currentSession = null;
  let sessionData = [];

  for (const data of rawData) {
    const dataTime = new Date(data.timestamp);
    
    // Calculate session boundaries
    const sessionStartTime = new Date(
      Math.floor(dataTime.getTime() / (sessionIntervalMinutes * 60 * 1000)) * (sessionIntervalMinutes * 60 * 1000)
    );
    const sessionEndTime = new Date(sessionStartTime.getTime() + sessionIntervalMinutes * 60 * 1000);

    // Check if this data belongs to current session
    if (!currentSession || sessionStartTime.getTime() !== currentSession.sessionStart.getTime()) {
      // Save previous session if exists
      if (currentSession && sessionData.length > 0) {
        const aggregated = aggregateSessionData(currentSession, sessionData, sessionIntervalMinutes);
        sessions.push(aggregated);
      }

      // Start new session
      currentSession = {
        userId,
        employeeId: rawData[0].employeeId,
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

  console.log(`[Session Aggregator] Created ${sessions.length} sessions for user ${userId}`);
  return sessions;
}

/**
 * Aggregate data points into a single session
 */
function aggregateSessionData(session, dataPoints, intervalMinutes) {
  // Collect all screenshots
  const screenshots = [];
  const appUsageMap = new Map();
  const websiteUsageMap = new Map();
  let totalKeystrokes = 0;
  let totalMouseClicks = 0;
  let totalScrollEvents = 0;

  for (const data of dataPoints) {
    // Add screenshot if present
    if (data.screenshotUrl || data.screenshot) {
      screenshots.push({
        url: data.screenshotUrl || data.screenshot,
        capturedAt: data.timestamp,
        thumbnailUrl: data.thumbnailUrl || data.screenshotUrl || data.screenshot,
        context: {
          activeWindow: data.activeWindow,
          activeApp: data.activeApp
        }
      });
    }

    // Aggregate app usage
    if (data.activeApp) {
      const existing = appUsageMap.get(data.activeApp) || { duration: 0, count: 0 };
      existing.duration += data.duration || 1;
      existing.count += 1;
      appUsageMap.set(data.activeApp, existing);
    }

    // Aggregate app usage from array if present
    if (data.apps && Array.isArray(data.apps)) {
      for (const app of data.apps) {
        const existing = appUsageMap.get(app.name) || { duration: 0, count: 0 };
        existing.duration += app.duration || 1;
        existing.count += 1;
        appUsageMap.set(app.name, existing);
      }
    }

    // Aggregate website visits
    if (data.activeUrl || data.url) {
      const url = data.activeUrl || data.url;
      try {
        const domain = new URL(url).hostname;
        const existing = websiteUsageMap.get(domain) || { duration: 0, visitCount: 0, url };
        existing.duration += data.duration || 1;
        existing.visitCount += 1;
        websiteUsageMap.set(domain, existing);
      } catch (e) {
        // Invalid URL, skip
      }
    }

    // Aggregate browser history if present
    if (data.browserHistory && Array.isArray(data.browserHistory)) {
      for (const visit of data.browserHistory) {
        try {
          const domain = new URL(visit.url).hostname;
          const existing = websiteUsageMap.get(domain) || { duration: 0, visitCount: 0, url: visit.url };
          existing.duration += visit.duration || 1;
          existing.visitCount += 1;
          websiteUsageMap.set(domain, existing);
        } catch (e) {
          // Invalid URL
        }
      }
    }

    // Aggregate input metrics
    totalKeystrokes += data.keystrokes || data.keystrokeCount || 0;
    totalMouseClicks += data.mouseClicks || data.clickCount || 0;
    totalScrollEvents += data.scrollEvents || 0;
  }

  // Convert maps to arrays
  const appUsage = Array.from(appUsageMap.entries()).map(([appName, data]) => ({
    appName,
    category: categorizeApp(appName),
    duration: data.duration,
    percentage: 0 // Will be calculated below
  }));

  // Calculate percentages
  const totalAppDuration = appUsage.reduce((sum, app) => sum + app.duration, 0);
  appUsage.forEach(app => {
    app.percentage = totalAppDuration > 0 ? Math.round((app.duration / totalAppDuration) * 100) : 0;
  });

  // Sort by duration descending
  appUsage.sort((a, b) => b.duration - a.duration);

  const websiteVisits = Array.from(websiteUsageMap.entries()).map(([domain, data]) => ({
    domain,
    url: data.url,
    category: categorizeWebsite(domain),
    duration: data.duration,
    visitCount: data.visitCount
  }));

  websiteVisits.sort((a, b) => b.duration - a.duration);

  // Calculate basic productivity metrics
  const productiveApps = appUsage.filter(a => a.category === 'productive');
  const productiveTime = productiveApps.reduce((sum, a) => sum + a.duration, 0);
  const productivityScore = totalAppDuration > 0 
    ? Math.round((productiveTime / totalAppDuration) * 100) 
    : 0;

  // Calculate time breakdowns
  const neutralApps = appUsage.filter(a => a.category === 'neutral');
  const distractingApps = appUsage.filter(a => a.category === 'distracting');
  const neutralTime = neutralApps.reduce((sum, a) => sum + a.duration, 0);
  const unproductiveTime = distractingApps.reduce((sum, a) => sum + a.duration, 0);

  // Format for model schema
  const appUsageSummary = appUsage.slice(0, 20).map(app => ({
    appName: app.appName,
    totalDuration: app.duration,
    category: app.category === 'distracting' ? 'unproductive' : app.category,
    percentage: app.percentage
  }));

  const websiteVisitSummary = websiteVisits.slice(0, 20).map(site => ({
    domain: site.domain,
    totalDuration: site.duration,
    visitCount: site.visitCount,
    category: site.category === 'distracting' ? 'unproductive' : site.category,
    percentage: 0
  }));

  // Calculate website percentages
  const totalWebDuration = websiteVisitSummary.reduce((sum, w) => sum + w.totalDuration, 0);
  websiteVisitSummary.forEach(w => {
    w.percentage = totalWebDuration > 0 ? Math.round((w.totalDuration / totalWebDuration) * 100) : 0;
  });

  return {
    userId: session.userId,
    employeeId: session.employeeId,
    sessionStart: session.sessionStart,
    sessionEnd: session.sessionEnd,
    sessionDuration: intervalMinutes,
    status: 'completed',
    
    // Screenshots with proper structure
    screenshots: screenshots.map(s => ({
      capturedAt: s.capturedAt,
      thumbnail: s.thumbnailUrl || s.url,
      fullData: s.url,
      captureType: 'periodic'
    })),
    
    // Aggregated summaries matching model schema
    appUsageSummary,
    websiteVisitSummary,
    
    keystrokeSummary: {
      totalCount: totalKeystrokes,
      averagePerMinute: Math.round(totalKeystrokes / intervalMinutes),
      peakMinute: 0
    },
    
    mouseActivitySummary: {
      totalClicks: totalMouseClicks,
      totalScrollDistance: totalScrollEvents * 100, // Approximate
      totalMovementDistance: 0
    },
    
    // Time aggregations
    totalActiveTime: totalAppDuration,
    productiveTime,
    neutralTime,
    unproductiveTime,
    idleTime: 0,
    
    // Top apps/websites for quick display
    topApps: appUsage.slice(0, 5).map(a => ({
      appName: a.appName,
      duration: a.duration,
      percentage: a.percentage
    })),
    
    topWebsites: websiteVisits.slice(0, 5).map(w => ({
      domain: w.domain,
      duration: w.duration,
      visits: w.visitCount,
      percentage: 0
    })),
    
    // AI Analysis
    aiAnalysis: {
      summary: generateSessionSummary(appUsage, websiteVisits, screenshots.length),
      productivityScore,
      focusScore: calculateFocusScore(appUsage),
      efficiencyScore: calculateEfficiencyScore(totalKeystrokes, totalMouseClicks, intervalMinutes),
      insights: [],
      recommendations: [],
      areasOfImprovement: [],
      topAchievements: [],
      analyzedAt: new Date()
    },
    
    captureCount: dataPoints.length,
    sourceDataIds: dataPoints.map(d => d._id).filter(Boolean)
  };
}

/**
 * Categorize an app as productive, neutral, or distracting
 */
function categorizeApp(appName) {
  const name = appName.toLowerCase();
  
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

  if (productivePatterns.some(p => name.includes(p))) {
    return 'productive';
  }
  if (distractingPatterns.some(p => name.includes(p))) {
    return 'distracting';
  }
  return 'neutral';
}

/**
 * Categorize a website
 */
function categorizeWebsite(domain) {
  const d = domain.toLowerCase();
  
  const productiveDomains = [
    'github.com', 'gitlab.com', 'bitbucket.org',
    'stackoverflow.com', 'developer.', 'docs.',
    'notion.so', 'figma.com', 'miro.com',
    'atlassian.', 'jira.', 'confluence.',
    'slack.com', 'teams.microsoft.com',
    'google.com/docs', 'google.com/sheets', 'google.com/slides',
    'aws.amazon.com', 'console.cloud.google.com', 'portal.azure.com',
    'vercel.com', 'netlify.com', 'heroku.com'
  ];

  const distractingDomains = [
    'youtube.com', 'netflix.com', 'twitch.tv',
    'twitter.com', 'facebook.com', 'instagram.com', 'tiktok.com',
    'reddit.com', 'discord.com',
    'spotify.com', 'soundcloud.com'
  ];

  if (productiveDomains.some(p => d.includes(p))) {
    return 'productive';
  }
  if (distractingDomains.some(p => d.includes(p))) {
    return 'distracting';
  }
  return 'neutral';
}

/**
 * Calculate focus score based on app switching frequency
 */
function calculateFocusScore(appUsage) {
  if (appUsage.length === 0) return 0;
  
  // Fewer app switches = higher focus
  // If using mostly 1-3 apps, high focus
  // If using many apps briefly, low focus
  
  const totalApps = appUsage.length;
  const topAppPercentage = appUsage[0]?.percentage || 0;
  
  if (totalApps <= 3 && topAppPercentage >= 50) return 90;
  if (totalApps <= 5 && topAppPercentage >= 30) return 70;
  if (totalApps <= 8) return 50;
  return 30;
}

/**
 * Calculate efficiency score based on activity level
 */
function calculateEfficiencyScore(keystrokes, clicks, minutes) {
  const totalActions = keystrokes + clicks;
  const actionsPerMinute = totalActions / minutes;
  
  // Reasonable activity: 20-100 actions per minute
  if (actionsPerMinute >= 20 && actionsPerMinute <= 100) return 85;
  if (actionsPerMinute >= 10 && actionsPerMinute < 20) return 70;
  if (actionsPerMinute > 100 && actionsPerMinute <= 150) return 75;
  if (actionsPerMinute >= 5 && actionsPerMinute < 10) return 50;
  if (actionsPerMinute > 150) return 60; // Too much might indicate issues
  return 30; // Very low activity
}

/**
 * Categorize overall session activity
 */
function categorizeSessionActivity(appUsage, websiteVisits) {
  const categories = {
    development: 0,
    communication: 0,
    research: 0,
    design: 0,
    documentation: 0,
    entertainment: 0,
    other: 0
  };

  for (const app of appUsage) {
    const name = app.appName.toLowerCase();
    if (name.includes('code') || name.includes('terminal') || name.includes('studio')) {
      categories.development += app.percentage;
    } else if (name.includes('slack') || name.includes('teams') || name.includes('zoom') || name.includes('mail')) {
      categories.communication += app.percentage;
    } else if (name.includes('chrome') || name.includes('firefox') || name.includes('safari')) {
      categories.research += app.percentage;
    } else if (name.includes('figma') || name.includes('sketch') || name.includes('adobe')) {
      categories.design += app.percentage;
    } else if (name.includes('word') || name.includes('notion') || name.includes('docs')) {
      categories.documentation += app.percentage;
    } else if (app.category === 'distracting') {
      categories.entertainment += app.percentage;
    } else {
      categories.other += app.percentage;
    }
  }

  return categories;
}

/**
 * Generate session summary text
 */
function generateSessionSummary(appUsage, websiteVisits, screenshotCount) {
  if (appUsage.length === 0) {
    return 'No significant activity detected during this session.';
  }

  const topApp = appUsage[0];
  const topApps = appUsage.slice(0, 3).map(a => a.appName).join(', ');
  
  let summary = `Primary focus on ${topApp.appName} (${topApp.percentage}% of time). `;
  
  if (appUsage.length > 1) {
    summary += `Also used: ${topApps}. `;
  }

  const productivePercentage = appUsage
    .filter(a => a.category === 'productive')
    .reduce((sum, a) => sum + a.percentage, 0);

  if (productivePercentage >= 70) {
    summary += 'Highly productive session.';
  } else if (productivePercentage >= 40) {
    summary += 'Moderately productive session.';
  } else {
    summary += 'Session had limited productive activity.';
  }

  return summary;
}

/**
 * Generate warnings for concerning patterns
 */
function generateWarnings(appUsage, websiteVisits) {
  const warnings = [];

  const distractingPercentage = appUsage
    .filter(a => a.category === 'distracting')
    .reduce((sum, a) => sum + a.percentage, 0);

  if (distractingPercentage >= 30) {
    warnings.push({
      type: 'high_distraction',
      message: `${distractingPercentage}% of time spent on distracting apps`
    });
  }

  const distractingWebsites = websiteVisits.filter(w => w.category === 'distracting');
  if (distractingWebsites.length >= 3) {
    warnings.push({
      type: 'excessive_browsing',
      message: 'Multiple non-work websites visited'
    });
  }

  return warnings;
}

/**
 * Save aggregated sessions to database
 */
export async function saveAggregatedSessions(sessions) {
  await connectDB();
  
  const savedSessions = [];
  
  for (const session of sessions) {
    // Check if session already exists
    const existing = await ProductivitySession.findOne({
      userId: session.userId,
      sessionStart: session.sessionStart
    });

    if (existing) {
      // Update existing session
      Object.assign(existing, session);
      await existing.save();
      savedSessions.push(existing);
    } else {
      // Create new session
      const newSession = new ProductivitySession(session);
      await newSession.save();
      savedSessions.push(newSession);
    }
  }

  return savedSessions;
}

/**
 * Process all pending users and aggregate their sessions
 */
export async function processAllPendingSessions() {
  await connectDB();

  // Find all users with unprocessed productivity data
  const usersWithData = await ProductivityData.distinct('userId', {
    processed: { $ne: true }
  });

  console.log(`[Session Aggregator] Found ${usersWithData.length} users with pending data`);

  const results = [];
  
  for (const userId of usersWithData) {
    try {
      // Get time range of unprocessed data
      const oldestData = await ProductivityData.findOne({ 
        userId, 
        processed: { $ne: true } 
      }).sort({ timestamp: 1 }).select('timestamp');
      
      const newestData = await ProductivityData.findOne({ 
        userId, 
        processed: { $ne: true } 
      }).sort({ timestamp: -1 }).select('timestamp');

      if (!oldestData || !newestData) continue;

      // Aggregate sessions
      const sessions = await aggregateSessionsForUser(
        userId,
        oldestData.timestamp,
        newestData.timestamp
      );

      // Save sessions
      const saved = await saveAggregatedSessions(sessions);
      
      // Mark raw data as processed
      await ProductivityData.updateMany(
        { 
          userId,
          timestamp: { $gte: oldestData.timestamp, $lte: newestData.timestamp }
        },
        { $set: { processed: true } }
      );

      results.push({
        userId,
        sessionsCreated: saved.length,
        success: true
      });

    } catch (error) {
      console.error(`[Session Aggregator] Error processing user ${userId}:`, error);
      results.push({
        userId,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}
