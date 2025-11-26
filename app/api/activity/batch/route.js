import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import KeystrokeLog from '@/models/KeystrokeLog';
import MouseActivityLog from '@/models/MouseActivityLog';
import WindowActivityLog from '@/models/WindowActivityLog';
import ApplicationUsageLog from '@/models/ApplicationUsageLog';
import AutoScreenCapture from '@/models/AutoScreenCapture';
import { getCurrentISTDate } from '@/lib/timezone';
import OpenAI from 'openai';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY });

/**
 * POST /api/activity/batch
 * Receive batched activity data from extension
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const employee = user.employeeId;
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { keystrokes, mouse, windows } = body;

    const results = {
      keystrokes: 0,
      mouse: 0,
      windows: 0
    };

    // Process keystroke data
    if (keystrokes && keystrokes.length > 0) {
      for (const keystrokeData of keystrokes) {
        const keystrokeLog = new KeystrokeLog({
          employee: employee._id,
          user: user._id,
          sessionId: keystrokeData.sessionId,
          keystrokes: keystrokeData.keystrokes,
          textContent: keystrokeData.textContent,
          windowTitle: keystrokeData.windowTitle,
          applicationName: extractApplicationName(keystrokeData.windowTitle),
          url: keystrokeData.url,
          domain: keystrokeData.domain,
          startTime: new Date(keystrokeData.startTime),
          endTime: new Date(keystrokeData.endTime),
          duration: new Date(keystrokeData.endTime) - new Date(keystrokeData.startTime),
          keystrokeCount: keystrokeData.keystrokes.length,
          wordCount: countWords(keystrokeData.textContent),
          deviceInfo: {
            userAgent: request.headers.get('user-agent'),
            platform: 'browser'
          }
        });

        await keystrokeLog.save();
        results.keystrokes++;
      }
    }

    // Process mouse data
    if (mouse && mouse.length > 0) {
      for (const mouseData of mouse) {
        const clickCount = mouseData.events.filter(e => 
          e.type === 'click' || e.type === 'dblclick' || e.type === 'rightclick'
        ).length;
        const scrollCount = mouseData.events.filter(e => e.type === 'scroll').length;

        const mouseLog = new MouseActivityLog({
          employee: employee._id,
          user: user._id,
          sessionId: mouseData.sessionId,
          events: mouseData.events,
          windowTitle: mouseData.windowTitle,
          url: mouseData.url,
          domain: mouseData.domain,
          startTime: new Date(mouseData.startTime),
          endTime: new Date(mouseData.endTime),
          duration: new Date(mouseData.endTime) - new Date(mouseData.startTime),
          clickCount,
          scrollCount,
          activityLevel: calculateActivityLevel(clickCount, scrollCount, mouseData.events.length)
        });

        await mouseLog.save();
        results.mouse++;
      }
    }

    // Process window/tab tracking data
    if (windows && windows.length > 0) {
      for (const windowData of windows) {
        const windowLog = new WindowActivityLog({
          employee: employee._id,
          user: user._id,
          sessionId: windowData.sessionId,
          windowTitle: windowData.windowTitle,
          url: windowData.url,
          domain: windowData.domain,
          applicationName: extractApplicationName(windowData.windowTitle),
          focusStartTime: new Date(windowData.focusStartTime),
          focusEndTime: new Date(windowData.focusEndTime),
          timeSpent: windowData.timeSpent,
          category: categorizeWindow(windowData.domain, windowData.windowTitle),
          productivityScore: calculateProductivityScore(windowData.domain, windowData.windowTitle)
        });

        await windowLog.save();
        results.windows++;

        // Update daily application usage summary
        await updateApplicationUsage(employee._id, user._id, windowData);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Activity batch processed',
      results
    });

  } catch (error) {
    console.error('❌ Activity batch error:', error);
    return NextResponse.json(
      { error: 'Failed to process activity batch', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper: Extract application name from window title
 */
