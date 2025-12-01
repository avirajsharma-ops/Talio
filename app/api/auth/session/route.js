import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * GET /api/auth/session
 * Returns the current session information based on JWT token
 * This endpoint is called by NextAuth client but we use JWT-based auth instead
 */
export async function GET(request) {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    // Also check for token in cookies (NextAuth pattern)
    const cookieToken = request.cookies.get('token')?.value

    const activeToken = token || cookieToken

    if (!activeToken) {
      // No session - return empty session (not an error)
      return NextResponse.json({
        user: null,
        expires: null
      })
    }

    // Verify JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET)
    const { payload } = await jwtVerify(activeToken, secret)

    // Return session in NextAuth format
    return NextResponse.json({
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        name: payload.name || payload.email,
      },
      expires: new Date(payload.exp * 1000).toISOString(), // Convert exp to ISO string
    })
  } catch (error) {
    // Invalid/expired token - return empty session (not an error)
    return NextResponse.json({
      user: null,
      expires: null
    })
  }
}
