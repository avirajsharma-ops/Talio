# Environment Variables Setup Guide

## 🔧 Quick Setup

### Step 1: Create .env file

On your server, create a `.env` file in the project root:

```bash
cd ~/hrms
nano .env
```

### Step 2: Add Required Variables

Copy and paste this template, then replace with your actual values:

```env
# MongoDB Connection String
# Replace with your actual MongoDB connection
MONGODB_URI=mongodb://localhost:27017/hrms_db

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-to-random-string

# NextAuth Secret (generate a random string)
NEXTAUTH_SECRET=your-super-secret-nextauth-key-change-this-to-random-string

# Application URLs (use your domain)
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs

# Application Name
NEXT_PUBLIC_APP_NAME=Talio HRMS
```

### Step 3: Generate Secure Secrets

Generate random secrets for JWT_SECRET and NEXTAUTH_SECRET:

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

Copy the output and use them in your .env file.

---

## 📋 MongoDB Connection String Examples

### Local MongoDB (No Authentication)
```env
MONGODB_URI=mongodb://localhost:27017/hrms_db
```

### Local MongoDB (With Authentication)
```env
MONGODB_URI=mongodb://username:password@localhost:27017/hrms_db?authSource=admin
```

### Remote MongoDB Server
```env
MONGODB_URI=mongodb://username:password@192.168.1.100:27017/hrms_db
```

### MongoDB Atlas (Cloud)
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/hrms_db?
```

### Docker MongoDB (if running MongoDB in Docker)
```env
MONGODB_URI=mongodb://mongodb:27017/hrms_db
```

---

## ✅ Verification Steps

### 1. Check .env file exists
```bash
ls -la .env
cat .env  # View contents (be careful, contains secrets!)
```

### 2. Run diagnostic script
```bash
chmod +x check-db.sh
./check-db.sh
```

### 3. Restart Docker containers
```bash
docker-compose down
docker-compose up -d
```

### 4. Check logs
```bash
docker-compose logs -f hrms-app
```

Look for:
- ✅ "MongoDB Connected" or similar success message
- ❌ "ECONNREFUSED" - MongoDB not accessible
- ❌ "Authentication failed" - Wrong credentials
- ❌ "MONGODB_URI is not defined" - .env not loaded

### 5. Test the application
```bash
# Test if app is running
curl http://localhost:3000

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

## 🔍 Troubleshooting

### Issue: "MONGODB_URI is not defined"

**Solution:**
1. Ensure .env file exists in project root
2. Restart containers: `docker-compose down && docker-compose up -d`
3. Check if .env is loaded: `docker-compose exec hrms-app env | grep MONGODB`

### Issue: "Connection refused" (ECONNREFUSED)

**Possible causes:**
1. MongoDB is not running
2. Wrong host/port in connection string
3. Firewall blocking connection

**Solutions:**

**If MongoDB is on the same server:**
```bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod
```

**If MongoDB is on a different server:**
```bash
# Test connectivity
telnet mongodb-host 27017
# or
nc -zv mongodb-host 27017

# Check firewall
sudo ufw allow from your-app-server-ip to any port 27017
```

**MongoDB bind IP configuration:**
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

### Issue: "Authentication failed"

**Solution:**
1. Verify username and password in connection string
2. Check authSource parameter
3. Test connection manually:
```bash
mongosh "mongodb://username:password@host:27017/database?authSource=admin"
```

### Issue: Environment variables not loading

**Solution:**
1. Check .env file location (must be in project root)
2. Check .env file format (no spaces around =)
3. Restart containers completely:
```bash
docker-compose down -v
docker-compose up -d
```

---

## 🚀 Complete Setup Example

Here's a complete example for a typical setup:

```bash
# 1. Navigate to project
cd ~/hrms

# 2. Create .env file
cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
EOF

# 3. Generate and update secrets
JWT_SECRET=$(openssl rand -base64 32)
NEXTAUTH_SECRET=$(openssl rand -base64 32)
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|" .env

# 4. Verify .env file
cat .env

# 5. Restart containers
docker-compose down
docker-compose up -d

# 6. Check logs
docker-compose logs -f hrms-app
```

---

## 📊 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | ✅ Yes | MongoDB connection string | `mongodb://localhost:27017/hrms_db` |
| `JWT_SECRET` | ✅ Yes | Secret for JWT tokens | Random 32+ char string |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret for NextAuth | Random 32+ char string |
| `NEXTAUTH_URL` | ✅ Yes | Application URL | `https://zenova.sbs` |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Public app URL | `https://zenova.sbs` |
| `NEXT_PUBLIC_APP_NAME` | ⚠️ Optional | Application name | `Talio HRMS` |

---

## 🔒 Security Best Practices

1. **Never commit .env file to git** (already in .gitignore)
2. **Use strong random secrets** (at least 32 characters)
3. **Rotate secrets regularly** (every 90 days recommended)
4. **Use different secrets for dev/staging/production**
5. **Restrict MongoDB access** (firewall, authentication)
6. **Use SSL/TLS for MongoDB connections** (in production)

---

## 📞 Need Help?

Run the diagnostic script:
```bash
chmod +x check-db.sh
./check-db.sh
```

Check the troubleshooting guide:
```bash
cat DATABASE_TROUBLESHOOTING.md
```

View container logs:
```bash
docker-compose logs -f hrms-app
```

---

## ✅ Final Checklist

- [ ] .env file created in project root
- [ ] MONGODB_URI set with correct connection string
- [ ] JWT_SECRET generated (random 32+ chars)
- [ ] NEXTAUTH_SECRET generated (random 32+ chars)
- [ ] NEXTAUTH_URL set to your domain
- [ ] NEXT_PUBLIC_APP_URL set to your domain
- [ ] MongoDB is running and accessible
- [ ] Containers restarted after creating .env
- [ ] No errors in container logs
- [ ] Application accessible at https://zenova.sbs
- [ ] Can login successfully

Once all items are checked, your database connection should work! 🎉

