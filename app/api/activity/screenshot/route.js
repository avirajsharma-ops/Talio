import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * POST /api/activity/screenshot
 * Receive and save screenshots from desktop app
 * Saves to: public/activity/{userId}/{date}/{timestamp}.webp
 */
export async function POST(request) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    const userId = decoded.payload.userId;

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User not found' },
        { status: 401 }
      );
    }

    let screenshot, timestamp;
    const contentType = request.headers.get('content-type') || '';

    // Handle both FormData and JSON body
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      screenshot = formData.get('screenshot');
      timestamp = formData.get('timestamp') || Date.now().toString();
    } else {
      const body = await request.json();
      screenshot = body.screenshot;
      timestamp = body.timestamp || Date.now().toString();
    }

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot data required' },
        { status: 400 }
      );
    }

    // Create date folder structure: YYYY-MM-DD
    const date = new Date(parseInt(timestamp));
    const dateFolder = date.toISOString().split('T')[0];
    const timeString = date.toISOString().replace(/[:.]/g, '-');

    // Define the save path: public/activity/{userId}/{date}/
    const activityDir = path.join(process.cwd(), 'public', 'activity', userId, dateFolder);
    
    // Create directory if it doesn't exist
    await mkdir(activityDir, { recursive: true });

    // Save the file
    const fileName = `${timeString}.webp`;
    const filePath = path.join(activityDir, fileName);

    // Handle both File and base64 data
    let buffer;
    if (screenshot instanceof File) {
      buffer = Buffer.from(await screenshot.arrayBuffer());
    } else if (typeof screenshot === 'string') {
      // Handle base64 data
      const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      return NextResponse.json(
        { error: 'Invalid screenshot format' },
        { status: 400 }
      );
    }

    // Write the file
    await writeFile(filePath, buffer);

    // Return the relative URL path
    const relativePath = `/activity/${userId}/${dateFolder}/${fileName}`;

    return NextResponse.json({
      success: true,
      message: 'Screenshot saved successfully',
      path: relativePath,
      timestamp: date.toISOString(),
      userId
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json(
      { error: 'Failed to save screenshot', details: error.message },
      { status: 500 }
    );
  }
}
