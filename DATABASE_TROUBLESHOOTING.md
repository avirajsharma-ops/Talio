# Database Connection Troubleshooting

## 🔍 Checking Database Connection

### Step 1: Verify Environment Variables

```bash
# Check if .env file exists
ls -la .env

# View environment variables in container
docker-compose exec hrms-app env | grep MONGODB_URI
```

### Step 2: Test MongoDB Connection

```bash
# Test connection from container
docker-compose exec hrms-app node -e "
const mongoose = require('mongoose');
console.log('Connecting to:', process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully!');
    process.exit(0);
  })
  .catch(e => {
    console.log('❌ MongoDB Connection Failed:', e.message);
    process.exit(1);
  });
"
```

### Step 3: Check Application Logs

```bash
# View logs
docker-compose logs hrms-app --tail=100

# Follow logs in real-time
docker-compose logs -f hrms-app
```

---

## 🛠️ Common Issues & Solutions

### Issue 1: "MONGODB_URI is not defined"

**Symptoms:**
- Cannot login
- No data loading
- Error in logs: "Please define the MONGODB_URI environment variable"

**Solution:**

1. Create `.env` file in project root:
```bash
nano .env
```

2. Add your MongoDB connection string:
```env
MONGODB_URI=mongodb://your-host:27017/your-database
JWT_SECRET=your-jwt-secret-here
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=http://your-domain.com
NEXT_PUBLIC_APP_URL=http://your-domain.com
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

3. Restart containers:
```bash
docker-compose down
docker-compose up -d
```

---

### Issue 2: "Connection Refused" or "ECONNREFUSED"

**Symptoms:**
- Error: `connect ECONNREFUSED`
- Cannot reach MongoDB server

**Possible Causes & Solutions:**

#### A. MongoDB is not running
```bash
# If MongoDB is on the same server
sudo systemctl status mongod
sudo systemctl start mongod

# If using Docker MongoDB
docker ps | grep mongo
```

#### B. Wrong host/port in connection string
```bash
# Check your MONGODB_URI format:
# Local: mongodb://localhost:27017/hrms_db
# Remote: mongodb://your-server-ip:27017/hrms_db
# Atlas: mongodb+srv://username:password@cluster.mongodb.net/hrms_db
```

#### C. Firewall blocking connection
```bash
# Allow MongoDB port
sudo ufw allow 27017

# Or for specific IP
sudo ufw allow from your-app-server-ip to any port 27017
```

---

### Issue 3: "Authentication Failed"

**Symptoms:**
- Error: `Authentication failed`
- Error: `bad auth`

**Solution:**

Check your MongoDB credentials:

```env
# Format: mongodb://username:password@host:port/database
MONGODB_URI=mongodb://admin:yourpassword@localhost:27017/hrms_db?authSource=admin
```

Test credentials:
```bash
mongosh "mongodb://username:password@host:27017/database"
```

---

### Issue 4: "Network Timeout"

**Symptoms:**
- Connection hangs
- Timeout errors

**Solutions:**

1. **Check MongoDB is accessible:**
```bash
# From your server
telnet your-mongodb-host 27017
# or
nc -zv your-mongodb-host 27017
```

2. **For MongoDB Atlas:**
- Add your server's IP to Atlas whitelist
- Go to: Network Access → Add IP Address

3. **Check MongoDB bind IP:**
```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Change bindIp to allow remote connections
net:
  bindIp: 0.0.0.0  # Allow all IPs (or specify your app server IP)
  port: 27017

# Restart MongoDB
sudo systemctl restart mongod
```

---

### Issue 5: "Database Not Found"

**Symptoms:**
- Connection works but no data
- Empty collections

**Solution:**

MongoDB creates databases automatically, but you need to:

1. **Verify database name in connection string:**
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
#                                        ^^^^^^^^ database name
```

2. **Create initial admin user:**
```bash
# Access your app
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

---

## 📋 Complete Troubleshooting Checklist

Run these commands in order:

```bash
# 1. Check if .env file exists and has MONGODB_URI
cat .env | grep MONGODB_URI

# 2. Check if MongoDB is accessible
# For local MongoDB:
mongosh --eval "db.version()"

# For remote MongoDB:
mongosh "your-connection-string" --eval "db.version()"

# 3. Restart Docker containers
docker-compose down
docker-compose up -d

# 4. Check container logs
docker-compose logs hrms-app --tail=50

# 5. Test connection from container
docker-compose exec hrms-app node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected'))
  .catch(e => console.log('❌ Error:', e.message));
"

# 6. Check if app is responding
curl http://localhost:3000/api/health || curl http://localhost:3000
```

---

## 🔧 Quick Fixes

### Fix 1: Restart Everything
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose logs -f
```

### Fix 2: Check Environment Variables
```bash
# Inside container
docker-compose exec hrms-app sh
env | grep MONGODB
env | grep JWT
env | grep NEXTAUTH
exit
```

### Fix 3: Test MongoDB Directly
```bash
# Connect to MongoDB
mongosh "your-connection-string"

# List databases
show dbs

# Use your database
use hrms_db

# List collections
show collections

# Count users
db.users.countDocuments()
```

---

## 📊 MongoDB Connection String Examples

### Local MongoDB (No Auth)
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
```

### Local MongoDB (With Auth)
```env
MONGODB_URI=mongodb://admin:password@localhost:27017/hrms_db?authSource=admin
```

### Remote MongoDB
```env
MONGODB_URI=mongodb://username:password@192.168.1.100:27017/hrms_db
```

### MongoDB Atlas
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hrms_db?
```

### Docker MongoDB (in same docker-compose)
```env
MONGODB_URI=mongodb://mongodb:27017/hrms_db
```

---

## 🚨 Emergency: Reset Everything

If nothing works, start fresh:

```bash
# 1. Stop all containers
docker-compose down -v

# 2. Remove all Docker images
docker rmi $(docker images -q)

# 3. Clean Docker system
docker system prune -a --volumes

# 4. Verify .env file
cat .env

# 5. Rebuild and start
docker-compose build --no-cache
docker-compose up -d

# 6. Watch logs
docker-compose logs -f
```

---

## ✅ Verification Steps

After fixing, verify everything works:

```bash
# 1. Check containers are running
docker-compose ps

# 2. Check logs for errors
docker-compose logs hrms-app --tail=20

# 3. Test API endpoint
curl http://localhost:3000/api/health

# 4. Try to login
# Open browser: http://localhost:3000/login
# Or test with curl:
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrms.com","password":"admin123"}'
```

---

## 📞 Still Having Issues?

Check these files:
- `docker-compose.yml` - Ensure env_file and environment are set
- `.env` - Ensure MONGODB_URI is correct
- `lib/mongodb.js` - Database connection logic

Common log messages:
- ✅ "MongoDB Connected" - Good!
- ❌ "ECONNREFUSED" - MongoDB not accessible
- ❌ "Authentication failed" - Wrong credentials
- ❌ "MONGODB_URI is not defined" - Missing .env file

