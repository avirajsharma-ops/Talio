import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailAccount from '@/models/EmailAccount';
import { google } from 'googleapis';

// Create OAuth2 client - uses NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID from .env
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  // Use production URL for OAuth to match Google Cloud Console configuration
  const baseUrl = 'https://app.talio.in';
  const redirectUri = `${baseUrl}/api/auth/callback/google-mail`;
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
  }
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
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

    const oauth2Client = getOAuth2Client();

    // Generate a state token to prevent CSRF
    // Use userId from JWT payload (not _id)
    const state = Buffer.from(JSON.stringify({
      userId: payload.userId,
      timestamp: Date.now()
    })).toString('base64');

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: state,
      prompt: 'consent'
    });

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
