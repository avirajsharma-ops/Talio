import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import ProductivityData from '@/models/ProductivityData';
import ProductivitySession from '@/models/ProductivitySession';
import ProductivitySettings from '@/models/ProductivitySettings';

/**
 * Helper to safely convert to ObjectId
 */
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return id; // Return as-is for other types
}

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
 * @param {string|ObjectId} userId - The user ID to aggregate data for
 * @param {Date} startTime - Start time for aggregation window
 * @param {Date} endTime - End time for aggregation window
 */
export async function aggregateSessionsForUser(userId, startTime = null, endTime = null) {
  await connectDB();

  // Convert userId to ObjectId for consistent querying
  const userObjId = toObjectId(userId);
  if (!userObjId) {
    console.log(`[Session Aggregator] Invalid userId: ${userId}`);
    return [];
  }

  const sessionIntervalMinutes = await getSessionInterval();
  
  // Default to last 24 hours if no time range specified
  const now = new Date();
  if (!endTime) endTime = now;
  if (!startTime) {
    startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  console.log(`[Session Aggregator] Processing user ${userObjId} from ${startTime.toISOString()} to ${endTime.toISOString()}, interval: ${sessionIntervalMinutes} mins`);

  // Get raw productivity data for the time range - use createdAt instead of timestamp
  const rawData = await ProductivityData.find({
    userId: userObjId,
    createdAt: { $gte: startTime, $lte: endTime },
    status: { $in: ['synced', 'analyzed'] }
  }).sort({ createdAt: 1 }).lean();

  if (rawData.length === 0) {
    console.log(`[Session Aggregator] No data found for user ${userObjId}`);
    return [];
  }

  console.log(`[Session Aggregator] Found ${rawData.length} raw data points for user ${userId}`);

  // Group data into session buckets based on session interval
  const sessions = [];
  let currentSession = null;
  let sessionData = [];

  for (const data of rawData) {
    // Use createdAt or periodStart as the data timestamp
    const dataTime = new Date(data.createdAt || data.periodStart);
    
    // Calculate session boundaries based on the configured interval
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

      // Start new session - use userObjId for consistent ObjectId type
      currentSession = {
        userId: userObjId,
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

  console.log(`[Session Aggregator] Created ${sessions.length} sessions for user ${userId}`);
  return sessions;
}

/**
 * Aggregate data points into a single session
 * This function properly extracts data from ProductivityData schema
 */
function aggregateSessionData(session, dataPoints, intervalMinutes) {
  // Collect all screenshots from the data points
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
    // Add screenshot if present (from ProductivityData schema)
    if (data.screenshot?.data || data.screenshot?.url) {
      screenshots.push({
        capturedAt: data.screenshot.capturedAt || data.createdAt || data.periodStart,
        thumbnail: data.screenshot.data || data.screenshot.url,
        fullData: data.screenshot.data || data.screenshot.url,
        captureType: data.screenshot.captureType || 'periodic',
        linkedDataId: data._id
      });
    }

    // Aggregate app usage from appUsage array (ProductivityData schema)
    if (data.appUsage && Array.isArray(data.appUsage)) {
      for (const app of data.appUsage) {
        const appName = app.appName || 'Unknown';
        const existing = appUsageMap.get(appName) || { 
          duration: 0, 
          count: 0,
          category: app.category || 'unknown'
        };
        existing.duration += app.duration || 0;
        existing.count += 1;
        // Update category if we have a better one
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

    // Aggregate website visits (from ProductivityData schema)
    if (data.websiteVisits && Array.isArray(data.websiteVisits)) {
      for (const site of data.websiteVisits) {
        const domain = site.domain || site.url || 'Unknown';
        const existing = websiteUsageMap.get(domain) || { 
          duration: 0, 
          visitCount: 0, 
          url: site.url,
          category: site.category || 'unknown'
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

    // Aggregate time stats from ProductivityData
    totalActiveTime += data.totalActiveTime || 0;
    productiveTime += data.productiveTime || 0;
    neutralTime += data.neutralTime || 0;
    unproductiveTime += data.unproductiveTime || 0;

    // Aggregate keystrokes (ProductivityData schema)
    if (data.keystrokes) {
      totalKeystrokes += data.keystrokes.totalCount || 0;
    }

    // Aggregate mouse activity (ProductivityData schema)
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

  // Calculate percentages for apps
  const totalAppDuration = appUsage.reduce((sum, app) => sum + app.duration, 0);
  appUsage.forEach(app => {
    app.percentage = totalAppDuration > 0 ? Math.round((app.duration / totalAppDuration) * 100) : 0;
  });

  // Sort by duration descending
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

  // Format for ProductivitySession model schema
  const appUsageSummary = appUsage.slice(0, 20).map(app => ({
    appName: app.appName,
    totalDuration: app.duration,
    category: app.category === 'distracting' ? 'unproductive' : app.category,
    percentage: app.percentage
  }));

  // Calculate website percentages
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
    
    // Screenshots - limit to reasonable number per session
    screenshots: screenshots.slice(0, Math.min(screenshots.length, intervalMinutes)), // Max 1 per minute
    
    // Aggregated summaries matching model schema
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
    
    // Time aggregations
    totalActiveTime: totalActiveTime || totalAppDuration,
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
      percentage: totalWebDuration > 0 ? Math.round((w.duration / totalWebDuration) * 100) : 0
    })),
    
    // AI Analysis
    aiAnalysis: {
      summary: generateSessionSummary(appUsage, websiteVisits, screenshots.length, intervalMinutes, productivityScore),
      productivityScore,
      focusScore: calculateFocusScore(appUsage),
      efficiencyScore: calculateEfficiencyScore(totalKeystrokes, totalMouseClicks, intervalMinutes),
      insights: generateInsights(appUsage, websiteVisits, productivityScore),
      recommendations: generateRecommendations(appUsage, productivityScore),
      areasOfImprovement: [],
      topAchievements: productivityScore >= 70 ? ['High productivity session'] : [],
      analyzedAt: new Date()
    },
    
    captureCount: dataPoints.length,
    sourceDataIds: dataPoints.map(d => d._id).filter(Boolean)
  };
}

/**
 * Generate insights based on session data
 */
function generateInsights(appUsage, websiteVisits, productivityScore) {
  const insights = [];
  
  if (appUsage.length > 0) {
    insights.push(`Most used: ${appUsage[0].appName} (${appUsage[0].percentage}%)`);
  }
  
  if (websiteVisits.length > 0) {
    insights.push(`Top website: ${websiteVisits[0].domain} (${websiteVisits[0].visitCount} visits)`);
  }
  
  if (productivityScore >= 70) {
    insights.push('Excellent focus on productive work');
  } else if (productivityScore >= 50) {
    insights.push('Good balance of work activities');
  }
  
  return insights;
}

/**
 * Generate recommendations
 */
function generateRecommendations(appUsage, productivityScore) {
  const recommendations = [];
  
  if (productivityScore < 50) {
    recommendations.push('Consider using focus mode to reduce distractions');
  }
  
  if (appUsage.length > 5) {
    recommendations.push('Try to focus on fewer applications at once');
  }
  
  recommendations.push('Take regular breaks every 90 minutes');
  
  return recommendations;
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
function generateSessionSummary(appUsage, websiteVisits, screenshotCount, intervalMinutes, productivityScore) {
  if (appUsage.length === 0) {
    return 'No significant activity detected during this session.';
  }

  const topApp = appUsage[0];
  const topApps = appUsage.slice(0, 3).map(a => a.appName).join(', ');
  
  let summary = `${intervalMinutes || 30}-minute session with ${productivityScore || 0}% productivity. `;
  summary += `Primary focus on ${topApp.appName} (${topApp.percentage}% of time). `;
  
  if (appUsage.length > 1) {
    summary += `Also used: ${topApps}. `;
  }

  if (websiteVisits.length > 0) {
    summary += `Visited ${websiteVisits.length} websites. `;
  }

  if (screenshotCount > 0) {
    summary += `${screenshotCount} screenshots captured.`;
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
    try {
      // Ensure userId is ObjectId
      const userObjId = toObjectId(session.userId);
      if (!userObjId) {
        console.error(`[Session Aggregator] Invalid userId in session:`, session.userId);
        continue;
      }
      
      // Check if session already exists
      const existing = await ProductivitySession.findOne({
        userId: userObjId,
        sessionStart: session.sessionStart
      });

      if (existing) {
        // Update existing session
        Object.assign(existing, { ...session, userId: userObjId });
        await existing.save();
        savedSessions.push(existing);
        console.log(`[Session Aggregator] Updated session ${existing._id}`);
      } else {
        // Create new session
        const newSession = new ProductivitySession({ ...session, userId: userObjId });
        await newSession.save();
        savedSessions.push(newSession);
        console.log(`[Session Aggregator] Created session ${newSession._id} for user ${userObjId}`);
      }
    } catch (err) {
      console.error(`[Session Aggregator] Error saving session:`, err.message);
    }
  }

  return savedSessions;
}

/**
 * Process all pending users and aggregate their sessions
 */
export async function processAllPendingSessions() {
  await connectDB();

  // Find all users with productivity data that hasn't been processed into sessions
  // Look for data created in the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const usersWithData = await ProductivityData.distinct('userId', {
    createdAt: { $gte: yesterday },
    status: { $in: ['synced', 'analyzed'] }
  });

  console.log(`[Session Aggregator] Found ${usersWithData.length} users with recent data`);

  const results = [];
  
  for (const userId of usersWithData) {
    try {
      // Get time range of recent data
      const oldestData = await ProductivityData.findOne({ 
        userId, 
        createdAt: { $gte: yesterday },
        status: { $in: ['synced', 'analyzed'] }
      }).sort({ createdAt: 1 }).select('createdAt');
      
      const newestData = await ProductivityData.findOne({ 
        userId, 
        createdAt: { $gte: yesterday },
        status: { $in: ['synced', 'analyzed'] }
      }).sort({ createdAt: -1 }).select('createdAt');

      if (!oldestData || !newestData) continue;

      // Aggregate sessions
      const sessions = await aggregateSessionsForUser(
        userId,
        oldestData.createdAt,
        newestData.createdAt
      );

      // Save sessions
      const saved = await saveAggregatedSessions(sessions);

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
