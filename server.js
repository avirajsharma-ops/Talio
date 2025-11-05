const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  // Initialize Socket.IO
  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // Socket.IO connection handling
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

  server.listen(port, (err) => {
    if (err) throw err
    console.log(`🚀 Server ready on http://${hostname}:${port}`)
    console.log(`🔌 Socket.IO ready on path: /api/socketio`)
  })
})

