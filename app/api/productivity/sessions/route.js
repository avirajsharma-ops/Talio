import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import ProductivityData from '@/models/ProductivityData';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import { analyzeProductivityData } from '@/lib/productivityAnalyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for processing

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper to safely convert to ObjectId
function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) {
    return new mongoose.Types.ObjectId(id);
  }
  return null;
}

/**
 * Check if a user is a department head via Department.head or Department.heads[] field
 * Returns the department if user is head, null otherwise
 */
async function getDepartmentIfHead(userId) {
  const userObjId = toObjectId(userId);
  if (!userObjId) return null;
  
  const user = await User.findById(userObjId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId: userObjId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) return null;
  
  // Check both head and heads fields
  const department = await Department.findOne({ 
    $or: [
      { head: employeeId },
      { heads: employeeId }
    ],
    isActive: true 
  });
  return department;
}

/**
 * Aggregate raw productivity data into sessions
 * Called periodically or on-demand
 */
async function aggregateSessionsForUser(userId, sessionDurationMins = 30) {
  try {
    // Find the last completed session for this user
    const lastSession = await ProductivitySession.findOne({
      userId,
      status: 'completed'
    }).sort({ sessionEnd: -1 }).lean();

    const startFrom = lastSession?.sessionEnd || new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24h if no sessions
    const now = new Date();
    const sessionDurationMs = sessionDurationMins * 60 * 1000;

    // Find all raw data since last session
    const rawData = await ProductivityData.find({
      userId,
      createdAt: { $gte: startFrom }
    }).sort({ createdAt: 1 }).lean();

    if (rawData.length === 0) {
      return { sessionsCreated: 0, message: 'No new data to aggregate' };
    }

    // Group data into session windows
    const sessionWindows = [];
    let currentWindowStart = new Date(startFrom);
    
    // Align to session boundaries (e.g., 00:00, 00:30, 01:00, etc.)
    const msIntoHour = currentWindowStart.getTime() % (60 * 60 * 1000);
    const sessionsIntoHour = Math.floor(msIntoHour / sessionDurationMs);
    currentWindowStart = new Date(currentWindowStart.getTime() - (msIntoHour - sessionsIntoHour * sessionDurationMs));

    while (currentWindowStart < now) {
      const windowEnd = new Date(currentWindowStart.getTime() + sessionDurationMs);
      
      // Only create completed sessions (window end is in the past)
      if (windowEnd <= now) {
        const windowData = rawData.filter(d => {
          const dataTime = new Date(d.createdAt);
          return dataTime >= currentWindowStart && dataTime < windowEnd;
        });

        if (windowData.length > 0) {
          sessionWindows.push({
            start: new Date(currentWindowStart),
            end: new Date(windowEnd),
            data: windowData
          });
        }
      }
      
      currentWindowStart = new Date(windowEnd);
    }

    // Create session documents for each window
    const createdSessions = [];
    
    for (const window of sessionWindows) {
      // Check if session already exists
      const existingSession = await ProductivitySession.findOne({
        userId,
        sessionStart: window.start,
        sessionEnd: window.end
      });
      
      if (existingSession) continue;

      // Aggregate the data
      const aggregated = aggregateWindowData(window.data);
      
      // Get employee info from first record
      const employeeId = window.data[0]?.employeeId;
      const deviceInfo = window.data[0]?.deviceInfo;

      // Create session
      const session = new ProductivitySession({
        userId,
        employeeId,
        sessionStart: window.start,
        sessionEnd: window.end,
        sessionDuration: sessionDurationMins,
        status: 'completed',
        screenshots: aggregated.screenshots,
        appUsageSummary: aggregated.appUsageSummary,
        websiteVisitSummary: aggregated.websiteVisitSummary,
        keystrokeSummary: aggregated.keystrokeSummary,
        mouseActivitySummary: aggregated.mouseActivitySummary,
        totalActiveTime: aggregated.totalActiveTime,
        productiveTime: aggregated.productiveTime,
        neutralTime: aggregated.neutralTime,
        unproductiveTime: aggregated.unproductiveTime,
        topApps: aggregated.topApps,
        topWebsites: aggregated.topWebsites,
        captureCount: window.data.length,
        sourceDataIds: window.data.map(d => d._id),
        deviceInfo,
        isPartialSession: false
      });

      await session.save();
      createdSessions.push(session);

      // Run AI analysis in background
      analyzeSessionAsync(session._id);
    }

    return { 
      sessionsCreated: createdSessions.length, 
      sessions: createdSessions.map(s => s._id) 
    };
  } catch (error) {
    console.error('[Session Aggregation] Error:', error);
    throw error;
  }
}

