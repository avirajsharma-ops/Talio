import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import dbConnect from '@/lib/mongodb'
import Chat from '@/models/Chat'
import Employee from '@/models/Employee'

// GET - Fetch messages for a chat
export async function GET(request, { params }) {
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

    const { chatId } = params

    // Get user's employee ID
    const user = await Employee.findOne({ user: decoded.userId })
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
export async function POST(request, { params }) {
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

    const { chatId } = params
    const body = await request.json()
    const { content, fileUrl, fileName, fileType, fileSize } = body

    // Get user's employee ID
    const user = await Employee.findOne({ user: decoded.userId })
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

    const newMessage = updatedChat.messages[updatedChat.messages.length - 1]

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

