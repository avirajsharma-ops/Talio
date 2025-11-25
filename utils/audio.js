/**
 * Audio utility functions for playing notification sounds
 */

let audioContext = null
let notificationSound = null

// Initialize audio context (needed for some browsers)
const getAudioContext = () => {
  if (!audioContext && typeof window !== 'undefined') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  return audioContext
}

/**
 * Play notification sound
 * Uses Web Audio API to generate a pleasant notification sound
 */
export const playNotificationSound = () => {
  try {
    // Use Web Audio API for reliable cross-platform sound
    playBeep()
  } catch (error) {
    console.error('[Audio] Error playing notification sound:', error)
  }
}

/**
 * Play a simple beep sound using Web Audio API
 * This is a fallback when audio file is not available
 */
const playBeep = () => {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // Resume audio context if suspended (required by some browsers)
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    // Create oscillator for beep sound
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Configure sound
    oscillator.frequency.value = 800 // Frequency in Hz
    oscillator.type = 'sine'

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

    // Play
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.2)
  } catch (error) {
    console.error('[Audio] Error playing beep:', error)
  }
}

/**
 * Play message sent sound (lighter, shorter beep)
 */
export const playMessageSentSound = () => {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 600
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.1)
  } catch (error) {
    console.error('[Audio] Error playing message sent sound:', error)
  }
}

/**
 * Initialize audio on user interaction
 * Call this on first user click/tap to enable audio
 */
export const initAudio = () => {
  try {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume()
    }
  } catch (error) {
    console.error('[Audio] Error initializing audio:', error)
  }
}

