# 📘 Complete Guide: How to Add Employee with Login & Attendance

## 🎯 Overview

This guide shows you how to:
1. ✅ Create Departments
2. ✅ Create Designations
3. ✅ Add Employee with Login Credentials
4. ✅ Employee Login and Mark Attendance

---

## 📋 STEP 1: Create Departments

### **Why?**
Departments organize employees by their functional area (IT, HR, Sales, etc.)

### **How to Create:**

1. **Login as Admin**
   - Email: `admin@hrms.com`
   - Password: `admin123`

2. **Navigate to Departments**
   - Click **"Employees"** in sidebar
   - Click **"Departments"** submenu

3. **Add New Department**
   - Click **"Add Department"** button
   - Fill in the form:
     - **Name:** IT Department (required)
     - **Code:** IT (required, e.g., IT, HR, SALES)
     - **Description:** Information Technology Department
   - Click **"Save"**

4. **Example Departments to Create:**
   ```
   Name: IT Department          Code: IT
   Name: Human Resources        Code: HR
   Name: Sales                  Code: SALES
   Name: Marketing              Code: MKT
   Name: Finance                Code: FIN
   Name: Operations             Code: OPS
   ```

5. **Success!**
   - You'll see the department in the list
   - You can edit or delete it anytime

---

## 📋 STEP 2: Create Designations

### **Why?**
Designations define job roles/positions (Developer, Manager, etc.)

### **How to Create:**

1. **Navigate to Designations**
   - Click **"Employees"** in sidebar
   - Click **"Designations"** submenu

2. **Add New Designation**
   - Click **"Add Designation"** button
   - Fill in the form:
     - **Title:** Software Developer (required)
     - **Department:** Select IT Department (required)
     - **Level:** Select level (entry, junior, mid, senior, lead, manager, director, executive)
     - **Description:** Develops and maintains software applications
   - Click **"Save"**

3. **Example Designations to Create:**
   ```
   Title: Software Developer    Department: IT          Level: mid
   Title: Senior Developer      Department: IT          Level: senior
   Title: Team Lead             Department: IT          Level: lead
   Title: HR Manager            Department: HR          Level: manager
   Title: Sales Executive       Department: Sales       Level: mid
   Title: Marketing Manager     Department: Marketing   Level: manager
   ```

4. **Success!**
   - You'll see the designation in the table
   - It's linked to the department you selected

---

## 📋 STEP 3: Add Employee with Login Credentials

### **Why?**
This creates both an employee record AND a user account for login

### **How to Add:**

1. **Navigate to Add Employee**
   - Click **"Employees"** in sidebar
   - Click **"Add Employee"** submenu

2. **Fill in Employee Details:**

   **Basic Information:**
   - **Employee Code:** EMP001 (required, unique)
   - **First Name:** John (required)
   - **Last Name:** Doe (required)
   - **Email:** john.doe@company.com (required, unique)
   - **Phone:** +1234567890 (required)
   - **Date of Birth:** 1990-01-15
   - **Gender:** Male

   **Employment Information:**
   - **Date of Joining:** 2024-01-01 (required)
   - **Department:** Select IT Department
   - **Designation:** Select Software Developer
   - **Employment Type:** Full Time
   - **Status:** Active

   **Login Credentials (NEW!):**
   - **Password:** john123 (required)
     - This is the password the employee will use to login
     - Default is "employee123" if not provided
   - **User Role:** Employee (required)
     - **Employee:** Basic access (can mark attendance, apply leave)
     - **Manager:** Can approve leaves, view team
     - **HR:** Can manage all HR functions
     - **Admin:** Full system access

3. **Click "Save Employee"**

4. **Success!**
   - You'll see a success message
   - **IMPORTANT:** You'll see the login credentials:
     ```
     Email: john.doe@company.com
     Password: john123
     ```
   - **Share these credentials with the employee!**

---

## 📋 STEP 4: Employee Login and Mark Attendance

### **Employee Login:**

1. **Open the HRMS System**
   - URL: `http://localhost:3000/login`

2. **Login with Employee Credentials**
   - **Email:** john.doe@company.com
   - **Password:** john123
   - Click **"Login"**

3. **Success!**
   - Employee is now logged in
   - They can see the dashboard

### **Mark Attendance:**

1. **Navigate to Attendance**
   - Click **"Attendance"** in the sidebar

2. **Clock In (Start of Day)**
   - Click **"Clock In"** button
   - Current time is recorded
   - Status changes to "Clocked In"

3. **Clock Out (End of Day)**
   - Click **"Clock Out"** button
   - Current time is recorded
   - Work hours are automatically calculated
   - Status changes to "Clocked Out"

4. **View Attendance History**
   - Scroll down to see all attendance records
   - See date, clock in/out times, work hours, status

---

## 🎯 Complete Example Workflow

### **Scenario: Add a new Software Developer**

