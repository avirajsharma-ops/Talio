import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Chat from '@/models/Chat'
import Employee from '@/models/Employee'
import User from '@/models/User'
import { sendMessageNotification } from '@/lib/notificationService'

// GET - Fetch messages for a chat
export async function GET(request, context) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await dbConnect()

    const params = await context.params
    const { chatId } = params

    // Get user to find employee ID
    const userDoc = await User.findById(decoded.userId).select('employeeId')
    if (!userDoc || !userDoc.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Get employee details
    const user = await Employee.findById(userDoc.employeeId)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Fetch chat and verify user is a participant
    const chat = await Chat.findById(chatId)
      .populate('messages.sender', 'firstName lastName profilePicture employeeCode')

    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 })
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(p => p.toString() === user._id.toString())
    if (!isParticipant) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: chat.messages
    })
  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

// POST - Send a message
export async function POST(request, context) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    await dbConnect()

    const params = await context.params
    const { chatId } = params
    const body = await request.json()
    const { content, fileUrl, fileName, fileType, fileSize } = body

    // Get user to find employee ID
    const userDoc = await User.findById(decoded.userId).select('employeeId')
    if (!userDoc || !userDoc.employeeId) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Get employee details
    const user = await Employee.findById(userDoc.employeeId)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Employee not found' }, { status: 404 })
    }

    // Fetch chat and verify user is a participant
    const chat = await Chat.findById(chatId)
    if (!chat) {
      return NextResponse.json({ success: false, message: 'Chat not found' }, { status: 404 })
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(p => p.toString() === user._id.toString())
    if (!isParticipant) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 })
    }

    // Create message
    const message = {
      sender: user._id,
      content: content || '',
      createdAt: new Date()
    }

    // Add file info if present
    if (fileUrl) {
      message.fileUrl = fileUrl
      message.fileName = fileName
      message.fileType = fileType
      message.fileSize = fileSize
    }

    // Add message to chat
    chat.messages.push(message)
    chat.lastMessage = content || fileName || 'File'
    chat.lastMessageAt = new Date()
    
    await chat.save()

    // Populate the new message
    const updatedChat = await Chat.findById(chatId)
      .populate('messages.sender', 'firstName lastName profilePicture employeeCode')
      .populate('participants', 'firstName lastName')

    const newMessage = updatedChat.messages[updatedChat.messages.length - 1]

    // Broadcast message via WebSocket (server-side)
    try {
      // Get the Socket.IO instance from the global scope
      const io = global.io

      if (io) {
        // Broadcast to all users in this chat room
        io.to(`chat:${chatId}`).emit('new-message', {
          chatId,
          message: newMessage
        })
        console.log(`💬 [WebSocket] Broadcasted message to chat:${chatId}`)
      } else {
        console.warn('⚠️ [WebSocket] Socket.IO instance not available')
      }
    } catch (socketError) {
      console.error('[WebSocket] Failed to broadcast message:', socketError)
    }

    // Send push notifications to other participants (not the sender)
    try {
      const otherParticipants = chat.participants.filter(p => p.toString() !== user._id.toString())
      console.log(`[Chat Notification] Other participants count: ${otherParticipants.length}`)

      if (otherParticipants.length > 0) {
        // Get User IDs from Employee IDs
        const recipientUsers = await User.find({
          employeeId: { $in: otherParticipants }
        }).select('_id')

        const recipientUserIds = recipientUsers.map(u => u._id.toString())
        console.log(`[Chat Notification] Recipient user IDs: ${recipientUserIds.join(', ')}`)

        if (recipientUserIds.length > 0) {
          // Send Firebase notification to each recipient
          for (const recipientId of recipientUserIds) {
            await sendMessageNotification({
              senderId: decoded.userId,
              recipientId,
              message: content || fileName || 'Sent a file',
              chatId
            })
          }

          console.log(`[Chat Notification] Firebase notifications sent to ${recipientUserIds.length} recipient(s)`)
        } else {
          console.log(`[Chat Notification] No recipient user IDs found`)
        }
      } else {
        console.log(`[Chat Notification] No other participants to notify`)
      }
    } catch (notifError) {
      // Don't fail the message send if notification fails
      console.error('[Chat Notification] Failed to send push notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      data: newMessage,
      message: 'Message sent successfully'
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

