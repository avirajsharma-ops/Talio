import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';

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
async function analyzeScreenshot(imageData, index, total, GEMINI_API_KEY) {
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
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              },
              {
                text: `Screenshot ${index + 1} of ${total}. Briefly describe (1-2 sentences max): What application/website is shown? What is the user doing? Is this work-related activity?`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 100
          }
        })
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[Screenshot ${index + 1}] API error: ${response.status}`);
      return null;
    }

    const result = await response.json();
    const description = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return description.trim();
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
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
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
    const maxScreenshots = Math.min(screenshots.length, 10); // Limit to 10 screenshots max
    
    for (let i = 0; i < maxScreenshots; i++) {
      const screenshot = screenshots[i];
      const imageData = screenshot?.fullData || screenshot?.thumbnail;
      
      if (imageData && imageData.length > 100) {
        console.log(`[Session Analyze] Analyzing screenshot ${i + 1}/${maxScreenshots}...`);
        const description = await analyzeScreenshot(imageData, i, maxScreenshots, GEMINI_API_KEY);
        
        if (description) {
          screenshotDescriptions.push({
            index: i + 1,
            time: screenshot.capturedAt ? new Date(screenshot.capturedAt).toLocaleTimeString() : `Screenshot ${i + 1}`,
            description
          });
          console.log(`[Session Analyze] Screenshot ${i + 1}: ${description.slice(0, 80)}...`);
        }
        
        // Small delay between requests to avoid rate limiting
        if (i < maxScreenshots - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    
    console.log(`[Session Analyze] Analyzed ${screenshotDescriptions.length} screenshots, generating comprehensive summary...`);
    
    // Phase 2: Generate comprehensive analysis combining all data
    const screenshotSummary = screenshotDescriptions.length > 0
      ? screenshotDescriptions.map(s => `[${s.time}] ${s.description}`).join('\n')
      : 'No screenshots were available for analysis.';
    
    const comprehensivePrompt = `You are an expert workplace productivity analyst conducting a detailed assessment of an employee's work session.

═══════════════════════════════════════════════════════════════════════
EMPLOYEE PROFILE
═══════════════════════════════════════════════════════════════════════
• Full Name: ${employeeName}
• Job Title/Designation: ${designationTitle}
• Job Description: ${designationDescription || 'Standard duties for this role'}
• Department: ${department}

IMPORTANT: Evaluate this employee's activities SPECIFICALLY based on their job title "${designationTitle}" and what someone in this role would typically do. A software developer has different productive activities than a marketing manager or HR executive.

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
ROLE-SPECIFIC PRODUCTIVITY CRITERIA
═══════════════════════════════════════════════════════════════════════

Based on the job title "${designationTitle}", apply these relevant criteria:

FOR SOFTWARE/TECH ROLES (Developer, Engineer, Programmer, QA, DevOps):
• HIGHLY PRODUCTIVE: VS Code, IntelliJ, Xcode, Terminal, Git, debugging tools, Stack Overflow, GitHub, technical documentation, API testing (Postman), database tools
• PRODUCTIVE: Slack/Teams for work discussions, Jira/Trello, code reviews, technical blogs
• NEUTRAL: Email, calendar, general browsing for research
• DISTRACTING: Social media, entertainment, shopping (unless role-related)

FOR DESIGN ROLES (Designer, UX, UI, Creative):
• HIGHLY PRODUCTIVE: Figma, Sketch, Adobe Creative Suite, Canva, design research, Dribbble, Behance
• PRODUCTIVE: Design feedback tools, prototyping, client communication
• NEUTRAL: Email, reference browsing, inspiration gathering
• DISTRACTING: Non-design social media, entertainment

FOR MARKETING ROLES (Marketing, Content, SEO, Social Media):
• HIGHLY PRODUCTIVE: Analytics (Google Analytics, Meta), social media management tools, content creation, CRM, email marketing platforms, SEO tools
• PRODUCTIVE: Social media research, competitor analysis, content planning
• NEUTRAL: Industry news, trend research
• DISTRACTING: Personal social media, unrelated browsing

FOR HR ROLES (HR, Recruiter, People Operations):
• HIGHLY PRODUCTIVE: HRMS systems, ATS platforms, LinkedIn Recruiter, policy documents, employee records, payroll systems
• PRODUCTIVE: Email for candidate/employee communication, calendar for interviews, documentation
• NEUTRAL: HR news, industry benchmarks
• DISTRACTING: Personal browsing, entertainment

