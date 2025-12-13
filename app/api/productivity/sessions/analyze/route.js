import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import Designation from '@/models/Designation';
import { generateContent, generateVisionContent } from '@/lib/gemini';
import { generateSmartContent } from '@/lib/promptEngine';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for multi-screenshot AI processing

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
 * Analyze a single screenshot with Gemini Vision
 * Returns a brief description of what's happening in the screenshot
 */
async function analyzeScreenshot(imageData, index, total) {
  try {
    // Validate image data
    if (!imageData || typeof imageData !== 'string' || imageData.length < 100) {
      console.log(`[Screenshot ${index + 1}] Skipping - invalid or too short image data`);
      return null;
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let base64Data = imageData;
    if (imageData.startsWith('data:')) {
      const base64Match = imageData.match(/base64,(.+)/);
      if (base64Match) {
        base64Data = base64Match[1];
      }
    }

    // Validate base64 data length (at least 1KB of actual image data)
    if (base64Data.length < 1000) {
      console.log(`[Screenshot ${index + 1}] Skipping - base64 data too short (${base64Data.length} chars)`);
      return null;
    }

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Detect mime type from data URI or default to webp (our compression format)
    let mimeType = 'image/webp';
    if (imageData.startsWith('data:image/jpeg')) {
      mimeType = 'image/jpeg';
    } else if (imageData.startsWith('data:image/png')) {
      mimeType = 'image/png';
    }

    const prompt = `Screenshot ${index + 1} of ${total}. Briefly describe (1-2 sentences max): What application/website is shown? What is the user doing? Is this work-related activity?`;
    const images = [{ mimeType, data: base64Data }];
    
    // Retry logic for 429 errors
    let retries = 3;
    let delay = 2000; // Start with 2s delay

    while (retries > 0) {
      try {
        const text = await generateVisionContent(prompt, images);
        return text?.trim() || null;
      } catch (err) {
        if (err.message.includes('429') || err.status === 429) {
          console.log(`[Screenshot ${index + 1}] Rate limited (429). Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
          retries--;
        } else {
          throw err; // Non-retryable error
        }
      }
    }
    console.log(`[Screenshot ${index + 1}] Failed after retries due to rate limiting.`);
    return null;

  } catch (error) {
    console.error(`[Screenshot ${index + 1}] Error:`, error.message);
    return null;
  }
}

/**
 * Analyze ALL screenshots in a session, one at a time
 * Then create a comprehensive summary combining all analyses
 */
async function analyzeSessionWithAI(session, employee) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) {
    console.log('[Session Analyze] No Gemini API key found');
    const designationTitle = employee?.designation?.title || employee?.designation?.levelName || 'Employee';
    return generateFallbackAnalysis(session, designationTitle);
  }

  // Extract designation title from populated field or fallback
  const designationTitle = employee?.designation?.title || employee?.designation?.levelName || 'Employee';
  const designationDescription = employee?.designation?.description || '';
  const department = employee?.department?.name || 'General';
  const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Employee';
  const screenshots = session.screenshots || [];

  // Get app and website activity context
  const apps = session.appUsageSummary || session.topApps || [];
  const websites = session.websiteVisitSummary || session.topWebsites || [];
  const appList = apps.slice(0, 10).map(a => {
    const name = a.appName;
    const duration = a.totalDuration || a.duration;
    const pct = a.percentage;
    return pct ? `${name} (${pct}%)` : `${name} (${Math.round((duration || 0) / 60000)}m)`;
  }).join(', ') || 'No app data tracked';

  const websiteList = websites.slice(0, 10).map(w => {
    const domain = w.domain;
    const visits = w.visitCount || w.visits || 1;
    return `${domain} (${visits} visits)`;
  }).join(', ') || 'No website data tracked';

  const keystrokeCount = session.keystrokeSummary?.totalCount || 0;
  const mouseClicks = session.mouseActivitySummary?.totalClicks || 0;

  console.log(`[Session Analyze] Starting comprehensive analysis for ${employeeName} (${designationTitle}) in ${department}`);
  console.log(`[Session Analyze] Apps: ${apps.length}, Websites: ${websites.length}, Screenshots: ${screenshots.length}`);

  try {
    // Phase 1: Analyze each screenshot individually
    const screenshotDescriptions = [];
    // Reduce to 6 screenshots to avoid hitting rate limits (15 RPM) while maintaining coverage
    const maxScreenshots = Math.min(screenshots.length, 6); 
    
    // Select screenshots evenly distributed across the session
    const selectedIndices = [];
    if (screenshots.length <= maxScreenshots) {
      for (let i = 0; i < screenshots.length; i++) selectedIndices.push(i);
    } else {
      const step = (screenshots.length - 1) / (maxScreenshots - 1);
      for (let i = 0; i < maxScreenshots; i++) {
        selectedIndices.push(Math.round(i * step));
      }
    }

    for (let i = 0; i < selectedIndices.length; i++) {
      const idx = selectedIndices[i];
      const screenshot = screenshots[idx];
      const imageData = screenshot?.fullData || screenshot?.thumbnail;

      if (imageData && imageData.length > 100) {
        console.log(`[Session Analyze] Analyzing screenshot ${i + 1}/${maxScreenshots} (Index ${idx})...`);
        const description = await analyzeScreenshot(imageData, i, maxScreenshots);

        if (description) {
          screenshotDescriptions.push({
            index: idx + 1,
            time: screenshot.capturedAt ? new Date(screenshot.capturedAt).toLocaleTimeString() : `Screenshot ${idx + 1}`,
            description
          });
          console.log(`[Session Analyze] Screenshot ${idx + 1}: ${description.slice(0, 80)}...`);
        }

        // 4 second delay between requests to stay under 15 RPM limit
        if (i < selectedIndices.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
    }

    console.log(`[Session Analyze] Analyzed ${screenshotDescriptions.length} screenshots, generating comprehensive summary...`);

    // Phase 2: Generate comprehensive analysis combining all data
    const screenshotSummary = screenshotDescriptions.length > 0
      ? screenshotDescriptions.map(s => `[${s.time}] ${s.description}`).join('\n')
      : 'No screenshots were available for analysis.';

    const comprehensivePrompt = `You are an expert workplace productivity analyst conducting a deep, forensic assessment of an employee's work session. Your goal is to provide a highly detailed, educated, and professional analysis that reads like a human expert's report.

═══════════════════════════════════════════════════════════════════════
EMPLOYEE PROFILE
═══════════════════════════════════════════════════════════════════════
• Full Name: ${employeeName}
• Job Title/Designation: ${designationTitle}
• Job Description: ${designationDescription || 'Standard duties for this role'}
• Department: ${department}

IMPORTANT: Evaluate this employee's activities SPECIFICALLY based on their job title "${designationTitle}". Use your knowledge of this role's typical workflows, tools, and expectations.

═══════════════════════════════════════════════════════════════════════
SESSION METRICS
═══════════════════════════════════════════════════════════════════════
• Duration: ${session.sessionDuration || 30} minutes
• Total Keystrokes: ${keystrokeCount} (${keystrokeCount > 0 ? Math.round(keystrokeCount / (session.sessionDuration || 30)) + ' per minute' : 'no data'})
• Mouse Clicks: ${mouseClicks}
• Screenshots Analyzed: ${screenshotDescriptions.length}

═══════════════════════════════════════════════════════════════════════
APPLICATION USAGE (Time Distribution)
═══════════════════════════════════════════════════════════════════════
${appList}

═══════════════════════════════════════════════════════════════════════
WEBSITE ACTIVITY
═══════════════════════════════════════════════════════════════════════
${websiteList}

═══════════════════════════════════════════════════════════════════════
SCREENSHOT ANALYSIS (Chronological Activity Log)
═══════════════════════════════════════════════════════════════════════
${screenshotSummary}

═══════════════════════════════════════════════════════════════════════
ANALYSIS INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════
1. **Synthesize Data**: Combine the screenshot visual evidence with the app/website logs. If screenshots show code but logs show "Chrome", explain that they are likely researching.
2. **Role-Specific Context**: A developer on YouTube watching a tutorial is productive; a data entry clerk watching a music video is not. Apply this nuance.
3. **Identify Patterns**: Look for "flow states" (long periods in one app) vs. "fragmentation" (constant switching).
4. **Be Specific**: Don't just say "They worked". Say "They were developing a React component in VS Code while referencing documentation on MDN."

═══════════════════════════════════════════════════════════════════════
REQUIRED JSON OUTPUT
═══════════════════════════════════════════════════════════════════════

{
  "summary": "A comprehensive, multi-paragraph narrative (approx 150-200 words). Paragraph 1: Executive summary of the session's main focus. Paragraph 2: Detailed breakdown of specific tasks, tools used, and workflows observed. Paragraph 3: Assessment of work intensity, focus, and alignment with role expectations. Use professional language.",
  "productivityScore": [0-100 based on role alignment],
  "focusScore": [0-100 based on task continuity],
  "efficiencyScore": [0-100 based on output intensity],
  "scoreBreakdown": {
    "productivityReason": "Detailed justification citing specific productive/unproductive behaviors.",
    "focusReason": "Analysis of their attention span and context switching patterns.",
    "efficiencyReason": "Evaluation of their interaction rate (keystrokes/clicks) relative to the task type."
  },
  "workActivities": [
    "Detailed activity description 1 (e.g., 'Debugging backend API routes in VS Code')",
    "Detailed activity description 2",
    "Detailed activity description 3",
    "Detailed activity description 4",
    "Detailed activity description 5"
  ],
  "insights": [
    "Deep insight about their workflow efficiency",
    "Observation about tool mastery or usage patterns",
    "Note on time management or distraction handling"
  ],
  "recommendations": [
    "Specific, actionable advice to enhance performance",
    "Tool or workflow suggestion based on observed bottlenecks"
  ],
  "areasOfImprovement": ["Specific constructive feedback"],
  "topAchievements": ["Notable positive behavior or completed task"]
}

CRITICAL: Be accurate and fair. Base scores strictly on observed data, not assumptions. If screenshots show productive work, score high. If they show browsing/entertainment, score accordingly. Consider the role context - what's distracting for a developer might be productive for a social media manager.`;

    const content = await generateSmartContent(comprehensivePrompt, {
      userId: session.userId.toString(),
      feature: 'productivity-session-analyze'
    });
    console.log(`[Session Analyze] Comprehensive response: ${content.slice(0, 300)}...`);

    // Parse JSON response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Session analyzed successfully',
          productivityScore: Math.min(100, Math.max(0, parseInt(parsed.productivityScore) || 50)),
          focusScore: Math.min(100, Math.max(0, parseInt(parsed.focusScore) || 50)),
          efficiencyScore: Math.min(100, Math.max(0, parseInt(parsed.efficiencyScore) || 50)),
          scoreBreakdown: parsed.scoreBreakdown || null,
          workActivities: (parsed.workActivities || []).slice(0, 5),
          insights: (parsed.insights || []).slice(0, 4),
          recommendations: (parsed.recommendations || []).slice(0, 3),
          areasOfImprovement: (parsed.areasOfImprovement || []).slice(0, 2),
          topAchievements: (parsed.topAchievements || []).slice(0, 2),
          screenshotAnalysis: screenshotDescriptions, // Include individual screenshot analyses
          analyzedAt: new Date()
        };
      }
    } catch (parseErr) {
      console.error('[Session Analyze] JSON parse error:', parseErr.message);
    }

    // If parsing failed, use fallback
    return generateFallbackAnalysis(session, designationTitle);

  } catch (error) {
    console.error('[Session Analyze] Error:', error.message);
    return generateFallbackAnalysis(session, designationTitle);
  }
}

/**
 * Generate fallback analysis when AI is unavailable
 * Provides meaningful feedback based on available session data
 */
function generateFallbackAnalysis(session, designation) {
  const totalTime = session.totalActiveTime || 1;
  const productivePercent = Math.round(((session.productiveTime || 0) / totalTime) * 100) || 0;

  // Calculate scores based on available data
  const hasApps = session.topApps?.length > 0;
  const hasWebsites = session.topWebsites?.length > 0;
  const hasKeystrokes = session.keystrokeSummary?.totalCount > 0;
  const hasScreenshots = session.screenshots?.length > 0;

  // More intelligent scoring when no app data available
  let productivityScore = 50; // Default neutral
  let focusScore = 50;
  let efficiencyScore = 50;

  if (hasApps) {
    productivityScore = Math.max(40, productivePercent);
    focusScore = session.topApps.length <= 3 ? 80 : session.topApps.length <= 5 ? 65 : 50;
  } else if (hasScreenshots) {
    // If we have screenshots but no app data, indicate pending analysis
    productivityScore = 60; // Assume working
    focusScore = 70;
  }

  if (hasKeystrokes) {
    const kpm = session.keystrokeSummary.averagePerMinute || 0;
    efficiencyScore = kpm > 30 ? 80 : kpm > 10 ? 65 : kpm > 0 ? 50 : 40;
  }

  const topApp = session.topApps?.[0];
  const topSite = session.topWebsites?.[0];

  let summary = `${session.sessionDuration || 30}-minute work session as ${designation}. `;

  if (topApp) {
    summary += `Primary activity on ${topApp.appName}. `;
  } else if (topSite) {
    summary += `Browsing activity on ${topSite.domain}. `;
  } else if (hasScreenshots) {
    summary += `${session.screenshots.length} screenshots captured. Click "Analyze with AI" for detailed analysis. `;
  }

  if (hasKeystrokes) {
    summary += `${session.keystrokeSummary.totalCount} keystrokes indicating active work.`;
  } else if (hasScreenshots) {
    summary += 'Activity captured for review.';
  } else {
    summary += 'Limited activity data available.';
  }

  const insights = [];
  if (topApp) insights.push(`Most used app: ${topApp.appName}`);
  if (topSite) insights.push(`Top website: ${topSite.domain}`);
  if (hasKeystrokes) insights.push(`Typing activity: ${session.keystrokeSummary.averagePerMinute || 0} keys/min`);
  if (hasScreenshots && !hasApps) insights.push(`${session.screenshots.length} screenshots available for AI analysis`);
  if (!insights.length) insights.push('Session activity captured');

  const recommendations = [];
  if (!hasApps && !hasWebsites && hasScreenshots) {
    recommendations.push('Use AI analysis to get detailed insights from screenshots');
  }
  if (!hasApps && !hasWebsites && !hasScreenshots) {
    recommendations.push('Ensure desktop app is tracking applications');
  }
  if (session.topApps?.length > 5) {
    recommendations.push('Consider reducing app switching for better focus');
  }
  if (!recommendations.length) {
    recommendations.push('Continue maintaining your work patterns');
  }

  return {
    summary,
    productivityScore,
    focusScore,
    efficiencyScore,
    insights: insights.slice(0, 3),
    recommendations: recommendations.slice(0, 2),
    areasOfImprovement: productivePercent < 50 && hasApps ? ['Review time allocation'] : [],
    topAchievements: productivityScore >= 60 ? ['Consistent activity'] : [],
    analyzedAt: new Date()
  };
}

/**
 * POST - Analyze a session with cost-optimized AI
 * Returns cached analysis if already analyzed (unless forceReanalyze=true)
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { sessionId, forceReanalyze, preloadedScreenshots } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // Log if we received pre-loaded screenshots from the client
    if (preloadedScreenshots?.length > 0) {
      console.log(`[Session Analyze] Received ${preloadedScreenshots.length} pre-loaded screenshots from client`);
    }

    // Fetch session with full data
    const session = await ProductivitySession.findById(sessionId).lean();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // If we have pre-loaded screenshots from the client, use them instead of DB data
    // This avoids network roundtrip to re-fetch images we already have
    if (preloadedScreenshots?.length > 0) {
      session.screenshots = session.screenshots?.map((ss, idx) => {
        const preloaded = preloadedScreenshots.find(p => p.index === idx);
        if (preloaded?.fullData) {
          return { ...ss, fullData: preloaded.fullData };
        }
        return ss;
      }) || preloadedScreenshots.map(p => ({ fullData: p.fullData, capturedAt: p.capturedAt }));
    }

    // Check if session already has AI analysis (return cached if not forcing reanalyze)
    if (session.aiAnalysis?.summary && session.aiAnalysis?.analyzedAt && !forceReanalyze) {
      console.log(`[Session Analyze] Returning cached analysis for session ${sessionId} (analyzed at ${session.aiAnalysis.analyzedAt})`);
      return NextResponse.json({
        success: true,
        message: 'Session already analyzed (cached)',
        cached: true,
        analysis: {
          summary: session.aiAnalysis.summary,
          productivityScore: session.aiAnalysis.productivityScore,
          focusScore: session.aiAnalysis.focusScore,
          efficiencyScore: session.aiAnalysis.efficiencyScore,
          scoreBreakdown: session.aiAnalysis.scoreBreakdown,
          workActivities: session.aiAnalysis.workActivities,
          insights: session.aiAnalysis.insights,
          recommendations: session.aiAnalysis.recommendations,
          areasOfImprovement: session.aiAnalysis.areasOfImprovement,
          topAchievements: session.aiAnalysis.topAchievements,
          screenshotAnalysis: session.aiAnalysis.screenshotAnalysis,
          analyzedAt: session.aiAnalysis.analyzedAt
        }
      });
    }

    // Check permissions - use .lean() for read-only queries
    const requester = await User.findById(decoded.userId).select('role employeeId').lean();
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);

    console.log(`[Session Analyze] Permission check: decoded.userId=${decoded.userId}, requester.role=${requester?.role}, isAdmin=${isAdmin}`);
    console.log(`[Session Analyze] Session userId=${session.userId?.toString()}, match=${session.userId?.toString() === decoded.userId}`);

    let hasAccess = isAdmin || session.userId.toString() === decoded.userId;

    if (!hasAccess) {
      console.log(`[Session Analyze] No direct access, checking department head permissions...`);

      // Check if user is a department head and the session belongs to someone in their department
      // First get the requester's employee ID
      let requesterEmployeeId = requester?.employeeId;
      if (!requesterEmployeeId) {
        const requesterEmployee = await Employee.findOne({ userId: decoded.userId }).select('_id').lean();
        requesterEmployeeId = requesterEmployee?._id;
        console.log(`[Session Analyze] Looked up employee from userId: ${requesterEmployeeId}`);
      } else {
        console.log(`[Session Analyze] Got employeeId from User model: ${requesterEmployeeId}`);
      }

      if (requesterEmployeeId) {
        // Check if this employee is head of a department (don't require isActive)
        const dept = await Department.findOne({
          head: requesterEmployeeId
        }).lean();

        console.log(`[Session Analyze] Department where user is head: ${dept?.name || 'NONE'}`);

        if (dept) {
          // Check if the session's employee belongs to this department
          const sessionEmployee = await Employee.findById(session.employeeId).select('department').lean();
          console.log(`[Session Analyze] Session employee dept: ${sessionEmployee?.department?.toString()}, dept._id: ${dept._id.toString()}`);

          if (sessionEmployee && sessionEmployee.department?.toString() === dept._id.toString()) {
            hasAccess = true;
            console.log(`[Session Analyze] Department head ${decoded.userId} authorized to analyze session in ${dept.name}`);
          }
        }
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ success: false, error: 'Unauthorized to analyze this session' }, { status: 403 });
    }

    // Get employee info for role context (populate designation to get actual title)
    const employee = await Employee.findById(session.employeeId)
      .populate('department', 'name')
      .populate('designation', 'title levelName description')
      .select('firstName lastName designation designationLevel designationLevelName department')
      .lean();

    // Extract the actual designation title from the populated object
    const designationTitle = employee?.designation?.title || employee?.designation?.levelName || 'Employee';
    console.log(`[Session Analyze] Starting for session ${sessionId}, ${session.screenshots?.length || 0} screenshots, designation: ${designationTitle}`);

    // Single optimized AI call
    const analysis = await analyzeSessionWithAI(session, employee);

    console.log(`[Session Analyze] Complete: productivity=${analysis.productivityScore}%, focus=${analysis.focusScore}%`);

    // Try to update session with new analysis (don't fail if this times out)
    let dbUpdateSuccess = false;
    try {
      await ProductivitySession.findByIdAndUpdate(sessionId, {
        aiAnalysis: {
          summary: analysis.summary,
          productivityScore: analysis.productivityScore,
          focusScore: analysis.focusScore,
          efficiencyScore: analysis.efficiencyScore,
          scoreBreakdown: analysis.scoreBreakdown,
          workActivities: analysis.workActivities,
          insights: analysis.insights,
          recommendations: analysis.recommendations,
          areasOfImprovement: analysis.areasOfImprovement,
          topAchievements: analysis.topAchievements,
          screenshotAnalysis: analysis.screenshotAnalysis,
          analyzedAt: analysis.analyzedAt
        }
      }, { maxTimeMS: 30000 }); // 30 second timeout for update
      dbUpdateSuccess = true;
    } catch (dbError) {
      console.error('[Session Analyze] DB update failed (analysis still returned):', dbError.message);
    }

    return NextResponse.json({
      success: true,
      message: dbUpdateSuccess ? 'Session analyzed and saved' : 'Session analyzed (save pending)',
      savedToDb: dbUpdateSuccess,
      analysis
    });

  } catch (error) {
    console.error('[Session Analyze API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze session: ' + error.message
    }, { status: 500 });
  }
}
