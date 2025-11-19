/**
 * MAYA Screenshot Submission API
 * Receives screenshots from monitored users and analyzes them
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ScreenMonitor from '@/models/ScreenMonitor';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import User from '@/models/User';
import Employee from '@/models/Employee';
import OpenAI from 'openai';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

// Initialize OpenAI client lazily to avoid build-time errors
let openai = null;
function getOpenAIClient() {
  if (!openai) {
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (apiKey) {
      openai = new OpenAI({ apiKey });
    }
  }
  return openai;
}

/**
 * POST /api/maya/submit-screenshot
 * Submit screenshot for a monitoring request
 */
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    const body = await request.json();
    const { requestId, screenshot, currentPage, activeApplications } = body;

    if (!requestId || !screenshot) {
      return NextResponse.json({ error: 'Request ID and screenshot are required' }, { status: 400 });
    }

    // Find the monitoring request
    const monitorRequest = await ScreenMonitor.findById(requestId);
    if (!monitorRequest) {
      return NextResponse.json({ error: 'Monitoring request not found' }, { status: 404 });
    }

    // Verify the screenshot is from the correct user
    if (monitorRequest.targetUser.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized: You are not the target of this monitoring request' }, { status: 403 });
    }

    // Update the monitoring request with screenshot
    monitorRequest.screenshot = screenshot;
    monitorRequest.currentPage = currentPage;
    monitorRequest.activeApplications = activeApplications;
    monitorRequest.status = 'captured';
    monitorRequest.capturedAt = new Date();
    await monitorRequest.save();

    // Analyze the screenshot using OpenAI Vision
    try {
      const client = getOpenAIClient();
      if (!client) {
        throw new Error('OpenAI client not configured');
      }
      const analysisResponse = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are MAYA, an AI assistant analyzing a user's screen activity. Provide a brief, professional summary of what the user is doing based on the screenshot. Focus on:
1. What application/page they are using
2. What task they appear to be working on
3. General activity level (active work, idle, meeting, etc.)

Keep the summary concise (2-3 sentences) and professional. Do not include sensitive information like passwords or personal data.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this screenshot and provide a brief summary of what the user is doing. Current page: ${currentPage?.title || 'Unknown'}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: screenshot,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const summary = analysisResponse.choices[0]?.message?.content || 'Unable to analyze screenshot';

      // Update with analysis
      monitorRequest.summary = summary;
      monitorRequest.status = 'analyzed';
      await monitorRequest.save();

      // Store in MAYA's dedicated screen summary collection
      try {
        const targetUser = await User.findById(monitorRequest.targetUser).populate('employeeId');
        const requesterUser = await User.findById(monitorRequest.requestedBy).populate('employeeId');

        const mayaScreenSummary = await MayaScreenSummary.create({
          monitoredUserId: monitorRequest.targetUser,
          monitoredEmployeeId: targetUser?.employeeId?._id || targetUser?.employeeId,
          requestedByUserId: monitorRequest.requestedBy,
          requestedByEmployeeId: requesterUser?.employeeId?._id || requesterUser?.employeeId,
          captureType: 'screenshot',
          summary,
          detailedAnalysis: summary,
          currentPage: currentPage ? {
            url: currentPage.url,
            title: currentPage.title,
            path: currentPage.path,
          } : undefined,
          activities: activeApplications || [],
          screenshotUrl: screenshot.substring(0, 100) + '...', // Store reference, not full base64
          status: 'analyzed',
          consentGiven: true, // User gave consent when allowing the capture
          consentTimestamp: new Date(),
          deliveredAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });

        console.log('✅ Screen summary stored in MAYA DB:', mayaScreenSummary._id);
      } catch (mayaDbError) {
        console.error('❌ Failed to store in MAYA DB:', mayaDbError);
        // Don't fail the request if MAYA DB storage fails
      }

      // Notify the requester via Socket.IO
      global.io?.emit('maya:screen-analysis-complete', {
        requestId: monitorRequest._id,
        requestedBy: monitorRequest.requestedBy.toString(),
        targetUserName: monitorRequest.targetUserName,
        summary,
        currentPage: currentPage?.title,
      });

      return NextResponse.json({
        success: true,
        message: 'Screenshot submitted and analyzed',
        requestId: monitorRequest._id,
        summary,
      });

    } catch (analysisError) {
      console.error('❌ Screenshot Analysis Error:', analysisError);
      
      // Still save the screenshot even if analysis fails
      monitorRequest.status = 'captured';
      monitorRequest.error = 'Analysis failed: ' + analysisError.message;
      await monitorRequest.save();

      return NextResponse.json({
        success: true,
        message: 'Screenshot submitted but analysis failed',
        requestId: monitorRequest._id,
        error: 'Analysis failed',
      });
    }

  } catch (error) {
    console.error('❌ Submit Screenshot Error:', error);
    return NextResponse.json({ 
      error: 'Failed to submit screenshot',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/maya/submit-screenshot/[requestId]
 * Get screenshot and analysis for a specific request
 */
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');

    if (!requestId) {
      return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
    }

    const monitorRequest = await ScreenMonitor.findById(requestId);
    if (!monitorRequest) {
      return NextResponse.json({ error: 'Monitoring request not found' }, { status: 404 });
    }

    // Verify the user is authorized to view this
    if (monitorRequest.requestedBy.toString() !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      request: monitorRequest,
    });

  } catch (error) {
    console.error('❌ Get Screenshot Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get screenshot',
      details: error.message,
    }, { status: 500 });
  }
}

