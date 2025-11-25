# 🚀 START HERE - Quick Setup Guide

## Step 1: Install Dependencies

Open your terminal in this directory and run:

```bash
npm install
```

Wait for all packages to install (this may take 2-3 minutes).

---

## Step 2: Make Sure MongoDB is Running

### Check if MongoDB is installed:
```bash
mongosh --version
```

If not installed, download from: https://www.mongodb.com/try/download/community

### Start MongoDB:

**Windows:**
```bash
net start MongoDB
```

**macOS:**
```bash
brew services start mongodb-community
```

**Linux:**
```bash
sudo systemctl start mongod
```

---

## Step 3: Create Admin User (Seed Database)

Run this command to create default users:

```bash
npm run seed
```

This will create 4 demo users:
- **Admin**: admin@hrms.com / admin123
- **HR**: hr@hrms.com / hr123
- **Manager**: manager@hrms.com / manager123
- **Employee**: employee@hrms.com / employee123

---

## Step 4: Start the Application

```bash
npm run dev
```

You should see:
```
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

---

## Step 5: Login

1. Open your browser
2. Go to: **http://localhost:3000**
3. You'll be redirected to the login page
4. Use these credentials:

**Admin Login:**
- Email: `admin@hrms.com`
- Password: `admin123`

---

## 🎉 That's It!

You should now see the HRMS dashboard with:
- Statistics cards
- Charts and graphs
- Navigation sidebar
- All modules accessible

---

## 🔧 Troubleshooting

### Problem: "Cannot connect to MongoDB"
**Solution:** Make sure MongoDB is running
```bash
# Check MongoDB status
mongosh

# If not running, start it
net start MongoDB  # Windows
```

### Problem: "Port 3000 already in use"
**Solution:** Kill the process or use different port
```bash
# Use different port
npm run dev -- -p 3001
```

### Problem: "Module not found"
**Solution:** Reinstall dependencies
```bash
rm -rf node_modules
npm install
```

### Problem: "User already exists"
**Solution:** The database already has users. Just login with existing credentials.

---

## 📋 Quick Commands

```bash
# Install dependencies
npm install

# Create demo users
npm run seed

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

---

## 📚 More Documentation

- **README.md** - Complete documentation
- **QUICK_START.md** - Detailed quick start
- **SETUP_GUIDE.md** - Full setup guide
- **FEATURES_CHECKLIST.md** - All features list

---

## 🎯 What You Get

After login, you'll have access to:

1. **Dashboard** - Overview with statistics and charts
2. **Employee Management** - Manage employees
3. **Attendance** - Track attendance
4. **Leave Management** - Apply and approve leaves
5. **Payroll** - Process payroll
6. **Performance** - Performance reviews
7. **Recruitment** - Job postings and candidates
8. **Onboarding/Offboarding** - Employee lifecycle
9. **Documents & Assets** - Document and asset management
10. **Expenses & Travel** - Expense and travel management
11. **Helpdesk** - Ticket system
12. **Policies** - Company policies
13. **LMS** - Learning management
14. **Announcements** - Company announcements
15. **Settings** - System configuration

---

## 💡 Next Steps

1. **Explore the Dashboard** - Check out all the features
2. **Navigate Modules** - Click through the sidebar menu
3. **Test Different Roles** - Login with different users (admin, hr, manager, employee)
4. **Start Building** - The foundation is ready, start implementing features!

---

## 🆘 Need Help?

1. Check the documentation files
2. Review the code - it's well commented
3. Check MongoDB connection
4. Verify environment variables in `.env.local`

---

## ✅ Success Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] MongoDB is running
- [ ] Database seeded (`npm run seed`)
- [ ] Development server running (`npm run dev`)
- [ ] Successfully logged in
- [ ] Dashboard is visible

---

**Ready to go? Run these 3 commands:**

```bash
npm install
npm run seed
npm run dev
```

Then open http://localhost:3000 and login with `admin@hrms.com` / `admin123`

**Happy coding! 🚀**

