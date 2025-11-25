const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0' // Listen on all interfaces in production
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev })
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

  // Initialize Socket.IO using the centralized module
  // This allows API routes to access the Socket.IO instance
  const { Server } = require('socket.io')

  const io = new Server(server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: dev
        ? 'http://localhost:3000'
        : [
            'https://mwg.talio.in',
            'http://mwg.talio.in',
            // keep existing domains if used elsewhere
            'https://zenova.sbs',
            'https://www.zenova.sbs'
          ],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['polling', 'websocket'], // Allow both transports
    allowEIO3: true, // Allow Engine.IO v3 clients
    pingTimeout: 60000,
    pingInterval: 25000
  })

  // Store the io instance globally so API routes can access it
  global.io = io

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

    // REMOVED: 'send-message' handler - messages are now broadcasted by the API route
    // This eliminates duplicate broadcasts and reduces server load

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

    // ==================== MAYA MESSAGE RELAY EVENTS ====================

    // Handle MAYA message acknowledgment
    socket.on('maya:message-delivered', (data) => {
      const { messageId, userId } = data
      console.log(`📨 [MAYA] Message ${messageId} delivered to user ${userId}`)

      // Notify sender that message was delivered
      io.emit('maya:delivery-confirmation', {
        messageId,
        userId,
        status: 'delivered',
        timestamp: new Date()
      })
    })

    // Handle MAYA message spoken confirmation
    socket.on('maya:message-spoken', (data) => {
      const { messageId, userId } = data
      console.log(`🗣️ [MAYA] Message ${messageId} spoken to user ${userId}`)

      // Notify sender that message was spoken
      io.emit('maya:spoken-confirmation', {
        messageId,
        userId,
        status: 'spoken',
        timestamp: new Date()
      })
    })

    // ==================== MAYA SCREEN MONITORING EVENTS ====================

    // Handle screenshot submission from monitored user
    socket.on('maya:screenshot-captured', (data) => {
      const { requestId, screenshot, currentPage } = data
      console.log(`📸 [MAYA] Screenshot captured for request ${requestId}`)

      // Forward to the requester
      io.emit('maya:screenshot-received', {
        requestId,
        screenshot,
        currentPage,
        timestamp: new Date()
      })
    })

    // Handle monitoring request acknowledgment
    socket.on('maya:monitoring-acknowledged', (data) => {
      const { requestId, userId } = data
      console.log(`✅ [MAYA] Monitoring request ${requestId} acknowledged by user ${userId}`)
    })

    // Handle permission denied
    socket.on('maya:permission-denied', (data) => {
      const { requestId, userId, requestedBy } = data
      console.log(`❌ [MAYA] Screen capture permission denied by user ${userId} for request ${requestId}`)

      // Notify the requester that permission was denied
      io.emit('maya:permission-denied-notification', {
        requestId,
        userId,
        requestedBy,
        message: 'User denied screen capture permission',
        timestamp: new Date()
      })
    })

    // Handle screenshot capture failure
    socket.on('maya:screenshot-failed', (data) => {
      const { requestId, userId, error } = data
      console.log(`❌ [MAYA] Screenshot capture failed for request ${requestId}: ${error}`)

      // Notify the requester that screenshot failed
      io.emit('maya:screenshot-failed-notification', {
        requestId,
        userId,
        error,
        message: 'Screenshot capture failed',
        timestamp: new Date()
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

