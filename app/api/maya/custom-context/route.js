import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import MayaCustomContext from '@/models/MayaCustomContext';

/**
 * MAYA Custom Context API
 * Allows GOD ADMIN to customize MAYA's behavior, personality, and knowledge
 * Only accessible by god_admin role
 */

// GET - Fetch all custom contexts or specific ones
export async function GET(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(request.url);
    const contextType = searchParams.get('contextType');
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    const query = {};
    
    if (contextType) query.contextType = contextType;
    if (category) query.category = category;
    if (isActive !== null) query.isActive = isActive === 'true';

    // God admin can see all contexts, others can only see active ones
    if (user.role !== 'god_admin') {
      query.isActive = true;
    }

    const contexts = await MayaCustomContext.find(query)
      .populate('createdBy', 'email')
      .populate('updatedBy', 'email')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      contexts,
      total: contexts.length
    });

  } catch (error) {
    console.error('Error fetching custom contexts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom contexts', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create new custom context (god_admin only)
export async function POST(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Only god_admin can create custom contexts
    if (user.role !== 'god_admin') {
      return NextResponse.json(
        { error: 'Only GOD ADMIN can create custom contexts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contextType, category, title, description, content, priority, appliesTo, conditions, metadata } = body;

    if (!contextType || !category || !title || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: contextType, category, title, content' },
        { status: 400 }
      );
    }

    const newContext = await MayaCustomContext.create({
      contextType,
      category,
      title,
      description,
      content,
      priority: priority || 0,
      appliesTo: appliesTo || {},
      conditions: conditions || {},
      metadata: metadata || {},
      createdBy: user._id,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      message: 'Custom context created successfully',
      context: newContext
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating custom context:', error);
    return NextResponse.json(
      { error: 'Failed to create custom context', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update custom context (god_admin only)
export async function PUT(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Only god_admin can update custom contexts
    if (user.role !== 'god_admin') {
      return NextResponse.json(
        { error: 'Only GOD ADMIN can update custom contexts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { contextId, ...updates } = body;

    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      );
    }

    const existingContext = await MayaCustomContext.findById(contextId);

    if (!existingContext) {
      return NextResponse.json(
        { error: 'Custom context not found' },
        { status: 404 }
      );
    }

    // Save change history
    const changeHistory = {
      changedBy: user._id,
      changedAt: new Date(),
      changes: JSON.stringify(updates),
      previousContent: existingContext.content,
    };

    existingContext.changeHistory.push(changeHistory);
    existingContext.updatedBy = user._id;

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key !== 'contextId' && key !== 'changeHistory') {
        existingContext[key] = updates[key];
      }
    });

    await existingContext.save();

    return NextResponse.json({
      success: true,
      message: 'Custom context updated successfully',
      context: existingContext
    });

  } catch (error) {
    console.error('Error updating custom context:', error);
    return NextResponse.json(
      { error: 'Failed to update custom context', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete custom context (god_admin only)
export async function DELETE(request) {
  try {
    await connectDB();

    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Only god_admin can delete custom contexts
    if (user.role !== 'god_admin') {
      return NextResponse.json(
        { error: 'Only GOD ADMIN can delete custom contexts' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'contextId is required' },
        { status: 400 }
      );
    }

    const deletedContext = await MayaCustomContext.findByIdAndDelete(contextId);

    if (!deletedContext) {
      return NextResponse.json(
        { error: 'Custom context not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Custom context deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting custom context:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom context', details: error.message },
      { status: 500 }
    );
  }
}

