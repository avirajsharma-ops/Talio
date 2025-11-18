# MAYA GOD Admin Setup 👑

## Overview

The GOD Admin account has been created with **UNLIMITED ACCESS** to all HRMS data and actions. This is the supreme administrator account that MAYA treats with complete transparency and no restrictions.

---

## GOD Admin Credentials

```
Email: avi2001raj@gmail.com
Password: Mansiavi@2001
Role: god_admin
Employee Code: GOD001
```

**⚠️ IMPORTANT: Keep these credentials secure!**

---

## Access Level

### GOD Admin Has:
- ✅ **UNLIMITED READ access** to ALL data
- ✅ **UNLIMITED WRITE access** to ALL resources
- ✅ **NO FILTERING** - Sees everything without restrictions
- ✅ **NO HIERARCHY** - Can access any employee's data
- ✅ **COMPLETE CONTROL** - Can perform any action

### Regular Users Have:
- 🔒 **Role-based access** - Limited by their role (admin, hr, manager, employee)
- 🔒 **Filtered data** - Only see what they're authorized to see
- 🔒 **Hierarchy restrictions** - Can only access their team/department
- 🔒 **Limited actions** - Can only perform authorized operations

---

## MAYA's Behavior with GOD Admin

### When GOD Admin Asks for Data:

**Example 1: All Employee Salaries**
```
GOD Admin: "Show me all employee salaries"
MAYA: [Queries ALL salary data]
MAYA: [NO FILTERING]
MAYA: "Here are all employee salaries across the company:
       - John Doe: $120,000
       - Jane Smith: $95,000
       - ... [complete list]"
```

**Example 2: Specific Employee Data**
```
GOD Admin: "Show me John Doe's complete profile"
MAYA: [Queries John's complete record]
MAYA: [Shows EVERYTHING including sensitive data]
MAYA: "Here's John Doe's complete profile:
       - Salary: $120,000
       - Bank Details: [full details]
       - Performance: [complete history]
       - Leave Balance: [all details]"
```

**Example 3: All Leave Requests**
```
GOD Admin: "Show me all pending leave requests"
MAYA: [Queries ALL leave requests from ALL employees]
MAYA: [NO FILTERING by department or team]
MAYA: "Here are all pending leave requests:
       - John Doe: Dec 20-25 (Vacation)
       - Jane Smith: Dec 22-23 (Sick Leave)
       - ... [complete list from entire company]"
```

### When Regular User Asks for Same Data:

**Example: Employee Asks for Salaries**
```
Employee: "Show me all employee salaries"
MAYA: [Queries ALL salary data]
MAYA: [FILTERS to show only their own salary]
MAYA: "Your current salary is $95,000. I can only show you your own salary information."
```

---

## MAYA's Scope Definition

### For GOD Admin:
```
MAYA is your UNLIMITED assistant with:
- Full access to ALL HRMS data
- Ability to perform ANY action
- Complete transparency on ALL information
- No restrictions or filtering
```

### For Regular Users:
```
MAYA is your HRMS assistant with:
- Access to data within your role scope
- Ability to perform authorized actions
- Filtered information based on hierarchy
- Role-based restrictions
```

---

## Technical Implementation

### 1. Role Hierarchy
```javascript
const ROLE_HIERARCHY = {
  employee: 1,
  manager: 2,
  department_head: 3,
  hr: 4,
  admin: 5,
  god_admin: 999, // Supreme access
};
```

### 2. Permissions
```javascript
god_admin: {
  read: ['*'],    // All collections
  create: ['*'],  // All collections
  update: ['*'],  // All collections
  delete: ['*'],  // All collections
}
```

### 3. Data Filtering
```javascript
// GOD ADMIN - No filtering
if (userRole === 'god_admin') {
  return {}; // Empty filter = see ALL data
}

// Regular users - Apply filters
if (userRole === 'employee') {
  filters.employee = employeeId; // Only their data
}
```

---

## Files Modified

1. **`models/User.js`**
   - Added 'god_admin' to role enum

2. **`lib/mayaPermissions.js`**
   - Added god_admin to ROLE_HIERARCHY (999)
   - Added god_admin permissions (all '*')
   - Updated canAccessEmployeeData() for god_admin
   - Updated getAllowedFields() for god_admin
   - Updated buildRoleBasedFilter() for god_admin

3. **`lib/mayaContext.js`**
   - Added GOD ADMIN MODE section in system prompt
   - Added conditional instructions based on user role
   - Added examples for god_admin vs regular users

4. **`middleware.js`**
   - Added /api/create-god-admin to public routes

5. **`app/api/create-god-admin/route.js`**
   - Created API endpoint to create GOD admin account

---

## How to Login as GOD Admin

1. **Open the application**: http://localhost:3000
2. **Go to login page**: Click "Login"
3. **Enter credentials**:
   - Email: `avi2001raj@gmail.com`
   - Password: `Mansiavi@2001`
4. **Login**: Click "Login" button
5. **Access granted**: You now have UNLIMITED access!

---

## Testing GOD Admin Access

### Test 1: Ask MAYA for All Employee Data
```
You: "MAYA, show me all employees"
Expected: MAYA shows ALL employees from entire company
```

### Test 2: Ask for Sensitive Data
```
You: "MAYA, show me all employee salaries"
Expected: MAYA shows complete salary list for ALL employees
```

### Test 3: Ask for Specific Employee
```
You: "MAYA, show me John Doe's complete profile"
Expected: MAYA shows ALL information including sensitive data
```

### Test 4: Perform Admin Actions
```
You: "MAYA, create a new department"
Expected: MAYA creates the department without restrictions
```

---

## Security Notes

1. **GOD Admin credentials should be kept secure**
2. **Only one GOD Admin account should exist**
3. **GOD Admin actions are logged and auditable**
4. **Password hashes are still hidden (security best practice)**
5. **GOD Admin cannot see other users' password hashes**

---

## Status

✅ GOD Admin account created
✅ Permissions configured
✅ MAYA context updated
✅ Role hierarchy established
✅ Data filtering implemented
✅ Ready for use

---

**The GOD Admin account is now active and ready to use!** 👑