/**
 * Aggregate window data into summary statistics
 */
function aggregateWindowData(dataList) {
  const screenshots = [];
  const appUsageMap = {};
  const websiteVisitMap = {};
  let totalActiveTime = 0;
  let productiveTime = 0;
  let neutralTime = 0;
  let unproductiveTime = 0;
  let totalKeystrokes = 0;
  let totalClicks = 0;
  let totalScrollDistance = 0;
  let totalMovementDistance = 0;

  for (const data of dataList) {
    // Collect screenshots
    if (data.screenshot?.data) {
      screenshots.push({
        capturedAt: data.screenshot.capturedAt || data.createdAt,
        fullData: data.screenshot.data,
        thumbnail: generateThumbnail(data.screenshot.data), // We'll create small thumbnail
        captureType: data.screenshot.captureType || 'periodic',
        linkedDataId: data._id
      });
    }

    // Aggregate app usage
    for (const app of (data.appUsage || [])) {
      const key = app.appName;
      if (!appUsageMap[key]) {
        appUsageMap[key] = { 
          appName: app.appName, 
          totalDuration: 0, 
          category: app.category || 'unknown' 
        };
      }
      appUsageMap[key].totalDuration += app.duration || 0;
    }

    // Aggregate website visits
    for (const site of (data.websiteVisits || [])) {
      const key = site.domain || site.url;
      if (!websiteVisitMap[key]) {
        websiteVisitMap[key] = { 
          domain: site.domain || site.url, 
          totalDuration: 0, 
          visitCount: 0,
          category: site.category || 'unknown' 
        };
      }
      websiteVisitMap[key].totalDuration += site.duration || 0;
      websiteVisitMap[key].visitCount++;
    }

    // Aggregate time stats
    totalActiveTime += data.totalActiveTime || 0;
    productiveTime += data.productiveTime || 0;
    neutralTime += data.neutralTime || 0;
    unproductiveTime += data.unproductiveTime || 0;

    // Aggregate keystrokes
    totalKeystrokes += data.keystrokes?.totalCount || 0;

    // Aggregate mouse activity
    totalClicks += data.mouseActivity?.clicks || 0;
    totalScrollDistance += data.mouseActivity?.scrollDistance || 0;
    totalMovementDistance += data.mouseActivity?.movementDistance || 0;
  }

  // Calculate percentages for apps
  const appUsageSummary = Object.values(appUsageMap)
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .map(app => ({
      ...app,
      percentage: totalActiveTime > 0 ? Math.round((app.totalDuration / totalActiveTime) * 100) : 0
    }));

  // Calculate percentages for websites
  const totalWebsiteTime = Object.values(websiteVisitMap).reduce((sum, w) => sum + w.totalDuration, 0);
  const websiteVisitSummary = Object.values(websiteVisitMap)
    .sort((a, b) => b.totalDuration - a.totalDuration)
    .map(site => ({
      ...site,
      percentage: totalWebsiteTime > 0 ? Math.round((site.totalDuration / totalWebsiteTime) * 100) : 0
    }));

  // Top 5 apps and websites
  const topApps = appUsageSummary.slice(0, 5).map(app => ({
    appName: app.appName,
    duration: app.totalDuration,
    percentage: app.percentage
  }));

  const topWebsites = websiteVisitSummary.slice(0, 5).map(site => ({
    domain: site.domain,
    duration: site.totalDuration,
    visits: site.visitCount,
    percentage: site.percentage
  }));

  // Keystroke summary
  const sessionMins = dataList.length > 0 ? 
    (new Date(dataList[dataList.length - 1].createdAt) - new Date(dataList[0].createdAt)) / 60000 : 1;
  
  return {
    screenshots: screenshots.slice(0, 20), // Limit to 20 screenshots per session
    appUsageSummary,
    websiteVisitSummary,
    keystrokeSummary: {
      totalCount: totalKeystrokes,
      averagePerMinute: sessionMins > 0 ? Math.round(totalKeystrokes / sessionMins) : 0
    },
    mouseActivitySummary: {
      totalClicks,
      totalScrollDistance,
      totalMovementDistance
    },
    totalActiveTime,
    productiveTime,
    neutralTime,
    unproductiveTime,
    topApps,
    topWebsites
  };
}

