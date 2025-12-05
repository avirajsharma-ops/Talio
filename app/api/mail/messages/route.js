import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import EmailAccount from '@/models/EmailAccount';
import { google } from 'googleapis';

// Production URL and redirect URI - must match Google Cloud Console
const PRODUCTION_URL = 'https://app.talio.in';
const REDIRECT_URI = `${PRODUCTION_URL}/api/auth/google/callback`;

// Create OAuth2 client with user's tokens
async function getAuthenticatedClient(emailAccount) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  oauth2Client.setCredentials({
    access_token: emailAccount.accessToken,
    refresh_token: emailAccount.refreshToken,
    expiry_date: emailAccount.tokenExpiry?.getTime()
  });

  // Check if token needs refresh
  if (emailAccount.tokenExpiry && new Date() >= emailAccount.tokenExpiry) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      emailAccount.accessToken = credentials.access_token;
      emailAccount.tokenExpiry = new Date(credentials.expiry_date);
      await emailAccount.save();
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error('Token refresh failed');
    }
  }

  return oauth2Client;
}

// Parse email address from Gmail format
function parseEmailAddress(str) {
  if (!str) return { name: '', email: '' };
  const match = str.match(/^(?:(.+?)\s*)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (match) {
    return { name: match[1]?.trim() || '', email: match[2] };
  }
  return { name: '', email: str };
}

// GET - Fetch emails
export async function GET(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const pageToken = searchParams.get('pageToken') || null;
    const maxResults = parseInt(searchParams.get('maxResults')) || 20;

    await connectDB();

    const emailAccount = await EmailAccount.findOne({ user: payload.userId }).select('+accessToken +refreshToken');

    if (!emailAccount || !emailAccount.isConnected) {
      return NextResponse.json({ error: 'Email not connected' }, { status: 400 });
    }

    const oauth2Client = await getAuthenticatedClient(emailAccount);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Map folder to Gmail label
    const labelMap = {
      inbox: 'INBOX',
      sent: 'SENT',
      drafts: 'DRAFT',
      trash: 'TRASH',
      spam: 'SPAM',
      starred: 'STARRED',
      important: 'IMPORTANT'
    };

    const labelId = labelMap[folder] || 'INBOX';

    // Fetch message list
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: [labelId],
      maxResults: maxResults,
      pageToken: pageToken
    });

    const messages = listResponse.data.messages || [];
    const nextPageToken = listResponse.data.nextPageToken;

    // Fetch full message details for each
    const emailPromises = messages.map(async (msg) => {
      const messageResponse = await gmail.users.messages.get({
        userId: 'me',
        id: msg.id,
        format: 'full'
      });

      const message = messageResponse.data;
      const headers = message.payload?.headers || [];

      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header?.value || '';
      };

      // Get email body
      let body = '';
      let bodyHtml = '';

      function extractBody(payload) {
        if (payload.body?.data) {
          const decodedBody = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          if (payload.mimeType === 'text/html') {
            bodyHtml = decodedBody;
          } else {
            body = decodedBody;
          }
        }
        if (payload.parts) {
          payload.parts.forEach(extractBody);
        }
      }

      extractBody(message.payload);

      // Get attachments info
      const attachments = [];
      function extractAttachments(payload) {
        if (payload.filename && payload.body?.attachmentId) {
          attachments.push({
            filename: payload.filename,
            mimeType: payload.mimeType,
            size: payload.body.size,
            attachmentId: payload.body.attachmentId
          });
        }
        if (payload.parts) {
          payload.parts.forEach(extractAttachments);
        }
      }
      extractAttachments(message.payload);

      return {
        messageId: message.id,
        threadId: message.threadId,
        from: parseEmailAddress(getHeader('From')),
        to: getHeader('To').split(',').map(e => parseEmailAddress(e.trim())),
        cc: getHeader('Cc') ? getHeader('Cc').split(',').map(e => parseEmailAddress(e.trim())) : [],
        subject: getHeader('Subject') || '(No Subject)',
        snippet: message.snippet,
        body: body,
        bodyHtml: bodyHtml,
        date: new Date(parseInt(message.internalDate)),
        isRead: !message.labelIds?.includes('UNREAD'),
        isStarred: message.labelIds?.includes('STARRED'),
        labels: message.labelIds || [],
        attachments: attachments,
        folder: folder
      };
    });

    const emails = await Promise.all(emailPromises);

    // Update unread count
    const unreadResponse = await gmail.users.messages.list({
      userId: 'me',
      labelIds: ['INBOX', 'UNREAD'],
      maxResults: 1
    });
    
    emailAccount.unreadCount = unreadResponse.data.resultSizeEstimate || 0;
    emailAccount.lastSynced = new Date();
    await emailAccount.save();

    return NextResponse.json({
      emails,
      nextPageToken,
      unreadCount: emailAccount.unreadCount
    });

  } catch (error) {
    console.error('Error fetching emails:', error);
    
    if (error.message === 'Token refresh failed') {
      return NextResponse.json({ error: 'Session expired. Please reconnect your email.' }, { status: 401 });
    }
    
    return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
  }
}

