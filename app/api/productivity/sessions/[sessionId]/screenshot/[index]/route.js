import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * GET - Get a specific screenshot's fullData by index
 * This allows lazy-loading screenshot images in the carousel
 */
export async function GET(request, { params }) {
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

    const { sessionId, index } = await params;
    const screenshotIndex = parseInt(index, 10);

    if (isNaN(screenshotIndex) || screenshotIndex < 0) {
      return NextResponse.json({ success: false, error: 'Invalid screenshot index' }, { status: 400 });
    }

    // Check permissions first
    const sessionBasic = await ProductivitySession.findById(sessionId)
      .select('userId')
      .lean();

    if (!sessionBasic) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const requester = await User.findById(decoded.userId).select('role');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    const isDeptHead = requester?.role === 'department_head';
    const isOwner = sessionBasic.userId?.toString() === decoded.userId;

    if (!isAdmin && !isDeptHead && !isOwner) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Use aggregation to extract just the specific screenshot
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(sessionId) } },
      {
        $project: {
          screenshot: { $arrayElemAt: ['$screenshots', screenshotIndex] }
        }
      }
    ];

    const [result] = await ProductivitySession.aggregate(pipeline);

    if (!result?.screenshot) {
      return NextResponse.json({ success: false, error: 'Screenshot not found' }, { status: 404 });
    }

    // Ensure fullData and thumbnail have proper data URI prefixes
    let fullData = result.screenshot.fullData;
    let thumbnail = result.screenshot.thumbnail;
    
    if (fullData && !fullData.startsWith('data:')) {
      const mimeType = fullData.startsWith('/9j/') ? 'image/jpeg' : 
                      fullData.startsWith('iVBOR') ? 'image/png' : 'image/webp';
      fullData = `data:${mimeType};base64,${fullData}`;
    }
    
    if (thumbnail && !thumbnail.startsWith('data:')) {
      const mimeType = thumbnail.startsWith('/9j/') ? 'image/jpeg' : 
                      thumbnail.startsWith('iVBOR') ? 'image/png' : 'image/webp';
      thumbnail = `data:${mimeType};base64,${thumbnail}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: result.screenshot._id,
        capturedAt: result.screenshot.capturedAt,
        captureType: result.screenshot.captureType,
        fullData,
        thumbnail
      }
    });

  } catch (error) {
    console.error('[Screenshot API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch screenshot' 
    }, { status: 500 });
  }
}
