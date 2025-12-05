import { NextResponse } from 'next/server';
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
  
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// GET - Handle OAuth callback from Google
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Handle error from Google
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/mail?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/mail?error=missing_params`
      );
    }

    // Decode and verify state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/mail?error=invalid_state`
      );
    }

    const { userId, timestamp } = stateData;

    // Check if state is not too old (5 minutes max)
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/mail?error=expired_state`
      );
    }

    // Exchange code for tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Get user's email address from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    await connectDB();

    // Save or update email account
    const emailAccount = await EmailAccount.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        email: userInfo.email,
        provider: 'gmail',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isConnected: true,
        lastSynced: new Date(),
        syncError: null
      },
      { upsert: true, new: true }
    );

    // Redirect back to mail page with success
    return NextResponse.redirect(
      `${baseUrl}/dashboard/mail?connected=true`
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/mail?error=${encodeURIComponent('Failed to connect email')}`
    );
  }
}
