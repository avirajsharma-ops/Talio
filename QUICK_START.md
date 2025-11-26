# 🚀 Quick Start Guide

Get your HRMS system up and running in 5 minutes!

## Prerequisites Check

Before starting, make sure you have:
- [ ] Node.js 18+ installed
- [ ] MongoDB installed and running
- [ ] A code editor (VS Code recommended)
- [ ] Terminal/Command Prompt access

## Step 1: Install Dependencies (2 minutes)

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including:
- Next.js
- React
- MongoDB/Mongoose
- TailwindCSS
- And all other dependencies

## Step 2: Start MongoDB (1 minute)

### Windows:
```bash
net start MongoDB
```

### macOS:
```bash
brew services start mongodb-community
```

### Linux:
```bash
sudo systemctl start mongod
```

### Verify MongoDB is running:
```bash
mongosh
# You should see MongoDB shell
# Type 'exit' to close
```

## Step 3: Configure Environment (1 minute)

The `.env.local` file is already created. Just verify it exists and update if needed:

```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
NEXTAUTH_SECRET=hrms-secret-key-2024
JWT_SECRET=jwt-secret-key-2024
```

## Step 4: Run the Application (1 minute)

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

## Step 5: Access the Application

1. Open your browser
2. Go to: **http://localhost:3000**
3. You'll be redirected to the login page

## First Time Setup

### Create Your First Admin User

Since this is the first time, you need to create an admin user. You have two options:

#### Option A: Using API (Recommended)

1. Open a new terminal
2. Run this command:

```bash
curl -X POST http://localhost:3000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"admin@hrms.com\",\"password\":\"admin123\",\"role\":\"admin\",\"employeeData\":{\"employeeCode\":\"EMP001\",\"firstName\":\"Admin\",\"lastName\":\"User\",\"email\":\"admin@hrms.com\",\"phone\":\"1234567890\",\"dateOfJoining\":\"2024-01-01\"}}"
```

**For PowerShell (Windows):**
```powershell
$body = @{
    email = "admin@hrms.com"
    password = "admin123"
    role = "admin"
    employeeData = @{
        employeeCode = "EMP001"
        firstName = "Admin"
        lastName = "User"
        email = "admin@hrms.com"
        phone = "1234567890"
        dateOfJoining = "2024-01-01"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method Post -Body $body -ContentType "application/json"
```

#### Option B: Using Postman/Thunder Client

1. Install Thunder Client extension in VS Code (or use Postman)
2. Create a new POST request to: `http://localhost:3000/api/auth/register`
3. Set Headers: `Content-Type: application/json`
4. Set Body (raw JSON):

```json
{
  "email": "admin@hrms.com",
  "password": "admin123",
  "role": "admin",
  "employeeData": {
    "employeeCode": "EMP001",
    "firstName": "Admin",
    "lastName": "User",
    "email": "admin@hrms.com",
    "phone": "1234567890",
    "dateOfJoining": "2024-01-01"
  }
}
```

5. Send the request

### Login to Your HRMS

1. Go to: http://localhost:3000/login
2. Enter credentials:
   - **Email**: admin@hrms.com
   - **Password**: admin123
3. Click "Sign in"
4. You'll be redirected to the dashboard! 🎉

## What You'll See

After logging in, you'll see:

1. **Dashboard** with:
   - Statistics cards (Employees, Attendance, etc.)
   - Charts (Attendance, Department Distribution, Leave Trends)
   - Recent Activities
   - Quick Actions

2. **Sidebar Navigation** with all modules:
   - Employees
   - Attendance
   - Leave
   - Payroll
   - Performance
   - Recruitment
   - And 10+ more modules

3. **Header** with:
   - Search bar
   - Notifications
   - Profile menu

## Next Steps

Now that your HRMS is running, you can:

### 1. Explore the Dashboard
- Check out the statistics
- View the charts
- Try the quick actions

### 2. Navigate Through Modules
- Click on different menu items in the sidebar
- Explore the structure

### 3. Create More Users
Create different types of users:

**HR User:**
```json
{
  "email": "hr@hrms.com",
  "password": "hr123",
  "role": "hr"
}
```

**Manager:**
```json
{
  "email": "manager@hrms.com",
  "password": "manager123",
  "role": "manager"
}
```

**Employee:**
```json
{
  "email": "employee@hrms.com",
  "password": "employee123",
  "role": "employee"
}
```

### 4. Start Building Features

The foundation is ready! Now you can:
- Add employee management pages
- Implement attendance tracking
- Build leave management
- Create payroll processing
- And much more!

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"
**Solution**: Make sure MongoDB is running
```bash
# Check if MongoDB is running
mongosh

# If not running, start it
net start MongoDB  # Windows
brew services start mongodb-community  # macOS
sudo systemctl start mongod  # Linux
```

### Issue: "Port 3000 already in use"
**Solution**: Use a different port
```bash
npm run dev -- -p 3001
```

### Issue: "Module not found"
**Solution**: Reinstall dependencies
```bash
rm -rf node_modules
npm install
```

### Issue: "Cannot find .env.local"
**Solution**: The file is already created, but if missing:
```bash
# Copy from .env.local file in the project
# Or create it with the required variables
```

## Development Tips

### Hot Reload
The app automatically reloads when you make changes to the code.

### View Database
Use MongoDB Compass to view your database:
1. Open MongoDB Compass
2. Connect to: `mongodb://localhost:27017`
3. Select database: `hrms_db`

### Check Logs
Watch the terminal for any errors or logs while developing.

### Code Editor Setup
Recommended VS Code extensions:
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- MongoDB for VS Code
- Thunder Client (for API testing)

## Project Structure Quick Reference

```
hrms/
├── app/
│   ├── api/              # API routes
│   ├── dashboard/        # Dashboard pages
│   ├── login/           # Login page
│   └── page.js          # Home page
├── components/          # Reusable components
├── lib/                # Utilities
├── models/             # Database models
└── public/             # Static files
```

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm start               # Start production server

# Database
mongosh                 # Open MongoDB shell
use hrms_db            # Switch to HRMS database
db.users.find()        # View all users
db.employees.find()    # View all employees

# Clear database (if needed)
db.dropDatabase()      # Drops current database
```

## Getting Help

1. **Check Documentation**
   - README.md - Full documentation
   - SETUP_GUIDE.md - Detailed setup
   - PROJECT_SUMMARY.md - Project overview

2. **Check Code**
   - All files are well-commented
   - Models show database structure
   - Components show UI structure

3. **Common Resources**
   - Next.js Docs: https://nextjs.org/docs
   - MongoDB Docs: https://docs.mongodb.com
   - TailwindCSS: https://tailwindcss.com/docs

## Success Checklist

- [ ] Dependencies installed
- [ ] MongoDB running
- [ ] Environment variables configured
- [ ] Development server running
- [ ] Admin user created
- [ ] Successfully logged in
- [ ] Dashboard visible
- [ ] Navigation working

## Congratulations! 🎉

You now have a fully functional HRMS system running locally!

The foundation is complete with:
- ✅ Authentication system
- ✅ Database models for all modules
- ✅ Modern UI with dashboard
- ✅ Navigation system
- ✅ Role-based access control

You're ready to start building the remaining features!

---

**Need help?** Check the other documentation files or review the code comments.

**Happy coding!** 🚀

