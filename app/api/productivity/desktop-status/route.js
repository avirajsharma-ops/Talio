import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

/**
 * GET /api/productivity/desktop-status
 * Check if a user's desktop app is connected
 */
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

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');

    if (!targetUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID required' 
      }, { status: 400 });
    }

    // Check if desktop app is connected for this user
    let isConnected = false;
    let socketCount = 0;

    if (global.io) {
      const roomName = `user:${targetUserId}`;
      const socketsInRoom = await global.io.in(roomName).fetchSockets();
      socketCount = socketsInRoom.length;
      isConnected = socketsInRoom.some(s => s.isDesktopApp === true);
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: targetUserId,
        isConnected,
        socketCount,
        message: isConnected 
          ? 'Desktop app is connected and ready for screen capture'
          : 'Desktop app is not connected. User needs to open the Talio desktop app.'
      }
    });

  } catch (error) {
    console.error('Desktop Status Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check desktop status' 
    }, { status: 500 });
  }
}
