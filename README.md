# HRMS - Human Resource Management System

A comprehensive HRMS (Human Resource Management System) built with Next.js 14, MongoDB, and modern web technologies. This system is inspired by Zimyo and includes all essential HR management features.

## 🚀 Features

### Core Modules

#### 1. **Employee Management**
- Complete employee lifecycle management
- Employee profiles with personal and professional details
- Organizational hierarchy
- Department and designation management
- Employee directory with search and filters
- Bulk import/export functionality

#### 2. **Attendance & Time Tracking**
- Clock in/out system
- Attendance calendar view
- Shift management
- Overtime tracking
- Attendance reports and analytics
- Biometric integration ready

#### 3. **Leave Management**
- Multiple leave types (Casual, Sick, Earned, etc.)
- Leave balance tracking
- Leave application and approval workflow
- Leave calendar
- Leave encashment
- Carry forward rules

#### 4. **Payroll Management**
- Automated payroll processing
- Salary structure configuration
- Payslip generation
- Tax calculations (TDS)
- Statutory compliance (PF, ESI, PT)
- Salary disbursement tracking
- Comprehensive payroll reports

#### 5. **Performance Management**
- KRA/KPI management
- OKR (Objectives and Key Results) tracking
- Performance reviews (Quarterly, Annual)
- 360-degree feedback
- Goal setting and tracking
- Performance reports and analytics

#### 6. **Recruitment (ATS)**
- Job requisition management
- Candidate management
- Applicant tracking system
- Interview scheduling
- Candidate pipeline
- Offer management
- Recruitment analytics

#### 7. **Employee Onboarding**
- Onboarding workflows
- Document collection
- Task assignments
- Onboarding checklist
- Welcome kit management
- Training assignments
- Buddy assignment

#### 8. **Employee Offboarding**
- Exit workflows
- Exit interviews
- Asset return tracking
- Final settlement calculation
- Clearance forms
- Experience and relieving letters
- Access revocation

#### 9. **Document Management**
- Centralized document repository
- Document categories
- Version control
- Document approval workflows
- Secure storage
- Document acknowledgment tracking

#### 10. **Asset Management**
- Asset inventory
- Asset allocation/deallocation
- Asset tracking
- Maintenance schedules
- Asset reports

#### 11. **Expense Management**
- Expense claims
- Expense categories
- Approval workflows
- Reimbursement tracking
- Receipt uploads
- Expense reports

#### 12. **Travel Management**
- Travel requests
- Travel approvals
- Travel booking integration ready
- Travel expense tracking
- Travel reports

#### 13. **Helpdesk**
- Ticket system
- Ticket categories
- Ticket assignment
- SLA management
- Ticket status tracking
- Helpdesk reports

#### 14. **Policy Management**
- Policy repository
- Policy versioning
- Policy acknowledgment tracking
- Policy distribution
- Policy search

#### 15. **Learning Management System (LMS)**
- Course management
- Training assignments
- Progress tracking
- Assessments and quizzes
- Certificates
- Learning reports

#### 16. **Employee Engagement**
- Announcements
- Employee surveys
- Feedback system
- Recognition and rewards
- Social feed

#### 17. **Reports & Analytics**
- Comprehensive reports for all modules
- Data visualization with charts
- Export to PDF/Excel
- Custom report builder
- Analytics dashboard

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, NextAuth.js
- **Charts**: Recharts
- **Icons**: React Icons
- **Notifications**: React Hot Toast
- **File Handling**: Multer, Sharp
- **PDF Generation**: jsPDF
- **Excel Export**: XLSX

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6+
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd hrms
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hrms_db

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# JWT Secret
JWT_SECRET=your-jwt-secret-key-change-this

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password

# App Configuration
NEXT_PUBLIC_APP_NAME=HRMS System
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Start MongoDB**

Make sure MongoDB is running on your system:
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo systemctl start mongod
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**

Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Default Credentials

After setting up, you can create an admin user using the registration API or use these demo credentials:

- **Admin**: admin@hrms.com / admin123
- **HR**: hr@hrms.com / hr123
- **Manager**: manager@hrms.com / manager123
- **Employee**: employee@hrms.com / employee123

## 📁 Project Structure

```
hrms/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication APIs
│   │   ├── employees/      # Employee APIs
│   │   ├── attendance/     # Attendance APIs
│   │   ├── leave/          # Leave APIs
│   │   ├── payroll/        # Payroll APIs
│   │   └── ...             # Other module APIs
│   ├── dashboard/          # Dashboard pages
│   │   ├── employees/      # Employee pages
│   │   ├── attendance/     # Attendance pages
│   │   ├── leave/          # Leave pages
│   │   └── ...             # Other module pages
│   ├── login/              # Login page
│   ├── globals.css         # Global styles
│   ├── layout.js           # Root layout
│   └── page.js             # Home page
├── components/              # Reusable components
│   ├── Sidebar.js          # Sidebar navigation
│   ├── Header.js           # Header component
│   └── ...                 # Other components
├── lib/                     # Utility libraries
│   └── mongodb.js          # MongoDB connection
├── models/                  # Mongoose models
│   ├── User.js             # User model
│   ├── Employee.js         # Employee model
│   ├── Attendance.js       # Attendance model
│   ├── Leave.js            # Leave model
│   ├── Payroll.js          # Payroll model
│   └── ...                 # Other models
├── public/                  # Static files
│   └── uploads/            # File uploads
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json            # Dependencies

```

## 🎨 Key Features

### Role-Based Access Control
- **Admin**: Full system access
- **HR**: Employee management, payroll, recruitment
- **Manager**: Team management, approvals
- **Employee**: Self-service portal

### Responsive Design
- Mobile-first approach
- Works on all devices
- Touch-friendly interface

### Real-time Updates
- Live notifications
- Real-time data sync
- Instant updates

### Security
- JWT authentication
- Password encryption
- Role-based permissions
- Secure API endpoints

## 📊 Database Models

The system includes comprehensive MongoDB schemas for:
- Users & Authentication
- Employees & Departments
- Attendance & Shifts
- Leave Management
- Payroll & Salary
- Performance & Reviews
- Recruitment & Candidates
- Assets & Documents
- Expenses & Travel
- Training & Courses
- Policies & Announcements
- And more...

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel deploy
```

### Docker
```bash
docker build -t hrms .
docker run -p 3000:3000 hrms
```

## 📝 API Documentation

API endpoints are organized by modules:

- `/api/auth/*` - Authentication
- `/api/employees/*` - Employee management
- `/api/attendance/*` - Attendance tracking
- `/api/leave/*` - Leave management
- `/api/payroll/*` - Payroll processing
- `/api/performance/*` - Performance management
- `/api/recruitment/*` - Recruitment
- And more...

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@hrms.com or create an issue in the repository.

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced analytics with AI
- [ ] Integration with third-party tools
- [ ] Multi-language support
- [ ] Advanced reporting
- [ ] Biometric integration
- [ ] Video interview integration
- [ ] Advanced workflow automation

## 📸 Screenshots

(Add screenshots of your application here)

---

Built with ❤️ using Next.js and MongoDB

