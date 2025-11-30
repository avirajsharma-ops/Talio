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
  
  const user = await User.findById(userObjId).select('employeeId').lean();
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId: userObjId }).select('_id').lean();
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
  }).lean();
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
      // Note: AI analysis is now triggered manually by the user via "Analyze with AI" button
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

// ===================== API ROUTES =====================
// Note: AI analysis is now triggered manually via /api/productivity/sessions/analyze endpoint
// Analysis results are cached in the session document and won't be re-run unless forced

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
    const requester = await User.findById(decoded.userId).select('role settings').lean();
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
    const requester = await User.findById(decoded.userId).select('role employeeId').lean();
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
        let targetEmployee = await Employee.findOne({ userId: userObjId }).select('department').lean();
        
        if (!targetEmployee) {
          // Try reverse relationship: User.employeeId
          const targetUser = await User.findById(userObjId).select('employeeId').lean();
          if (targetUser?.employeeId) {
            targetEmployee = await Employee.findById(targetUser.employeeId).select('department').lean();
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

    // OPTIMIZATION: Use aggregation pipeline for efficient data loading
    // This avoids loading massive base64 screenshot data
    const pipeline = [
      { $match: query },
      { $sort: { sessionStart: -1 } },
      { $skip: offset },
      { $limit: limit },
      {
        $project: {
          // Core session info
          sessionStart: 1,
          sessionEnd: 1,
          sessionDuration: 1,
          status: 1,
          userId: 1,
          employeeId: 1,
          
          // Summary data (small)
          totalActiveTime: 1,
          productiveTime: 1,
          neutralTime: 1,
          unproductiveTime: 1,
          
          // App/website summaries (small arrays)
          topApps: { $slice: ['$topApps', 5] },
          topWebsites: { $slice: ['$topWebsites', 5] },
          appUsageSummary: { $slice: ['$appUsageSummary', 5] },
          websiteVisitSummary: { $slice: ['$websiteVisitSummary', 5] },
          
          // Keystroke/mouse summary
          keystrokeSummary: 1,
          mouseActivitySummary: 1,
          
          // AI analysis (if exists)
          aiAnalysis: 1,
          
          // Screenshot count and first screenshot thumbnail ONLY (no fullData)
          screenshotCount: { $size: { $ifNull: ['$screenshots', []] } },
          // Get first 2 screenshots but only thumbnail field
          screenshots: {
            $map: {
              input: { $slice: ['$screenshots', 2] },
              as: 'ss',
              in: {
                _id: '$$ss._id',
                capturedAt: '$$ss.capturedAt',
                captureType: '$$ss.captureType',
                // Only include thumbnail, NOT fullData (which is huge)
                thumbnail: '$$ss.thumbnail'
              }
            }
          },
          
          // Device info
          deviceInfo: 1,
          
          // Metadata
          createdAt: 1,
          updatedAt: 1
        }
      }
    ];

    // Run aggregation and count in parallel for speed
    const [sessions, countResult] = await Promise.all([
      ProductivitySession.aggregate(pipeline),
      ProductivitySession.countDocuments(query)
    ]);

    const totalCount = countResult;

    // Populate employee and user info efficiently
    const populatedSessions = await ProductivitySession.populate(sessions, [
      { path: 'employeeId', select: 'firstName lastName employeeCode designation profilePicture' },
      { path: 'userId', select: 'name email profilePicture' }
    ]);

    // Format for list view
    const sessionsForList = populatedSessions.map(session => ({
      _id: session._id,
      sessionStart: session.sessionStart,
      sessionEnd: session.sessionEnd,
      status: session.status,
      userId: session.userId,
      employeeId: session.employeeId,
      durationMinutes: session.sessionDuration || Math.round((new Date(session.sessionEnd) - new Date(session.sessionStart)) / 60000),
      
      // Use screenshotCount from aggregation
      screenshotCount: session.screenshotCount || 0,
      screenshots: session.screenshots || [],
      
      // Activity summaries
      totalActiveTime: session.totalActiveTime,
      productiveTime: session.productiveTime,
      appUsage: session.appUsageSummary || session.topApps || [],
      websiteVisits: session.websiteVisitSummary || session.topWebsites || [],
      topApps: session.topApps,
      topWebsites: session.topWebsites,
      
      keystrokes: {
        total: session.keystrokeSummary?.totalCount || 0,
        perMinute: session.keystrokeSummary?.averagePerMinute || 0
      },
      keystrokeSummary: session.keystrokeSummary,
      mouseClicks: session.mouseActivitySummary?.totalClicks || 0,
      mouseActivitySummary: session.mouseActivitySummary,
      
      // AI analysis
      aiAnalysis: session.aiAnalysis,
      
      deviceInfo: session.deviceInfo
    }));

    // Note: Background auto-analysis has been removed. Users can manually trigger AI analysis via the "Analyze with AI" button.
    // Once analyzed, the analysis is saved to the session and won't need to be re-analyzed.

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
