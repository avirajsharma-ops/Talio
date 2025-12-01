# Announcement Creation - "Employee Profile Not Found" - FIXED ✅

**Issue:** Getting error `{"success":false,"message":"Employee profile not found"}` when creating announcements

**Root Cause:** The announcement creation code was querying for a non-existent field `isDepartmentHead` on the Employee model, and the employee lookup logic had issues.

---

## 🔧 Fixes Applied

### 1. Updated Announcement API (`app/api/announcements/route.js`)

**Changes Made:**
- ✅ Removed query for non-existent `Employee.isDepartmentHead` field
- ✅ Added `employeeId` to User query for better linking
- ✅ Implemented fallback employee lookup strategy:
  1. First try: Find employee by `userId` reference
  2. Second try: Find employee by User's `employeeId` field
- ✅ Changed department head check from `employee.isDepartmentHead` to `user.role === 'department_head'`
- ✅ Enhanced error messages and debug logging
- ✅ Improved data validation before announcement creation

**Key Code Changes:**
```javascript
// Before (WRONG - field doesn't exist)
const employee = await Employee.findOne({ userId: decoded.userId }).select('_id department isDepartmentHead')
if (employee.isDepartmentHead) { ... }

// After (CORRECT - uses User role)
const user = await User.findById(decoded.userId).select('role employeeId')
let employee = await Employee.findOne({ userId: decoded.userId }).select('_id department')
if (!employee && user.employeeId) {
  employee = await Employee.findById(user.employeeId).select('_id department')
}
if (user.role === 'department_head') { ... }
```

### 2. Fixed User-Employee Two-Way Linking

**Problem:** Employee records had `userId` field not set, creating one-way links only

**Solution:** Created and ran `fix-user-employee-links.js` script

**Results:**
- ✅ Fixed 5 user-employee links
- ✅ All 6 active users now have proper two-way linking:
  - `User.employeeId` → Points to Employee document
  - `Employee.userId` → Points to User document

**Users Fixed:**
1. aviraj.sharma@mushroomworldgroup.com (manager)
2. ankita.pandey@mushroomworldgroup.com (employee)
3. adil.khan@mushroomworldgroup.com (admin)
4. lokesh.dhote@mushroomworldgroup.com (hr)
5. rithik.jain@mushroomworldgroup.com (employee)

---

## 📊 Verification

### Database Status:
```
Total Active Users: 6
Linked Employee Profiles: 6 ✅
Unlinked: 0 ✅
Two-Way Links: All configured ✅
```

### Code Status:
- ✅ No compilation errors
- ✅ Enhanced error handling
- ✅ Better debug logging
- ✅ Fallback lookup strategies

---

## 🧪 Testing

**To test the fix:**

1. **Try creating an announcement:**
   ```bash
   curl -X POST http://localhost:3000/api/announcements \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Announcement",
       "content": "This is a test",
       "targetAudience": "all"
     }'
   ```

2. **Check console logs for debugging:**
   ```
   [Announcement] Token decoded: { userId: '...' }
   [Announcement] User found: Yes admin
   [Announcement] Employee found: Yes 673e...
   [Announcement] Setting createdBy to: 673e...
   [Announcement] Data before create: { title: 'Test', createdBy: '673e...', ... }
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Announcement created successfully",
     "announcement": { ... }
   }
   ```

---

## 🛠️ Utility Scripts Created

### 1. `check-user-employee-links.js`
**Purpose:** Verify user-employee profile linking status

**Usage:**
```bash
node check-user-employee-links.js
```

**Output:**
- Shows which users have linked employee profiles
- Identifies missing links
- Warns about incomplete two-way linking

### 2. `fix-user-employee-links.js`
**Purpose:** Automatically fix two-way linking issues

**Usage:**
```bash
node fix-user-employee-links.js
```

**What it does:**
- Sets `User.employeeId` if missing
- Sets `Employee.userId` if missing
- Ensures both directions of the link exist
- Handles email-based matching as fallback

---

## 🔍 Understanding the User Roles

The User model supports these roles (in `models/User.js`):
- `god_admin` - Highest level admin
- `admin` - Administrator
- `hr` - Human Resources
- `manager` - Team/Project Manager
- `department_head` - Department Head (used for department-specific announcements)
- `employee` - Regular Employee

**For Announcements:**
- `department_head` role → Creates department-specific announcements
- `manager` role → Creates team/department announcements
- Other roles → Create general announcements

---

## 📝 Important Notes

### Employee Model Structure
The Employee model does **NOT** have an `isDepartmentHead` field. Department head status is determined by the **User's role** being `'department_head'`.

**Employee Model has:**
- `userId` - Reference to User document
- `department` - Reference to Department document
- `reportingManager` - Reference to another Employee
- `designation` - Reference to Designation document
- But **NO** `isDepartmentHead` field

**User Model has:**
- `role` - Enum including `'department_head'`
- `employeeId` - Reference to Employee document

### Two-Way Linking Pattern
For robust queries, both references should exist:
```javascript
User {
  _id: userId,
  employeeId: employeeId  // Points to Employee
}

Employee {
  _id: employeeId,
  userId: userId  // Points to User
}
```

This allows lookups in both directions:
- From User to Employee: `User.employeeId → Employee._id`
- From Employee to User: `Employee.userId → User._id`

---

## ✅ Issue Resolution Checklist

- [x] Identified root cause (non-existent field query)
- [x] Updated announcement creation API
- [x] Fixed employee lookup logic with fallback
- [x] Changed department head detection to use User.role
- [x] Fixed database two-way linking issues
- [x] Created utility scripts for monitoring
- [x] Verified all users have linked profiles
- [x] No compilation errors
- [x] Enhanced error messages
- [x] Added comprehensive logging

---

## 🚀 Next Steps

1. **Test Announcement Creation:**
   - Log in to the application
   - Navigate to Announcements
   - Create a new announcement
   - Verify no errors occur

2. **Monitor Logs:**
   - Check console for `[Announcement]` prefixed logs
   - Verify `Employee found: Yes` message appears
   - Confirm `createdBy` is set correctly

3. **Production Deployment:**
   - Run `fix-user-employee-links.js` on production database
   - Deploy updated `app/api/announcements/route.js`
   - Monitor for any issues

4. **Regular Maintenance:**
   - Run `check-user-employee-links.js` periodically
   - Ensure new users have employee profiles created
   - Verify two-way linking when creating new accounts

---

## 🔗 Related Files

- `app/api/announcements/route.js` - Fixed announcement creation endpoint
- `models/User.js` - User model with role field
- `models/Employee.js` - Employee model (no isDepartmentHead field)
- `models/Announcement.js` - Announcement model requiring createdBy
- `check-user-employee-links.js` - Diagnostic script
- `fix-user-employee-links.js` - Repair script

---

**Status:** ✅ **RESOLVED**

The announcement creation should now work correctly for all users with linked employee profiles.
