import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Employee from '@/models/Employee'
import jwt from 'jsonwebtoken'

// MongoDB model for Employee Ratings
const mongoose = require('mongoose')

const ratingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  period: {
    type: String,
    required: true
  },
  ratingDate: {
    type: Date,
    default: Date.now
  },
  ratings: {
    technical: { type: Number, min: 0, max: 5, default: 0 },
    communication: { type: Number, min: 0, max: 5, default: 0 },
    teamwork: { type: Number, min: 0, max: 5, default: 0 },
    leadership: { type: Number, min: 0, max: 5, default: 0 },
    problemSolving: { type: Number, min: 0, max: 5, default: 0 },
    reliability: { type: Number, min: 0, max: 5, default: 0 },
    initiative: { type: Number, min: 0, max: 5, default: 0 },
    quality: { type: Number, min: 0, max: 5, default: 0 }
  },
  overallRating: {
    type: Number,
    min: 0,
    max: 5,
    required: true
  },
  comments: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'completed', 'pending'],
    default: 'completed'
  }
}, {
  timestamps: true
})

const Rating = mongoose.models.Rating || mongoose.model('Rating', ratingSchema)

// Verify JWT token
function verifyToken(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    return decoded
  } catch (error) {
    return null
  }
}

// GET - Fetch all employee ratings
export async function GET(request) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    await connectDB()

    const ratings = await Rating.find()
      .populate('employee', 'firstName lastName employeeCode department position')
      .populate('rater', 'firstName lastName position')
      .sort({ createdAt: -1 })

    return NextResponse.json({
      success: true,
      data: ratings
    })
  } catch (error) {
    console.error('GET ratings error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch ratings'
    }, { status: 500 })
  }
}

// POST - Create new employee rating
export async function POST(request) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to create ratings
    if (!['admin', 'hr', 'manager'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions to create ratings' 
      }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const {
      employeeId,
      period,
      ratingDate,
      ratings,
      overallRating,
      comments,
      status
    } = body

    // Validate required fields
    if (!employeeId || !period || !overallRating) {
      return NextResponse.json({
        success: false,
        message: 'Employee, period, and overall rating are required'
      }, { status: 400 })
    }

    // Check if employee exists
    const employee = await Employee.findById(employeeId)
    if (!employee) {
      return NextResponse.json({
        success: false,
        message: 'Employee not found'
      }, { status: 404 })
    }

    // Check if rating already exists for this employee and period
    const existingRating = await Rating.findOne({
      employee: employeeId,
      period: period
    })

    if (existingRating) {
      return NextResponse.json({
        success: false,
        message: 'Rating already exists for this employee and period'
      }, { status: 400 })
    }

    // Create new rating
    const newRating = new Rating({
      employee: employeeId,
      rater: user.userId,
      period,
      ratingDate: ratingDate || new Date(),
      ratings: ratings || {},
      overallRating,
      comments: comments || '',
      status: status || 'completed'
    })

    await newRating.save()

    // Populate the response
    await newRating.populate('employee', 'firstName lastName employeeCode department position')
    await newRating.populate('rater', 'firstName lastName position')

    return NextResponse.json({
      success: true,
      message: 'Employee rating created successfully',
      data: newRating
    }, { status: 201 })

  } catch (error) {
    console.error('POST rating error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to create rating'
    }, { status: 500 })
  }
}

// PUT - Update employee rating
export async function PUT(request) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to update ratings
    if (!['admin', 'hr', 'manager'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions to update ratings' 
      }, { status: 403 })
    }

    await connectDB()

    const body = await request.json()
    const { ratingId, ...updateData } = body

    if (!ratingId) {
      return NextResponse.json({
        success: false,
        message: 'Rating ID is required'
      }, { status: 400 })
    }

    const rating = await Rating.findById(ratingId)
    if (!rating) {
      return NextResponse.json({
        success: false,
        message: 'Rating not found'
      }, { status: 404 })
    }

    // Update the rating
    Object.assign(rating, updateData)
    await rating.save()

    // Populate the response
    await rating.populate('employee', 'firstName lastName employeeCode department position')
    await rating.populate('rater', 'firstName lastName position')

    return NextResponse.json({
      success: true,
      message: 'Rating updated successfully',
      data: rating
    })

  } catch (error) {
    console.error('PUT rating error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to update rating'
    }, { status: 500 })
  }
}

// DELETE - Delete employee rating
export async function DELETE(request) {
  try {
    const user = verifyToken(request)
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to delete ratings
    if (!['admin', 'hr'].includes(user.role)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Insufficient permissions to delete ratings' 
      }, { status: 403 })
    }

    await connectDB()

    const { searchParams } = new URL(request.url)
    const ratingId = searchParams.get('id')

    if (!ratingId) {
      return NextResponse.json({
        success: false,
        message: 'Rating ID is required'
      }, { status: 400 })
    }

    const rating = await Rating.findById(ratingId)
    if (!rating) {
      return NextResponse.json({
        success: false,
        message: 'Rating not found'
      }, { status: 404 })
    }

    await Rating.findByIdAndDelete(ratingId)

    return NextResponse.json({
      success: true,
      message: 'Rating deleted successfully'
    })

  } catch (error) {
    console.error('DELETE rating error:', error)
    return NextResponse.json({
      success: false,
      message: 'Failed to delete rating'
    }, { status: 500 })
  }
}