FOR SALES ROLES (Sales, Business Development, Account Management):
• HIGHLY PRODUCTIVE: CRM (Salesforce, HubSpot), email campaigns, proposal tools, call/demo tools
• PRODUCTIVE: LinkedIn for prospecting, industry research, pricing tools
• NEUTRAL: General email, calendar management
• DISTRACTING: Personal browsing, non-work social media

FOR MANAGEMENT ROLES (Manager, Lead, Director, Head):
• HIGHLY PRODUCTIVE: Team management tools, reporting dashboards, strategic planning, documentation
• PRODUCTIVE: Email, calendar, 1-on-1 meetings, team communication, reviews
• NEUTRAL: Industry reading, professional development
• DISTRACTING: Excessive personal browsing

FOR ADMINISTRATIVE ROLES (Admin, Assistant, Coordinator):
• HIGHLY PRODUCTIVE: Document management, scheduling, data entry, office tools, coordination platforms
• PRODUCTIVE: Email, calendar, file organization
• NEUTRAL: Reference lookups
• DISTRACTING: Personal browsing, entertainment

═══════════════════════════════════════════════════════════════════════
SCORING METHODOLOGY (Apply Rigorously)
═══════════════════════════════════════════════════════════════════════

PRODUCTIVITY SCORE (0-100):
• 90-100: Exceptional - Sustained high-value work directly aligned with job responsibilities
• 75-89: High - Consistent productive work with minimal distractions
• 60-74: Moderate - Mix of productive and neutral activities, some context switching
• 40-59: Low - Significant time on non-work activities or excessive idle periods
• 0-39: Very Low - Predominantly distracted or inactive

FOCUS SCORE (0-100):
• 90-100: Deep focus - Stayed on 1-2 related apps/tasks, minimal switching
• 75-89: Good focus - Limited app switching, coherent work patterns
• 60-74: Moderate focus - Some task switching but generally on track
• 40-59: Fragmented - Frequent app/context switching affecting continuity
• 0-39: Highly scattered - Constant switching, no sustained attention

EFFICIENCY SCORE (0-100):
• 90-100: Optimal - High output indicators (keystrokes, meaningful clicks), streamlined workflow
• 75-89: Good - Consistent activity, effective tool usage
• 60-74: Average - Moderate activity levels, some workflow inefficiencies
• 40-59: Below average - Low activity or inefficient patterns
• 0-39: Poor - Very low activity or significant workflow issues

═══════════════════════════════════════════════════════════════════════
REQUIRED JSON OUTPUT
═══════════════════════════════════════════════════════════════════════

{
  "summary": "A detailed 4-6 sentence narrative analyzing: (1) What the ${designationTitle} worked on during this session, (2) Key activities observed with specific app/website mentions, (3) Work pattern quality and flow, (4) Overall productivity assessment considering their specific role requirements.",
  "productivityScore": [0-100 based on role-specific criteria above],
  "focusScore": [0-100 based on task switching and attention patterns],
  "efficiencyScore": [0-100 based on activity levels and workflow],
  "scoreBreakdown": {
    "productivityReason": "Brief explanation of productivity score",
    "focusReason": "Brief explanation of focus score",
    "efficiencyReason": "Brief explanation of efficiency score"
  },
  "workActivities": ["Specific activity 1 detected", "Activity 2", "Activity 3", "Activity 4", "Activity 5"],
  "insights": [
    "Specific insight about work patterns observed",
    "Insight about tool/app usage effectiveness",
    "Insight about time allocation"
  ],
  "recommendations": [
    "Actionable recommendation to improve productivity",
    "Specific tip based on observed patterns"
  ],
  "areasOfImprovement": ["Specific area where improvement is needed based on observations"],
  "topAchievements": ["Positive achievement or good practice observed in this session"]
}

CRITICAL: Be accurate and fair. Base scores strictly on observed data, not assumptions. If screenshots show productive work, score high. If they show browsing/entertainment, score accordingly. Consider the role context - what's distracting for a developer might be productive for a social media manager.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: comprehensivePrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Session Analyze] Gemini API error (${response.status}):`, errorText.slice(0, 300));
      return generateFallbackAnalysis(session, designationTitle);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
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
      .select('firstName lastName designation department')
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
