import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
// import MayaScreenSummary from '@/models/MayaScreenSummary'; // Deprecated

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// GET - Check for pending instant fetch requests for this user
export async function GET(request) {
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

    // Find pending instant capture requests for this user
    // TODO: Implement new mechanism for instant capture requests using a dedicated model or Redis
    // For now, return no pending requests to unblock build
    
    return NextResponse.json({
      success: true,
      pendingRequest: null
    });

  } catch (error) {
    console.error('[Instant Fetch Pending] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check for pending requests' 
    }, { status: 500 });
  }
}
