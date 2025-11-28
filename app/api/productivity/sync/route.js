import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import { uploadBase64ToCloudinary } from '@/lib/cloudinary';
import { analyzeProductivityData } from '@/lib/productivityAnalyzer';

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

    const employee = await Employee.findOne({ userId: decoded.userId }).select('_id department');

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

    // Create productivity data record
    const productivityData = new ProductivityData({
      userId: decoded.userId,
      employeeId: employee?._id,
      periodStart: periodStart || new Date(Date.now() - 30 * 60 * 1000), // Default 30 min ago
      periodEnd: periodEnd || new Date(),
      screenshot: screenshot ? {
        data: screenshot,
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

// Process screenshot upload in background
async function processScreenshotAsync(dataId, screenshotData) {
  try {
    await connectDB();
    
    // Upload to Cloudinary
    const uploadResult = await uploadBase64ToCloudinary(screenshotData, {
      folder: 'productivity-screenshots',
      resource_type: 'image'
    });

    if (uploadResult?.secure_url) {
      await ProductivityData.findByIdAndUpdate(dataId, {
        'screenshot.url': uploadResult.secure_url,
        'screenshot.data': null // Clear base64 data after upload
      });
      console.log(`[Productivity] Screenshot uploaded for ${dataId}`);
    }
  } catch (error) {
    console.error('[Productivity] Screenshot upload error:', error);
  }
}

// Run AI analysis in background
async function analyzeProductivityAsync(dataId) {
  try {
    await connectDB();
    
    const data = await ProductivityData.findById(dataId);
    if (!data) return;

    const analysis = await analyzeProductivityData(data);

    await ProductivityData.findByIdAndUpdate(dataId, {
      aiAnalysis: {
        summary: analysis.summary,
        productivityScore: analysis.productivityScore,
        focusScore: analysis.focusScore,
        efficiencyScore: analysis.efficiencyScore,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        areasOfImprovement: analysis.areasOfImprovement,
        topAchievements: analysis.topAchievements,
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
  }
}
