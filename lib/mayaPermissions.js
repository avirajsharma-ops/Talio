/**
 * Maya AI Permission System
 *
 * IMPORTANT: MAYA has FULL access to ALL database collections and data.
 * Role-based restrictions are ONLY applied when presenting/filtering data to users.
 *
 * MAYA can:
 * - Read ALL collections (employees, payroll, attendance, etc.)
 * - Access ALL data in the database
 * - Filter and present data based on user's role
 *
 * The role system controls what data is SHOWN to the user, not what MAYA can access.
 */

// Role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  employee: 1,
  manager: 2,
  department_head: 3,
  hr: 4,
  admin: 5,
  god_admin: 999, // GOD ADMIN - Supreme access, no restrictions
};

// MAYA's full database access (all collections available)
const ALL_COLLECTIONS = [
  'employees', 'users', 'departments', 'designations', 'attendance', 'leave',
  'leavetypes', 'leavebalances', 'payroll', 'performance', 'recruitment',
  'candidates', 'onboarding', 'offboarding', 'documents', 'assets', 'expenses',
  'travel', 'helpdesk', 'policies', 'announcements', 'holidays', 'training',
  'courses', 'tasks', 'projects', 'timesheets', 'approvals', 'activities',
  'notifications', 'settings', 'roles', 'permissions', 'audit', 'reports',
  'benefits', 'insurance', 'loans', 'advances', 'deductions', 'bonuses',
  'increments', 'transfers', 'promotions', 'resignations', 'terminations',
  'warnings', 'appreciations', 'feedback', 'surveys', 'polls', 'events',
  'meetings', 'rooms', 'equipment', 'inventory', 'vendors', 'contracts',
];

// Collection-level permissions
const COLLECTION_PERMISSIONS = {
  // GOD ADMIN - Supreme access, no restrictions whatsoever
  god_admin: {
    read: ['*'],
    create: ['*'],
    update: ['*'],
    delete: ['*'],
    description: 'GOD ADMIN has unrestricted access to ALL data and ALL actions. No filters, no restrictions.',
  },

  // Admin can do everything
  admin: {
    read: ['*'],
    create: ['*'],
    update: ['*'],
    delete: ['*'],
  },

  // HR has broad access
  hr: {
    read: ['employees', 'users', 'departments', 'designations', 'attendance', 'leave', 'leavetypes', 'leavebalances', 'payroll', 'performance', 'recruitment', 'candidates', 'onboarding', 'offboarding', 'documents', 'assets', 'expenses', 'travel', 'helpdesk', 'policies', 'announcements', 'holidays', 'training', 'courses'],
    create: ['employees', 'departments', 'designations', 'leavetypes', 'payroll', 'performance', 'recruitment', 'onboarding', 'offboarding', 'documents', 'policies', 'announcements', 'holidays', 'training'],
    update: ['employees', 'departments', 'designations', 'attendance', 'leave', 'payroll', 'performance', 'recruitment', 'onboarding', 'offboarding', 'documents', 'assets', 'expenses', 'travel', 'helpdesk', 'policies', 'announcements', 'holidays'],
    delete: ['announcements', 'documents', 'policies'],
  },
  
  // Department Head
  department_head: {
    read: ['employees', 'departments', 'attendance', 'leave', 'performance', 'tasks', 'projects', 'announcements', 'documents', 'assets'],
    create: ['tasks', 'projects', 'announcements', 'performance'],
    update: ['employees', 'attendance', 'leave', 'tasks', 'projects', 'performance'],
    delete: [],
  },
  
  // Manager
  manager: {
    read: ['employees', 'departments', 'attendance', 'leave', 'tasks', 'projects', 'announcements', 'documents'],
    create: ['tasks', 'announcements'],
    update: ['tasks', 'leave', 'attendance'],
    delete: [],
  },
  
  // Employee (most restricted)
  employee: {
    read: ['employees', 'departments', 'announcements', 'documents', 'policies', 'holidays'],
    create: ['leave', 'expenses', 'travel', 'helpdesk'],
    update: ['tasks'], // Only their own tasks
    delete: [],
  },
};

/**
 * Check if MAYA has permission to access a collection
 *
 * IMPORTANT: MAYA has FULL access to ALL collections for READ operations.
 * For CREATE/UPDATE/DELETE, we check user's role permissions.
 */
