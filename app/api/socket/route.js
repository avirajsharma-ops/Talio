import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// This is a placeholder route for Socket.IO
// The actual Socket.IO server is initialized in server.js
export async function GET() {
  return NextResponse.json({
    message: 'Socket.IO endpoint - connect via client',
    path: '/api/socketio'
  })
}

