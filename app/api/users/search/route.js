import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

async function verifyAuth(request) {
  try {
    const token = request.cookies.get('token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.userId || payload.id,
      ...payload
    };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return null;
  }
}

// GET /api/users/search - Search for users
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    let filter = {};
    if (query) {
      filter = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } }
        ]
      };
    }

    // Exclude current user from results
    filter._id = { $ne: user.id };

    const users = await User.find(filter)
      .select('name email avatar role')
      .limit(limit)
      .lean();

    return NextResponse.json({
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Failed to search users' }, { status: 500 });
  }
}