function extractApplicationName(windowTitle) {
  if (!windowTitle) return 'Unknown';
  
  // Common patterns
  if (windowTitle.includes('Google Chrome')) return 'Google Chrome';
  if (windowTitle.includes('Firefox')) return 'Mozilla Firefox';
  if (windowTitle.includes('Safari')) return 'Safari';
  if (windowTitle.includes('Visual Studio Code')) return 'VS Code';
  if (windowTitle.includes('Slack')) return 'Slack';
  if (windowTitle.includes('Microsoft Teams')) return 'Microsoft Teams';
  
  return windowTitle.split('-')[windowTitle.split('-').length - 1].trim();
}

/**
 * Helper: Count words in text
 */
function countWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Helper: Calculate mouse activity level
 */
function calculateActivityLevel(clicks, scrolls, totalEvents) {
  const score = (clicks * 3 + scrolls * 1 + totalEvents * 0.1);
  
  if (score < 5) return 'idle';
  if (score < 15) return 'low';
  if (score < 30) return 'medium';
  if (score < 50) return 'high';
  return 'very-high';
}

/**
 * Helper: Categorize window/application
 */
function categorizeWindow(domain, title) {
  if (!domain && !title) return 'unknown';
  
  const combined = `${domain} ${title}`.toLowerCase();
  
  // Productive
  if (combined.includes('github') || combined.includes('gitlab') || 
      combined.includes('vscode') || combined.includes('code') ||
      combined.includes('jira') || combined.includes('trello') ||
      combined.includes('notion') || combined.includes('docs.google')) {
    return 'productive';
  }
  
  // Communication
  if (combined.includes('slack') || combined.includes('teams') || 
      combined.includes('zoom') || combined.includes('meet') ||
      combined.includes('mail') || combined.includes('gmail')) {
    return 'communication';
  }
  
  // Research
  if (combined.includes('stackoverflow') || combined.includes('wikipedia') ||
      combined.includes('documentation') || combined.includes('docs')) {
    return 'research';
  }
  
  // Distraction
  if (combined.includes('facebook') || combined.includes('twitter') ||
      combined.includes('instagram') || combined.includes('youtube') ||
      combined.includes('reddit') || combined.includes('tiktok')) {
    return 'distraction';
  }
  
  // Entertainment
  if (combined.includes('netflix') || combined.includes('spotify') ||
      combined.includes('game') || combined.includes('twitch')) {
    return 'entertainment';
  }
  
  return 'neutral';
}

/**
 * Helper: Calculate productivity score
 */
function calculateProductivityScore(domain, title) {
  const category = categorizeWindow(domain, title);
  
  const scores = {
    'productive': 90,
    'research': 80,
    'communication': 70,
    'neutral': 50,
    'distraction': 20,
    'entertainment': 10,
    'unknown': 50
  };
  
  return scores[category] || 50;
}

/**
 * Helper: Update daily application usage
 */
async function updateApplicationUsage(employeeId, userId, windowData) {
  const today = getCurrentISTDate();
  today.setHours(0, 0, 0, 0);
  
  const category = categorizeWindow(windowData.domain, windowData.windowTitle);
  const productivityScore = calculateProductivityScore(windowData.domain, windowData.windowTitle);
  
  await ApplicationUsageLog.findOneAndUpdate(
    {
      employee: employeeId,
      user: userId,
      date: today
    },
    {
      $push: {
        applications: {
          name: windowData.domain || extractApplicationName(windowData.windowTitle),
          type: windowData.url ? 'browser' : 'desktop-app',
          url: windowData.url,
          domain: windowData.domain,
          totalTime: windowData.timeSpent,
          activeTime: windowData.timeSpent,
          idleTime: 0,
          windowSwitches: 1,
          category,
          productivityScore,
          lastUsed: getCurrentISTDate()
        }
      },
      $inc: {
        totalActiveTime: windowData.timeSpent,
        totalApplications: 1
      },
      $set: {
        lastActivity: getCurrentISTDate()
      }
    },
    { upsert: true, new: true }
  );
}
