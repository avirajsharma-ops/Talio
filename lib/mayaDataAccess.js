/**
 * MAYA Data Access Layer
 * Provides MAYA with access to all database collections with proper role-based filtering
 */

import Employee from '@/models/Employee';
import User from '@/models/User';
import Department from '@/models/Department';
import Designation from '@/models/Designation';
import Leave from '@/models/Leave';
import Attendance from '@/models/Attendance';
import Task from '@/models/Task';
import Expense from '@/models/Expense';
import Document from '@/models/Document';
import Announcement from '@/models/Announcement';
import Holiday from '@/models/Holiday';
import Payroll from '@/models/Payroll';
import Performance from '@/models/Performance';
import Asset from '@/models/Asset';
import Helpdesk from '@/models/Helpdesk';
import Policy from '@/models/Policy';
import MayaFormattedData from '@/models/MayaFormattedData';
import MayaLearning from '@/models/MayaLearning';
import MayaReference from '@/models/MayaReference';
import MayaChatHistory from '@/models/MayaChatHistory';
import MayaActionLog from '@/models/MayaActionLog';

/**
 * Get user's access scope based on role and hierarchy
 */
export async function getUserAccessScope(userId) {
  const user = await User.findById(userId).populate({
    path: 'employeeId',
    populate: { path: 'department' }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const employee = user.employeeId;
  
  return {
    userId: user._id,
    employeeId: employee?._id,
    role: user.role,
    department: employee?.department?._id,
    departmentName: employee?.department?.name,
    isGodAdmin: user.role === 'god_admin',
    isAdmin: user.role === 'admin' || user.role === 'god_admin',
    isHR: user.role === 'hr' || user.role === 'admin' || user.role === 'god_admin',
    isManager: user.role === 'manager' || user.role === 'department_head',
    isDepartmentHead: user.role === 'department_head',
  };
}

/**
 * Get employees accessible to user based on role
 */
export async function getAccessibleEmployees(accessScope, filters = {}) {
  let query = { status: 'active', ...filters };

  // God admin sees everyone
  if (accessScope.isGodAdmin) {
    return await Employee.find(query)
      .populate('department')
      .populate('designation')
      .populate('reportingManager')
      .lean();
  }

  // Admin and HR see everyone
  if (accessScope.isAdmin || accessScope.isHR) {
    return await Employee.find(query)
      .populate('department')
      .populate('designation')
      .populate('reportingManager')
      .lean();
  }

  // Department head sees their department
  if (accessScope.isDepartmentHead && accessScope.department) {
    query.department = accessScope.department;
    return await Employee.find(query)
      .populate('department')
      .populate('designation')
      .populate('reportingManager')
      .lean();
  }

  // Manager sees their team
  if (accessScope.isManager && accessScope.employeeId) {
    query.reportingManager = accessScope.employeeId;
    return await Employee.find(query)
      .populate('department')
      .populate('designation')
      .populate('reportingManager')
      .lean();
  }

  // Regular employee sees only themselves
  if (accessScope.employeeId) {
    return await Employee.find({ _id: accessScope.employeeId })
      .populate('department')
      .populate('designation')
      .populate('reportingManager')
      .lean();
  }

  return [];
}

/**
 * Get all database collections accessible to MAYA
 */
export const MAYA_ACCESSIBLE_COLLECTIONS = {
  employees: Employee,
  users: User,
  departments: Department,
  designations: Designation,
  leaves: Leave,
  attendances: Attendance,
  tasks: Task,
  expenses: Expense,
  documents: Document,
  announcements: Announcement,
  holidays: Holiday,
  payrolls: Payroll,
  performances: Performance,
  assets: Asset,
  helpdesks: Helpdesk,
  policies: Policy,
  mayaFormattedData: MayaFormattedData,
  mayaLearnings: MayaLearning,
  mayaReferences: MayaReference,
  mayaChatHistories: MayaChatHistory,
  mayaActionLogs: MayaActionLog,
};

/**
 * Query any collection with role-based access control
 */
export async function queryCollection(collectionName, accessScope, query = {}, options = {}) {
  const Model = MAYA_ACCESSIBLE_COLLECTIONS[collectionName];
  
  if (!Model) {
    throw new Error(`Collection ${collectionName} not accessible to MAYA`);
  }

  // Apply role-based filtering
  let finalQuery = { ...query };

  // God admin has no restrictions
  if (accessScope.isGodAdmin) {
    return await Model.find(finalQuery, null, options).lean();
  }

  // Collection-specific access control
  switch (collectionName) {
    case 'employees':
      return await getAccessibleEmployees(accessScope, query);
    
    case 'payrolls':
      // Only admin, HR, and god_admin can see payroll
      if (!accessScope.isAdmin && !accessScope.isHR) {
        finalQuery.employee = accessScope.employeeId;
      }
      break;
    
    // Add more collection-specific rules as needed
  }

  return await Model.find(finalQuery, null, options).lean();
}

/**
 * Format employee data for MAYA consumption
 */
export function formatEmployeeData(employee) {
  if (!employee) return null;

  return {
    id: employee._id?.toString(),
    name: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    phone: employee.phone,
    employeeCode: employee.employeeCode,
    department: employee.department?.name || 'N/A',
    designation: employee.designation?.title || 'N/A',
    reportingManager: employee.reportingManager ?
      `${employee.reportingManager.firstName} ${employee.reportingManager.lastName}` : 'N/A',
    dateOfJoining: employee.dateOfJoining,
    status: employee.status,
    employmentType: employee.employmentType,
    skills: employee.skills || [],
  };
}

/**
 * Format leave data for MAYA consumption
 */
export function formatLeaveData(leave) {
  if (!leave) return null;

  return {
    id: leave._id?.toString(),
    employee: leave.employee ?
      `${leave.employee.firstName} ${leave.employee.lastName}` : 'N/A',
    leaveType: leave.leaveType?.name || 'N/A',
    startDate: leave.startDate,
    endDate: leave.endDate,
    days: leave.days,
    reason: leave.reason,
    status: leave.status,
    appliedOn: leave.createdAt,
  };
}

/**
 * Format attendance data for MAYA consumption
 */
export function formatAttendanceData(attendance) {
  if (!attendance) return null;

  return {
    id: attendance._id?.toString(),
    employee: attendance.employee ?
      `${attendance.employee.firstName} ${attendance.employee.lastName}` : 'N/A',
    date: attendance.date,
    checkIn: attendance.checkIn,
    checkOut: attendance.checkOut,
    status: attendance.status,
    workHours: attendance.workHours,
    location: attendance.location,
  };
}

/**
 * Format task data for MAYA consumption
 */
export function formatTaskData(task) {
  if (!task) return null;

  return {
    id: task._id?.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignedTo: task.assignedTo?.map(emp =>
      `${emp.firstName} ${emp.lastName}`).join(', ') || 'N/A',
    createdBy: task.createdBy ?
      `${task.createdBy.firstName} ${task.createdBy.lastName}` : 'N/A',
    dueDate: task.dueDate,
    progress: task.progress,
  };
}

/**
 * Get formatted data for any collection
 */
export async function getFormattedCollectionData(collectionName, accessScope, filters = {}) {
  const data = await queryCollection(collectionName, accessScope, filters);

  switch (collectionName) {
    case 'employees':
      return data.map(formatEmployeeData);
    case 'leaves':
      return data.map(formatLeaveData);
    case 'attendances':
      return data.map(formatAttendanceData);
    case 'tasks':
      return data.map(formatTaskData);
    default:
      return data;
  }
}

/**
 * Store formatted data in MAYA's dedicated collection
 */
export async function syncFormattedData(sourceCollection, sourceDocumentId, formattedContent, structuredData, accessControl) {
  await MayaFormattedData.findOneAndUpdate(
    { sourceCollection, sourceDocumentId },
    {
      sourceCollection,
      sourceDocumentId,
      dataType: sourceCollection.replace(/s$/, ''), // Remove trailing 's'
      formattedContent,
      structuredData,
      searchableText: formattedContent,
      accessControl,
      metadata: {
        lastSynced: new Date(),
        syncVersion: 1,
        dataQuality: 1,
      },
      isActive: true,
    },
    { upsert: true, new: true }
  );
}

/**
 * Get all accessible data for MAYA based on user role
 */
export async function getAllAccessibleData(accessScope) {
  const collections = ['employees', 'departments', 'leaves', 'attendances', 'tasks', 'announcements'];
  const result = {};

  for (const collection of collections) {
    try {
      result[collection] = await getFormattedCollectionData(collection, accessScope);
    } catch (error) {
      console.error(`Error fetching ${collection}:`, error);
      result[collection] = [];
    }
  }

  return result;
}

