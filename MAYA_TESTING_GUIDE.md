# MAYA Database Access - Testing Guide 🧪

## Overview
This guide provides comprehensive testing scenarios for MAYA's database access and navigation capabilities across different user roles.

---

## 🚀 Getting Started

### 1. Start the Development Server
```bash
cd Talio
npm run dev
```

### 2. Open the Application
Navigate to `http://localhost:3000` in your browser

### 3. Login with Different Roles
Test with users having different roles:
- Admin
- HR
- Department Head
- Manager
- Employee

---

## 📋 Test Scenarios

### Test 1: Admin - Full Database Access

**Login as:** Admin user

#### Test 1.1: Read All Employees
1. Click on MAYA blob
2. Say or type: **"Show me all employees"**
3. **Expected:** MAYA retrieves and displays all employees
4. **Verify:** Check that employee data is returned

#### Test 1.2: Create New Announcement
1. Say: **"Create a new announcement about the company picnic next Friday"**
2. **Expected:** MAYA asks for details or creates the announcement
3. **Verify:** Check announcements collection for new entry

#### Test 1.3: Update Employee Status
1. Say: **"Update employee status to inactive for [employee-name]"**
2. **Expected:** MAYA updates the employee status
3. **Verify:** Check employee record is updated

#### Test 1.4: Delete Old Announcement
1. Say: **"Delete the announcement about the company picnic"**
2. **Expected:** MAYA asks for confirmation
3. Confirm: **"Yes, delete it"**
4. **Verify:** Announcement is removed from database

#### Test 1.5: Navigate to Payroll
1. Say: **"Take me to the payroll page"**
2. **Expected:** MAYA navigates to `/dashboard/payroll`
3. **Verify:** URL changes and payroll page loads

---

### Test 2: HR - Broad Access

**Login as:** HR user

#### Test 2.1: Read Employee Data
1. Say: **"Show me all employees in the Engineering department"**
2. **Expected:** MAYA retrieves Engineering employees
3. **Verify:** Only Engineering department employees shown

#### Test 2.2: Create Leave Type
1. Say: **"Create a new leave type called 'Paternity Leave' with 10 days"**
2. **Expected:** MAYA creates the leave type
3. **Verify:** New leave type appears in leavetypes collection

#### Test 2.3: Approve Leave Request
1. Say: **"Show me all pending leave requests"**
2. **Expected:** MAYA shows pending leaves
3. Say: **"Approve the leave request for [employee-name]"**
4. **Expected:** MAYA updates leave status to approved
5. **Verify:** Leave status changed in database

#### Test 2.4: Try to Delete Employee (Should Fail)
1. Say: **"Delete the employee record for [employee-name]"**
2. **Expected:** MAYA says HR doesn't have permission to delete employees
3. **Verify:** Error message about insufficient permissions

#### Test 2.5: Navigate to Recruitment
1. Say: **"Open the recruitment page"**
2. **Expected:** MAYA navigates to `/dashboard/recruitment`
3. **Verify:** Recruitment page loads

---

### Test 3: Manager - Team Access

**Login as:** Manager user

#### Test 3.1: Read Team Members
1. Say: **"Show me my team members"**
2. **Expected:** MAYA shows employees reporting to this manager
3. **Verify:** Only team members are shown

#### Test 3.2: Create Task
1. Say: **"Create a task for [team-member] to complete the project report by Friday"**
2. **Expected:** MAYA creates the task
3. **Verify:** Task appears in tasks collection

#### Test 3.3: Update Leave Request
1. Say: **"Approve [team-member]'s leave request"**
2. **Expected:** MAYA updates the leave status
3. **Verify:** Leave status changed

#### Test 3.4: Try to Access Payroll (Should Fail)
1. Say: **"Show me payroll data"**
2. **Expected:** MAYA says manager doesn't have permission
3. **Verify:** Error message about insufficient permissions

#### Test 3.5: Try to Navigate to Payroll (Should Fail)
1. Say: **"Take me to the payroll page"**
2. **Expected:** MAYA says manager doesn't have access to payroll
3. **Verify:** Navigation blocked with permission error

---

### Test 4: Employee - Limited Access

**Login as:** Employee user

#### Test 4.1: Read Own Data
1. Say: **"Show me my profile"**
2. **Expected:** MAYA shows employee's own data
3. **Verify:** Only own data is shown

#### Test 4.2: Apply for Leave
1. Say: **"I want to apply for leave from December 20 to December 25"**
2. **Expected:** MAYA creates a leave request
3. **Verify:** Leave request created in database

#### Test 4.3: Submit Expense
1. Say: **"Submit an expense claim for $50 for office supplies"**
2. **Expected:** MAYA creates expense record
3. **Verify:** Expense appears in expenses collection

