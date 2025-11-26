import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import AutoScreenCapture from '@/models/AutoScreenCapture';
import { getCurrentISTDate } from '@/lib/timezone';
import OpenAI from 'openai';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY });

/**
 * POST /api/activity/screenshot
 * Receive and analyze automatic screenshots
 */
export async function POST(request) {
  try {
    await connectDB();

    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.payload.userId;

    const user = await User.findById(userId).populate('employeeId');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const employee = user.employeeId;
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      screenshot,
      capturedAt,
      windowTitle,
      activeApplication, // From desktop apps
      url,
      domain,
      sessionId,
      deviceId,        // From desktop apps
      deviceInfo       // From desktop apps { platform, screenResolution, displays }
    } = body;

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot data required' },
        { status: 400 }
      );
    }

    // Validate screenshot size (max 10MB)
    const screenshotSize = Buffer.byteLength(screenshot, 'base64');
    if (screenshotSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Screenshot too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Analyze screenshot with OpenAI Vision
    console.log('🔍 Analyzing screenshot with OpenAI Vision...');
    
    let analysis = {
      summary: 'Analysis pending',
      applications: [],
      activity: 'unknown',
      productivity: 'neutral',
      contentType: [],
      detectedText: '',
      aiConfidence: 0
    };

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this employee screen capture and provide:
1. A brief summary of what the employee is doing
2. List of visible applications/windows
3. Type of activity (coding, browsing, email, meeting, document-editing, design, data-entry, idle, etc.)
4. Productivity level (highly-productive, productive, neutral, low-productivity, distraction)
5. Content types visible (code, document, email, chat, video, dashboard, etc.)
6. Any visible text (OCR)

Employee: ${employee.firstName} ${employee.lastName}
Time: ${new Date(capturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
Window: ${windowTitle}
URL: ${url || 'N/A'}

Respond in JSON format:
{
  "summary": "brief description",
  "applications": ["app1", "app2"],
  "activity": "activity type",
  "productivity": "productivity level",
  "contentType": ["type1", "type2"],
  "detectedText": "visible text",
  "confidence": 0-100
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshot,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const responseText = response.choices[0].message.content;
      
      // Parse JSON response
      try {
        const parsedAnalysis = JSON.parse(responseText);
        analysis = {
          summary: parsedAnalysis.summary || 'No summary available',
          applications: parsedAnalysis.applications || [],
          activity: parsedAnalysis.activity || 'unknown',
          productivity: parsedAnalysis.productivity || 'neutral',
          contentType: parsedAnalysis.contentType || [],
          detectedText: parsedAnalysis.detectedText || '',
          aiConfidence: parsedAnalysis.confidence || 70
        };
      } catch (parseError) {
        // If JSON parsing fails, use raw text as summary
        analysis.summary = responseText;
        analysis.aiConfidence = 60;
      }

      console.log('✅ Screenshot analyzed:', analysis.summary);
    } catch (visionError) {
      console.error('❌ OpenAI Vision analysis failed:', visionError);
      // Continue without analysis
    }

    // Determine platform from device info or user agent
    const platform = deviceInfo?.platform ||
                     (request.headers.get('user-agent')?.includes('Windows') ? 'windows' :
                      request.headers.get('user-agent')?.includes('Mac') ? 'mac' : 'browser');

    // Save screenshot with analysis
    const screenCapture = new AutoScreenCapture({
      employee: employee._id,
      user: user._id,
      screenshot,
      screenshotSize,
      capturedAt: new Date(capturedAt),
      windowTitle,
      activeApplication: activeApplication || extractApplicationName(windowTitle),
      url,
      domain,
      analysis,
      sessionId,
      deviceId: deviceId || null,
      deviceInfo: {
        userAgent: request.headers.get('user-agent'),
        platform: platform,
        screenResolution: deviceInfo?.screenResolution || null,
        displays: deviceInfo?.displays || 1,
        captureMethod: deviceInfo?.captureMethod || 'browser'
      }
    });

    await screenCapture.save();

    // Emit socket event to notify admins/managers
    const io = global.io;
    if (io) {
      io.to(`department:${employee.department}`).emit('employee:screenshot-captured', {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        capturedAt,
        productivity: analysis.productivity,
        activity: analysis.activity
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Screenshot captured and analyzed',
      captureId: screenCapture._id,
      analysis: {
        summary: analysis.summary,
        productivity: analysis.productivity,
        activity: analysis.activity
      }
    });

  } catch (error) {
    console.error('❌ Screenshot capture error:', error);
    return NextResponse.json(
      { error: 'Failed to process screenshot', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper: Extract application name from window title
 */
function extractApplicationName(windowTitle) {
  if (!windowTitle) return 'Unknown';
  
  if (windowTitle.includes('Google Chrome')) return 'Google Chrome';
  if (windowTitle.includes('Firefox')) return 'Mozilla Firefox';
  if (windowTitle.includes('Safari')) return 'Safari';
  if (windowTitle.includes('Visual Studio Code')) return 'VS Code';
  if (windowTitle.includes('Slack')) return 'Slack';
  if (windowTitle.includes('Microsoft Teams')) return 'Microsoft Teams';
  if (windowTitle.includes('Zoom')) return 'Zoom';
  
  return windowTitle.split('-')[windowTitle.split('-').length - 1].trim();
}
