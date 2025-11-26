import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import KeystrokeLog from '@/models/KeystrokeLog';
import WindowActivityLog from '@/models/WindowActivityLog';
import { getCurrentISTDate } from '@/lib/timezone';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * POST /api/monitoring/activity
 * Receive activity data from desktop apps (keystrokes, app usage)
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
    const { keystrokes, appUsage, timestamp } = body;

    const results = { keystrokes: 0, appUsage: 0 };
    const now = getCurrentISTDate();

    // Process keystroke data (count only, not content for privacy)
    if (keystrokes && Array.isArray(keystrokes)) {
      for (const ks of keystrokes) {
        const keystrokeLog = new KeystrokeLog({
          employee: employee._id,
          user: user._id,
          timestamp: new Date(ks.timestamp),
          keystrokeCount: ks.count,
          source: 'desktop-app',
          deviceInfo: {
            platform: request.headers.get('user-agent')?.includes('Windows') ? 'windows' : 'darwin',
            captureMethod: 'native-keyboard-listener'
          }
        });
        await keystrokeLog.save();
        results.keystrokes++;
      }
    }

    // Process app usage data
    if (appUsage && Array.isArray(appUsage)) {
      for (const usage of appUsage) {
        const windowLog = new WindowActivityLog({
          employee: employee._id,
          user: user._id,
          windowTitle: usage.title || 'Unknown',
          applicationName: usage.app,
          focusStartTime: new Date(usage.timestamp),
          focusEndTime: new Date(new Date(usage.timestamp).getTime() + usage.duration),
          timeSpent: usage.duration,
          category: categorizeApp(usage.app),
          productivityScore: getProductivityScore(usage.app),
          source: 'desktop-app'
        });
        await windowLog.save();
        results.appUsage++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Activity data processed',
      results
    });

  } catch (error) {
    console.error('❌ Monitoring activity error:', error);
    return NextResponse.json(
      { error: 'Failed to process activity data', details: error.message },
      { status: 500 }
    );
  }
}

// Categorize application
function categorizeApp(appName) {
  const name = (appName || '').toLowerCase();
  
  const productive = ['code', 'visual studio', 'intellij', 'xcode', 'terminal', 'iterm', 'sublime', 'atom', 'figma', 'sketch', 'photoshop', 'illustrator', 'excel', 'word', 'powerpoint', 'notion', 'obsidian', 'slack', 'teams', 'zoom', 'meet'];
  const neutral = ['finder', 'explorer', 'settings', 'system preferences', 'calculator', 'calendar', 'mail', 'outlook', 'notes'];
  const distraction = ['youtube', 'netflix', 'spotify', 'twitter', 'facebook', 'instagram', 'tiktok', 'reddit', 'discord', 'game'];
  
  if (productive.some(p => name.includes(p))) return 'productive';
  if (distraction.some(d => name.includes(d))) return 'distraction';
  if (neutral.some(n => name.includes(n))) return 'neutral';
  return 'uncategorized';
}

// Get productivity score
function getProductivityScore(appName) {
  const category = categorizeApp(appName);
  switch (category) {
    case 'productive': return 100;
    case 'neutral': return 50;
    case 'distraction': return 10;
    default: return 50;
  }
}

