/**
 * MAYA Message Relay API
 * Allows MAYA to send messages from one user to another(s)
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import MayaMessage from '@/models/MayaMessage';
import Chat from '@/models/Chat';
import { canUserAccessTarget } from '@/lib/mayaPermissions';
import { sendMessageNotification } from '@/lib/notificationService';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

/**
 * POST /api/maya/relay-message
 * Send a message through MAYA to one or more users
 */
export async function POST(request) {
  try {
    // Verify authentication
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    // Get sender user
    const sender = await User.findById(userId).populate('employeeId');
    if (!sender) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { recipientIds, recipientEmails, message, priority, shouldSpeak, shouldActivate, messageType } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Find recipients
    let recipients = [];

    if (recipientIds && recipientIds.length > 0) {
      const users = await User.find({ _id: { $in: recipientIds } }).populate('employeeId');
      recipients = users;
    } else if (recipientEmails && recipientEmails.length > 0) {
      const users = await User.find({ email: { $in: recipientEmails } }).populate('employeeId');
      recipients = users;
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 });
    }

    // MAYA messaging has NO hierarchy restrictions - anyone can message anyone
    // Build authorized recipients list (all recipients are authorized)
    const authorizedRecipients = [];

    for (const recipient of recipients) {
      // Get recipient name from employeeId
      const recipientName = recipient.employeeId
        ? `${recipient.employeeId.firstName} ${recipient.employeeId.lastName}`.trim()
        : recipient.email;

      authorizedRecipients.push({
        user: recipient._id,
        userName: recipientName,
        status: 'pending',
      });
    }

    if (authorizedRecipients.length === 0) {
      return NextResponse.json({
        error: 'No valid recipients found',
      }, { status: 400 });
    }

    // Get sender name from employeeId
    const senderName = sender.employeeId
      ? `${sender.employeeId.firstName} ${sender.employeeId.lastName}`.trim()
      : sender.email;

    // Create MAYA message
    const mayaMessage = await MayaMessage.create({
      sender: sender._id,
      senderName: senderName,
      senderRole: sender.role,
      recipients: authorizedRecipients,
      message,
      messageType: messageType || 'text',
      priority: priority || 'normal',
      shouldSpeak: shouldSpeak !== false, // Default true
      shouldActivate: shouldActivate !== false, // Default true
      isUrgent: priority === 'urgent',
      requiresAcknowledgment: priority === 'urgent',
    });

    // ==================== ALSO SEND VIA CHAT SYSTEM ====================
    // Create or find chat conversations and send the message there too
    try {
      console.log('📨 [MAYA] Sending message via Chat system...');

      // Get sender's employee ID
      const senderEmployee = await Employee.findOne({ userId: sender._id });

      if (senderEmployee) {
        // Get recipient employee IDs
        const recipientUserIds = authorizedRecipients.map(r => r.user);
        const recipientEmployees = await Employee.find({ userId: { $in: recipientUserIds } });

        console.log(`📨 [MAYA] Found ${recipientEmployees.length} recipient employees`);

        // For each recipient, create or find a chat and send the message
        for (const recipientEmployee of recipientEmployees) {
          try {
            // Find existing 1-on-1 chat or create new one
            let chat = await Chat.findOne({
              isGroup: false,
              participants: { $all: [senderEmployee._id, recipientEmployee._id], $size: 2 }
            });

            if (!chat) {
              // Create new chat
              console.log(`📨 [MAYA] Creating new chat between ${senderEmployee.firstName} and ${recipientEmployee.firstName}`);
              chat = await Chat.create({
                isGroup: false,
                participants: [senderEmployee._id, recipientEmployee._id],
                createdBy: senderEmployee._id,
                messages: []
              });
            }

            // Add message to chat
            const chatMessage = {
              sender: senderEmployee._id,
              content: `📨 MAYA Message: ${message}`,
              createdAt: new Date(),
              isRead: [{
                user: senderEmployee._id,
                readAt: new Date()
              }]
            };

            chat.messages.push(chatMessage);
            chat.lastMessage = `📨 MAYA: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`;
            chat.lastMessageAt = new Date();
            await chat.save();

            console.log(`✅ [MAYA] Message sent to chat ${chat._id}`);

            // Emit Socket.IO event for chat message
            if (global.io) {
              const newMessage = chat.messages[chat.messages.length - 1];

              // Populate sender info for the message
              const populatedMessage = {
                ...newMessage.toObject(),
                sender: {
                  _id: senderEmployee._id,
                  firstName: senderEmployee.firstName,
                  lastName: senderEmployee.lastName,
                  profilePicture: senderEmployee.profilePicture,
                  employeeCode: senderEmployee.employeeCode
                }
              };

              // Broadcast to chat room
              global.io.to(`chat:${chat._id}`).emit('new-message', {
                chatId: chat._id.toString(),
                message: populatedMessage,
                senderId: senderEmployee._id.toString()
              });

              // Send to recipient's personal room
              global.io.to(`user:${recipientEmployee.userId}`).emit('new-message', {
                chatId: chat._id.toString(),
                message: populatedMessage,
                senderId: senderEmployee._id.toString()
              });

              console.log(`💬 [MAYA] Chat notification sent to user:${recipientEmployee.userId}`);
            }

            // Send push notification
            try {
              await sendMessageNotification({
                senderId: sender._id,
                recipientId: recipientEmployee.userId,
                message: `📨 MAYA: ${message}`,
                chatId: chat._id.toString()
              });
              console.log(`🔔 [MAYA] Push notification sent to ${recipientEmployee.firstName}`);
            } catch (notifError) {
              console.error('❌ [MAYA] Push notification error:', notifError);
            }

          } catch (chatError) {
            console.error(`❌ [MAYA] Error sending chat message to ${recipientEmployee.firstName}:`, chatError);
          }
        }
      } else {
        console.warn('⚠️ [MAYA] Sender employee not found, skipping chat system integration');
      }
    } catch (chatSystemError) {
      console.error('❌ [MAYA] Chat system integration error:', chatSystemError);
      // Don't fail the whole operation if chat system fails
    }

    // ==================== EMIT MAYA-SPECIFIC SOCKET EVENT ====================
    // Emit Socket.IO event to notify recipients (will be handled by Socket.IO server)
    // This will be picked up by the real-time system for MAYA PIP/sidebar activation
    global.io?.emit('maya:new-message', {
      messageId: mayaMessage._id,
      recipientIds: authorizedRecipients.map(r => r.user.toString()),
      senderName: mayaMessage.senderName,
      message: mayaMessage.message,
      priority: mayaMessage.priority,
      shouldSpeak: mayaMessage.shouldSpeak,
      shouldActivate: mayaMessage.shouldActivate,
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully via MAYA and Chat system',
      messageId: mayaMessage._id,
      deliveredTo: authorizedRecipients.length,
    });

  } catch (error) {
    console.error('❌ MAYA Relay Message Error:', error);
    return NextResponse.json({ 
      error: 'Failed to relay message',
      details: error.message,
    }, { status: 500 });
  }
}

/**
 * GET /api/maya/relay-message
 * Get pending messages for the current user
 */
export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.userId;

    await connectDB();

    const messages = await MayaMessage.getUnreadMessages(userId)
      .populate('sender', 'email')
      .limit(50);

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
    });

  } catch (error) {
    console.error('❌ Get MAYA Messages Error:', error);
    return NextResponse.json({ 
      error: 'Failed to get messages',
      details: error.message,
    }, { status: 500 });
  }
}