export function hasPermission(userRole, action, collection) {
  if (!userRole || !ROLE_HIERARCHY[userRole]) {
    return false;
  }

  // MAYA has FULL READ access to ALL collections regardless of user role
  // This allows MAYA to access all data and filter based on role when presenting
  if (action === 'read') {
    return true; // MAYA can read from ANY collection
  }

  // For write operations (create, update, delete), check user's role permissions
  const permissions = COLLECTION_PERMISSIONS[userRole];
  if (!permissions) {
    return false;
  }

  const allowedCollections = permissions[action] || [];

  // Check for wildcard permission
  if (allowedCollections.includes('*')) {
    return true;
  }

  // Check if collection is in allowed list
  return allowedCollections.includes(collection);
}

/**
 * Check if user can access specific employee data
 */
export function canAccessEmployeeData(userRole, requestingUserId, targetEmployeeId, employeeData) {
  // GOD ADMIN can access EVERYTHING
  if (userRole === 'god_admin') {
    return { allowed: true, reason: 'god_admin_unlimited_access' };
  }

  // Admin and HR can access all employee data
  if (['admin', 'hr'].includes(userRole)) {
    return { allowed: true, reason: 'admin_or_hr_privileges' };
  }
  
  // Users can access their own data
  if (requestingUserId === targetEmployeeId) {
    return { allowed: true, reason: 'own_data' };
  }
  
  // Managers can access their team's data
  if (userRole === 'manager' || userRole === 'department_head') {
    if (employeeData && employeeData.reportingManager?.toString() === requestingUserId) {
      return { allowed: true, reason: 'manager_access' };
    }
  }
  
  // Department heads can access their department's data
  if (userRole === 'department_head') {
    // This would need department head info - simplified for now
    return { allowed: false, reason: 'insufficient_permissions' };
  }
  
  return { allowed: false, reason: 'insufficient_permissions' };
}

/**
 * Get allowed fields for a collection based on user role
 *
 * IMPORTANT: MAYA has access to ALL fields in the database.
 * Field restrictions are applied when PRESENTING data to users, not when MAYA accesses it.
 */
export function getAllowedFields(userRole, collection, action) {
  // GOD ADMIN can see ALL fields - no restrictions
  if (userRole === 'god_admin') {
    return {
      restricted: [],
      allowAll: true,
    };
  }

  // Fields that should be HIDDEN from users (but MAYA can still access them)
  const SENSITIVE_FIELDS_TO_HIDE = {
    employees: {
      employee: ['salary', 'bankDetails', 'emergencyContact.bankDetails'],
      manager: ['salary', 'bankDetails'],
      department_head: ['salary', 'bankDetails'],
      hr: [], // HR can see all employee fields
      admin: [], // Admin can see all fields
      god_admin: [], // GOD ADMIN can see ALL fields
    },
    users: {
      employee: ['password', 'passwordResetToken', 'passwordHash'],
      manager: ['password', 'passwordResetToken', 'passwordHash'],
      department_head: ['password', 'passwordResetToken', 'passwordHash'],
      hr: ['password', 'passwordHash'], // HR can't see passwords
      admin: ['password', 'passwordHash'], // Even admin shouldn't see password hashes
      god_admin: ['password', 'passwordHash'], // GOD ADMIN also shouldn't see password hashes (security)
    },
    payroll: {
      employee: [], // Employees can see their own payroll (filtered by buildRoleBasedFilter)
      manager: ['*'], // Managers can't see payroll details
      department_head: ['*'], // Dept heads can't see payroll details
      hr: [], // HR can see all payroll
      admin: [], // Admin can see all payroll
      god_admin: [], // GOD ADMIN can see all payroll
    },
  };

  const restrictedFields = SENSITIVE_FIELDS_TO_HIDE[collection]?.[userRole] || [];

  return {
    restricted: restrictedFields,
    allowAll: restrictedFields.length === 0 || (restrictedFields.length === 1 && restrictedFields[0] === '*'),
  };
}

/**
 * Build query filter based on user role and permissions
 *
 * IMPORTANT: This function filters what data is SHOWN to the user.
 * MAYA has access to ALL data, but filters results based on user's role.
 *
 * For example:
 * - Employee asks "show me all salaries" → MAYA can access all salary data,
 *   but only shows the employee's own salary
 * - Admin asks "show me all salaries" → MAYA shows all salaries
 */
