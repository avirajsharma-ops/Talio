/**
 * MAYA Screenshot Submission API
 * Receives screenshots from monitored users and analyzes them
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import ScreenMonitor from '@/models/ScreenMonitor';
import OpenAI from 'openai';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY });

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
      const analysisResponse = await openai.chat.completions.create({
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