/**
 * Generate a small thumbnail from base64 image
 * For now, we'll just store the full image - thumbnail generation can be added later
 */
function generateThumbnail(base64Data) {
  // TODO: Implement actual thumbnail generation with sharp or canvas
  // For now, return null to save space - full image available on demand
  return null;
}

/**
 * Run AI analysis on session in background
 */
async function analyzeSessionAsync(sessionId) {
  try {
    await connectDB();
    
    const session = await ProductivitySession.findById(sessionId);
    if (!session) return;

    // Build analysis context from session data
    const analysisContext = {
      totalActiveTime: session.totalActiveTime,
      productiveTime: session.productiveTime,
      neutralTime: session.neutralTime,
      unproductiveTime: session.unproductiveTime,
      topApps: session.topApps,
      topWebsites: session.topWebsites,
      keystrokes: session.keystrokeSummary,
      screenshotCount: session.screenshots?.length || 0,
      sessionDuration: session.sessionDuration
    };

    // Generate AI analysis
    const analysis = await generateSessionAnalysis(analysisContext);

    await ProductivitySession.findByIdAndUpdate(sessionId, {
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
      }
    });

    console.log(`[Session Analysis] Completed for session ${sessionId}`);
  } catch (error) {
    console.error('[Session Analysis] Error:', error);
    // Save fallback analysis
    try {
      const session = await ProductivitySession.findById(sessionId);
      if (session && !session.aiAnalysis?.summary) {
        const fallback = generateFallbackSessionAnalysis(session);
        await ProductivitySession.findByIdAndUpdate(sessionId, { aiAnalysis: fallback });
      }
    } catch (e) {
      console.error('[Session Analysis] Fallback also failed:', e);
    }
  }
}

/**
 * Generate AI-powered session analysis
 */
