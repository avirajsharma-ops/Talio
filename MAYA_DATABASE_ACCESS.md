# MAYA AI - Database Access & Control System 🤖

## Overview

MAYA is now the **"Godmother"** of the Talio HRMS database with full CRUD (Create, Read, Update, Delete) access to all collections, controlled by role-based permissions. Users can ask MAYA to perform database operations and navigate the HRMS system using natural language.

---

## 🎯 Key Features

### 1. **Full Database Access**
- ✅ Read data from any collection
- ✅ Create new records (employees, tasks, announcements, etc.)
- ✅ Update existing records
- ✅ Delete records (with admin/HR privileges)

### 2. **Role-Based Access Control**
- ✅ Admin: Full access to everything
- ✅ HR: Broad access to HR-related data
- ✅ Department Head: Access to department data
- ✅ Manager: Access to team data
- ✅ Employee: Limited access to own data

### 3. **Navigation Control**
- ✅ Navigate between HRMS pages
- ✅ Switch tabs and sections
- ✅ Open specific modules

### 4. **Intelligent Context**
- ✅ Understands HRMS structure
- ✅ Knows available collections and fields
- ✅ Suggests relevant actions
- ✅ Confirms destructive operations

---

## 📚 Available Collections

MAYA has access to 25+ database collections:

| Collection | Description | Admin | HR | Dept Head | Manager | Employee |
|------------|-------------|-------|----|-----------|---------| ---------|
| **employees** | Employee profiles | ✅ | ✅ | Read | Read | Read |
| **departments** | Department structure | ✅ | ✅ | Read | Read | Read |
| **designations** | Job titles | ✅ | ✅ | Read | Read | Read |
| **attendance** | Daily attendance | ✅ | ✅ | Read | Read | Read |
| **leave** | Leave requests | ✅ | ✅ | Update | Update | Create |
| **payroll** | Salary records | ✅ | ✅ | - | - | - |
| **performance** | Performance reviews | ✅ | ✅ | Create | - | Read |
| **tasks** | Task management | ✅ | ✅ | Create | Create | Update |
| **projects** | Project tracking | ✅ | ✅ | Create | - | Read |
| **announcements** | Company news | ✅ | ✅ | Create | Create | Read |
| **documents** | Document storage | ✅ | ✅ | Read | Read | Read |
| **expenses** | Expense claims | ✅ | ✅ | Read | Read | Create |
| **travel** | Travel requests | ✅ | ✅ | Read | Read | Create |
| **helpdesk** | Support tickets | ✅ | ✅ | Read | Read | Create |
| **policies** | Company policies | ✅ | ✅ | Read | Read | Read |
| **holidays** | Holiday calendar | ✅ | ✅ | Read | Read | Read |

---

## 💬 How to Use MAYA

### Example Conversations

#### 📖 **Reading Data**

**User:** "Show me all active employees in the Engineering department"

**MAYA:** "I'll retrieve all active employees from the Engineering department for you..."
- Executes: `read` on `employees` collection
- Filters: `{status: 'active', department: 'Engineering'}`
- Returns: List of employees with details

---

**User:** "Get all pending leave requests"

**MAYA:** "Let me fetch all pending leave requests..."
- Executes: `read` on `leave` collection
- Filters: `{status: 'pending'}`
- Returns: Pending leave requests

---

#### ✏️ **Creating Data**

**User:** "Create a new announcement about the team meeting tomorrow"

**MAYA:** "I'll create a new announcement for you. What should be the title and description?"

**User:** "Title: Team Meeting, Description: Monthly sync at 10 AM"

**MAYA:** "Creating announcement..."
- Executes: `create` on `announcements` collection
- Data: `{title: 'Team Meeting', description: 'Monthly sync at 10 AM', type: 'general'}`
- Returns: Success confirmation

---

#### 🔄 **Updating Data**

**User:** "Approve the leave request for John Doe"

**MAYA:** "I'll approve John Doe's leave request..."
- Executes: `update` on `leave` collection
- Query: `{employee: 'john-doe-id'}`
- Data: `{status: 'approved', approvedBy: 'current-user-id'}`
- Returns: Update confirmation

---

#### 🗑️ **Deleting Data** (Admin/HR only)

**User:** "Delete the old announcement about the holiday party"

**MAYA:** "⚠️ Are you sure you want to delete this announcement? This action cannot be undone."

**User:** "Yes, delete it"

**MAYA:** "Deleting announcement..."
- Executes: `delete` on `announcements` collection
- Query: `{title: 'Holiday Party'}`
- Returns: Deletion confirmation

---

#### 🧭 **Navigation**

**User:** "Take me to the attendance page"

