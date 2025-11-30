import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import Employee from '@/models/Employee';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for batch processing

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
 * POST - Auto-analyze pending sessions in background
 * Can be called by cron job or admin
 * Analyzes sessions that are completed but don't have AI analysis yet
 */
export async function POST(request) {
  try {
    // Optional auth - can be called by cron without auth or by admin with auth
    let isAdmin = false;
    const authHeader = request.headers.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const result = await jwtVerify(token, JWT_SECRET);
        const user = await User.findById(result.payload.userId).select('role');
        isAdmin = ['admin', 'god_admin'].includes(user?.role);
      } catch (e) {
        // Token invalid - continue as cron job
      }
    }
    
    // Parse request body for options
    let limit = 10; // Default: analyze 10 sessions at a time
    try {
      const body = await request.json();
      limit = body.limit || 10;
    } catch (e) {
      // No body or invalid JSON - use defaults
    }

    await connectDB();

    // Find sessions that need AI analysis
    // Criteria: completed, has screenshots, but no aiAnalysis.analyzedAt or low confidence
    const pendingSessions = await ProductivitySession.find({
      status: 'completed',
      'screenshots.0': { $exists: true }, // Has at least one screenshot
      $or: [
        { 'aiAnalysis.analyzedAt': { $exists: false } },
        { 'aiAnalysis.summary': { $exists: false } },
        { 'aiAnalysis.summary': '' }
      ]
    })
    .sort({ sessionEnd: -1 }) // Most recent first
    .limit(limit)
    .lean();

    console.log(`[Auto-Analyze] Found ${pendingSessions.length} sessions needing analysis`);

    if (pendingSessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sessions pending analysis',
        analyzed: 0
      });
    }

    const results = [];

    for (const session of pendingSessions) {
      try {
        // Get employee info for context
        let employee = null;
        if (session.employeeId) {
          employee = await Employee.findById(session.employeeId)
            .populate('department', 'name')
            .lean();
        }
        if (!employee && session.userId) {
          const user = await User.findById(session.userId).select('employeeId');
          if (user?.employeeId) {
            employee = await Employee.findById(user.employeeId)
              .populate('department', 'name')
              .lean();
          }
        }

        // Perform AI analysis
        const analysis = await analyzeSessionWithAI(session, employee);

        // Update session with analysis
        await ProductivitySession.updateOne(
          { _id: session._id },
          { 
            $set: { 
              aiAnalysis: analysis,
              'aiAnalysis.analyzedAt': new Date()
            }
          }
        );

        results.push({
          sessionId: session._id,
          success: true,
          productivityScore: analysis.productivityScore
        });

        console.log(`[Auto-Analyze] Analyzed session ${session._id} - Score: ${analysis.productivityScore}%`);

        // Small delay between sessions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`[Auto-Analyze] Error analyzing session ${session._id}:`, error.message);
        results.push({
          sessionId: session._id,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Analyzed ${successCount} of ${pendingSessions.length} sessions`,
      analyzed: successCount,
      failed: pendingSessions.length - successCount,
      results
    });

  } catch (error) {
    console.error('[Auto-Analyze] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to auto-analyze sessions' 
    }, { status: 500 });
  }
}

/**
 * Analyze screenshots in session using Gemini Vision API
 */
async function analyzeSessionWithAI(session, employee) {
  if (!GEMINI_API_KEY) {
    return generateFallbackAnalysis(session, employee?.designation || 'Employee');
  }

  const designation = employee?.designation || 'Employee';
  const department = employee?.department?.name || 'General';
  const employeeName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : 'Employee';
  const screenshots = session.screenshots || [];
  
  // Get app and website activity context
  const apps = session.appUsageSummary || session.topApps || [];
  const websites = session.websiteVisitSummary || session.topWebsites || [];
  const keystrokes = session.keystrokeSummary || {};
  
  const appList = apps.slice(0, 10).map(a => `${a.appName} (${Math.round((a.totalDuration || a.duration || 0) / 60000)}min)`).join(', ');
  const websiteList = websites.slice(0, 10).map(w => w.domain).join(', ');
  
  // Analyze up to 10 screenshots (sampling if more)
  const screenshotsToAnalyze = screenshots.length <= 10 
    ? screenshots 
    : sampleScreenshots(screenshots, 10);
  
  const screenshotDescriptions = [];
  
  for (let i = 0; i < screenshotsToAnalyze.length; i++) {
    const ss = screenshotsToAnalyze[i];
    const imageData = ss.fullData || ss.thumbnail;
    
    if (!imageData) continue;
    
    try {
      const description = await analyzeScreenshot(imageData, i, screenshotsToAnalyze.length);
      if (description) {
        screenshotDescriptions.push({
          time: ss.capturedAt,
          description
        });
      }
    } catch (e) {
      console.error(`[Auto-Analyze] Screenshot ${i + 1} error:`, e.message);
    }
    
    // Delay between API calls
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Create comprehensive summary using Gemini
  const summaryPrompt = `
You are analyzing a 30-minute work session for ${employeeName}, a ${designation} in ${department} department.

Session Data:
- Duration: ${session.sessionDuration || 30} minutes
- Screenshots analyzed: ${screenshotDescriptions.length}
- Apps used: ${appList || 'None tracked'}
- Websites visited: ${websiteList || 'None tracked'}
- Keystrokes: ${keystrokes.totalCount || 0} total (${keystrokes.averagePerMinute || 0}/min avg)
- Mouse clicks: ${session.mouseActivitySummary?.totalClicks || 0}

Screenshot Analysis:
${screenshotDescriptions.map((s, i) => `${i + 1}. ${s.description}`).join('\n')}

Based on this data, provide:
1. A 2-3 sentence summary of what work was done
2. Productivity score (0-100) - how focused and work-related was the activity?
3. Focus score (0-100) - how concentrated was the work? (fewer app switches = higher)
4. Efficiency score (0-100) - how active was the user based on keystrokes/clicks?
5. 2-3 key insights about the work patterns
6. 1-2 recommendations for improvement
7. List any concerning patterns (excessive social media, gaming, etc.) - only if present

Respond in JSON format:
{
  "summary": "...",
  "productivityScore": number,
  "focusScore": number,
  "efficiencyScore": number,
  "insights": ["..."],
  "recommendations": ["..."],
  "concerns": ["..."],
  "topAchievements": ["..."]
}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: summaryPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Session analyzed',
        productivityScore: Math.max(0, Math.min(100, parsed.productivityScore || 50)),
        focusScore: Math.max(0, Math.min(100, parsed.focusScore || 50)),
        efficiencyScore: Math.max(0, Math.min(100, parsed.efficiencyScore || 50)),
        insights: parsed.insights || [],
        recommendations: parsed.recommendations || [],
        areasOfImprovement: parsed.concerns || [],
        topAchievements: parsed.topAchievements || [],
        screenshotAnalyses: screenshotDescriptions,
        analyzedAt: new Date()
      };
    }
  } catch (error) {
    console.error('[Auto-Analyze] Summary generation error:', error.message);
  }

  // Fallback if AI fails
  return generateFallbackAnalysis(session, designation);
}

