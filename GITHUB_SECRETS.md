# 🔐 GitHub Secrets Setup for CI/CD

## 📋 **Required GitHub Secrets**

Go to **GitHub** → **Your Repository** → **Settings** → **Secrets and variables** → **Actions**

Click **"New repository secret"** and add these **7 secrets**:

### **1. Vercel Token**
```
Name: VERCEL_TOKEN
Value: [Get from https://vercel.com/account/tokens]
```

### **2. Vercel Organization ID**
```
Name: VERCEL_ORG_ID
Value: [Get from .vercel/project.json after running 'vercel link']
```

### **3. Vercel Project ID**
```
Name: VERCEL_PROJECT_ID
Value: [Get from .vercel/project.json after running 'vercel link']
```

### **4. MongoDB URI**
```
Name: MONGODB_URI
Value: mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?retryWrites=true&w=majority
```

### **5. NextAuth Secret**
```
Name: NEXTAUTH_SECRET
Value: wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=
```

### **6. JWT Secret**
```
Name: JWT_SECRET
Value: 1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=
```

---

## 🚀 **Quick Setup Commands**

Run these commands to get Vercel IDs:

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Get your IDs
cat .vercel/project.json
```

The output will show:
```json
{
  "orgId": "your-org-id-here",
  "projectId": "your-project-id-here"
}
```

---

## ✅ **After Setup**

Once you add all secrets:
1. **Push code** → Pipeline runs automatically
2. **Create PR** → Gets preview deployment
3. **Merge to main** → Deploys to production

**Your CI/CD pipeline will be fully automated!** 🎉
