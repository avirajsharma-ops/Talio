import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

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

    const userId = decoded.userId;
    await connectDB();

    const user = await User.findById(userId).select('name email mayaPreferences lastMayaGreeting');
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Check if user needs onboarding
    const needsOnboarding = !user.mayaPreferences?.onboardingCompleted;
    
    // Check if user needs daily greeting (hasn't been greeted today)
    const today = new Date().toDateString();
    const lastGreeting = user.lastMayaGreeting ? new Date(user.lastMayaGreeting).toDateString() : null;
    const needsGreeting = lastGreeting !== today;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email
        },
        needsOnboarding,
        needsGreeting,
        preferences: user.mayaPreferences || {
          voiceEnabled: true,
          autoGreetingEnabled: true,
          onboardingCompleted: false
        }
      }
    });

  } catch (error) {
    console.error('MAYA Onboarding Check Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to check onboarding status' }, { status: 500 });
  }
}

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

    const userId = decoded.userId;
    const { action } = await request.json();

    await connectDB();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update user preferences based on action
    if (!user.mayaPreferences) {
      user.mayaPreferences = {};
    }

    switch (action) {
      case 'complete':
        user.mayaPreferences.onboardingCompleted = true;
        user.lastMayaGreeting = new Date();
        break;
      case 'skip':
        user.mayaPreferences.onboardingCompleted = true;
        user.mayaPreferences.onboardingSkipped = true;
        break;
      case 'greeting':
        user.lastMayaGreeting = new Date();
        break;
    }

    await user.save();

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('MAYA Onboarding Update Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update onboarding status' }, { status: 500 });
  }
}
