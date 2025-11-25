import { Server } from 'socket.io'

let io

export const initSocket = (server) => {
  if (!io) {
    io = new Server(server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true
      }
    })

    io.on('connection', (socket) => {
      console.log('✅ [Socket.IO] Client connected:', socket.id)

      // Authenticate user
      socket.on('authenticate', (userId) => {
        socket.userId = userId
        socket.join(`user:${userId}`)
        console.log(`🔐 [Socket.IO] User ${userId} authenticated`)
      })

      // Join a chat room
      socket.on('join-chat', (chatId) => {
        socket.join(`chat:${chatId}`)
        console.log(`👤 [Socket.IO] User ${socket.userId || socket.id} joined chat:${chatId}`)
        
        // Notify others in the room
        socket.to(`chat:${chatId}`).emit('user-joined', {
          userId: socket.userId,
          socketId: socket.id
        })
      })

      // Leave a chat room
      socket.on('leave-chat', (chatId) => {
        socket.leave(`chat:${chatId}`)
        console.log(`👋 [Socket.IO] User ${socket.userId || socket.id} left chat:${chatId}`)
        
        // Notify others in the room
        socket.to(`chat:${chatId}`).emit('user-left', {
          userId: socket.userId,
          socketId: socket.id
        })
      })

      // Handle new message (broadcast to room)
      socket.on('send-message', (data) => {
        const { chatId, message } = data
        console.log(`💬 [Socket.IO] Broadcasting message to chat:${chatId}`)
        
        // Broadcast to all users in the chat room (including sender for confirmation)
        io.to(`chat:${chatId}`).emit('new-message', {
          chatId,
          message
        })
      })

      // Handle typing indicator
      socket.on('typing', (data) => {
        const { chatId, userId, userName } = data
        socket.to(`chat:${chatId}`).emit('user-typing', { 
          userId, 
          userName,
          chatId 
        })
      })

      // Handle stop typing
      socket.on('stop-typing', (data) => {
        const { chatId, userId } = data
        socket.to(`chat:${chatId}`).emit('user-stop-typing', { 
          userId,
          chatId 
        })
      })

      // Handle message read status
      socket.on('mark-read', (data) => {
        const { chatId, messageId, userId } = data
        socket.to(`chat:${chatId}`).emit('message-read', {
          chatId,
          messageId,
          userId
        })
      })

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('❌ [Socket.IO] Client disconnected:', socket.id)
      })

      // Handle errors
      socket.on('error', (error) => {
        console.error('⚠️ [Socket.IO] Socket error:', error)
      })
    })

    console.log('🚀 [Socket.IO] Server initialized successfully')
  }

  return io
}

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized')
  }
  return io
}

// Helper function to emit to specific chat
export const emitToChat = (chatId, event, data) => {
  if (io) {
    io.to(`chat:${chatId}`).emit(event, data)
    console.log(`📤 [Socket.IO] Emitted ${event} to chat:${chatId}`)
  }
}

// Helper function to emit to specific user
export const emitToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data)
    console.log(`📤 [Socket.IO] Emitted ${event} to user:${userId}`)
  }
}