```
STEP 1: Create Department (if not exists)
----------------------------------------
Name: IT Department
Code: IT
Description: Information Technology Department
✅ SAVED

STEP 2: Create Designation (if not exists)
------------------------------------------
Title: Software Developer
Department: IT Department
Level: mid
Description: Develops software applications
✅ SAVED

STEP 3: Add Employee
--------------------
Employee Code: EMP001
First Name: John
Last Name: Doe
Email: john.doe@company.com
Phone: +1234567890
Date of Birth: 1990-01-15
Gender: Male
Date of Joining: 2024-01-01
Department: IT Department
Designation: Software Developer
Employment Type: Full Time
Status: Active
Password: john123
Role: Employee
✅ SAVED

Login Credentials Created:
Email: john.doe@company.com
Password: john123

STEP 4: Employee Logs In
-------------------------
1. Go to http://localhost:3000/login
2. Enter: john.doe@company.com / john123
3. Click Login
✅ LOGGED IN

STEP 5: Employee Marks Attendance
----------------------------------
1. Click "Attendance" in sidebar
2. Click "Clock In" button
✅ CLOCKED IN at 09:00 AM

... work day ...

3. Click "Clock Out" button
✅ CLOCKED OUT at 06:00 PM
Work Hours: 9 hours
```

---

## 🔧 Troubleshooting

### **Problem: Departments page not loading**
**Solution:**
- Make sure server is running: `npm run dev`
- Check browser console for errors (F12)
- Verify you're logged in as admin

### **Problem: Can't see departments in dropdown**
**Solution:**
- First create departments in the Departments page
- Refresh the Add Employee page
- Departments should now appear in dropdown

### **Problem: Can't see designations in dropdown**
**Solution:**
- First create designations in the Designations page
- Make sure you selected a department for the designation
- Refresh the Add Employee page

### **Problem: Employee can't login**
**Solution:**
- Verify the email and password are correct
- Check that the employee was created successfully
- Try resetting password (contact admin)

### **Problem: Clock In button not working**
**Solution:**
- Make sure employee is logged in
- Check browser console for errors
- Verify attendance API is working

---

## 📊 User Roles Explained

### **Employee Role:**
- ✅ View own profile
- ✅ Mark attendance (clock in/out)
- ✅ Apply for leaves
- ✅ View leave balance
- ✅ View salary slips
- ✅ Submit expenses
- ✅ View announcements
- ❌ Cannot approve leaves
- ❌ Cannot manage other employees

### **Manager Role:**
- ✅ All Employee permissions
- ✅ Approve/reject team leaves
- ✅ View team attendance
- ✅ Create performance reviews
- ✅ View team reports
- ❌ Cannot manage departments
- ❌ Cannot manage all employees

### **HR Role:**
- ✅ All Manager permissions
- ✅ Manage all employees
- ✅ Manage departments & designations
- ✅ Manage holidays & leave types
- ✅ Generate payroll
- ✅ Manage onboarding/offboarding
- ✅ View all reports
- ❌ Cannot access system settings

### **Admin Role:**
- ✅ Full system access
- ✅ All HR permissions
- ✅ Manage system settings
- ✅ Manage user roles
- ✅ Access all modules
- ✅ Delete records

---

## 🎯 Quick Reference

### **Default Passwords:**
- Admin: `admin123`
- HR: `hr123`
- Manager: `manager123`
- Employee: `employee123` (if not specified)

### **Important URLs:**
- Login: `http://localhost:3000/login`
- Dashboard: `http://localhost:3000/dashboard`
- Departments: `http://localhost:3000/dashboard/departments`
- Designations: `http://localhost:3000/dashboard/designations`
- Add Employee: `http://localhost:3000/dashboard/employees/add`
- Attendance: `http://localhost:3000/dashboard/attendance`

### **Required Fields for Employee:**
- ✅ Employee Code (unique)
- ✅ First Name
- ✅ Last Name
- ✅ Email (unique)
- ✅ Phone
- ✅ Date of Joining
- ✅ Password
- ✅ Role

### **Optional Fields:**
- Date of Birth
- Gender
- Department
- Designation
- Employment Type
- Status

---

## ✅ Success Checklist

Before adding an employee, make sure:

- [ ] Server is running (`npm run dev`)
- [ ] You're logged in as Admin or HR
- [ ] At least one Department is created
- [ ] At least one Designation is created
- [ ] You have the employee's information ready
- [ ] You've decided on a password for the employee
- [ ] You've decided on the employee's role

After adding an employee:

- [ ] Note down the login credentials
- [ ] Share credentials with the employee
- [ ] Test employee login
- [ ] Test attendance marking
- [ ] Verify employee appears in employee list

---

## 🎊 Congratulations!

You now know how to:
- ✅ Create departments and designations
- ✅ Add employees with login credentials
- ✅ Employees can login and mark attendance
- ✅ Manage the complete employee lifecycle

**Your HRMS system is fully functional!** 🚀

---

## 📞 Need Help?

If you encounter any issues:
1. Check the browser console (F12 → Console)
2. Check the server terminal for errors
3. Verify all required fields are filled
4. Make sure departments and designations exist
5. Try refreshing the page

**Everything should work perfectly now!** ✨

