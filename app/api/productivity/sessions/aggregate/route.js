import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import { 
  aggregateSessionsForUser, 
  saveAggregatedSessions,
  processAllPendingSessions 
} from '@/lib/sessionAggregator';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

// Helper to check if user is a department head
async function getDepartmentIfHead(userId) {
  const user = await User.findById(userId).select('employeeId');
  let employeeId = user?.employeeId;
  
  if (!employeeId) {
    const employee = await Employee.findOne({ userId }).select('_id');
    employeeId = employee?._id;
  }
  
  if (!employeeId) return null;
  
  return await Department.findOne({ head: employeeId, isActive: true });
}

/**
 * POST - Trigger session aggregation
 * Can aggregate for a specific user or all users with pending data
 */
export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      const result = await jwtVerify(token, JWT_SECRET);
      decoded = result.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    // Check permissions - admins and department heads can trigger bulk aggregation
    const requester = await User.findById(decoded.userId).select('role');
    const isAdmin = ['admin', 'god_admin'].includes(requester?.role);
    const headOfDepartment = await getDepartmentIfHead(decoded.userId);
    const isDeptHead = !!headOfDepartment;

    const body = await request.json().catch(() => ({}));
    const { userId, startTime, endTime, processAll } = body;

    if (processAll) {
      if (!isAdmin && !isDeptHead) {
        return NextResponse.json({ 
          success: false, 
          error: 'Only admins and department heads can trigger bulk aggregation' 
        }, { status: 403 });
      }

      console.log('[Aggregate API] Processing all pending sessions...');
      const results = await processAllPendingSessions();
      
      return NextResponse.json({
        success: true,
        message: 'Bulk aggregation completed',
        results
      });
    }

    // Single user aggregation
    const targetUserId = userId || decoded.userId;
    
    // Non-admins can only aggregate their own data
    if (targetUserId !== decoded.userId && !isAdmin) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied' 
      }, { status: 403 });
    }

    console.log(`[Aggregate API] Aggregating sessions for user ${targetUserId}`);
    
    const sessions = await aggregateSessionsForUser(
      targetUserId,
      startTime ? new Date(startTime) : null,
      endTime ? new Date(endTime) : null
    );

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No data to aggregate',
        sessionsCreated: 0
      });
    }

    const saved = await saveAggregatedSessions(sessions);

    return NextResponse.json({
      success: true,
      message: `Aggregated ${saved.length} sessions`,
      sessionsCreated: saved.length,
      sessions: saved.map(s => ({
        id: s._id,
        sessionStart: s.sessionStart,
        sessionEnd: s.sessionEnd,
        screenshotCount: s.screenshots.length,
        productivityScore: s.aiAnalysis?.productivityScore
      }))
    });

  } catch (error) {
    console.error('[Aggregate API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to aggregate sessions',
      details: error.message
    }, { status: 500 });
  }
}
