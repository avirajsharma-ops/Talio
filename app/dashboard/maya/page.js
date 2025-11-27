'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { FaPaperPlane, FaMicrophone, FaKeyboard, FaVolumeMute, FaVolumeUp, FaMicrophoneSlash } from 'react-icons/fa'

// Blob animation colors
const BLOB_COLORS = [
  { start: 'rgba(77, 255, 163, 0.9)', end: 'rgba(0, 200, 150, 0.3)' },
  { start: 'rgba(100, 220, 255, 0.85)', end: 'rgba(50, 150, 255, 0.25)' },
  { start: 'rgba(139, 93, 255, 0.8)', end: 'rgba(100, 50, 200, 0.2)' },
  { start: 'rgba(255, 180, 100, 0.75)', end: 'rgba(255, 120, 50, 0.2)' }
]

export default function MayaChatPage() {
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(null)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [micEnabled, setMicEnabled] = useState(true)
  const [listeningStatus, setListeningStatus] = useState('Initializing...')
  const [showTextInput, setShowTextInput] = useState(false)
  const [micPermission, setMicPermission] = useState('pending') // 'pending', 'granted', 'denied'
  
  const messagesEndRef = useRef(null)
  const canvasRef = useRef(null)
  const blobsRef = useRef([])
  const animationRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const isSpeakingRef = useRef(false)
  const micEnabledRef = useRef(true)
  const hasInitializedRef = useRef(false) // Prevent double initialization
  const isMountedRef = useRef(true) // Track if component is mounted

  // ElevenLabs config
  const ELEVENLABS_API_KEY = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || 'sk_8ab047ba4afa70d44b5d89a9eace5e14b07585e255aadb96'
  const ELEVENLABS_VOICE_ID = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'm7GHBtY0UEqljrKQw2JH'

  // Keep refs in sync with state
  useEffect(() => {
    isSpeakingRef.current = isSpeaking
  }, [isSpeaking])

  useEffect(() => {
    micEnabledRef.current = micEnabled
  }, [micEnabled])

  // Handle tab visibility - pause mic when tab is not active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden - stop listening and speaking
        console.log('[Maya] Tab hidden - pausing mic')
        stopListening()
        if (audioRef.current) {
          audioRef.current.pause()
        }
        if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
        setIsSpeaking(false)
        isSpeakingRef.current = false
      } else {
        // Tab is visible again - resume listening if mic is enabled
        console.log('[Maya] Tab visible - resuming mic')
        if (micEnabledRef.current && !isSpeakingRef.current && recognitionRef.current) {
          setTimeout(() => startListening(), 500)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    // Prevent double initialization (React Strict Mode in dev)
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true
    
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }

    // Initialize blob animation
    initBlobAnimation()
    
    // Request mic permission and initialize (will also add welcome message)
    requestMicPermission()

    return () => {
      console.log('[Maya] Component unmounting - cleaning up mic and audio')
      
      // Mark as unmounted to prevent restarts
      isMountedRef.current = false
      micEnabledRef.current = false
      
      // Cancel animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      
      // Stop speech recognition completely
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onresult = null
          recognitionRef.current.onend = null
          recognitionRef.current.onerror = null
          recognitionRef.current.stop()
        } catch(e) {}
        try { 
          recognitionRef.current.abort() 
        } catch(e) {}
        recognitionRef.current = null
      }
      
      // Stop any playing audio
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      
      // Cancel speech synthesis
      if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Request microphone permission explicitly
  const requestMicPermission = async () => {
    const welcomeMsg = "Hi! I'm MAYA, your personal AI assistant. I can help with HR tasks, answer questions, brainstorm ideas, and much more. Just speak or type!"
    
    // Add welcome message first (only once)
    setMessages([{
      role: 'assistant',
      content: welcomeMsg,
      timestamp: new Date()
    }])
    
    try {
      setListeningStatus('Requesting mic access...')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately, we just needed permission
      stream.getTracks().forEach(track => track.stop())
      
      setMicPermission('granted')
      setListeningStatus('Mic ready')
      console.log('[Maya] Microphone permission granted')
      
      // Now initialize speech recognition
      initVoiceRecognition()
      
      // Speak welcome message (only once, after mic is ready)
      setTimeout(() => {
        speak(welcomeMsg, true)
      }, 300)
      
    } catch (err) {
      console.error('[Maya] Microphone permission denied:', err)
      setMicPermission('denied')
      setMicEnabled(false)
      micEnabledRef.current = false
      setListeningStatus('Mic blocked - click to enable')
      // Still speak welcome even if mic is blocked
      setTimeout(() => {
        speak(welcomeMsg, false)
      }, 300)
    }
  }

  // Blob animation initialization
  const initBlobAnimation = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const size = 80
    canvas.width = size
    canvas.height = size
    const cx = size / 2, cy = size / 2

    blobsRef.current = []
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * 6
      const r = 18 + Math.random() * 12
      const homeX = cx + Math.cos(angle) * dist
      const homeY = cy + Math.sin(angle) * dist
      blobsRef.current.push({
        x: homeX, y: homeY, r,
        vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
        hx: homeX, hy: homeY,
        palette: BLOB_COLORS[i],
        noiseOffset: Math.random() * 1000
      })
    }

    const noise = (x, y, t) => Math.sin(x * 0.5 + t) * Math.cos(y * 0.5 + t) * 0.5 + 0.5

    const drawBlob = (b, now) => {
      const points = 8
      const angleStep = (Math.PI * 2) / points
      const grd = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r * 1.3)
      grd.addColorStop(0, b.palette.start)
      grd.addColorStop(1, b.palette.end)

      const pts = []
      for (let i = 0; i < points; i++) {
        const angle = i * angleStep
        const n = noise(Math.cos(angle) + b.noiseOffset, Math.sin(angle) + b.noiseOffset, now * 0.0008)
        const offset = b.r * 0.15 * (n - 0.5) * 2
        pts.push({
          x: b.x + Math.cos(angle) * (b.r + offset),
          y: b.y + Math.sin(angle) * (b.r + offset)
        })
      }

      ctx.beginPath()
      ctx.moveTo((pts[0].x + pts[points-1].x) / 2, (pts[0].y + pts[points-1].y) / 2)
      for (let i = 0; i < points; i++) {
        const p1 = pts[i]
        const p2 = pts[(i + 1) % points]
        const mx = (p1.x + p2.x) / 2
        const my = (p1.y + p2.y) / 2
        ctx.quadraticCurveTo(p1.x, p1.y, mx, my)
      }
      ctx.closePath()
      ctx.fillStyle = grd
      ctx.fill()
    }

    const animate = (now) => {
      ctx.clearRect(0, 0, size, size)
      for (const b of blobsRef.current) {
        b.vx += (b.hx - b.x) * 0.012
        b.vy += (b.hy - b.y) * 0.012
        b.vx *= 0.97; b.vy *= 0.97
        b.x += b.vx; b.y += b.vy
        drawBlob(b, now)
      }
      animationRef.current = requestAnimationFrame(animate)
    }
    animate(0)
  }

  // Voice recognition initialization with auto-restart
  const initVoiceRecognition = () => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.log('[Maya] Speech recognition not supported')
      setMicEnabled(false)
      micEnabledRef.current = false
      setListeningStatus('Speech not supported')
      return
    }

    console.log('[Maya] Initializing speech recognition...')
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false // Set to false for better reliability
    recognitionRef.current.interimResults = true
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      console.log('[Maya] Recognition started')
      setIsListening(true)
      setListeningStatus('Listening...')
    }

    recognitionRef.current.onresult = (event) => {
      const last = event.results.length - 1
      const transcript = event.results[last][0].transcript
      console.log('[Maya] Transcript:', transcript, 'Final:', event.results[last].isFinal)

      if (event.results[last].isFinal) {
        if (transcript.trim().length > 2) {
          handleVoiceMessage(transcript.trim())
        } else {
          // Too short, restart listening
          setListeningStatus('Listening...')
          restartListening()
        }
      } else {
        setListeningStatus(transcript || 'Listening...')
      }
    }

    recognitionRef.current.onerror = (e) => {
      console.log('[Maya] Speech recognition error:', e.error)
      setIsListening(false)
      
      if (e.error === 'no-speech') {
        setListeningStatus('No speech detected, listening...')
        restartListening()
      } else if (e.error === 'aborted') {
        // Aborted intentionally, check if we should restart
        if (micEnabledRef.current && !isSpeakingRef.current) {
          restartListening()
        }
      } else if (e.error === 'not-allowed') {
        setListeningStatus('Mic blocked - check permissions')
        setMicPermission('denied')
      } else {
        setListeningStatus('Error - retrying...')
        restartListening()
      }
    }

    recognitionRef.current.onend = () => {
      console.log('[Maya] Recognition ended, speaking:', isSpeakingRef.current, 'micEnabled:', micEnabledRef.current)
      setIsListening(false)
      
      // Auto-restart if mic is enabled and not speaking
      if (micEnabledRef.current && !isSpeakingRef.current) {
        restartListening()
      }
    }
    
    console.log('[Maya] Speech recognition initialized')
  }

  const restartListening = () => {
    // Don't restart if unmounted, tab is hidden, mic is disabled, or speaking
    if (!isMountedRef.current || document.hidden || !micEnabledRef.current || isSpeakingRef.current) return
    
    setTimeout(() => {
      // Check all conditions again after timeout
      if (!isMountedRef.current || document.hidden) return
      if (recognitionRef.current && micEnabledRef.current && !isSpeakingRef.current) {
        try {
          recognitionRef.current.start()
          console.log('[Maya] Restarted listening')
        } catch (e) {
          console.log('[Maya] Could not restart:', e.message)
        }
      }
    }, 500)
  }

  const handleVoiceMessage = (transcript) => {
    console.log('[Maya] Processing voice message:', transcript)
    // Stop listening while processing
    try { recognitionRef.current?.stop() } catch(e) {}
    setIsListening(false)
    setListeningStatus('Processing...')
    sendMessage(transcript)
  }

  const startListening = () => {
    // Don't start if component unmounted or tab is hidden
    if (!isMountedRef.current || document.hidden) {
      console.log('[Maya] Component unmounted or tab hidden, not starting mic')
      return
    }
    if (!recognitionRef.current) {
      console.log('[Maya] Recognition not initialized')
      return
    }
    if (isSpeakingRef.current) {
      console.log('[Maya] Cannot start listening while speaking')
      return
    }
    if (!micEnabledRef.current) {
      console.log('[Maya] Mic is disabled')
      return
    }
    
    try {
      recognitionRef.current.start()
      console.log('[Maya] Started listening')
    } catch (e) {
      console.log('[Maya] Start error:', e.message)
      // If already started, that's fine
    }
  }

  const stopListening = () => {
    setIsListening(false)
    try {
      recognitionRef.current?.stop()
    } catch (e) {}
  }

  const toggleMic = async () => {
    if (micPermission === 'denied') {
      // Try to request permission again
      await requestMicPermission()
      return
    }
    
    if (micEnabled) {
      // Disable mic
      setMicEnabled(false)
      micEnabledRef.current = false
      stopListening()
      setListeningStatus('Mic off')
    } else {
      // Enable mic
      setMicEnabled(true)
      micEnabledRef.current = true
      setListeningStatus('Mic ready')
      if (!isSpeakingRef.current) {
        setTimeout(() => startListening(), 300)
      }
    }
  }

  // ElevenLabs TTS with auto-restart listening after
  const speak = async (text, startListeningAfter = true) => {
    console.log('[Maya] Speaking:', text.substring(0, 50) + '...')
    
    if (!voiceEnabled) {
      console.log('[Maya] Voice disabled, skipping TTS')
      if (startListeningAfter && micEnabledRef.current) {
        setTimeout(() => startListening(), 500)
      }
      return
    }

    // Stop listening while speaking
    stopListening()
    setIsSpeaking(true)
    isSpeakingRef.current = true

    // Stop any current audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()

    const onSpeechEnd = () => {
      console.log('[Maya] Speech ended, will start listening:', startListeningAfter && micEnabledRef.current)
      setIsSpeaking(false)
      isSpeakingRef.current = false
      
      // Auto-restart listening after MAYA finishes speaking
      if (startListeningAfter && micEnabledRef.current) {
        setListeningStatus('Your turn to speak...')
        setTimeout(() => {
          startListening()
        }, 600)
      }
    }

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)
        audioRef.current = new Audio(audioUrl)
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl)
          audioRef.current = null
          onSpeechEnd()
        }
        audioRef.current.onerror = () => {
          console.log('[Maya] Audio error, using web speech')
          speakWithWebSpeech(text, onSpeechEnd)
        }
        await audioRef.current.play()
      } else {
        console.log('[Maya] ElevenLabs failed, using web speech')
        speakWithWebSpeech(text, onSpeechEnd)
      }
    } catch (e) {
      console.log('[Maya] ElevenLabs error, using fallback:', e)
      speakWithWebSpeech(text, onSpeechEnd)
    }
  }

  const speakWithWebSpeech = (text, onEnd) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.()
      return
    }
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.95
    utterance.pitch = 1.1
    utterance.onend = onEnd
    utterance.onerror = onEnd
    window.speechSynthesis.speak(utterance)
  }

  const toggleMute = () => {
    setVoiceEnabled(!voiceEnabled)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    setIsSpeaking(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Screen capture functionality
  const captureScreen = async () => {
    try {
      console.log('[Maya] Requesting screen capture...')
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { mediaSource: 'screen' }
      })
      
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      
      // Wait a moment for video to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0)
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop())
      
      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8)
      console.log('[Maya] Screen captured successfully')
      return imageData
    } catch (error) {
      console.error('[Maya] Screen capture failed:', error)
      return null
    }
  }

  // Check if message is asking about screen/what's on screen
  const isScreenRelatedQuery = (message) => {
    const screenKeywords = [
      'screen', 'display', 'showing', 'see', 'look at', 'looking at',
      'what is this', 'what\'s this', 'whats this', 'help me with this',
      'analyze this', 'analyse this', 'read this', 'what am i',
      'working on', 'looking at my', 'on my screen', 'in front of',
      'can you see', 'do you see', 'what do you see', 'show you',
      'help me understand', 'explain this', 'what is on', 'what\'s on',
      'monitor', 'watching', 'viewing', 'current page', 'this page',
      'this website', 'this app', 'this application', 'help with what',
      'stuck on', 'confused about this', 'don\'t understand this',
      'screenshot', 'capture', 'study my', 'check my', 'review my'
    ]
    const lowerMessage = message.toLowerCase()
    return screenKeywords.some(keyword => lowerMessage.includes(keyword))
  }

  const sendMessage = async (messageText) => {
    const userMessage = messageText || inputMessage.trim()
    if (!userMessage || loading) return

    setInputMessage('')
    setShowTextInput(false)

    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    setLoading(true)

    try {
      const token = localStorage.getItem('token')
      let screenCapture = null
      
      // Check if user is asking about their screen
      if (isScreenRelatedQuery(userMessage)) {
        setListeningStatus('Capturing screen...')
        
        // Add a message indicating we're capturing
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '📸 Let me take a look at your screen...',
          timestamp: new Date()
        }])
        
        screenCapture = await captureScreen()
        
        if (!screenCapture) {
          setMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = {
              role: 'assistant',
              content: 'I tried to capture your screen but it was cancelled or blocked. Please allow screen sharing when prompted, or describe what you\'re looking at.',
              timestamp: new Date()
            }
            return newMsgs
          })
          setLoading(false)
          speak('I tried to capture your screen but it was cancelled. Please allow screen sharing when prompted, or describe what you\'re looking at.', true)
          return
        }
        
        // Update the message to show we captured it
        setMessages(prev => {
          const newMsgs = [...prev]
          newMsgs[newMsgs.length - 1] = {
            role: 'assistant',
            content: '📸 Got it! Analyzing your screen...',
            timestamp: new Date()
          }
          return newMsgs
        })
      }

      // Send to API with or without screen capture
      const requestBody = { message: userMessage }
      if (screenCapture) {
        requestBody.screenCapture = screenCapture
      }

      const response = await fetch('/api/maya/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success && data.response) {
        // If we had a "analyzing" message, replace it
        if (screenCapture) {
          setMessages(prev => {
            const newMsgs = [...prev]
            newMsgs[newMsgs.length - 1] = {
              role: 'assistant',
              content: data.response,
              timestamp: new Date()
            }
            return newMsgs
          })
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.response,
            timestamp: new Date()
          }])
        }
        speak(data.response, true) // Start listening after response
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('MAYA Error:', error)
      const errorMsg = 'I apologize, but I encountered an error. Please try again.'
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date()
      }])
      speak(errorMsg, true)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="h-full flex flex-col" style={{ fontFamily: "'Raleway', -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
        {/* Animated Blob */}
        <div className="flex items-center gap-4">
          <div className={`relative transition-all duration-300 ${isSpeaking ? 'scale-110' : ''}`}
            style={{ 
              filter: isSpeaking ? 'brightness(1.3) drop-shadow(0 0 15px rgba(139, 93, 255, 0.8))' : 'drop-shadow(0 0 8px rgba(139, 93, 255, 0.4))',
              animation: isSpeaking ? 'pulse-blob 0.5s ease-in-out infinite' : 'none'
            }}>
            <canvas ref={canvasRef} className="w-14 h-14" style={{ width: '56px', height: '56px' }} />
          </div>
          
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary, #1f2937)' }}>MAYA</h1>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary, #6b7280)' }}>
              {isSpeaking ? 'Speaking...' : isListening ? 'Listening...' : 'Your personal AI assistant'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Mic status indicator */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            isListening ? 'bg-green-100 text-green-700' : isSpeaking ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isListening && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
            {isSpeaking && <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>}
            <span>{listeningStatus}</span>
          </div>

          <button
            onClick={toggleMic}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              micEnabled ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
            title={micEnabled ? 'Disable mic' : 'Enable mic'}
          >
            {micEnabled ? <FaMicrophone size={14} /> : <FaMicrophoneSlash size={14} />}
          </button>

          <button
            onClick={toggleMute}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              voiceEnabled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-100 text-red-500 hover:bg-red-200'
            }`}
            title={voiceEnabled ? 'Mute voice' : 'Unmute voice'}
          >
            {voiceEnabled ? <FaVolumeUp size={14} /> : <FaVolumeMute size={14} />}
          </button>
        </div>
      </div>

      {/* Messages Area - Clean seamless design */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(156, 163, 175, 0.3) transparent'
      }}>
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}
              style={{
                borderBottomLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                borderBottomRightRadius: msg.role === 'user' ? '4px' : '16px',
              }}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-gray-100 rounded-2xl px-4 py-3" style={{ borderBottomLeftRadius: '4px' }}>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-4 border-t bg-white" style={{ borderColor: 'var(--color-border, #e5e7eb)' }}>
        {showTextInput ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-full px-4 py-3 border border-gray-200 shadow-sm">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-500"
                disabled={loading}
                autoFocus
              />
              <button
                onClick={() => { setShowTextInput(false); if (micEnabled && !isSpeaking) startListening() }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all"
                title="Switch to voice"
              >
                <FaMicrophone size={14} />
              </button>
              <button
                onClick={() => sendMessage()}
                disabled={loading || !inputMessage.trim()}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-all"
                title="Send"
              >
                <FaPaperPlane size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2">
            {/* Manual start listening button - prominent when not listening */}
            {!isListening && !isSpeaking && micEnabled && (
              <button
                onClick={startListening}
                className="px-6 py-3 rounded-full flex items-center gap-2 bg-green-500 text-white hover:bg-green-600 transition-all text-sm font-medium shadow-md"
              >
                <FaMicrophone size={16} />
                <span>Tap to speak</span>
              </button>
            )}
            
            {/* Show listening indicator */}
            {isListening && (
              <div className="px-6 py-3 rounded-full flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium border border-green-200">
                <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                <span>Listening... speak now</span>
              </div>
            )}
            
            {/* Show speaking indicator */}
            {isSpeaking && (
              <div className="px-6 py-3 rounded-full flex items-center gap-2 bg-purple-100 text-purple-700 text-sm font-medium border border-purple-200">
                <span className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></span>
                <span>MAYA is speaking...</span>
              </div>
            )}
            
            <button
              onClick={() => setShowTextInput(true)}
              className="px-5 py-3 rounded-full flex items-center gap-2 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all text-sm border border-gray-200"
            >
              <FaKeyboard size={14} />
              <span>Type instead</span>
            </button>
          </div>
        )}

        <p className="mt-3 text-center text-xs text-gray-400">
          💡 Try: "Help me write an email", "What's my leave balance?", "Brainstorm ideas for..."
        </p>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-blob {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