#### Test 4.4: Try to Read Other Employees (Should Fail)
1. Say: **"Show me all employees"**
2. **Expected:** MAYA shows only basic employee directory (no sensitive data)
3. **Verify:** Salary and bank details are hidden

#### Test 4.5: Try to Create Announcement (Should Fail)
1. Say: **"Create a new announcement"**
2. **Expected:** MAYA says employee doesn't have permission
3. **Verify:** Error message about insufficient permissions

#### Test 4.6: Navigate to Own Tasks
1. Say: **"Show me my tasks"**
2. **Expected:** MAYA navigates to tasks page
3. **Verify:** Tasks page loads

---

### Test 5: Department Head - Department Access

**Login as:** Department Head user

#### Test 5.1: Read Department Employees
1. Say: **"Show me all employees in my department"**
2. **Expected:** MAYA shows department employees
3. **Verify:** Only department employees shown

#### Test 5.2: Create Performance Review
1. Say: **"Create a performance review for [employee-name]"**
2. **Expected:** MAYA creates performance review
3. **Verify:** Review appears in performance collection

#### Test 5.3: Update Attendance
1. Say: **"Mark [employee-name] as present for today"**
2. **Expected:** MAYA updates attendance record
3. **Verify:** Attendance marked in database

#### Test 5.4: Try to Access Payroll (Should Fail)
1. Say: **"Show me department payroll"**
2. **Expected:** MAYA says department head doesn't have payroll access
3. **Verify:** Error message about insufficient permissions

---

## 🔍 Verification Checklist

### For Each Test:
- [ ] MAYA responds appropriately
- [ ] Permission checks work correctly
- [ ] Database operations execute successfully
- [ ] Error messages are clear and helpful
- [ ] Navigation works as expected
- [ ] Activity logs are created
- [ ] No unauthorized data access

---

## 🐛 Common Issues & Solutions

### Issue 1: "Authentication required" error
**Solution:** Make sure you're logged in and have a valid token in localStorage

### Issue 2: "Permission denied" error
**Solution:** Verify the user role has permission for the requested action

### Issue 3: MAYA doesn't respond
**Solution:** 
- Check browser console for errors
- Verify OpenAI API key is configured
- Check network tab for failed API calls

### Issue 4: Navigation doesn't work
**Solution:**
- Verify the page path exists
- Check user has permission to access the page
- Look for JavaScript errors in console

### Issue 5: Database action fails
**Solution:**
- Check MongoDB connection
- Verify collection name is correct
- Check data format matches model schema

---

## 📊 Test Results Template

```
Test Date: _______________
Tester: _______________

| Test ID | Description | Role | Status | Notes |
|---------|-------------|------|--------|-------|
| 1.1 | Read all employees | Admin | ✅/❌ | |
| 1.2 | Create announcement | Admin | ✅/❌ | |
| 1.3 | Update employee | Admin | ✅/❌ | |
| 1.4 | Delete announcement | Admin | ✅/❌ | |
| 1.5 | Navigate to payroll | Admin | ✅/❌ | |
| 2.1 | Read employees | HR | ✅/❌ | |
| 2.2 | Create leave type | HR | ✅/❌ | |
| 2.3 | Approve leave | HR | ✅/❌ | |
| 2.4 | Delete employee (fail) | HR | ✅/❌ | |
| 2.5 | Navigate to recruitment | HR | ✅/❌ | |
| 3.1 | Read team members | Manager | ✅/❌ | |
| 3.2 | Create task | Manager | ✅/❌ | |
| 3.3 | Update leave | Manager | ✅/❌ | |
| 3.4 | Access payroll (fail) | Manager | ✅/❌ | |
| 3.5 | Navigate to payroll (fail) | Manager | ✅/❌ | |
| 4.1 | Read own data | Employee | ✅/❌ | |
| 4.2 | Apply for leave | Employee | ✅/❌ | |
| 4.3 | Submit expense | Employee | ✅/❌ | |
| 4.4 | Read others (fail) | Employee | ✅/❌ | |
| 4.5 | Create announcement (fail) | Employee | ✅/❌ | |
| 4.6 | Navigate to tasks | Employee | ✅/❌ | |
| 5.1 | Read dept employees | Dept Head | ✅/❌ | |
| 5.2 | Create performance | Dept Head | ✅/❌ | |
| 5.3 | Update attendance | Dept Head | ✅/❌ | |
| 5.4 | Access payroll (fail) | Dept Head | ✅/❌ | |
```

---

## 🎯 Success Criteria

All tests should:
- ✅ Execute without errors
- ✅ Respect role-based permissions
- ✅ Provide clear feedback to users
- ✅ Log activities correctly
- ✅ Protect sensitive data
- ✅ Handle errors gracefully

---

**Status:** Ready for Testing

**Last Updated:** November 17, 2024

