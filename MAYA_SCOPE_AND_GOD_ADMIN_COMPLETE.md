# MAYA Scope & GOD Admin - Complete Implementation ✅

## Summary

MAYA's scope has been clearly defined with a two-tier access system:
1. **GOD Admin** - Unlimited access to everything
2. **Regular Users** - Role-based access with hierarchy

---

## 🎯 MAYA's Core Purpose

### Primary Mission:
MAYA assists users with their day-to-day HRMS tasks within their role scope, plus general questions.

### What MAYA Does:
1. **HRMS Task Assistance**
   - Check-in/check-out
   - Apply for leave
   - Submit expenses
   - Create tasks
   - View reports
   - Manage team (if authorized)

2. **Data Access & Queries**
   - Employee information
   - Attendance records
   - Leave balances
   - Payroll data (if authorized)
   - Performance reviews
   - Department data

3. **General Assistance**
   - Company policies
   - Holiday calendar
   - Announcements
   - Help desk support
   - Navigation assistance

---

## 👑 GOD Admin Account

### Credentials:
```
Email: avi2001raj@gmail.com
Password: Mansiavi@2001
Role: god_admin
Employee Code: GOD001
```

### Access Level:
- ✅ **UNLIMITED** - Can access ANY data about ANYONE
- ✅ **NO FILTERING** - Sees everything without restrictions
- ✅ **ALL ACTIONS** - Can perform ANY operation
- ✅ **COMPLETE CONTROL** - Supreme administrator

### MAYA's Behavior with GOD Admin:
```
GOD Admin: "Show me all employee salaries"
MAYA: [Shows ALL salaries for ALL employees - no filtering]

GOD Admin: "Show me John's performance reviews"
MAYA: [Shows John's complete performance history - all details]

GOD Admin: "Show me all pending leave requests"
MAYA: [Shows ALL requests from ALL employees - complete list]
```

---

## 👥 Regular Users (Hierarchy-Based Access)

### Employee Role:
- ✅ Can see: Own data, public announcements, policies
- ✅ Can do: Apply leave, submit expenses, check-in/out
- ❌ Cannot see: Other employees' salaries, team data

**MAYA's Behavior:**
```
Employee: "Show me all employee salaries"
MAYA: "Your current salary is $95,000. I can only show you your own salary information."
```

### Manager Role:
- ✅ Can see: Team data, team attendance, team leave
- ✅ Can do: Approve team leave, assign tasks, view team reports
- ❌ Cannot see: Other teams' data, all salaries

**MAYA's Behavior:**
```
Manager: "Show me team attendance"
MAYA: "Here's your team's attendance for this week: [only their team members]"
```

### HR Role:
- ✅ Can see: All employees, all leave, all attendance
- ✅ Can do: Manage employees, approve leave, generate payroll
- ❌ Cannot: Delete critical data (admin only)

**MAYA's Behavior:**
```
HR: "Show me all pending leave requests"
MAYA: "Here are all pending leave requests: [all employees, full access]"
```

### Admin Role:
- ✅ Can see: Everything
- ✅ Can do: All operations
- ❌ Limitation: Not GOD admin (some system-level restrictions may apply)

**MAYA's Behavior:**
```
Admin: "Show me all employee data"
MAYA: "Here's the complete employee database: [all employees, all data]"
```

---

## 🔐 How MAYA's Access Control Works

### The Godmother Model:
```
MAYA has FULL ACCESS to ALL data (she's the godmother)
    ↓
But she FILTERS what she SHOWS based on user role
    ↓
GOD Admin → No filtering (sees everything)
Regular Users → Role-based filtering (sees only authorized data)
```

### Technical Flow:
```javascript
// 1. MAYA queries ALL data (she has full access)
const allEmployees = await Employee.find({});

// 2. MAYA filters based on user role
if (userRole === 'god_admin') {
  // Show everything - no filter
  return allEmployees;
} else if (userRole === 'employee') {
  // Show only their own data
  return allEmployees.filter(emp => emp._id === userId);
} else if (userRole === 'manager') {
  // Show only their team
  return allEmployees.filter(emp => emp.manager === userId);
}
```

---

## 📊 Access Comparison Table

| Feature | GOD Admin | Admin | HR | Manager | Employee |
|---------|-----------|-------|----|---------| ---------|
| See all employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| See all salaries | ✅ | ✅ | ✅ | ❌ | ❌ |
| See team data | ✅ | ✅ | ✅ | ✅ (own team) | ❌ |
| See own data | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve leave | ✅ | ✅ | ✅ | ✅ (team) | ❌ |
| Delete employees | ✅ | ✅ | ❌ | ❌ | ❌ |
| System settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| **No restrictions** | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🚀 Implementation Details

### Files Modified:
1. **`models/User.js`** - Added 'god_admin' role
2. **`lib/mayaPermissions.js`** - GOD admin permissions
3. **`lib/mayaContext.js`** - GOD admin system prompt
4. **`middleware.js`** - Allow GOD admin creation endpoint
5. **`app/api/create-god-admin/route.js`** - GOD admin creation API

### Key Features:
- ✅ Role hierarchy (god_admin = 999)
- ✅ Unlimited permissions for GOD admin
- ✅ No data filtering for GOD admin
- ✅ Role-based filtering for regular users
- ✅ Clear MAYA instructions for each role

---

## 🧪 Testing Instructions

### Test as GOD Admin:
1. Login with `avi2001raj@gmail.com` / `Mansiavi@2001`
2. Ask MAYA: "Show me all employee salaries"
3. Expected: See ALL salaries for ALL employees
4. Ask MAYA: "Show me John Doe's profile"
5. Expected: See complete profile with sensitive data

### Test as Regular Employee:
1. Login as any employee
2. Ask MAYA: "Show me all employee salaries"
3. Expected: See only YOUR salary
4. Ask MAYA: "Show me team attendance"
5. Expected: "You don't have access to team data"

---

## 📚 Documentation Created

1. **`MAYA_GOD_ADMIN_SETUP.md`** - GOD admin setup guide
2. **`MAYA_SCOPE_AND_GOD_ADMIN_COMPLETE.md`** - This file
3. **`MAYA_CONTEXT_FIX.md`** - Context engine fix
4. **`MAYA_QUICK_REFERENCE.md`** - Quick reference guide

---

## ✅ Build Status

```bash
npm run build
```

✅ Build successful
✅ No errors
✅ All routes compiled
✅ GOD admin account created
✅ Permissions configured
✅ MAYA context updated
✅ Ready for production

---

## 🎉 Summary

**MAYA now has a clearly defined scope:**

### For GOD Admin (avi2001raj@gmail.com):
- 🔓 **UNLIMITED ACCESS** to all data
- 🔓 **NO RESTRICTIONS** on any actions
- 🔓 **COMPLETE TRANSPARENCY** on all information

### For Regular Users:
- 🔒 **Role-based access** to authorized data
- 🔒 **Hierarchy restrictions** based on position
- 🔒 **Filtered information** appropriate to role

**MAYA is the godmother with all the data, but she respects the hierarchy for everyone except the GOD Admin!** 👑

---

**Status:** ✅ Complete and Ready for Use
**Date:** November 17, 2024
**Version:** 5.0.0 (GOD Admin & Scope Definition)

