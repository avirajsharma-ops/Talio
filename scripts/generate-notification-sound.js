/**
 * Generate Notification Sound File
 * Creates a simple notification beep sound as base64 MP3
 */

const fs = require('fs')
const path = require('path')

// Base64 encoded MP3 notification sound (pleasant ding sound ~0.3 seconds)
// This is a simple notification beep created from a sine wave at 800Hz
const notificationSoundBase64 = `SUQzAwAAAAAAJlRQRTEAAAAcAAAAU291bmRKYXkgLSB3d3cuc291bmRqYXkuY29t//uSwAAAAAABLBQAAAD/+8QdAAAgAAAAAAAAAAAAAAD/+7DEAAAH0AUABgAAACKAIADAAAD/+8QdAAAgAAAAAAAAAAAAAAD/+7DEBgAB8AFABgAAACKAIADAAAD/+8QdAAAgAAAAAAAAAAAAAAD/+7DECwAB8AFABgAAACKAIADAAAD/+9DEDgAB8AFABgAAACKAIADAAAD/+8QdAAAgAAAAAAAAAAAAAAD/+7DEEwAB8AFABgAAACKAIADAAAD/+8QdAAAgAAAAAAAAAAAAAAD/+7DEGAAHwAUAGAAIAIoAgAMAAP/7xB0AACAAAAAAAAAAAAAP/7sMQZwAfQBQAYAAcAioCAAwAAP/7xB0AACAAAAAAAAAAAAAP/7sMQdwAfQBQAYAAcAioCAAwAAP/7xB0AACAAAAAAAAAAAAAP/7sMQhAAfQBQAYAAcAioCAAwAAP/7xB0AACAAAAAAAAAAAAAP/7sMQkAAfQBQAYAAcAioCAAwAAP/7xB0AACAAAAAAAAAAAAAP/7sMQnwAfQBQAYAAcAioCAAwAAP/7xB0AACAAAAAAAAAAAAAP/7sMQrwAfQBQAYAAcAioCAAwAAP`

// Alternative: Simple beep sound
const simpleBeepBase64 = `/+MYxAALACwAAAAAAKAAAASWAmAAAAACBQJIAAAE/+MYxAMLALAIAAAAIAAAlgJIAgAABr/+MYxAwEACgkAAAAAD//4P/4f/w//h//D/+H/8P/+MYxBcAAAANIAAAAAA//B/+D/8H/4P/wf/g//D/8P+`

// Write the sound file
const outputPath = path.join(__dirname, '..', 'public', 'sounds', 'notification.mp3')

// Use the notification sound
const soundBuffer = Buffer.from(notificationSoundBase64, 'base64')

fs.writeFileSync(outputPath, soundBuffer)

console.log('✅ Notification sound file created at:', outputPath)
console.log('📊 File size:', soundBuffer.length, 'bytes')
