/**
 * Maya AI Actions API
 * Allows Maya to perform database operations with role-based access control
 * 
 * Endpoint: POST /api/maya/actions
 * 
 * Request body:
 * {
 *   action: 'read' | 'create' | 'update' | 'delete',
 *   collection: 'employees' | 'departments' | etc.,
 *   query: { ... },  // For read/update/delete
 *   data: { ... },   // For create/update
 *   options: { ... } // Additional options (limit, sort, etc.)
 * }
 */

import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyTokenFromRequest } from '@/lib/auth';
import { 
  hasPermission, 
  validateMayaAction, 
  buildRoleBasedFilter,
  getAllowedFields,
  canAccessEmployeeData 
} from '@/lib/mayaPermissions';

// Import all models
import User from '@/models/User';
import Employee from '@/models/Employee';
import Department from '@/models/Department';
import Designation from '@/models/Designation';
import Attendance from '@/models/Attendance';
import Leave from '@/models/Leave';
import LeaveType from '@/models/LeaveType';
import LeaveBalance from '@/models/LeaveBalance';
import Payroll from '@/models/Payroll';
import Performance from '@/models/Performance';
import Recruitment from '@/models/Recruitment';
import Candidate from '@/models/Candidate';
import Asset from '@/models/Asset';
import Document from '@/models/Document';
import Expense from '@/models/Expense';
import Travel from '@/models/Travel';
import Helpdesk from '@/models/Helpdesk';
import Policy from '@/models/Policy';
import Announcement from '@/models/Announcement';
import Holiday from '@/models/Holiday';
import Onboarding from '@/models/Onboarding';
import Offboarding from '@/models/Offboarding';
import Task from '@/models/Task';
import Project from '@/models/Project';
import DailyGoal from '@/models/DailyGoal';
import Activity from '@/models/Activity';
import Notification from '@/models/Notification';

// Model mapping
const MODELS = {
  users: User,
  employees: Employee,
  departments: Department,
  designations: Designation,
  attendance: Attendance,
  leave: Leave,
  leavetypes: LeaveType,
  leavebalances: LeaveBalance,
  payroll: Payroll,
  performance: Performance,
  recruitment: Recruitment,
  candidates: Candidate,
  assets: Asset,
  documents: Document,
  expenses: Expense,
  travel: Travel,
  helpdesk: Helpdesk,
  policies: Policy,
  announcements: Announcement,
  holidays: Holiday,
  onboarding: Onboarding,
  offboarding: Offboarding,
  tasks: Task,
  projects: Project,
  dailygoals: DailyGoal,
  activities: Activity,
  notifications: Notification,
};

