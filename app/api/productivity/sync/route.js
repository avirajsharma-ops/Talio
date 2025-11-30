import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import { analyzeProductivityData } from '@/lib/productivityAnalyzer';
import { aggregateSessionsForUser, saveAggregatedSessions } from '@/lib/sessionAggregator';
import { quickCompress } from '@/lib/imageCompression';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Categorize apps into productive/neutral/unproductive
const categorizeApp = (appName) => {
  const lower = appName.toLowerCase();
  
  // Productive apps
  const productiveApps = [
    'code', 'visual studio', 'vscode', 'webstorm', 'intellij', 'pycharm', 'sublime', 'atom',
    'terminal', 'iterm', 'powershell', 'cmd',
    'excel', 'word', 'powerpoint', 'google docs', 'google sheets', 'notion', 'obsidian',
    'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'premiere',
    'slack', 'teams', 'zoom', 'meet', 'webex',
    'jira', 'asana', 'trello', 'monday', 'linear', 'github', 'gitlab', 'bitbucket',
    'postman', 'insomnia', 'docker', 'kubernetes'
  ];
  
  // Unproductive apps
  const unproductiveApps = [
    'netflix', 'youtube', 'twitch', 'spotify', 'apple music', 'vlc', 'quicktime',
    'facebook', 'instagram', 'twitter', 'tiktok', 'snapchat',
    'discord', 'telegram', 'whatsapp',
    'steam', 'epic games', 'battle.net', 'origin'
  ];
  
  if (productiveApps.some(app => lower.includes(app))) return 'productive';
  if (unproductiveApps.some(app => lower.includes(app))) return 'unproductive';
  return 'neutral';
};

// Categorize websites
const categorizeWebsite = (domain) => {
  if (!domain) return 'unknown';
  const lower = domain.toLowerCase();
  
  const productiveDomains = [
    'github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
    'docs.google.com', 'notion.so', 'figma.com', 'linear.app',
    'jira.atlassian.com', 'trello.com', 'asana.com', 'monday.com',
    'slack.com', 'zoom.us', 'meet.google.com', 'teams.microsoft.com',
    'aws.amazon.com', 'console.cloud.google.com', 'portal.azure.com',
    'vercel.com', 'netlify.com', 'heroku.com', 'digitalocean.com',
    'npmjs.com', 'pypi.org', 'hub.docker.com', 'medium.com', 'dev.to'
  ];
  
  const unproductiveDomains = [
    'youtube.com', 'netflix.com', 'twitch.tv', 'reddit.com',
    'facebook.com', 'instagram.com', 'twitter.com', 'tiktok.com',
    'discord.com', 'snapchat.com', 'pinterest.com', 'tumblr.com',
    'amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com'
  ];
  
  if (productiveDomains.some(d => lower.includes(d))) return 'productive';
  if (unproductiveDomains.some(d => lower.includes(d))) return 'unproductive';
  return 'neutral';
};

