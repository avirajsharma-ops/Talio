# 🚨 URGENT FIX - Run These Commands on Server

## ⚠️ Issue Found
The `nginx.ssl.conf` file got corrupted with git commands in the first line. I've fixed it!

---

## 🚀 Run These Commands on Your Server

### Step 1: Stop Everything
```bash
cd /root/hrms
docker-compose down
docker-compose -f docker-compose.ssl.yml down
```

### Step 2: Pull Fixed Code
```bash
git stash
git pull origin main
```

### Step 3: Start with SSL
```bash
docker-compose -f docker-compose.ssl.yml up -d
```

### Step 4: Check Status
```bash
docker-compose ps
```

You should see:
```
✔ Container hrms-hrms-app-1  Running
✔ Container hrms-nginx       Running  
✔ Container hrms-certbot-1   Running
```

### Step 5: Test
```bash
curl -I https://zenova.sbs
```

Should return: `HTTP/2 200`

---

## 📋 Copy-Paste All Commands at Once

```bash
cd /root/hrms
docker-compose down
docker-compose -f docker-compose.ssl.yml down
git stash
git pull origin main
docker-compose -f docker-compose.ssl.yml up -d
docker-compose ps
curl -I https://zenova.sbs
```

---

## 🔍 If Still Not Working

### Check Nginx Logs
```bash
docker-compose logs nginx
```

### Check App Logs
```bash
docker-compose logs hrms-app
```

### Rebuild Everything
```bash
docker-compose down
docker-compose -f docker-compose.ssl.yml down
docker-compose build --no-cache
docker-compose -f docker-compose.ssl.yml up -d
```

---

## ✅ What I Fixed

1. **nginx.ssl.conf** - Removed corrupted git command from line 1
2. **nginx.ssl.conf** - Added missing `include /etc/nginx/mime.types;`
3. **nginx.ssl.conf** - Fixed domain to `zenova.sbs`

---

**Run the commands above and let me know the output!** 🚀