export function buildRoleBasedFilter(userRole, collection, userId, employeeId) {
  const filters = {};

  // GOD ADMIN can see EVERYTHING - absolutely no filters
  if (userRole === 'god_admin') {
    return {}; // Empty filter = see ALL data, no restrictions
  }

  // Admin and HR can see everything - no filters applied
  if (['admin', 'hr'].includes(userRole)) {
    return filters; // Empty filter = see all data
  }

  // For employee-specific collections, filter by employee
  const employeeCollections = [
    'attendance', 'leave', 'expenses', 'travel', 'payroll', 'performance',
    'timesheets', 'benefits', 'insurance', 'loans', 'advances', 'deductions',
    'bonuses', 'increments', 'feedback', 'warnings', 'appreciations'
  ];

  if (employeeCollections.includes(collection)) {
    if (userRole === 'employee') {
      // Employees can only see their own data
      filters.employee = employeeId;
    } else if (userRole === 'manager' || userRole === 'department_head') {
      // Managers and dept heads can see their team's data
      // This would need to be enhanced with actual team/department logic
      // For now, we'll let them see all (MAYA will handle context)
      return filters;
    }
  }

  return filters;
}

/**
 * Validate Maya action request
 *
 * IMPORTANT: For READ operations, MAYA always has access.
 * For WRITE operations (create, update, delete), we validate user's role.
 */
export function validateMayaAction(userRole, action, collection, data) {
  // MAYA has FULL READ access to ALL collections
  if (action === 'read') {
    return {
      valid: true,
      note: 'MAYA has full read access. Data will be filtered based on user role when presenting results.'
    };
  }

  // For write operations, check user's role permissions
  if (!hasPermission(userRole, action, collection)) {
    return {
      valid: false,
      error: `You don't have permission to ${action} ${collection}. Only ${getRolesWithPermission(action, collection).join(', ')} can perform this action.`,
    };
  }

  // Additional validation based on action
  if (action === 'delete') {
    // Extra caution for delete operations
    if (!['admin', 'hr'].includes(userRole)) {
      return {
        valid: false,
        error: 'Delete operations require admin or HR privileges.',
      };
    }
  }

  return { valid: true };
}

/**
 * Get roles that have permission for an action
 */
function getRolesWithPermission(action, collection) {
  const roles = [];
  
  for (const [role, permissions] of Object.entries(COLLECTION_PERMISSIONS)) {
    const allowedCollections = permissions[action] || [];
    if (allowedCollections.includes('*') || allowedCollections.includes(collection)) {
      roles.push(role);
    }
  }
  
  return roles;
}

/**
 * Get Maya capabilities description for a user role
 */
export function getMayaCapabilities(userRole) {
  const permissions = COLLECTION_PERMISSIONS[userRole];
  if (!permissions) {
    return {
      role: userRole,
      canRead: [],
      canCreate: [],
      canUpdate: [],
      canDelete: [],
    };
  }
  
  return {
    role: userRole,
    canRead: permissions.read,
    canCreate: permissions.create,
    canUpdate: permissions.update,
    canDelete: permissions.delete,
  };
}

/**
 * Check if a user can access/monitor another user based on hierarchy
 * Used for message relay and screen monitoring
 *
 * @param {string} requesterRole - Role of the user making the request
 * @param {string} targetRole - Role of the target user
 * @param {string} requesterId - ID of the requester (for same-user check)
 * @param {string} targetId - ID of the target user
 * @returns {boolean} - Whether access is allowed
 */
export function canUserAccessTarget(requesterRole, targetRole, requesterId, targetId) {
  // GOD admin can access anyone
  if (requesterRole === 'god_admin') {
    return true;
  }

  // Users can always access themselves
  if (requesterId === targetId) {
    return true;
  }

  // Get hierarchy levels
  const requesterLevel = ROLE_HIERARCHY[requesterRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

  // Can access users at same or lower hierarchy level
  // Managers can access employees, HR can access managers and below, etc.
  return requesterLevel >= targetLevel;
}

// Export ROLE_HIERARCHY for use in other modules
export { ROLE_HIERARCHY };