// POST - Desktop app syncs productivity data
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      screenshot,        // Base64 screenshot data
      appUsage,          // Array of { appName, windowTitle, duration, startTime, endTime }
      websiteVisits,     // Array of { url, title, duration, visitTime }
      keystrokes,        // { totalCount, hourlyBreakdown }
      mouseActivity,     // { clicks, scrollDistance, movementDistance }
      periodStart,       // When data collection started
      periodEnd,         // When data collection ended
      deviceInfo,        // { platform, hostname, osVersion }
      isInstantCapture,  // Whether this is an instant fetch response
      instantRequestId   // ID of instant fetch request if applicable
    } = body;

    // Get user and employee info
    const user = await User.findById(decoded.userId).select('employeeId');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Try to get employee by user.employeeId first, then by userId field in Employee
    let employee = null;
    if (user.employeeId) {
      employee = await Employee.findById(user.employeeId).select('_id department firstName lastName');
    }
    if (!employee) {
      employee = await Employee.findOne({ userId: decoded.userId }).select('_id department firstName lastName');
    }
    
    console.log(`[Productivity Sync] User ${decoded.userId} -> Employee ${employee?._id} (${employee?.firstName} ${employee?.lastName})`);

    // Process app usage with categorization
    const processedAppUsage = (appUsage || []).map(app => ({
      ...app,
      category: categorizeApp(app.appName || '')
    }));

    // Process website visits with categorization
    const processedWebsites = (websiteVisits || []).map(site => {
      let domain = '';
      try {
        domain = new URL(site.url).hostname;
      } catch (e) {
        domain = site.url;
      }
      return {
        ...site,
        domain,
        category: categorizeWebsite(domain)
      };
    });

    // Calculate time distributions
    let productiveTime = 0;
    let neutralTime = 0;
    let unproductiveTime = 0;
    let totalActiveTime = 0;

    processedAppUsage.forEach(app => {
      const duration = app.duration || 0;
      totalActiveTime += duration;
      if (app.category === 'productive') productiveTime += duration;
      else if (app.category === 'unproductive') unproductiveTime += duration;
      else neutralTime += duration;
    });

    // Calculate top apps
    const appDurations = {};
    processedAppUsage.forEach(app => {
      if (!appDurations[app.appName]) appDurations[app.appName] = 0;
      appDurations[app.appName] += app.duration || 0;
    });
    
    const topApps = Object.entries(appDurations)
      .map(([appName, duration]) => ({
        appName,
        duration,
        percentage: totalActiveTime > 0 ? Math.round((duration / totalActiveTime) * 100) : 0
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Calculate top websites
    const websiteDurations = {};
    const websiteVisitCounts = {};
    processedWebsites.forEach(site => {
      if (!websiteDurations[site.domain]) {
        websiteDurations[site.domain] = 0;
        websiteVisitCounts[site.domain] = 0;
      }
      websiteDurations[site.domain] += site.duration || 0;
      websiteVisitCounts[site.domain]++;
    });

    const totalWebsiteTime = Object.values(websiteDurations).reduce((a, b) => a + b, 0);
    const topWebsites = Object.entries(websiteDurations)
      .map(([domain, duration]) => ({
        domain,
        duration,
        visits: websiteVisitCounts[domain],
        percentage: totalWebsiteTime > 0 ? Math.round((duration / totalWebsiteTime) * 100) : 0
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);

    // Compress screenshot before saving (if present)
    let screenshotData = null;
    let thumbnailData = null;
    if (screenshot) {
      try {
        const compressed = await quickCompress(screenshot);
        screenshotData = compressed.fullData;
        thumbnailData = compressed.thumbnail;
        console.log(`[Productivity Sync] Screenshot compressed: ${compressed.compressionRatio}% reduction`);
      } catch (compressError) {
        console.error('[Productivity Sync] Screenshot compression failed, using original:', compressError.message);
        screenshotData = screenshot;
        thumbnailData = screenshot;
      }
    }

    // Create productivity data record
    const productivityData = new ProductivityData({
      userId: decoded.userId,
      employeeId: employee?._id,
      periodStart: periodStart || new Date(Date.now() - 30 * 60 * 1000), // Default 30 min ago
      periodEnd: periodEnd || new Date(),
      screenshot: screenshotData ? {
        data: screenshotData,
        thumbnail: thumbnailData,
        capturedAt: new Date(),
        captureType: isInstantCapture ? 'instant' : 'periodic'
      } : undefined,
      appUsage: processedAppUsage,
      totalActiveTime,
      topApps,
      websiteVisits: processedWebsites,
      topWebsites,
      keystrokes: keystrokes || { totalCount: 0 },
      mouseActivity: mouseActivity || {},
      productiveTime,
      neutralTime,
      unproductiveTime,
      deviceInfo,
      isInstantCapture: !!isInstantCapture,
      isBackfill: false,
      status: 'synced'
    });

    await productivityData.save();

    console.log(`[Productivity Sync] Data received from user ${decoded.userId}, apps: ${processedAppUsage.length}, websites: ${processedWebsites.length}`);

    // Upload screenshot to Cloudinary in background if present
    if (screenshot) {
      processScreenshotAsync(productivityData._id, screenshot);
    }

    // Trigger AI analysis in background
    analyzeProductivityAsync(productivityData._id);

    // Trigger session aggregation in background
    triggerSessionAggregation(decoded.userId, employee?._id);

    // If this is a response to an instant fetch request, update the request
    if (instantRequestId) {
      try {
        const { MayaScreenSummary } = await import('@/models/MayaScreenSummary');
        await MayaScreenSummary.findByIdAndUpdate(instantRequestId, {
          status: 'captured',
          linkedProductivityData: productivityData._id
        });
      } catch (e) {
        console.error('[Productivity Sync] Failed to update instant request:', e);
      }
    }

    // Emit socket event for real-time updates
    if (global.io) {
      global.io.to(`user:${decoded.userId}`).emit('productivity-synced', {
        dataId: productivityData._id,
        timestamp: new Date().toISOString()
      });
      
      // Notify admins/department heads
      global.io.emit('employee-productivity-update', {
        userId: decoded.userId,
        employeeId: employee?._id,
        dataId: productivityData._id,
        productiveTime,
        totalActiveTime,
        isInstant: isInstantCapture
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Productivity data synced successfully',
      data: {
        id: productivityData._id,
        productiveTime,
        neutralTime,
        unproductiveTime,
        totalActiveTime,
        appsTracked: processedAppUsage.length,
        websitesTracked: processedWebsites.length
      }
    });

  } catch (error) {
    console.error('[Productivity Sync] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to sync productivity data' 
    }, { status: 500 });
  }
}

// GET - Retrieve productivity data for user
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const query = {};
    
    // Check user permissions
    const requester = await User.findById(decoded.userId).select('role employeeId');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    if (userId && isAdmin) {
      query.userId = userId;
    } else {
      // Users can only see their own data unless admin
      query.userId = decoded.userId;
    }

    if (startDate) {
      query.periodStart = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.periodEnd = { ...(query.periodEnd || {}), $lte: new Date(endDate) };
    }

    const data = await ProductivityData.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('employeeId', 'firstName lastName employeeCode designation')
      .lean();

    // Aggregate stats
    const stats = {
      totalRecords: data.length,
      totalProductiveTime: data.reduce((sum, d) => sum + (d.productiveTime || 0), 0),
      totalNeutralTime: data.reduce((sum, d) => sum + (d.neutralTime || 0), 0),
      totalUnproductiveTime: data.reduce((sum, d) => sum + (d.unproductiveTime || 0), 0),
      totalActiveTime: data.reduce((sum, d) => sum + (d.totalActiveTime || 0), 0),
      averageProductivityScore: data.length > 0 
        ? Math.round(data.reduce((sum, d) => sum + (d.aiAnalysis?.productivityScore || 0), 0) / data.length)
        : 0
    };

    return NextResponse.json({
      success: true,
      data,
      stats
    });

  } catch (error) {
    console.error('[Productivity Data] GET Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch productivity data' 
    }, { status: 500 });
  }
}

