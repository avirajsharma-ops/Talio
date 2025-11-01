# Employee Dashboard Fix - "Failed to Load Dashboard Data" Error

## Problem Summary
When employees logged in, they encountered a "Failed to load dashboard data" error. The dashboard was unable to fetch employee statistics and other data.

## Root Cause
The issue was in the API routes that handle employee-specific data. The JWT token contains `userId` which refers to the **User** document's ID, not the **Employee** document's ID. However, several API routes were incorrectly using `decoded.userId` directly to query the Employee collection.

### Data Model Structure
```
User {
  _id: ObjectId (This is what's in the JWT as userId)
  email: String
  role: String
  employeeId: ObjectId (Reference to Employee document)
}

Employee {
  _id: ObjectId (The actual employee record)
  firstName: String
  lastName: String
  ...
}
```

## Files Fixed

### 1. `/app/api/dashboard/employee-stats/route.js`
**Before:**
```javascript
const employee = await Employee.findOne({ _id: decoded.userId })
```

**After:**
```javascript
// Find the user first to get the employeeId
const user = await User.findById(decoded.userId).populate('employeeId')
if (!user) {
  return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 })
}

if (!user.employeeId) {
  return NextResponse.json({ success: false, message: 'Employee profile not found' }, { status: 404 })
}

const employee = user.employeeId
```

### 2. `/app/api/daily-goals/route.js`
Fixed three methods (GET, POST, PUT) that were using `decoded.userId` as employee ID:

**GET Method:**
```javascript
// Added at the beginning
const currentUser = await User.findById(decoded.userId).select('employeeId')
const currentEmployeeId = currentUser?.employeeId

// Changed from:
query.employee = decoded.userId
// To:
query.employee = currentEmployeeId
```

**POST Method:**
```javascript
// Changed from:
let targetEmployeeId = decoded.userId
// To:
const currentUser = await User.findById(decoded.userId).select('employeeId')
const currentEmployeeId = currentUser?.employeeId
let targetEmployeeId = currentEmployeeId
```

**PUT Method:**
```javascript
// Changed from:
const isOwner = dailyGoal.employee.toString() === decoded.userId
// To:
const currentUser = await User.findById(decoded.userId).select('employeeId')
const currentEmployeeId = currentUser?.employeeId
const isOwner = dailyGoal.employee.toString() === currentEmployeeId?.toString()
```

### 3. `/app/api/announcements/route.js`
**Created this missing file** - The announcements API route was completely missing, which was causing the dashboard to fail when trying to fetch announcements.

## Testing Steps

1. **Login as an employee**
   - Use employee credentials to login
   - Navigate to the dashboard

2. **Verify Dashboard Loads**
   - Check that the dashboard displays without errors
   - Verify employee stats are showing (hours, leave balance, salary, etc.)
   - Confirm announcements are displayed
   - Check that holidays are visible

3. **Test Daily Goals**
   - Navigate to daily goals section
   - Try creating/updating goals
   - Verify goals are saved correctly

4. **Check Console**
   - Open browser developer console
   - Verify no 404 or 500 errors
   - Check network tab for successful API responses

## Additional Notes

- The `/app/api/tasks/route.js` already had the correct implementation and didn't need fixing
- Other API routes that accept `employeeId` as a parameter (like attendance, leave, etc.) are working correctly as they receive the employee ID from the frontend
- The middleware authentication is working correctly - the issue was only in how the API routes were using the decoded token data

## Prevention

To prevent similar issues in the future:
1. Always remember that `decoded.userId` from JWT refers to the User document, not Employee
2. When you need employee data, first fetch the User, then access `user.employeeId`
3. Consider creating a helper function to get current employee from token:
   ```javascript
   async function getCurrentEmployee(userId) {
     const user = await User.findById(userId).populate('employeeId')
     return user?.employeeId
   }
   ```

## Status
✅ **FIXED** - Employee dashboard should now load successfully without errors.