**MAYA:** "Navigating to the attendance page..."
- Executes: `navigate` to `/dashboard/attendance`
- Redirects user to the page

---

**User:** "Open the employees section"

**MAYA:** "Opening employees page..."
- Executes: `navigate` to `/dashboard/employees`

---

## 🔐 Permission System

### Role Hierarchy

```
Admin (Level 5)
  ↓
HR (Level 4)
  ↓
Department Head (Level 3)
  ↓
Manager (Level 2)
  ↓
Employee (Level 1)
```

### Permission Matrix

#### **Admin** (Full Access)
- ✅ Read: All collections
- ✅ Create: All collections
- ✅ Update: All collections
- ✅ Delete: All collections

#### **HR** (Broad Access)
- ✅ Read: employees, users, departments, attendance, leave, payroll, performance, recruitment, etc.
- ✅ Create: employees, departments, payroll, performance, recruitment, policies, etc.
- ✅ Update: employees, attendance, leave, payroll, performance, etc.
- ✅ Delete: announcements, documents, policies

#### **Department Head**
- ✅ Read: employees, departments, attendance, leave, performance, tasks, projects
- ✅ Create: tasks, projects, announcements, performance
- ✅ Update: employees, attendance, leave, tasks, projects, performance
- ❌ Delete: None

#### **Manager**
- ✅ Read: employees, departments, attendance, leave, tasks, projects, announcements
- ✅ Create: tasks, announcements
- ✅ Update: tasks, leave, attendance
- ❌ Delete: None

#### **Employee** (Limited Access)
- ✅ Read: employees, departments, announcements, documents, policies, holidays
- ✅ Create: leave, expenses, travel, helpdesk
- ✅ Update: tasks (own only)
- ❌ Delete: None

---

## 🛡️ Security Features

### 1. **Authentication Required**
- All API calls require valid JWT token
- Unauthenticated users cannot access database

### 2. **Role Verification**
- Every action checks user's role
- Unauthorized actions are blocked with clear error messages

### 3. **Data Filtering**
- Employees can only see their own sensitive data
- Managers can only access their team's data
- Department heads can only access their department's data

### 4. **Sensitive Field Protection**
- Salary information hidden from non-HR/admin users
- Password fields never exposed
- Bank details restricted to HR/admin

### 5. **Audit Logging**
- All database operations logged to `activities` collection
- Tracks who performed what action and when

---

## 🔧 Technical Architecture

### API Endpoints

#### 1. **Maya Chat API** (`/api/maya/chat`)
- Main chat interface with function calling
- Automatically executes database actions
- Handles navigation requests

#### 2. **Maya Actions API** (`/api/maya/actions`)
- Direct database CRUD operations
- Role-based permission checking
- Supports all collections

#### 3. **Maya Navigate API** (`/api/maya/navigate`)
- Page navigation control
- Tab switching
- Available pages listing

### Files Created

```
Talio/
├── app/api/maya/
│   ├── chat/route.js          # Enhanced chat with function calling
│   ├── actions/route.js       # Database CRUD operations
│   └── navigate/route.js      # Navigation control
├── lib/
│   ├── mayaPermissions.js     # Permission system
│   └── mayaContext.js         # System prompts & context
├── public/
│   └── maya-enhanced.js       # Frontend integration
└── components/maya/
    └── MayaRuntimeLoader.js   # Updated to load enhanced script
```

---

## 📊 Usage Examples

### JavaScript API (Advanced)

```javascript
// Execute database action
const result = await mayaExecuteAction(
  'read',                    // action
  'employees',               // collection
  { status: 'active' },      // query
  {},                        // data
  { limit: 10, populate: ['department'] }  // options
);

// Navigate to page
await mayaNavigate('/dashboard/attendance');

// Get available pages
const pages = await mayaGetAvailablePages();
```

---

## ⚠️ Important Guidelines

### For Users:
1. **Be Specific**: Clearly state what you want MAYA to do
2. **Confirm Deletions**: MAYA will ask for confirmation before deleting
3. **Check Permissions**: If MAYA says you don't have permission, contact your admin
4. **Review Results**: Always verify MAYA's actions

### For Admins:
1. **Monitor Activity Logs**: Check the `activities` collection regularly
2. **Review Permissions**: Ensure roles are correctly assigned
3. **Backup Data**: Regular backups before bulk operations
4. **Train Users**: Educate users on MAYA's capabilities and limitations

---

## 🚀 Next Steps

1. **Test MAYA** with different user roles
2. **Train your team** on how to use MAYA effectively
3. **Monitor usage** through activity logs
4. **Provide feedback** for improvements

---

**Status:** ✅ Fully Implemented and Ready to Use

**Last Updated:** November 17, 2024

