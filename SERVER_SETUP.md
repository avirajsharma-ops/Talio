# 🚀 Server Setup Guide - Talio HRMS

## Why .env is NOT in Git

The `.env` file contains sensitive credentials and should **NEVER** be committed to Git:
- MongoDB password
- JWT secrets
- API keys

Instead, we use a deployment script that creates the `.env` file on the server.

---

## 📋 One-Time Server Setup

### Step 1: Clone the Repository

```bash
cd ~
git clone https://github.com/avirajsharma-ops/Tailo.git hrms
cd hrms
```

### Step 2: Make Deployment Script Executable

```bash
chmod +x deploy-server.sh
```

### Step 3: Run Initial Deployment

```bash
./deploy-server.sh
```

This script will:
- ✅ Pull latest code from GitHub
- ✅ Generate secure JWT and NextAuth secrets
- ✅ Create `.env` file with your MongoDB credentials
- ✅ Build Docker image
- ✅ Start containers
- ✅ Run diagnostics

---

## 🔄 Deploying Updates

Every time you push changes to GitHub, run this on your server:

```bash
cd ~/hrms
./deploy-server.sh
```

The script will:
- Pull latest code
- Keep existing secrets (won't regenerate)
- Rebuild and restart containers

---

## 🔐 Regenerating Secrets

If you need to regenerate JWT/NextAuth secrets:

```bash
cd ~/hrms
./deploy-server.sh --regenerate-secrets
```

⚠️ **Warning**: This will log out all users!

---

## 🔧 Manual .env Creation (Alternative)

If you prefer to create `.env` manually:

```bash
cd ~/hrms

# Generate secrets
JWT_SECRET=$(openssl rand -base64 48)
NEXTAUTH_SECRET=$(openssl rand -base64 48)

# Create .env file
cat > .env <<EOF
NODE_ENV=production
PORT=3000

MONGODB_URI=mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?

NEXTAUTH_URL=https://zenova.sbs
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET

NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
EOF

chmod 600 .env
```

Then deploy:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Verify Deployment

After deployment, check:

```bash
# 1. Check container status
docker-compose ps

# 2. Run diagnostics
docker-compose exec hrms-app node debug-env.js

# 3. View logs
docker-compose logs -f hrms-app

# 4. Test the app
curl https://zenova.sbs
```

---

## 🔍 Troubleshooting

### Issue: "MONGODB_URI contains dummy"

**Solution:**
```bash
# Verify .env exists
ls -la .env

# Check content (masked)
cat .env | sed 's/\(SECRET=\).*/\1***HIDDEN***/g'

# Rebuild completely
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Issue: "MongoDB connection failed"

**Possible causes:**
1. MongoDB Atlas network access not configured
2. Wrong credentials
3. Database name missing

**Solution:**
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
3. Verify connection string includes `/hrms_db`

### Issue: ".env file not being read"

**Solution:**
```bash
# Ensure .env is in project root
cd ~/hrms
pwd  # Should show /root/hrms or /home/username/hrms
ls -la .env docker-compose.yml  # Both should be in same directory

# Rebuild
./deploy-server.sh
```

---

## 🔒 Security Best Practices

1. **Never commit .env to Git**
   - `.env` is in `.gitignore` for a reason
   - Use deployment script instead

2. **Restrict .env file permissions**
   ```bash
   chmod 600 .env  # Only owner can read/write
   ```

3. **Use strong secrets**
   ```bash
   # Generate 48-character secrets
   openssl rand -base64 48
   ```

4. **Whitelist server IP in MongoDB Atlas**
   - Don't use 0.0.0.0/0 in production
   - Add specific server IP

5. **Rotate secrets periodically**
   ```bash
   ./deploy-server.sh --regenerate-secrets
   ```

---

## 📁 File Structure on Server

```
~/hrms/
├── .env                    # Created by deploy script (NOT in Git)
├── .env.example           # Template (in Git)
├── docker-compose.yml     # Docker configuration
├── deploy-server.sh       # Deployment script
├── QUICK_FIX.sh          # Quick fix script
├── debug-env.js          # Environment diagnostics
└── ... (other project files)
```

---

## 🚀 Quick Reference

```bash
# Deploy latest changes
cd ~/hrms && ./deploy-server.sh

# View logs
docker-compose logs -f hrms-app

# Restart containers
docker-compose restart

# Stop containers
docker-compose down

# Check status
docker-compose ps

# Run diagnostics
docker-compose exec hrms-app node debug-env.js

# Access container shell
docker-compose exec hrms-app sh
```

---

## ✅ Success Checklist

After deployment, verify:

- [ ] `docker-compose ps` shows containers running
- [ ] `debug-env.js` shows MongoDB connection successful
- [ ] No "dummy" values in environment
- [ ] https://zenova.sbs loads correctly
- [ ] Can login successfully
- [ ] Data loads from database

---

## 📞 Need Help?

If deployment fails:

1. Run diagnostics:
   ```bash
   ./deploy-server.sh
   docker-compose exec hrms-app node debug-env.js
   ```

2. Check logs:
   ```bash
   docker-compose logs hrms-app --tail=50
   ```

3. See detailed troubleshooting:
   ```bash
   cat TROUBLESHOOT_NOW.md
   ```

---

**Remember**: The `.env` file is created automatically by the deployment script. You don't need to commit it to Git! 🔒