// POST - Send email
export async function POST(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, cc, bcc, subject, body, isHtml } = await request.json();

    if (!to || !subject) {
      return NextResponse.json({ error: 'To and subject are required' }, { status: 400 });
    }

    await connectDB();

    const emailAccount = await EmailAccount.findOne({ user: payload.userId }).select('+accessToken +refreshToken');

    if (!emailAccount || !emailAccount.isConnected) {
      return NextResponse.json({ error: 'Email not connected' }, { status: 400 });
    }

    const oauth2Client = await getAuthenticatedClient(emailAccount);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Build email
    const headers = [
      `From: ${emailAccount.email}`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      cc ? `Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}` : '',
      bcc ? `Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}` : '',
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`,
      '',
      body
    ].filter(Boolean).join('\r\n');

    const encodedMessage = Buffer.from(headers)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return NextResponse.json({
      success: true,
      messageId: response.data.id
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

// PATCH - Mark email as read/unread or starred/unstarred
export async function PATCH(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, action } = await request.json();

    if (!messageId || !action) {
      return NextResponse.json({ error: 'Message ID and action are required' }, { status: 400 });
    }

    await connectDB();

    const emailAccount = await EmailAccount.findOne({ user: payload.userId }).select('+accessToken +refreshToken');

    if (!emailAccount || !emailAccount.isConnected) {
      return NextResponse.json({ error: 'Email not connected' }, { status: 400 });
    }

    const oauth2Client = await getAuthenticatedClient(emailAccount);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    let addLabelIds = [];
    let removeLabelIds = [];

    switch (action) {
      case 'markRead':
        removeLabelIds = ['UNREAD'];
        break;
      case 'markUnread':
        addLabelIds = ['UNREAD'];
        break;
      case 'star':
        addLabelIds = ['STARRED'];
        break;
      case 'unstar':
        removeLabelIds = ['STARRED'];
        break;
      case 'archive':
        removeLabelIds = ['INBOX'];
        break;
      case 'trash':
        addLabelIds = ['TRASH'];
        removeLabelIds = ['INBOX'];
        break;
      case 'untrash':
        removeLabelIds = ['TRASH'];
        addLabelIds = ['INBOX'];
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        addLabelIds,
        removeLabelIds
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error modifying email:', error);
    return NextResponse.json({ error: 'Failed to modify email' }, { status: 500 });
  }
}

// DELETE - Delete email permanently
export async function DELETE(request) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1];
    const payload = await verifyToken(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    await connectDB();

    const emailAccount = await EmailAccount.findOne({ user: payload.userId }).select('+accessToken +refreshToken');

    if (!emailAccount || !emailAccount.isConnected) {
      return NextResponse.json({ error: 'Email not connected' }, { status: 400 });
    }

    const oauth2Client = await getAuthenticatedClient(emailAccount);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    await gmail.users.messages.delete({
      userId: 'me',
      id: messageId
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting email:', error);
    return NextResponse.json({ error: 'Failed to delete email' }, { status: 500 });
  }
}
