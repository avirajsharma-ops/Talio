import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * GET /api/maya/onboarding
 * Get user's onboarding status and preferences
 */
export async function GET(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.payload.userId;

    const user = await User.findById(userId).populate('employeeId');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const employee = user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const needsGreeting = user.mayaPreferences?.lastGreetingDate !== today;
    const needsOnboarding = !user.mayaPreferences?.onboardingCompleted && !user.mayaPreferences?.onboardingSkipped;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          name: employee ? `${employee.firstName} ${employee.lastName}` : user.email.split('@')[0]
        },
        preferences: user.mayaPreferences || {
          onboardingCompleted: false,
          onboardingSkipped: false,
          autoGreetingEnabled: true,
          voiceEnabled: true
        },
        needsOnboarding,
        needsGreeting,
        isFirstLogin: !user.lastLogin
      }
    });

  } catch (error) {
    console.error('Maya onboarding GET error:', error);
    return NextResponse.json({ error: 'Failed to get onboarding status' }, { status: 500 });
  }
}

/**
 * POST /api/maya/onboarding
 * Update onboarding status (complete or skip)
 */
export async function POST(request) {
  try {
    await connectDB();

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = await jwtVerify(token, JWT_SECRET);
    const userId = decoded.payload.userId;

    const body = await request.json();
    const { action, preferences } = body; // action: 'complete', 'skip', 'greeting', 'update'

    const updateData = {};

    if (action === 'complete') {
      updateData['mayaPreferences.onboardingCompleted'] = true;
      updateData['mayaPreferences.onboardingCompletedAt'] = new Date();
    } else if (action === 'skip') {
      updateData['mayaPreferences.onboardingSkipped'] = true;
    } else if (action === 'greeting') {
      updateData['mayaPreferences.lastGreetingDate'] = new Date().toISOString().split('T')[0];
    } else if (action === 'update' && preferences) {
      if (typeof preferences.autoGreetingEnabled === 'boolean') {
        updateData['mayaPreferences.autoGreetingEnabled'] = preferences.autoGreetingEnabled;
      }
      if (typeof preferences.voiceEnabled === 'boolean') {
        updateData['mayaPreferences.voiceEnabled'] = preferences.voiceEnabled;
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });

    return NextResponse.json({
      success: true,
      message: `Onboarding ${action} successful`,
      preferences: user.mayaPreferences
    });

  } catch (error) {
    console.error('Maya onboarding POST error:', error);
    return NextResponse.json({ error: 'Failed to update onboarding status' }, { status: 500 });
  }
}