// Process screenshot in background (stores in DB, no external upload)
async function processScreenshotAsync(dataId, screenshotData) {
  try {
    // Screenshot is already stored as base64 in the database
    // This function is kept for potential future cloud storage integration
    console.log(`[Productivity] Screenshot stored for ${dataId}`);
    
    // Optional: If you want to upload to external storage (S3, Cloudinary, etc.)
    // you can add that integration here. For now, base64 in MongoDB is sufficient
    // for the screenshot viewing functionality.
  } catch (error) {
    console.error('[Productivity] Screenshot processing error:', error);
  }
}

// Run AI analysis in background
async function analyzeProductivityAsync(dataId) {
  try {
    await connectDB();
    
    const data = await ProductivityData.findById(dataId);
    if (!data) {
      console.error('[Productivity] AI analysis: Data not found for', dataId);
      return;
    }

    console.log(`[Productivity] Starting AI analysis for ${dataId}...`);
    
    let analysis;
    try {
      analysis = await analyzeProductivityData(data);
    } catch (aiError) {
      console.error('[Productivity] AI analysis API error:', aiError.message);
      // Generate fallback analysis if AI fails
      analysis = generateFallbackAnalysis(data);
    }

    await ProductivityData.findByIdAndUpdate(dataId, {
      aiAnalysis: {
        summary: analysis.summary,
        productivityScore: analysis.productivityScore,
        focusScore: analysis.focusScore,
        efficiencyScore: analysis.efficiencyScore,
        insights: analysis.insights || [],
        recommendations: analysis.recommendations || [],
        areasOfImprovement: analysis.areasOfImprovement || [],
        topAchievements: analysis.topAchievements || [],
        analyzedAt: new Date()
      },
      status: 'analyzed'
    });

    console.log(`[Productivity] AI analysis complete for ${dataId}, score: ${analysis.productivityScore}`);

    // Emit update
    if (global.io) {
      global.io.to(`user:${data.userId}`).emit('productivity-analyzed', {
        dataId,
        productivityScore: analysis.productivityScore,
        summary: analysis.summary
      });
    }
  } catch (error) {
    console.error('[Productivity] AI analysis error:', error);
    // Try to at least save a basic analysis so the record isn't stuck
    try {
      const data = await ProductivityData.findById(dataId);
      if (data && data.status !== 'analyzed') {
        const fallback = generateFallbackAnalysis(data);
        await ProductivityData.findByIdAndUpdate(dataId, {
          aiAnalysis: fallback,
          status: 'analyzed'
        });
        console.log(`[Productivity] Saved fallback analysis for ${dataId}`);
      }
    } catch (fallbackError) {
      console.error('[Productivity] Fallback analysis also failed:', fallbackError);
    }
  }
}

