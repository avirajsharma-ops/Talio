import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import MayaScreenSummary from '@/models/MayaScreenSummary';
import { analyzeScreenshot } from '@/lib/mayaProductivityAnalyzer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for AI analysis

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// POST - Upload screenshot for instant capture request
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

    const { requestId, screenshot, timestamp } = await request.json();

    if (!requestId || !screenshot) {
      return NextResponse.json({ 
        success: false, 
        error: 'Request ID and screenshot are required' 
      }, { status: 400 });
    }

    await connectDB();

    // Find the capture request
    const captureRequest = await MayaScreenSummary.findById(requestId);
    if (!captureRequest) {
      return NextResponse.json({ 
        success: false, 
        error: 'Capture request not found' 
      }, { status: 404 });
    }

    // Verify this user is the target of the capture
    if (captureRequest.monitoredUserId.toString() !== decoded.userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'You can only upload screenshots for your own capture requests' 
      }, { status: 403 });
    }

    // Update with screenshot data
    captureRequest.screenshotData = screenshot;
    captureRequest.capturedAt = timestamp || new Date();
    captureRequest.status = 'captured';
    await captureRequest.save();

    console.log(`[Instant Capture] Screenshot uploaded for request ${requestId}`);

    // Trigger AI analysis in background
    analyzeScreenshotAsync(requestId, screenshot);

    return NextResponse.json({
      success: true,
      message: 'Screenshot uploaded successfully. AI analysis in progress...',
      data: {
        requestId: captureRequest._id,
        status: 'captured',
      },
    });

  } catch (error) {
    console.error('Screenshot Upload Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to upload screenshot' 
    }, { status: 500 });
  }
}

// Async function to analyze screenshot without blocking response
async function analyzeScreenshotAsync(requestId, screenshot) {
  try {
    await connectDB();
    
    const captureRequest = await MayaScreenSummary.findById(requestId);
    if (!captureRequest) return;

    // Analyze screenshot with MAYA
    const analysis = await analyzeScreenshot(screenshot);

    // Update with analysis results
    captureRequest.summary = analysis.summary || 'Analysis complete';
    captureRequest.productivityScore = analysis.productivityScore || 0;
    captureRequest.applications = analysis.applications || [];
    captureRequest.aiAnalysis = analysis.detailedAnalysis || analysis.summary;
    captureRequest.status = 'analyzed';
    captureRequest.analyzedAt = new Date();
    
    await captureRequest.save();

    console.log(`[Instant Capture] Analysis complete for request ${requestId}`);

    // Emit socket event for real-time update
    if (global.io) {
      global.io.emit('capture-analyzed', {
        requestId: requestId,
        status: 'analyzed',
        productivityScore: analysis.productivityScore,
      });
    }

  } catch (error) {
    console.error('[Instant Capture] Analysis error:', error);
    
    // Update status to error
    try {
      await connectDB();
      await MayaScreenSummary.findByIdAndUpdate(requestId, {
        status: 'error',
        summary: `Analysis failed: ${error.message}`
      });
    } catch (updateError) {
      console.error('[Instant Capture] Failed to update error status:', updateError);
    }
  }
}