async function generateSessionAnalysis(context) {
  try {
    // Try using OpenAI or similar
    const { OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `Analyze this ${context.sessionDuration}-minute work session:
    
- Total active time: ${Math.round(context.totalActiveTime / 60000)} minutes
- Productive time: ${Math.round(context.productiveTime / 60000)} minutes (${Math.round((context.productiveTime / context.totalActiveTime) * 100)}%)
- Neutral time: ${Math.round(context.neutralTime / 60000)} minutes
- Unproductive time: ${Math.round(context.unproductiveTime / 60000)} minutes
- Top apps: ${context.topApps?.map(a => `${a.appName} (${a.percentage}%)`).join(', ') || 'None'}
- Top websites: ${context.topWebsites?.map(w => `${w.domain} (${w.visits} visits)`).join(', ') || 'None'}
- Total keystrokes: ${context.keystrokes?.totalCount || 0}
- Screenshots captured: ${context.screenshotCount}

Provide a JSON response with:
{
  "summary": "2-3 sentence summary of the session productivity",
  "productivityScore": number (0-100),
  "focusScore": number (0-100),
  "efficiencyScore": number (0-100),
  "insights": ["insight1", "insight2", "insight3"],
  "recommendations": ["recommendation1", "recommendation2"],
  "areasOfImprovement": ["area1"],
  "topAchievements": ["achievement1"]
}`;

    const response = await openai.chat.completions.create({
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('[AI Analysis] Error:', error);
    return generateFallbackSessionAnalysis({ 
      totalActiveTime: context.totalActiveTime,
      productiveTime: context.productiveTime,
      neutralTime: context.neutralTime,
      unproductiveTime: context.unproductiveTime,
      topApps: context.topApps,
      topWebsites: context.topWebsites,
      keystrokeSummary: context.keystrokes
    });
  }
}

/**
 * Generate fallback analysis when AI is unavailable
 */
function generateFallbackSessionAnalysis(session) {
  const totalTime = session.totalActiveTime || 1;
  const productivePercent = Math.round((session.productiveTime / totalTime) * 100);
  const unproductivePercent = Math.round((session.unproductiveTime / totalTime) * 100);
  
  const productivityScore = productivePercent;
  const focusScore = session.topApps?.length <= 3 ? 85 : session.topApps?.length <= 5 ? 70 : 55;
  const efficiencyScore = session.keystrokeSummary?.totalCount > 500 ? 80 : 
                          session.keystrokeSummary?.totalCount > 100 ? 65 : 50;
  
  const totalMins = Math.round(totalTime / 60000);
  const topApp = session.topApps?.[0];
  
  let summary = `${session.sessionDuration || 30}-minute session with ${productivePercent}% productive time. `;
  if (topApp) {
    summary += `Primary focus: ${topApp.appName} (${topApp.percentage}% of session). `;
  }
  if (productivePercent >= 70) {
    summary += 'Excellent work session!';
  } else if (productivePercent >= 50) {
    summary += 'Balanced work session.';
  } else {
    summary += 'Consider reducing distractions.';
  }

  const insights = [];
  if (topApp) insights.push(`Most used: ${topApp.appName} (${topApp.percentage}%)`);
  if (session.topWebsites?.[0]) insights.push(`Top site: ${session.topWebsites[0].domain}`);
  if (session.keystrokeSummary?.totalCount > 0) insights.push(`${session.keystrokeSummary.totalCount} keystrokes`);
  
  const recommendations = [];
  if (productivePercent < 50) recommendations.push('Use focus mode during work hours');
  if (session.topApps?.length > 5) recommendations.push('Reduce app switching');
  recommendations.push('Take short breaks every 90 minutes');
  
  const areasOfImprovement = [];
  if (unproductivePercent > 30) areasOfImprovement.push('Reduce unproductive app usage');
  
  const topAchievements = [];
  if (productivePercent >= 70) topAchievements.push('High productivity session');
  if (session.keystrokeSummary?.totalCount > 500) topAchievements.push('High engagement');

  return {
    summary,
    productivityScore,
    focusScore,
    efficiencyScore,
    insights,
    recommendations,
    areasOfImprovement: areasOfImprovement.length > 0 ? areasOfImprovement : ['Continue current patterns'],
    topAchievements: topAchievements.length > 0 ? topAchievements : ['Session completed'],
    analyzedAt: new Date()
  };
}

// ===================== API ROUTES =====================

/**
 * Trigger auto-analysis for multiple sessions in background
 * Non-blocking - errors are logged but don't affect response
 */
async function triggerAutoAnalysisForSessions(sessionIds) {
  for (const sessionId of sessionIds.slice(0, 3)) { // Limit to 3 to avoid timeout
    try {
      await analyzeSessionAsync(sessionId);
    } catch (err) {
      console.error(`[Auto-Analysis] Failed for session ${sessionId}:`, err.message);
    }
  }
}

/**
 * POST - Trigger session aggregation
 * Can be called by cron job or manually by admin
 */
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

    const { userId, forAll, sessionDuration } = await request.json();
    
    // Get requester's role
    const requester = await User.findById(decoded.userId).select('role settings');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    // Get session duration from settings or request
    const duration = sessionDuration || requester?.settings?.screenshotInterval || 30;

    let results = [];

    if (forAll && isAdmin) {
      // Aggregate for all users with raw data
      const usersWithData = await ProductivityData.distinct('userId', {
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      for (const uid of usersWithData) {
        try {
          const result = await aggregateSessionsForUser(uid, duration);
          results.push({ userId: uid, ...result });
        } catch (e) {
          results.push({ userId: uid, error: e.message });
        }
      }
    } else {
      // Aggregate for specific user or self
      const targetUserId = (userId && isAdmin) ? userId : decoded.userId;
      const result = await aggregateSessionsForUser(targetUserId, duration);
      results.push({ userId: targetUserId, ...result });
    }

    return NextResponse.json({
      success: true,
      message: 'Session aggregation completed',
      results
    });

  } catch (error) {
    console.error('[Session Aggregate API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to aggregate sessions' 
    }, { status: 500 });
  }
}

/**
 * GET - Get aggregated sessions with pagination
 */
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
    const limit = parseInt(searchParams.get('limit') || '4');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const afterDate = searchParams.get('after'); // For incremental fetching of new sessions only
    const includePartial = searchParams.get('includePartial') === 'true';

    // Check permissions
    const requester = await User.findById(decoded.userId).select('role employeeId');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    // Check if user is a department head via Department.head field
    const headOfDepartment = await getDepartmentIfHead(decoded.userId);
    const isDeptHead = !!headOfDepartment;
    console.log('[Sessions] Permission check:', { 
      userId: decoded.userId, 
      isAdmin, 
      isDeptHead, 
      departmentId: headOfDepartment?._id?.toString() 
    });

    // Build query
    const query = {};
    
    if (userId && (isAdmin || isDeptHead)) {
      // Convert userId from URL param to ObjectId
      const userObjId = toObjectId(userId);
      if (userObjId) {
        query.userId = userObjId;
      } else {
        query.userId = userId; // Fallback to string
      }
      
      // If department head, verify the target user is in their department
      if (isDeptHead && !isAdmin && headOfDepartment) {
        // Bidirectional lookup: check Employee.userId first, then User.employeeId
        let targetEmployee = await Employee.findOne({ userId: userObjId }).select('department');
        
        if (!targetEmployee) {
          // Try reverse relationship: User.employeeId
          const targetUser = await User.findById(userObjId).select('employeeId');
          if (targetUser?.employeeId) {
            targetEmployee = await Employee.findById(targetUser.employeeId).select('department');
          }
        }
        
        if (!targetEmployee?.department || targetEmployee.department.toString() !== headOfDepartment._id.toString()) {
          return NextResponse.json({ success: false, error: 'Cannot access data for users outside your department' }, { status: 403 });
        }
      }
    } else if (!isAdmin && !isDeptHead) {
      // Regular employees can only see their own sessions
      query.userId = toObjectId(decoded.userId) || decoded.userId;
    }

    // Status filter
    if (!includePartial) {
      query.status = 'completed';
    }

    // Date filters
    if (startDate) {
      query.sessionStart = { $gte: new Date(startDate) };
    }
    if (endDate) {
      query.sessionEnd = { ...(query.sessionEnd || {}), $lte: new Date(endDate) };
    }

    // For incremental fetch - only get sessions newer than specified date
    if (afterDate) {
      query.sessionEnd = { ...(query.sessionEnd || {}), $gt: new Date(afterDate) };
    }

    // Get total count for pagination
    const totalCount = await ProductivitySession.countDocuments(query);

    // Fetch sessions
    const sessions = await ProductivitySession.find(query)
      .sort({ sessionStart: -1 })
      .skip(offset)
      .limit(limit)
      .populate('employeeId', 'firstName lastName employeeCode designation department profilePicture')
      .populate('userId', 'name email profilePicture')
      .lean();

    // For list view: include thumbnail OR fullData for first 4 screenshots (for card display)
    // Also include fullData fallback if no thumbnail exists
    const sessionsForList = sessions.map(session => ({
      ...session,
      // Ensure we have computed duration if not set
      durationMinutes: session.sessionDuration || Math.round((new Date(session.sessionEnd) - new Date(session.sessionStart)) / 60000),
      screenshots: session.screenshots?.slice(0, 4).map((s, idx) => ({
        _id: s._id,
        capturedAt: s.capturedAt,
        // Include thumbnail if available, else include fullData for display
        thumbnail: s.thumbnail || s.fullData,
        // For first screenshot only, include fullData as fallback
        url: s.thumbnail || s.fullData,
        thumbnailUrl: s.thumbnail || s.fullData,
        captureType: s.captureType
      })),
      // Ensure these fields exist for display
      appUsage: session.appUsageSummary || session.topApps || [],
      websiteVisits: session.websiteVisitSummary || session.topWebsites || [],
      keystrokes: {
        total: session.keystrokeSummary?.totalCount || 0,
        perMinute: session.keystrokeSummary?.averagePerMinute || 0
      },
      mouseClicks: session.mouseActivitySummary?.totalClicks || 0
    }));

    // Trigger auto-analysis for sessions without AI analysis (background, non-blocking)
    const unanalyzedSessions = sessions.filter(s => !s.aiAnalysis?.summary);
    if (unanalyzedSessions.length > 0) {
      // Don't await - run in background
      triggerAutoAnalysisForSessions(unanalyzedSessions.map(s => s._id)).catch(err => {
        console.error('[Sessions GET] Auto-analysis error:', err.message);
      });
    }

    return NextResponse.json({
      success: true,
      data: sessionsForList,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error('[Session Get API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch sessions' 
    }, { status: 500 });
  }
}

/**
 * DELETE - Delete sessions and/or raw productivity data for a user
 * Admin only - allows purging user's productivity data
 */
export async function DELETE(request) {
  try {
    await connectDB();
    
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Check if user is admin/god_admin
    const user = await User.findById(payload.userId).select('role');
    if (!user || !['admin', 'god_admin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');
    const deleteType = searchParams.get('type') || 'sessions'; // 'sessions', 'screenshots', 'all'
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!targetUserId && !sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Either userId or sessionId is required' 
      }, { status: 400 });
    }

    const results = {
      sessionsDeleted: 0,
      rawDataDeleted: 0,
      screenshotsCleared: 0
    };

    // Build date filter if provided
    const dateFilter = {};
    if (dateFrom) dateFilter.$gte = new Date(dateFrom);
    if (dateTo) dateFilter.$lte = new Date(dateTo);

    // Delete specific session
    if (sessionId) {
      const sessionObjId = toObjectId(sessionId);
      if (!sessionObjId) {
        return NextResponse.json({ success: false, error: 'Invalid session ID' }, { status: 400 });
      }

      if (deleteType === 'screenshots') {
        // Just clear screenshots from the session
        const session = await ProductivitySession.findById(sessionObjId);
        if (session) {
          results.screenshotsCleared = session.screenshots?.length || 0;
          session.screenshots = [];
          await session.save();
        }
      } else {
        // Delete the entire session
        const deleted = await ProductivitySession.findByIdAndDelete(sessionObjId);
        if (deleted) {
          results.sessionsDeleted = 1;
          results.screenshotsCleared = deleted.screenshots?.length || 0;
        }
      }
    } 
    // Delete by user ID
    else if (targetUserId) {
      const userObjId = toObjectId(targetUserId);
      if (!userObjId) {
        return NextResponse.json({ success: false, error: 'Invalid user ID' }, { status: 400 });
      }

      const sessionQuery = { userId: userObjId };
      const rawDataQuery = { userId: userObjId };
      
      if (Object.keys(dateFilter).length > 0) {
        sessionQuery.sessionStart = dateFilter;
        rawDataQuery.createdAt = dateFilter;
      }

      if (deleteType === 'screenshots') {
        // Clear screenshots from all matching sessions
        const sessions = await ProductivitySession.find(sessionQuery);
        for (const session of sessions) {
          results.screenshotsCleared += session.screenshots?.length || 0;
          session.screenshots = [];
          await session.save();
        }
        
        // Also clear screenshots from raw data
        const rawDataUpdated = await ProductivityData.updateMany(
          rawDataQuery,
          { $unset: { 'screenshot.data': 1, 'screenshot.url': 1 } }
        );
        results.rawDataDeleted = rawDataUpdated.modifiedCount || 0;
      } else if (deleteType === 'sessions') {
        // Delete sessions only
        const deleted = await ProductivitySession.deleteMany(sessionQuery);
        results.sessionsDeleted = deleted.deletedCount || 0;
      } else if (deleteType === 'all') {
        // Delete everything
        const sessionsDeleted = await ProductivitySession.deleteMany(sessionQuery);
        results.sessionsDeleted = sessionsDeleted.deletedCount || 0;
        
        const rawDeleted = await ProductivityData.deleteMany(rawDataQuery);
        results.rawDataDeleted = rawDeleted.deletedCount || 0;
      }
    }

    console.log(`[Session Delete API] Admin ${payload.userId} deleted data:`, results);

    return NextResponse.json({
      success: true,
      message: 'Data deleted successfully',
      ...results
    });

  } catch (error) {
    console.error('[Session Delete API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete data' 
    }, { status: 500 });
  }
}
