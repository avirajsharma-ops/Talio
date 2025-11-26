import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import AutoScreenCapture from '@/models/AutoScreenCapture';
import OpenAI from 'openai';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY });

/**
 * POST /api/monitoring/screenshot
 * Receive and analyze screenshots from desktop apps
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const employee = user.employeeId;
    if (!employee) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { screenshot, timestamp } = body;

    if (!screenshot) {
      return NextResponse.json({ error: 'Screenshot data required' }, { status: 400 });
    }

    // Validate screenshot size (max 10MB)
    const screenshotSize = Buffer.byteLength(screenshot, 'base64');
    if (screenshotSize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Screenshot too large (max 10MB)' }, { status: 400 });
    }

    // Analyze screenshot with OpenAI Vision
    let analysis = {
      summary: 'Screenshot captured',
      applications: [],
      activity: 'unknown',
      productivity: 'neutral',
      contentTypes: []
    };

    try {
      const visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this screenshot from an employee's desktop. Provide a brief JSON response with:
                - summary: One sentence describing what the employee is doing
                - applications: Array of visible application names
                - activity: One of [coding, browsing, email, document, meeting, design, communication, entertainment, other]
                - productivity: One of [highly-productive, productive, neutral, low-productivity, distraction]
                - contentTypes: Array of content types visible [code, text, images, video, spreadsheet, presentation, chat, social-media]
                
                Respond ONLY with valid JSON, no markdown.`
              },
              {
                type: 'image_url',
                image_url: { url: screenshot, detail: 'low' }
              }
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const content = visionResponse.choices[0]?.message?.content || '';
      try {
        analysis = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
      } catch (e) {
        console.log('Could not parse vision response, using default analysis');
      }
    } catch (visionError) {
      console.error('Vision API error:', visionError.message);
    }

    // Save screenshot with analysis
    const screenCapture = new AutoScreenCapture({
      employee: employee._id,
      user: user._id,
      screenshot,
      screenshotSize,
      capturedAt: new Date(timestamp),
      analysis,
      source: 'desktop-app',
      deviceInfo: {
        platform: request.headers.get('user-agent')?.includes('Windows') ? 'windows' : 'darwin',
        captureMethod: 'desktop-capturer'
      }
    });

    await screenCapture.save();

    // Emit socket event to notify admins/managers
    const io = global.io;
    if (io) {
      io.to(`department:${employee.department}`).emit('employee:screenshot-captured', {
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        capturedAt: timestamp,
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
    console.error('❌ Monitoring screenshot error:', error);
    return NextResponse.json(
      { error: 'Failed to process screenshot', details: error.message },
      { status: 500 }
    );
  }
}

