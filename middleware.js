import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

export async function middleware(request) {
  const token = request.headers.get('authorization')?.split(' ')[1] ||
                request.cookies.get('token')?.value

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/forgot-password']
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/session',
    '/api/auth/forgot-password',
    '/api/auth/google/callback',
    '/api/create-user',
    '/api/clear-users',
    '/api/debug/users',
    '/api/test',
    '/api/assetlinks',
    '/api/create-god-admin'
  ]

  const isPublicRoute = publicRoutes.some(route =>
    route === '/' ? request.nextUrl.pathname === '/' : request.nextUrl.pathname.startsWith(route)
  )
  const isPublicApiRoute = publicApiRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // Check if accessing API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      )
    }

    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET)
      await jwtVerify(token, secret)

      return NextResponse.next()
    } catch (error) {
      return NextResponse.json(
        { message: 'Invalid token' },
        { status: 401 }
      )
    }
  }

  // For page routes, redirect to login if no token
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
}

