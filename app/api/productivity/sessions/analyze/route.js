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
    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let base64Data = imageData;
    if (imageData.startsWith('data:')) {
      const base64Match = imageData.match(/base64,(.+)/);
      if (base64Match) {
        base64Data = base64Match[1];
      }
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/png',
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
    return generateFallbackAnalysis(session, employee?.designation || 'Employee');
  }

  const designation = employee?.designation || 'Employee';
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
  
  console.log(`[Session Analyze] Starting comprehensive analysis for ${employeeName} (${designation}) in ${department}`);
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
    
    const comprehensivePrompt = `You are analyzing a work session for productivity assessment.

EMPLOYEE CONTEXT:
- Name: ${employeeName}
- Role: ${designation}
- Department: ${department}
- This employee should be evaluated based on their specific job responsibilities.

SESSION OVERVIEW:
- Duration: ${session.sessionDuration || 30} minutes
- Total keystrokes: ${keystrokeCount}
- Mouse clicks: ${mouseClicks}
- Screenshots analyzed: ${screenshotDescriptions.length}

APPLICATION USAGE:
${appList}

WEBSITE ACTIVITY:
${websiteList}

SCREENSHOT ANALYSIS (chronological):
${screenshotSummary}

ROLE-SPECIFIC PRODUCTIVITY GUIDELINES:
- Developers: coding, debugging, documentation, IDE usage, Stack Overflow = productive
- Designers: Figma, Sketch, Adobe tools, design research = productive  
- Marketing: social media management, analytics, content creation, campaigns = productive
- HR: HRMS systems, communication, policy documents, recruitment = productive
- Managers: email, calendar, meetings, planning, team communication = productive
- Sales: CRM, email, calls, proposals = productive

Based on ALL the above data, provide a comprehensive JSON analysis:
{
  "summary": "3-5 sentences providing a detailed narrative of the entire session. Describe what the employee did throughout, the progression of activities, and overall productivity assessment for their role.",
  "productivityScore": 0-100,
  "focusScore": 0-100,
  "efficiencyScore": 0-100,
  "workActivities": ["list of main work activities identified"],
  "insights": ["insight 1 about work patterns", "insight 2", "insight 3"],
  "recommendations": ["actionable recommendation 1", "recommendation 2"],
  "areasOfImprovement": ["specific area to improve"],
  "topAchievements": ["positive achievement if any"]
}`;

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
      return generateFallbackAnalysis(session, designation);
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
    return generateFallbackAnalysis(session, designation);
    
  } catch (error) {
    console.error('[Session Analyze] Error:', error.message);
    return generateFallbackAnalysis(session, designation);
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

    const { sessionId } = await request.json();
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
    }

    // Fetch session with full data
    const session = await ProductivitySession.findById(sessionId).lean();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check permissions
    const requester = await User.findById(decoded.userId).select('role');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    
    if (!isAdmin && session.userId.toString() !== decoded.userId) {
      // Check if department head
      const dept = await Department.findOne({ 
        head: toObjectId(decoded.userId),
        isActive: true 
      });
      if (!dept) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Get employee info for role context
    const employee = await Employee.findById(session.employeeId)
      .populate('department', 'name')
      .select('firstName lastName designation department')
      .lean();

    console.log(`[Session Analyze] Starting for session ${sessionId}, ${session.screenshots?.length || 0} screenshots, employee: ${employee?.designation || 'Unknown'}`);

    // Single optimized AI call
    const analysis = await analyzeSessionWithAI(session, employee);
    
    console.log(`[Session Analyze] Complete: productivity=${analysis.productivityScore}%, focus=${analysis.focusScore}%`);

    // Update session with new analysis
    await ProductivitySession.findByIdAndUpdate(sessionId, {
      aiAnalysis: {
        summary: analysis.summary,
        productivityScore: analysis.productivityScore,
        focusScore: analysis.focusScore,
        efficiencyScore: analysis.efficiencyScore,
        workActivities: analysis.workActivities,
        insights: analysis.insights,
        recommendations: analysis.recommendations,
        areasOfImprovement: analysis.areasOfImprovement,
        topAchievements: analysis.topAchievements,
        screenshotAnalysis: analysis.screenshotAnalysis,
        analyzedAt: analysis.analyzedAt
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Session analyzed successfully',
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
