import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1]
    if (!token) {
      return NextResponse.json({ success: false, message: 'No token provided' }, { status: 401 })
    }

    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ success: false, message: 'No file provided' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'chat')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${timestamp}-${originalName}`
    const filepath = path.join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Return the URL
    const fileUrl = `/uploads/chat/${filename}`

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      }
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}

