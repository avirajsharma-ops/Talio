# ✅ VERCEL DEPLOYMENT CHECKLIST

## 🎯 **Quick Deployment Steps**

### **Step 1: Database Setup (5 minutes)**
- [ ] Create MongoDB Atlas account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
- [ ] Create a free M0 cluster
- [ ] Create database user: `hrms_admin` with secure password
- [ ] Whitelist all IP addresses (0.0.0.0/0)
- [ ] Copy connection string and replace `<password>` and `<dbname>`

### **Step 2: Generate Secrets (1 minute)**
- [ ] Run: `node generate-secrets.js` to generate secure secrets
- [ ] Copy the generated NEXTAUTH_SECRET and JWT_SECRET

### **Step 3: Deploy to Vercel (3 minutes)**
- [ ] Push code to GitHub
- [ ] Go to [vercel.com](https://vercel.com) and import your repository
- [ ] Add environment variables (see list below)
- [ ] Click Deploy

### **Step 4: Post-Deployment (2 minutes)**
- [ ] Update NEXTAUTH_URL with your actual Vercel URL
- [ ] Test login with default credentials
- [ ] Change default passwords in production

---

## 🔧 **Environment Variables to Set in Vercel**

Copy these to your Vercel project settings → Environment Variables:

```bash
# Database - Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://hrms_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/hrms_db?retryWrites=true&w=majority

# Security - Use generated secrets from generate-secrets.js
NEXTAUTH_SECRET=your-generated-nextauth-secret
JWT_SECRET=your-generated-jwt-secret

# App URLs - Replace with your actual Vercel URL
NEXTAUTH_URL=https://your-app-name.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# App Configuration
NEXT_PUBLIC_APP_NAME=HRMS System
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
NODE_ENV=production
```

---

## 🔑 **Default Login Credentials**

After deployment, login with:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hrms.com | admin123 |
| HR | hr@hrms.com | hr123 |
| Manager | manager@hrms.com | manager123 |
| Employee | employee@hrms.com | employee123 |

**⚠️ Change these passwords after first login!**

---

## 🚀 **Quick Commands**

```bash
# Generate secure secrets
node generate-secrets.js

# Test build locally before deploying
npm run build

# Push to GitHub
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

---

## 🎉 **That's It!**

Your HRMS system will be live at: **`https://your-app-name.vercel.app`**

**Total deployment time: ~10 minutes** ⏱️
