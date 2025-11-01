# 🔐 Login Credentials

## Default Demo Users

After running `npm run seed`, you can login with these credentials:

---

## 👤 Admin User

**Email:** `admin@hrms.com`  
**Password:** `admin123`  
**Role:** Administrator  
**Access:** Full system access

**Permissions:**
- Manage all employees
- Access all modules
- Configure system settings
- View all reports
- Approve/reject all requests
- Manage departments and designations

---

## 👤 HR Manager

**Email:** `hr@hrms.com`  
**Password:** `hr123`  
**Role:** HR Manager  
**Access:** HR operations

**Permissions:**
- Manage employees
- Process payroll
- Manage recruitment
- Handle onboarding/offboarding
- Approve leave requests
- Manage policies
- View HR reports

---

## 👤 Team Manager

**Email:** `manager@hrms.com`  
**Password:** `manager123`  
**Role:** Manager  
**Access:** Team management

**Permissions:**
- View team members
- Approve team leave requests
- Approve team expenses
- Conduct performance reviews
- View team reports
- Manage team attendance

---

## 👤 Employee

**Email:** `employee@hrms.com`  
**Password:** `employee123`  
**Role:** Employee  
**Access:** Self-service

**Permissions:**
- View own profile
- Mark attendance
- Apply for leave
- Submit expenses
- View payslips
- Access training courses
- View announcements

---

## 🔄 How to Create These Users

If you haven't created the demo users yet, run:

```bash
npm run seed
```

This will:
1. Connect to MongoDB
2. Clear existing users (if any)
3. Create 4 demo users with the above credentials
4. Display success message with credentials

---

## 🌐 Login URL

**Development:** http://localhost:3000/login  
**Production:** Update with your production URL

---

## 🔒 Security Notes

### For Development:
- These are demo credentials for testing
- Use them to explore different user roles
- Safe to use in local development

### For Production:
⚠️ **IMPORTANT:** 
- Change all default passwords immediately
- Use strong, unique passwords
- Enable two-factor authentication
- Implement password policies
- Regular security audits

---

## 🔑 Password Requirements

When creating new users in production:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

---

## 📝 Creating New Users

### Option 1: Using the Seed Script

Edit `scripts/seed.js` and add new users, then run:
```bash
npm run seed
```

### Option 2: Using the API

Make a POST request to `/api/auth/register`:

```json
{
  "email": "newuser@hrms.com",
  "password": "SecurePass123!",
  "role": "employee",
  "employeeData": {
    "employeeCode": "EMP005",
    "firstName": "New",
    "lastName": "User",
    "email": "newuser@hrms.com",
    "phone": "1234567894",
    "dateOfJoining": "2024-01-01"
  }
}
```

### Option 3: Through Admin Panel (Future Feature)

Once the employee management module is complete, admins can create users through the UI.

---

## 🔄 Reset Password

To reset a password:

1. **Using MongoDB:**
```javascript
// Connect to MongoDB
mongosh

// Use the database
use hrms_db

// Update password (hashed)
db.users.updateOne(
  { email: "user@hrms.com" },
  { $set: { password: "hashed_password_here" } }
)
```

2. **Using API (Future Feature):**
- Forgot password functionality
- Email-based password reset
- Admin password reset

---

## 👥 User Roles Explained

### Admin
- Highest level access
- Can manage everything
- Configure system settings
- Manage all users

### HR
- Manage employee lifecycle
- Process payroll
- Handle recruitment
- Manage policies

### Manager
- Manage team members
- Approve team requests
- Conduct reviews
- View team reports

### Employee
- Self-service portal
- Personal information
- Apply for leave
- Submit expenses

---

## 📊 Testing Different Roles

To test the system with different roles:

1. **Login as Admin** - Test full system access
2. **Login as HR** - Test HR operations
3. **Login as Manager** - Test team management
4. **Login as Employee** - Test self-service features

---

## 🔐 Database Connection

**MongoDB URI:** `mongodb://localhost:27017/hrms_db`

To view users in MongoDB:
```bash
mongosh
use hrms_db
db.users.find().pretty()
```

---

## ⚠️ Troubleshooting

### "Invalid credentials" error:
1. Make sure you ran `npm run seed`
2. Check if MongoDB is running
3. Verify the database has users: `db.users.find()`
4. Try re-running the seed script

### "User already exists" error:
- Users are already created
- Use existing credentials to login
- Or clear database and re-seed

### Can't login:
1. Check MongoDB is running: `mongosh`
2. Check users exist: `db.users.find()`
3. Check .env.local has correct JWT_SECRET
4. Clear browser cache and try again

---

## 📞 Support

If you have issues with login:
1. Check START_HERE.md
2. Review QUICK_START.md
3. Verify MongoDB connection
4. Check browser console for errors

---

**Remember:** These are demo credentials for development only!  
**Always use secure passwords in production!** 🔒

