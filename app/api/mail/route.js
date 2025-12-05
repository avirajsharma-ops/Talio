import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailAccount from '@/models/EmailAccount';
import { google } from 'googleapis';

// Production URL - must match Google Cloud Console
const PRODUCTION_URL = 'https://app.talio.in';

// The SAME redirect URI that's already whitelisted for Google Sign-In
const REDIRECT_URI = `${PRODUCTION_URL}/api/auth/google/callback`;

// Create OAuth2 client
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
}

// GET - Check if email is connected and get email account info
export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const emailAccount = await EmailAccount.findOne({ user: payload.userId });

    if (!emailAccount) {
      return NextResponse.json({
        isConnected: false,
        email: null
      });
    }

    return NextResponse.json({
      isConnected: emailAccount.isConnected,
      email: emailAccount.email,
      provider: emailAccount.provider,
      lastSynced: emailAccount.lastSynced,
      unreadCount: emailAccount.unreadCount,
      settings: emailAccount.settings
    });

  } catch (error) {
    console.error('Error getting email account:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Generate OAuth URL for Gmail connection
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    if (!clientId) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    // Generate a state token to identify this as a mail connection request
    const state = Buffer.from(JSON.stringify({
      type: 'mail_connect',  // This tells the callback it's for mail
      userId: payload.userId,
      timestamp: Date.now()
    })).toString('base64');

    // Gmail scopes for reading, sending, and modifying emails
    const scopes = [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify'
    ];

    // Build the OAuth URL manually - same pattern as login page
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scopes.join(' '))}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${encodeURIComponent(state)}`;

    console.log('[Mail OAuth] Generated auth URL with redirect:', REDIRECT_URI);

    return NextResponse.json({ authUrl, state });

  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Disconnect email account
export async function DELETE(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Remove email account
    await EmailAccount.findOneAndDelete({ user: payload.userId });

    return NextResponse.json({ success: true, message: 'Email disconnected successfully' });

  } catch (error) {
    console.error('Error disconnecting email:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
