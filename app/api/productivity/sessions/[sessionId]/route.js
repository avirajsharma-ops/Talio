import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import ProductivitySession from '@/models/ProductivitySession';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * GET - Get session details with screenshots (thumbnails only for list, fullData only for current screenshot)
 * Query params: ?fullScreenshots=true to get all fullData (expensive)
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

    const { sessionId } = await params;
    const { searchParams } = new URL(request.url);
    const fullScreenshots = searchParams.get('fullScreenshots') === 'true';

    // Check permissions first with a minimal query
    const sessionBasic = await ProductivitySession.findById(sessionId)
      .select('userId employeeId')
      .lean();

    if (!sessionBasic) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const requester = await User.findById(decoded.userId).select('role').lean();
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    const isDeptHead = requester?.role === 'department_head';
    const isOwner = sessionBasic.userId?.toString() === decoded.userId;

    if (!isAdmin && !isDeptHead && !isOwner) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Use aggregation to fetch session WITHOUT screenshot fullData
    // The frontend will lazy-load individual screenshots via the /screenshot/[index] endpoint
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(sessionId) } },
      {
        $project: {
          sessionStart: 1,
          sessionEnd: 1,
          sessionDuration: 1,
          durationMinutes: 1,
          status: 1,
          productivityScore: 1,
          activeTime: 1,
          idleTime: 1,
          appUsage: 1,
          appUsageSummary: 1,
          topApps: 1,
          websiteVisits: 1,
          websiteVisitSummary: 1,
          topWebsites: 1,
          keystrokeSummary: 1,
          mouseActivitySummary: 1,
          aiAnalysis: 1,
          userId: 1,
          employeeId: 1,
          screenshotCount: { $size: { $ifNull: ['$screenshots', []] } },
          // Only include metadata for each screenshot, NO fullData or thumbnails
          // Frontend will fetch individual screenshots on demand
          screenshots: fullScreenshots ? '$screenshots' : {
            $map: {
              input: { $ifNull: ['$screenshots', []] },
              as: 'ss',
              in: {
                _id: '$$ss._id',
                capturedAt: '$$ss.capturedAt',
                captureType: '$$ss.captureType'
                // No thumbnail or fullData - will be fetched on demand
              }
            }
          }
        }
      }
    ];

    const [session] = await ProductivitySession.aggregate(pipeline);

    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Populate user info manually
    if (session.userId) {
      const user = await User.findById(session.userId).select('name email profilePicture').lean();
      session.userId = user;
    }
    if (session.employeeId) {
      const Employee = mongoose.models.Employee || mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));
      const emp = await Employee.findById(session.employeeId).select('firstName lastName employeeCode designation department profilePicture').lean();
      session.employeeId = emp;
    }

    return NextResponse.json({
      success: true,
      data: session
    });

  } catch (error) {
    console.error('[Session Detail API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch session details' 
    }, { status: 500 });
  }
}