/**
 * Analyze a single screenshot
 */
async function analyzeScreenshot(imageData, index, total) {
  try {
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
                text: `Screenshot ${index + 1}/${total}. Briefly (1 sentence): What app/website is shown and what is the user doing?`
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 50
          }
        })
      }
    );

    if (!response.ok) return null;

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (error) {
    return null;
  }
}

/**
 * Sample screenshots evenly from array
 */
function sampleScreenshots(screenshots, count) {
  if (screenshots.length <= count) return screenshots;
  
  const result = [];
  const step = (screenshots.length - 1) / (count - 1);
  
  for (let i = 0; i < count; i++) {
    result.push(screenshots[Math.round(i * step)]);
  }
  
  return result;
}

/**
 * Generate fallback analysis without AI
 */
function generateFallbackAnalysis(session, designation) {
  const apps = session.appUsageSummary || session.topApps || [];
  const websites = session.websiteVisitSummary || session.topWebsites || [];
  const keystrokes = session.keystrokeSummary?.totalCount || 0;
  const clicks = session.mouseActivitySummary?.totalClicks || 0;
  
  // Calculate basic scores
  const productiveApps = apps.filter(a => a.category === 'productive').length;
  const distractingApps = apps.filter(a => a.category === 'unproductive' || a.category === 'distracting').length;
  
  let productivityScore = 50; // Base score
  productivityScore += productiveApps * 10;
  productivityScore -= distractingApps * 15;
  productivityScore = Math.max(0, Math.min(100, productivityScore));
  
  const focusScore = apps.length <= 3 ? 80 : apps.length <= 5 ? 60 : 40;
  
  const actionsPerMin = (keystrokes + clicks) / (session.sessionDuration || 30);
  const efficiencyScore = actionsPerMin >= 20 ? 80 : actionsPerMin >= 10 ? 60 : 40;
  
  const topApp = apps[0]?.appName || 'Unknown';
  
  return {
    summary: `${session.sessionDuration || 30}-minute session. Primary activity: ${topApp}. ${apps.length} apps used, ${websites.length} websites visited.`,
    productivityScore,
    focusScore,
    efficiencyScore,
    insights: [
      `Most used app: ${topApp}`,
      `${keystrokes} keystrokes, ${clicks} mouse clicks`,
      apps.length <= 3 ? 'Good focus - minimal context switching' : 'Multiple apps used - consider focusing on fewer tasks'
    ],
    recommendations: [
      productivityScore < 60 ? 'Try using focus mode to reduce distractions' : 'Keep up the productive work!',
      'Take regular breaks every 90 minutes'
    ],
    areasOfImprovement: distractingApps > 0 ? ['Reduce time on non-work apps'] : [],
    topAchievements: productivityScore >= 70 ? ['High productivity session'] : [],
    analyzedAt: new Date()
  };
}

/**
 * GET - Get auto-analyze status and pending count
 */
export async function GET(request) {
  try {
    await connectDB();

    const pendingCount = await ProductivitySession.countDocuments({
      status: 'completed',
      'screenshots.0': { $exists: true },
      $or: [
        { 'aiAnalysis.analyzedAt': { $exists: false } },
        { 'aiAnalysis.summary': { $exists: false } },
        { 'aiAnalysis.summary': '' }
      ]
    });

    const analyzedToday = await ProductivitySession.countDocuments({
      'aiAnalysis.analyzedAt': { 
        $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
      }
    });

    return NextResponse.json({
      success: true,
      pendingCount,
      analyzedToday,
      hasGeminiKey: !!GEMINI_API_KEY
    });

  } catch (error) {
    console.error('[Auto-Analyze Status] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to get status' 
    }, { status: 500 });
  }
}