export async function POST(request) {
  try {
    // Verify authentication
    const authResult = await verifyTokenFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          message: authResult.message 
        },
        { status: 401 }
      );
    }

    const { user } = authResult;
    const body = await request.json();
    const { action, collection, query = {}, data = {}, options = {} } = body;

    // Validate request
    if (!action || !collection) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: action and collection are required' 
        },
        { status: 400 }
      );
    }

    // Validate action
    const validation = validateMayaAction(user.role, action, collection, data);
    if (!validation.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          userRole: user.role,
          requiredAction: action,
          targetCollection: collection
        },
        { status: 403 }
      );
    }

    await connectDB();

    // Get the model
    const Model = MODELS[collection];
    if (!Model) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Unknown collection: ${collection}`,
          availableCollections: Object.keys(MODELS)
        },
        { status: 400 }
      );
    }

    // Get employee ID and department for the user
    const userEmployee = await Employee.findOne({ email: user.email }).populate('department');
    const employeeId = userEmployee?._id;
    const departmentId = userEmployee?.department?._id;

    // Build role-based filter with department context
    const roleFilter = buildRoleBasedFilter(user.role, collection, user.userId, employeeId, departmentId);
    const finalQuery = { ...query, ...roleFilter };

    // Execute action
    let result;
    switch (action) {
      case 'read':
        result = await executeRead(Model, finalQuery, options, user.role, collection, employeeId, departmentId);
        break;

      case 'create':
        result = await executeCreate(Model, data, user, employeeId);
        break;

      case 'update':
        result = await executeUpdate(Model, finalQuery, data, user, employeeId);
        break;

      case 'delete':
        result = await executeDelete(Model, finalQuery, user);
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      action,
      collection,
      ...result,
    });

  } catch (error) {
    console.error('Maya actions error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Helper functions for executing actions

async function executeRead(Model, query, options, userRole, collection, employeeId = null, departmentId = null) {
  const { limit = 50, skip = 0, sort = {}, populate = [] } = options;

  // Get allowed fields
  const { restricted, allowAll } = getAllowedFields(userRole, collection, 'read');

  // Build projection to exclude restricted fields
  const projection = {};
  if (!allowAll && restricted.length > 0) {
    restricted.forEach(field => {
      projection[field] = 0;
    });
  }

  // For department heads, filter employee-specific collections by department employees
  const employeeCollections = [
    'attendance', 'leave', 'expenses', 'travel', 'payroll', 'performance',
    'timesheets', 'benefits', 'insurance', 'loans', 'advances', 'deductions',
    'bonuses', 'increments', 'feedback', 'warnings', 'appreciations'
  ];

  if (userRole === 'department_head' && departmentId && employeeCollections.includes(collection)) {
    // Get all employees in the department
    const departmentEmployees = await Employee.find({ department: departmentId }).select('_id').lean();
    const departmentEmployeeIds = departmentEmployees.map(emp => emp._id);

    // Add filter to only show data for department employees
    if (query.employee) {
      // If query already has employee filter, ensure it's in the department
      if (!departmentEmployeeIds.some(id => id.toString() === query.employee.toString())) {
        // Employee not in department, return empty result
        return {
          data: [],
          count: 0,
          limit,
          skip,
          hasMore: false,
        };
      }
    } else {
      // Add department employee filter
      query.employee = { $in: departmentEmployeeIds };
    }
  }

  // Execute query
  let queryBuilder = Model.find(query, projection)
    .limit(Math.min(limit, 100)) // Max 100 results
    .skip(skip)
    .sort(sort);

  // Apply population if specified
  if (populate.length > 0) {
    populate.forEach(pop => {
      queryBuilder = queryBuilder.populate(pop);
    });
  }

  const data = await queryBuilder.lean();
  const count = await Model.countDocuments(query);

  return {
    data,
    count,
    limit,
    skip,
    hasMore: count > (skip + data.length),
  };
}

async function executeCreate(Model, data, user, employeeId) {
  // Add metadata
  const enrichedData = {
    ...data,
    createdBy: employeeId,
    createdAt: new Date(),
  };

  // Create document
  const document = await Model.create(enrichedData);

  // Log activity
  await logActivity({
    employee: employeeId,
    type: 'other',
    action: `Created ${Model.modelName}`,
    details: `Maya AI created a new ${Model.modelName} record`,
    relatedModel: Model.modelName,
    relatedId: document._id,
  });

  return {
    data: document,
    message: `Successfully created ${Model.modelName}`,
  };
}

async function executeUpdate(Model, query, data, user, employeeId) {
  // Remove fields that shouldn't be updated
  const { _id, createdAt, createdBy, ...updateData } = data;

  // Add update metadata
  updateData.updatedBy = employeeId;
  updateData.updatedAt = new Date();

  // Update documents
  const result = await Model.updateMany(query, { $set: updateData });

  // Log activity
  await logActivity({
    employee: employeeId,
    type: 'other',
    action: `Updated ${Model.modelName}`,
    details: `Maya AI updated ${result.modifiedCount} ${Model.modelName} record(s)`,
    relatedModel: Model.modelName,
  });

  return {
    modifiedCount: result.modifiedCount,
    matchedCount: result.matchedCount,
    message: `Successfully updated ${result.modifiedCount} ${Model.modelName}(s)`,
  };
}

async function executeDelete(Model, query, user) {
  // Safety check - prevent deleting everything
  if (Object.keys(query).length === 0) {
    throw new Error('Delete operation requires a query filter');
  }

  // Get employee ID
  const userEmployee = await Employee.findOne({ email: user.email });
  const employeeId = userEmployee?._id;

  // Delete documents
  const result = await Model.deleteMany(query);

  // Log activity
  await logActivity({
    employee: employeeId,
    type: 'other',
    action: `Deleted ${Model.modelName}`,
    details: `Maya AI deleted ${result.deletedCount} ${Model.modelName} record(s)`,
    relatedModel: Model.modelName,
  });

  return {
    deletedCount: result.deletedCount,
    message: `Successfully deleted ${result.deletedCount} ${Model.modelName}(s)`,
  };
}

async function logActivity(activityData) {
  try {
    await Activity.create(activityData);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// GET endpoint for documentation
export async function GET(request) {
  return NextResponse.json({
    message: 'Maya AI Actions API',
    description: 'Allows Maya to perform database operations with role-based access control',
    usage: {
      method: 'POST',
      endpoint: '/api/maya/actions',
      authentication: 'Required (JWT token)',
      body: {
        action: 'read | create | update | delete',
        collection: 'employees | departments | attendance | leave | etc.',
        query: { field: 'value' },
        data: { field: 'value' },
        options: {
          limit: 50,
          skip: 0,
          sort: { field: 1 },
          populate: ['field1', 'field2'],
        },
      },
    },
    examples: {
      readEmployees: {
        action: 'read',
        collection: 'employees',
        query: { status: 'active' },
        options: { limit: 10, populate: ['department', 'designation'] },
      },
      createAnnouncement: {
        action: 'create',
        collection: 'announcements',
        data: {
          title: 'Team Meeting',
          description: 'Monthly team sync',
          type: 'general',
        },
      },
      updateLeave: {
        action: 'update',
        collection: 'leave',
        query: { _id: 'leave-id' },
        data: { status: 'approved' },
      },
    },
    availableCollections: Object.keys(MODELS),
    rolePermissions: {
      admin: 'Full access to all collections',
      hr: 'Broad access to HR-related collections',
      department_head: 'Access to department data',
      manager: 'Access to team data',
      employee: 'Limited access to own data',
    },
  });
}

