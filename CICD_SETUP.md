# 🚀 CI/CD Pipeline Setup for HRMS

## 📋 **Pipeline Overview**

The CI/CD pipeline automatically:
- ✅ **Tests** code on every push/PR
- ✅ **Builds** the application
- ✅ **Deploys** to Vercel automatically
- ✅ **Runs** preview deployments for PRs
- ✅ **Deploys** to production on main branch

---

## 🔧 **Setup Instructions**

### **Step 1: GitHub Secrets Setup**

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

Add these **Repository Secrets**:

```bash
# Vercel Integration
VERCEL_TOKEN=your_vercel_token_here
VERCEL_ORG_ID=your_org_id_here
VERCEL_PROJECT_ID=your_project_id_here

# Database & Auth (Same as Vercel env vars)
MONGODB_URI=mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?
NEXTAUTH_SECRET=wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=
JWT_SECRET=1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=
```

### **Step 2: Get Vercel Credentials**

#### **Get Vercel Token:**
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create new token → Copy it
3. Add as `VERCEL_TOKEN` secret

#### **Get Org ID & Project ID:**
```bash
# Install Vercel CLI locally
npm i -g vercel

# Login and link project
vercel login
vercel link

# Get IDs (will be shown in .vercel/project.json)
cat .vercel/project.json
```

### **Step 3: Vercel Environment Variables**

Ensure these are set in Vercel dashboard:

```bash
MONGODB_URI=mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?
NEXTAUTH_SECRET=wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=
JWT_SECRET=1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=
NEXTAUTH_URL=https://your-vercel-url.vercel.app
NEXT_PUBLIC_APP_URL=https://your-vercel-url.vercel.app
NEXT_PUBLIC_APP_NAME=HRMS System
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
NODE_ENV=production
```

---

## 🔄 **Pipeline Workflow**

### **On Pull Request:**
1. **Test** → Install deps → Lint → Build
2. **Deploy Preview** → Create preview deployment
3. **Comment** → Add preview URL to PR

### **On Main Branch Push:**
1. **Test** → Install deps → Lint → Build  
2. **Deploy Production** → Deploy to production URL
3. **Notify** → Deployment success message

---

## 🧪 **Testing the Pipeline**

### **Test 1: Create a PR**
```bash
git checkout -b feature/test-cicd
git add .
git commit -m "Test CI/CD pipeline"
git push origin feature/test-cicd
# Create PR on GitHub
```

### **Test 2: Merge to Main**
```bash
# Merge PR → Triggers production deployment
```

---

## 🚨 **Current Deployment Issue Fix**

The main issue is **missing environment variables** in Vercel. Here's the immediate fix:

### **Quick Fix Steps:**

1. **Go to Vercel Dashboard**
2. **Settings** → **Environment Variables**
3. **Add all variables** from the list above
4. **Redeploy** (or push to trigger CI/CD)

### **Verify Fix:**
- Visit: `https://your-vercel-url.vercel.app/api/test`
- Should return: `{"success": true, "message": "API is working correctly"}`
- Login should work with: `admin@hrms.com / admin123`

---

## 📊 **Pipeline Benefits**

✅ **Automated Testing** → Catch issues before deployment  
✅ **Preview Deployments** → Test changes safely  
✅ **Production Deployments** → Automatic on main branch  
✅ **Environment Management** → Consistent across environments  
✅ **Build Optimization** → Faster deployments  

---

## 🔧 **Troubleshooting**

### **Pipeline Fails:**
- Check GitHub Actions logs
- Verify all secrets are set
- Ensure Vercel token has correct permissions

### **Deployment Fails:**
- Check Vercel function logs
- Verify environment variables
- Test API endpoint manually

### **Database Issues:**
- Verify MongoDB Atlas connection
- Check network access settings (0.0.0.0/0)
- Test connection with migration script

---

## 🎯 **Next Steps**

1. **Set up GitHub secrets** (Step 1)
2. **Configure Vercel environment** (Step 3)  
3. **Test the pipeline** (create a PR)
4. **Monitor deployments** (GitHub Actions tab)

**Once setup, every push to main will automatically deploy your HRMS to production!** 🚀
