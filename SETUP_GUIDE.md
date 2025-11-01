# HRMS Setup Guide

This guide will help you set up and run the HRMS system on your local machine.

## Step-by-Step Setup

### 1. Install Node.js

Download and install Node.js (v18 or higher) from [nodejs.org](https://nodejs.org/)

Verify installation:
```bash
node --version
npm --version
```

### 2. Install MongoDB

#### Windows:
1. Download MongoDB Community Server from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB as a Service
5. Install MongoDB Compass (GUI tool)

#### macOS:
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

#### Linux (Ubuntu):
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

### 3. Clone and Setup Project

```bash
# Navigate to your project directory
cd c:\Users\DTPS\Desktop\hrms

# Install dependencies
npm install
```

### 4. Configure Environment Variables

The `.env.local` file is already created. Update it with your settings:

```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
NEXTAUTH_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

### 5. Create Initial Admin User

You can create an admin user by making a POST request to `/api/auth/register`:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
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
  }'
```

Or use a tool like Postman or Thunder Client in VS Code.

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### 7. Access the Application

1. Open your browser and go to `http://localhost:3000`
2. You'll be redirected to the login page
3. Use the credentials you created in step 5

## Common Issues and Solutions

### Issue 1: MongoDB Connection Error

**Error**: `MongooseServerSelectionError: connect ECONNREFUSED`

**Solution**:
- Make sure MongoDB is running
- Check if MongoDB is running on port 27017
- Verify MONGODB_URI in `.env.local`

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl status mongod
```

### Issue 2: Port 3000 Already in Use

**Error**: `Port 3000 is already in use`

**Solution**:
```bash
# Kill the process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

### Issue 3: Module Not Found

**Error**: `Cannot find module 'xyz'`

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

### Issue 4: JWT Secret Not Defined

**Error**: `JWT_SECRET is not defined`

**Solution**:
- Make sure `.env.local` file exists
- Add JWT_SECRET to `.env.local`
- Restart the development server

## Database Seeding (Optional)

To populate the database with sample data, you can create a seed script:

```bash
# Create seed script
node scripts/seed.js
```

## Production Deployment

### Build for Production

```bash
npm run build
npm start
```

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variables in Vercel dashboard

### Deploy to Other Platforms

The application can be deployed to:
- Vercel (Recommended)
- Netlify
- AWS
- DigitalOcean
- Heroku
- Your own server

## Monitoring and Maintenance

### Check Application Logs

```bash
# Development
npm run dev

# Production
pm2 logs hrms
```

### Database Backup

```bash
# Backup MongoDB
mongodump --db hrms_db --out ./backup

# Restore MongoDB
mongorestore --db hrms_db ./backup/hrms_db
```

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install package-name@latest
```

## Performance Optimization

1. **Enable caching**
2. **Optimize images**
3. **Use CDN for static assets**
4. **Enable compression**
5. **Monitor database queries**

## Security Best Practices

1. **Change default passwords**
2. **Use strong JWT secrets**
3. **Enable HTTPS in production**
4. **Implement rate limiting**
5. **Regular security audits**
6. **Keep dependencies updated**

## Getting Help

- Check the README.md file
- Review the code documentation
- Check MongoDB logs
- Check Next.js logs
- Create an issue on GitHub

## Next Steps

After successful setup:

1. Create departments and designations
2. Add employees
3. Configure leave types
4. Set up holiday calendar
5. Configure payroll settings
6. Create job openings
7. Set up policies
8. Configure email notifications

## Useful Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

# Database
mongosh              # Open MongoDB shell
use hrms_db          # Switch to HRMS database
db.users.find()      # View all users

# Git
git status           # Check status
git add .            # Stage changes
git commit -m "msg"  # Commit changes
git push             # Push to remote
```

## Support

For additional help:
- Email: support@hrms.com
- Documentation: /docs
- GitHub Issues: Create an issue

---

Happy coding! 🚀

