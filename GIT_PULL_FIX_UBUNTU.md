# 🔧 Fix Git Pull Conflict on Ubuntu Server

## ❌ **Error You're Seeing:**

```
error: Your local changes to the following files would be overwritten by merge:
    setup-ssl-impl.sh
    nginx.ssl.conf
Please commit your changes or stash them before you merge.
Aborting
Merge with strategy ort failed.
```

---

## ✅ **Solution: Choose One of These Methods**

### **Method 1: Stash Your Changes (Recommended if you want to keep local changes)**

This temporarily saves your local changes, pulls the latest code, then reapplies your changes.

```bash
# 1. Stash (save) your local changes
git stash

# 2. Pull the latest code
git pull origin main

# 3. Reapply your stashed changes
git stash pop

# 4. If there are conflicts, resolve them manually
# Then commit the resolved changes
git add .
git commit -m "Merge local changes with remote"
```

---

### **Method 2: Commit Your Changes First (Recommended if changes are important)**

This commits your local changes before pulling.

```bash
# 1. Add all changed files
git add .

# 2. Commit your changes
git commit -m "Save local changes before pull"

# 3. Pull the latest code
git pull origin main

# 4. If there are merge conflicts, resolve them
# Then commit the merge
git add .
git commit -m "Merge remote changes"
```

---

### **Method 3: Discard Local Changes (Use if you don't need local changes)**

⚠️ **WARNING:** This will permanently delete your local changes!

```bash
# 1. Discard all local changes
git reset --hard HEAD

# 2. Pull the latest code
git pull origin main
```

---

### **Method 4: Force Pull (Nuclear Option - Use with Caution)**

⚠️ **WARNING:** This will completely overwrite your local repository with the remote version!

```bash
# 1. Fetch the latest from remote
git fetch origin

# 2. Reset your branch to match remote exactly
git reset --hard origin/main

# 3. Clean any untracked files (optional)
git clean -fd
```

---

## 🎯 **Recommended Steps for Your Situation:**

Based on your error, I recommend **Method 1 (Stash)** or **Method 3 (Discard)** depending on whether you need those SSL configuration changes.

### **If you DON'T need the SSL config changes:**

```bash
cd /root/hrms  # or wherever your project is
git reset --hard HEAD
git pull origin main
```

### **If you DO need the SSL config changes:**

```bash
cd /root/hrms  # or wherever your project is
git stash
git pull origin main
git stash pop
# If conflicts appear, resolve them manually
```

---

## 🔍 **Check What Changed Locally:**

Before deciding, see what you changed locally:

```bash
# See which files changed
git status

# See the actual changes
git diff setup-ssl-impl.sh
git diff nginx.ssl.conf
```

---

## 📋 **Step-by-Step Guide (Safest Method):**

```bash
# 1. Navigate to your project
cd /root/hrms

# 2. Check what changed
git status
git diff

# 3. If you want to keep changes, stash them
git stash save "SSL config changes before pull"

# 4. Pull the latest code
git pull origin main

# 5. If you stashed, reapply changes
git stash pop

# 6. If there are conflicts, you'll see markers like:
# <<<<<<< HEAD
# ... your changes ...
# =======
# ... remote changes ...
# >>>>>>> origin/main

# 7. Edit the conflicted files to resolve
nano setup-ssl-impl.sh  # or vim
nano nginx.ssl.conf

# 8. After resolving, add and commit
git add .
git commit -m "Resolved merge conflicts"

# 9. Verify everything is clean
git status
```

---

## 🚀 **After Pulling Successfully:**

Once you've pulled the latest code, rebuild and restart your application:

```bash
# If it's a Node.js/Next.js app
npm install
npm run build

# Restart PM2 (if using PM2)
pm2 restart all

# Or restart your service
systemctl restart hrms  # or whatever your service name is
```

---

## 🛡️ **Prevent This in the Future:**

### **Option 1: Always Pull Before Making Changes**
```bash
git pull origin main
# Then make your changes
```

### **Option 2: Use a Separate Branch for Server-Specific Changes**
```bash
# Create a server-specific branch
git checkout -b server-config

# Make your SSL changes here
# This branch won't conflict with main
```

### **Option 3: Use .gitignore for Server-Specific Files**

Add these files to `.gitignore` if they're server-specific:
```bash
echo "setup-ssl-impl.sh" >> .gitignore
echo "nginx.ssl.conf" >> .gitignore
git add .gitignore
git commit -m "Ignore server-specific config files"
```

---

## 🔧 **Quick Fix Command (Copy-Paste):**

If you just want to pull and don't care about local SSL changes:

```bash
cd /root/hrms && git reset --hard HEAD && git pull origin main && npm install && npm run build && pm2 restart all
```

---

## 📞 **Troubleshooting:**

### **If you get "Permission denied":**
```bash
sudo chown -R $USER:$USER /root/hrms
```

### **If you get "Not a git repository":**
```bash
cd /root/hrms
git init
git remote add origin https://github.com/deependr20/hrms.git
git fetch
git reset --hard origin/main
```

### **If you get "Merge conflict":**
```bash
# See conflicted files
git status

# For each conflicted file, choose one:
# Keep yours:
git checkout --ours filename

# Keep theirs (remote):
git checkout --theirs filename

# Then:
git add .
git commit -m "Resolved conflicts"
```

---

## ✅ **Verification:**

After pulling, verify everything works:

```bash
# Check git status
git status

# Check if app runs
npm run dev  # or npm start

# Check logs
pm2 logs  # if using PM2
```

---

## 🎯 **Summary:**

1. **Decide:** Do you need the local SSL config changes?
2. **Choose Method:**
   - Need changes? → Use **Method 1 (Stash)**
   - Don't need? → Use **Method 3 (Discard)**
3. **Pull:** `git pull origin main`
4. **Rebuild:** `npm install && npm run build`
5. **Restart:** `pm2 restart all`

---

**Ready to fix it?** Choose the method that fits your needs and run the commands! 🚀

