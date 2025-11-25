# Quick Reference Guide - Talio HRMS

## 🚀 Quick Start

### Start Development Server
```bash
npm run dev
```
Server runs on: **http://localhost:3000**

### Stop Server
Press `Ctrl + C` in the terminal

---

## 🔐 Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hrms.com | admin123 |
| HR | hr@hrms.com | hr123 |
| Manager | manager@hrms.com | manager123 |
| Employee | employee@hrms.com | employee123 |

---

## 📊 Database Information

**MongoDB Atlas Connection:**
- **Cluster:** taliocluster.mvnlgwj.mongodb.net
- **Database:** hrms_db
- **Collections:** 35 collections
- **Users:** 15 users

**Test Connection:**
```bash
node test-mongodb.js
```

---

## 🔧 Environment Variables

All configured in `.env` and `.env.local`:

```env
MONGODB_URI=mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?
JWT_SECRET=1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=
NEXTAUTH_SECRET=wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

---

## 🛠️ Common Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
node test-mongodb.js              # Test MongoDB connection
npm run seed                      # Seed database with sample data
npm run migrate                   # Migrate data to Atlas
```

### Testing
```bash
curl http://localhost:3000/api/test    # Test API health
```

---

## 📁 Key Files

### Configuration
- `.env` - Production environment variables
- `.env.local` - Local development variables
- `next.config.js` - Next.js configuration
- `middleware.js` - Authentication middleware

### Backend
- `lib/mongodb.js` - Database connection
- `lib/auth.js` - Authentication helpers
- `server.js` - Custom server with Socket.IO
- `models/` - Mongoose schemas (35+ models)
- `app/api/` - API routes (40+ endpoints)

### Frontend
- `app/` - Next.js pages and layouts
- `components/` - React components
- `contexts/` - React contexts
- `hooks/` - Custom React hooks

---

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Employees
- `GET /api/employees` - List all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Clock in/out

### Leave Management
- `GET /api/leave` - Get leave requests
- `POST /api/leave` - Submit leave request
- `PUT /api/leave/[id]` - Update leave status

### More Endpoints
- `/api/payroll` - Payroll management
- `/api/performance` - Performance reviews
- `/api/recruitment` - Job postings
- `/api/chat` - Chat functionality
- `/api/tasks` - Task management
- `/api/team` - Team management

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Restart server
npm run dev
```

### Database Connection Issues
```bash
# Test connection
node test-mongodb.js

# Check environment variables
cat .env | grep MONGODB_URI
```

### Build Errors
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Next.js cache
rm -rf .next
npm run build
```

---

## 📦 Dependencies

### Core
- Next.js 14.2.0
- React 18.3.0
- Mongoose 8.0.0
- Socket.IO 4.8.1

### Authentication
- jose 6.1.0
- bcryptjs 2.4.3
- next-auth 4.24.0

### UI
- TailwindCSS 3.4.0
- React Icons 5.0.0
- Recharts 2.10.0

---

## 🎯 Features

### ✅ Implemented
- Employee Management
- Attendance Tracking
- Leave Management
- Payroll Processing
- Performance Reviews
- Recruitment/ATS
- Task Management
- Chat System
- Document Management
- Asset Management
- Expense Management
- Travel Management
- Onboarding/Offboarding
- Real-time Notifications
- Role-based Access Control

---

## 📱 Mobile App

Android app available in `android/` directory:
```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/`

---

## 🔒 Security

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control
- Secure session management
- Environment variable protection
- API route authentication

---

## 📊 System Status

✅ **Backend:** Fully operational
✅ **Database:** Connected to MongoDB Atlas
✅ **API Routes:** 40+ endpoints working
✅ **Authentication:** JWT + NextAuth configured
✅ **Real-time:** Socket.IO ready
✅ **Frontend:** All pages functional

---

## 📞 Support

For issues or questions:
1. Check `BACKEND_FIXES_COMPLETE.md` for detailed fixes
2. Review `DATABASE_TROUBLESHOOTING.md` for DB issues
3. Check server logs for error messages
4. Verify `.env` file configuration

---

**Last Updated:** November 7, 2025
**Version:** 1.0.0
**Status:** ✅ Production Ready

