# 🚀 START HERE - Deploy mwg.talio.in with SSL

## Quick Summary

Your Talio HRMS application needs to be deployed on **mwg.talio.in** with SSL certificates. The backend is currently giving 500 errors.

---

## ✅ What I've Done

1. ✅ Updated `nginx.conf` with new domain: **mwg.talio.in**
2. ✅ Created production `.env` file with correct settings
3. ✅ Created SSL setup script: `setup-ssl-mwg.sh`
4. ✅ Created diagnostic script: `diagnose-backend.sh`
5. ✅ Created quick fix script: `QUICK_FIX_MWG.sh`
6. ✅ Created deployment guide: `DEPLOY_MWG_TALIO.md`

---

## 🎯 What You Need to Do

### Option 1: Quick Fix (Recommended)

Run this single command on your Hostinger VPS:

```bash
sudo bash QUICK_FIX_MWG.sh
```

This will:
- Stop existing containers
- Verify environment variables
- Clean up Docker resources
- Rebuild the application
- Set up SSL certificates
- Start the application
- Test everything

### Option 2: Manual Step-by-Step

If you prefer manual control:

#### Step 1: Connect to Server
```bash
ssh root@your-hostinger-vps-ip
cd /path/to/Talio
```

#### Step 2: Pull Latest Changes
```bash
git pull origin main
```

#### Step 3: Make Scripts Executable
```bash
chmod +x setup-ssl-mwg.sh
chmod +x diagnose-backend.sh
chmod +x QUICK_FIX_MWG.sh
```

#### Step 4: Run Diagnostics (Optional)
```bash
sudo bash diagnose-backend.sh
```

#### Step 5: Deploy with SSL
```bash
sudo bash setup-ssl-mwg.sh
```

---

## 🔍 Troubleshooting Backend 500 Errors

### Quick Diagnosis

```bash
# Run diagnostic script
sudo bash diagnose-backend.sh
```

### Common Causes & Fixes

#### 1. MongoDB Connection Issue

**Check:**
```bash
docker-compose logs hrms-app | grep -i mongo
```

**Fix:**
- Verify `MONGODB_URI` in `.env` file
- Add your Hostinger VPS IP to MongoDB Atlas whitelist
- Or use `0.0.0.0/0` to allow all IPs (less secure)

**MongoDB Atlas Steps:**
1. Go to https://cloud.mongodb.com
2. Click "Network Access" in left sidebar
3. Click "Add IP Address"
4. Add your Hostinger VPS IP or use `0.0.0.0/0`
5. Click "Confirm"

#### 2. Environment Variables Not Set

**Check:**
```bash
cat .env | grep -E "MONGODB_URI|NEXTAUTH_URL|JWT_SECRET"
```

**Fix:**
```bash
# Edit .env file
nano .env

# Make sure these are set:
MONGODB_URI=mongodb+srv://...
NEXTAUTH_URL=https://mwg.talio.in
NEXT_PUBLIC_APP_URL=https://mwg.talio.in
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-secret-key
```

#### 3. Application Not Building

**Fix:**
```bash
# Rebuild from scratch
docker-compose down
docker system prune -a -f
docker-compose build --no-cache
docker-compose up -d
```

#### 4. Port Already in Use

**Check:**
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
```

**Fix:**
```bash
# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if nginx is running outside Docker

# Or kill the process
sudo kill -9 $(sudo lsof -t -i:80)
sudo kill -9 $(sudo lsof -t -i:443)
```

#### 5. Out of Disk Space

**Check:**
```bash
df -h
```

**Fix:**
```bash
# Clean up Docker
docker system prune -a --volumes -f

# Clean up system
sudo apt-get clean
sudo apt-get autoremove -y
```

---

## 📊 Monitoring & Logs

### View All Logs
```bash
docker-compose logs -f
```

### View Application Logs Only
```bash
docker-compose logs -f hrms-app
```

### View Last 100 Lines
```bash
docker-compose logs hrms-app --tail=100
```

### Check Container Status
```bash
docker-compose ps
```

### Check Resource Usage
```bash
docker stats
```

---

## 🔄 Common Commands

### Restart Application
```bash
docker-compose restart
```

### Stop Application
```bash
docker-compose down
```

### Start Application
```bash
docker-compose up -d
```

### Rebuild and Restart
```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### View Environment Variables
```bash
docker-compose exec hrms-app env | grep -E 'MONGODB|NEXTAUTH|JWT'
```

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Application accessible at http://mwg.talio.in (redirects to HTTPS)
- [ ] Application accessible at https://mwg.talio.in (with green padlock)
- [ ] Login page loads without errors
- [ ] Can log in successfully
- [ ] Dashboard loads without 500 errors
- [ ] API endpoints working (check browser console)
- [ ] No errors in logs: `docker-compose logs hrms-app --tail=50`

---

## 🆘 If Nothing Works

### Collect Information

```bash
# Save all logs
docker-compose logs > full-logs.txt

# Save diagnostic output
sudo bash diagnose-backend.sh > diagnostics.txt

# Save environment (without secrets)
cat .env | grep -v "SECRET\|PRIVATE_KEY" > env-info.txt
```

### Complete Reset

```bash
# Nuclear option - start completely fresh
docker-compose down -v
docker system prune -a -f
rm -rf certbot/
git pull origin main
sudo bash QUICK_FIX_MWG.sh
```

---

## 📞 Support Information

**Files Created:**
- `QUICK_FIX_MWG.sh` - One-command deployment
- `setup-ssl-mwg.sh` - SSL certificate setup
- `diagnose-backend.sh` - Diagnostic tool
- `DEPLOY_MWG_TALIO.md` - Detailed deployment guide
- `.env` - Production environment variables
- `nginx.conf` - Updated with mwg.talio.in

**Key Settings:**
- Domain: mwg.talio.in
- SSL Email: avi2001raj@gmail.com
- MongoDB: Atlas cluster (already configured)

---

## 🎯 Next Steps After Deployment

1. **Test the application thoroughly**
2. **Change default secrets in `.env`:**
   - `NEXTAUTH_SECRET`
   - `JWT_SECRET`
   - `CRON_SECRET`

3. **Set up monitoring:**
   ```bash
   # Add to crontab for daily health checks
   0 0 * * * cd /path/to/Talio && docker-compose ps | mail -s "Talio Status" your@email.com
   ```

4. **Set up backups:**
   - MongoDB Atlas automatic backups (already enabled)
   - Docker volume backups
   - Application code backups

5. **Update Firebase authorized domains:**
   - Go to Firebase Console
   - Add `mwg.talio.in` to authorized domains

---

## 📚 Additional Resources

- **Detailed Deployment Guide:** `DEPLOY_MWG_TALIO.md`
- **Docker Compose File:** `docker-compose.yml`
- **Nginx Configuration:** `nginx.conf`
- **Environment Variables:** `.env`

---

**Ready to deploy? Run:**

```bash
sudo bash QUICK_FIX_MWG.sh
```

**Good luck! 🚀**