// Generate fallback analysis when AI is unavailable
function generateFallbackAnalysis(data) {
  const totalTime = data.totalActiveTime || 1;
  const productivePercent = Math.round((data.productiveTime / totalTime) * 100);
  const unproductivePercent = Math.round((data.unproductiveTime / totalTime) * 100);
  
  // Calculate scores
  const productivityScore = productivePercent;
  const focusScore = data.topApps?.length <= 3 ? 85 : data.topApps?.length <= 5 ? 70 : 55;
  const efficiencyScore = data.keystrokes?.totalCount > 500 ? 80 : data.keystrokes?.totalCount > 100 ? 65 : 50;
  
  // Generate dynamic summary
  const topApp = data.topApps?.[0];
  const totalMins = Math.round(totalTime / 60000);
  let summary = '';
  
  if (topApp && totalMins > 0) {
    summary = `Active session of ${totalMins} minutes with ${productivePercent}% productive time. `;
    summary += `Primary application: ${topApp.appName} (${topApp.percentage}% of session). `;
    if (productivePercent >= 70) {
      summary += 'Excellent focus on work-related activities.';
    } else if (productivePercent >= 50) {
      summary += 'Good balance of productive and neutral activities.';
    } else {
      summary += 'Consider reducing time on non-work applications.';
    }
  } else {
    summary = `Activity captured for ${totalMins} minutes. ${productivePercent}% of time was spent on productive applications.`;
  }
  
  // Generate insights based on actual data
  const insights = [];
  if (topApp) {
    insights.push(`Most used application: ${topApp.appName} (${topApp.percentage}% of time)`);
  }
  if (data.topWebsites?.[0]) {
    insights.push(`Top website: ${data.topWebsites[0].domain} (${data.topWebsites[0].visits} visits)`);
  }
  if (data.keystrokes?.totalCount > 0) {
    insights.push(`Keyboard activity: ${data.keystrokes.totalCount} keystrokes logged`);
  }
  if (productivePercent >= 70) {
    insights.push('High productivity session - excellent work focus');
  }
  
  // Generate recommendations
  const recommendations = [];
  if (productivePercent < 50) {
    recommendations.push('Try using focus mode or website blockers during work hours');
  }
  if (data.topApps?.length > 5) {
    recommendations.push('Consider reducing app switching to maintain focus');
  }
  recommendations.push('Take regular breaks every 90 minutes to maintain peak performance');
  
  // Areas of improvement
  const areasOfImprovement = [];
  if (unproductivePercent > 30) {
    areasOfImprovement.push('Reduce time on entertainment and social media apps');
  }
  if (data.topApps?.length > 7) {
    areasOfImprovement.push('Focus on fewer applications at a time');
  }
  
  // Achievements
  const topAchievements = [];
  if (productivePercent >= 80) {
    topAchievements.push('Exceptional productivity - over 80% focused work time');
  } else if (productivePercent >= 60) {
    topAchievements.push('Good productivity maintained throughout the session');
  }
  if (data.keystrokes?.totalCount > 1000) {
    topAchievements.push('High engagement with keyboard-intensive work');
  }
  
  return {
    summary,
    productivityScore,
    focusScore,
    efficiencyScore,
    insights: insights.length > 0 ? insights : ['Activity data captured successfully'],
    recommendations,
    areasOfImprovement: areasOfImprovement.length > 0 ? areasOfImprovement : ['Continue current work patterns'],
    topAchievements: topAchievements.length > 0 ? topAchievements : ['Consistent activity tracking maintained']
  };
}

// Session aggregation in background
// Only aggregates when session interval has passed since last aggregation
const lastAggregation = new Map();

async function triggerSessionAggregation(userId, employeeId) {
  try {
    const now = Date.now();
    const lastTime = lastAggregation.get(userId);
    
    // Only aggregate every 5 minutes to avoid excessive processing
    if (lastTime && now - lastTime < 5 * 60 * 1000) {
      return;
    }
    
    lastAggregation.set(userId, now);
    
    // Aggregate last 2 hours of data
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);
    
    console.log(`[Session Aggregation] Triggering for user ${userId}`);
    
    const sessions = await aggregateSessionsForUser(
      userId,
      twoHoursAgo,
      new Date()
    );
    
    if (sessions.length > 0) {
      await saveAggregatedSessions(sessions);
      console.log(`[Session Aggregation] Created/updated ${sessions.length} sessions for user ${userId}`);
      
      // Emit socket event for session update
      if (global.io) {
        global.io.to(`user:${userId}`).emit('session-updated', {
          userId,
          sessionsCount: sessions.length,
          latestSession: sessions[sessions.length - 1]?.sessionEnd
        });
      }
    }
  } catch (error) {
    console.error(`[Session Aggregation] Error for user ${userId}:`, error);
  }
}
