# Production Server Environment Migration Guide

## ⚠️ URGENT: Action Required on Production Server

The application now uses **`.env`** instead of **`.env.local`** for all environment configuration.

---

## 🚨 What You Need to Do on Production Server

### Step 1: Check Current Environment Files

```bash
cd /path/to/your/app
ls -la .env*
```

You might see:
- `.env.local` (old file - needs to be migrated)
- `.env` (may or may not exist)

### Step 2: Migrate Configuration

#### If you have `.env.local` but NO `.env`:

```bash
# Simply rename .env.local to .env
mv .env.local .env
```

#### If you have BOTH `.env.local` and `.env`:

```bash
# Backup both files first
cp .env .env.backup
cp .env.local .env.local.backup

# Merge .env.local into .env (manually review and merge)
# Open both files and copy any missing variables from .env.local to .env
nano .env.local  # Review this
nano .env        # Add missing variables here

# After merging, delete .env.local
rm .env.local
```

### Step 3: Verify .env File

Ensure your `.env` file contains all required variables:

```bash
# Check that all critical variables are present
grep -E "MONGODB_URI|NEXTAUTH_SECRET|JWT_SECRET|FIREBASE_SERVICE_ACCOUNT_KEY" .env
```

Required variables:
- `MONGODB_URI`
- `MONGODB_DB_NAME`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_APP_URL`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT_KEY`
- `NEXT_PUBLIC_OPENAI_API_KEY`
- `NEXT_PUBLIC_ELEVENLABS_API_KEY`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `NODE_ENV=production`

### Step 4: Update Production URLs

Make sure these are set to production values in `.env`:

```bash
NEXTAUTH_URL=https://app.talio.in
NEXT_PUBLIC_APP_URL=https://app.talio.in
NODE_ENV=production
```

### Step 5: Restart Application

```bash
# If using Docker
docker-compose down
docker-compose up -d

# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-service
```

### Step 6: Verify Application is Working

```bash
# Check application logs
docker-compose logs -f hrms-app  # for Docker
# OR
pm2 logs  # for PM2

# Test the application
curl https://app.talio.in/api/test
```

---

## 🔍 Troubleshooting

### Issue: Application not reading environment variables

**Solution:**
```bash
# Ensure .env file exists and has correct permissions
ls -la .env
chmod 600 .env  # Make it readable only by owner

# Ensure no .env.local file exists (it would take precedence)
rm .env.local

# Restart the application
```

### Issue: MongoDB connection errors

**Solution:**
```bash
# Check MONGODB_URI is correct
grep MONGODB_URI .env

# Ensure it's the full connection string with credentials
# Should look like: mongodb+srv://username:password@cluster.mongodb.net/dbname?...
```

### Issue: Firebase/Push notifications not working

**Solution:**
```bash
# Check FIREBASE_SERVICE_ACCOUNT_KEY is present and valid JSON
grep FIREBASE_SERVICE_ACCOUNT_KEY .env

# It should be a complete JSON object on one line
```

---

## 📋 Quick Checklist

- [ ] Located `.env.local` file on production server
- [ ] Renamed or merged `.env.local` to `.env`
- [ ] Verified all required variables are in `.env`
- [ ] Updated production URLs (NEXTAUTH_URL, NEXT_PUBLIC_APP_URL)
- [ ] Set NODE_ENV=production
- [ ] Deleted `.env.local` file
- [ ] Restarted application
- [ ] Verified application is working
- [ ] Checked application logs for errors

---

## 🆘 Emergency Rollback

If something goes wrong and you need to rollback:

```bash
# Restore from backup
cp .env.local.backup .env.local

# Checkout previous version of code
git checkout <previous-commit-hash>

# Restart application
docker-compose restart
```

---

## 📞 Support

If you encounter issues during migration:

1. Check application logs first
2. Verify `.env` file format (no syntax errors)
3. Ensure all secrets are properly escaped
4. Contact development team with error logs

---

## ✅ Post-Migration

After successful migration:

- `.env` is the ONLY environment file used
- `.env.local` should NOT exist
- All environment variables are read from `.env`
- Application should work exactly as before

