# 🎯 How to Create Vector Search Index in MongoDB Atlas

## ✅ Current Status

Your data is ready:
- ✅ **15 employees** with embeddings (1536 dimensions)
- ✅ **4 departments** with embeddings (1536 dimensions)
- ✅ MongoDB connection working
- ⬜ **Vector indexes NOT created yet** ← You need to do this!

---

## 📋 Step-by-Step Instructions

### Step 1: Open MongoDB Atlas

1. Go to: https://cloud.mongodb.com
2. Log in with your account
3. You should see your organization: **Avinj's Org**
4. Project: **Talio**
5. Cluster: **TalioCluster**

### Step 2: Navigate to Search

1. Click on your cluster **"TalioCluster"**
2. In the left sidebar, look for **"Atlas Search"** or **"Search"**
3. Click on it
4. You'll see a button: **"Create Search Index"**
5. Click **"Create Search Index"**

### Step 3: Choose Index Type

You'll see two options:
- Visual Editor
- **JSON Editor** ← Choose this one!

Click **"JSON Editor"**

### Step 4: Fill in the Form

You'll see a form with these fields:

#### Field 1: Index Name
```
vector_index
```
**Important:** Use exactly this name!

#### Field 2: Database
```
hrms_db
```
(Should already be selected)

#### Field 3: Collection
```
employees
```
(Start with employees - you have 15 documents ready)

#### Field 4: Index Definition

Click in the JSON editor box and **DELETE** any existing JSON, then paste this:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.type"
    },
    {
      "type": "filter",
      "path": "metadata.department"
    }
  ]
}
```

### Step 5: Create the Index

1. Double-check:
   - ✅ Index Name: `vector_index`
   - ✅ Database: `hrms_db`
   - ✅ Collection: `employees`
   - ✅ JSON is pasted correctly

2. Click the **"Create Search Index"** button (usually at the bottom)

3. You'll see a confirmation message

4. **Wait 2-3 minutes** for the index to build

5. Status will show:
   - "Building..." (yellow) → Wait
   - "Active" (green) → ✅ Ready!

### Step 6: Repeat for Other Collections

Now create the **SAME index** for other collections:

#### For `departments` collection:
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `departments` ← Change this
- JSON: Same as above

#### For `announcements` collection:
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `announcements` ← Change this
- JSON: Same as above

#### For `assets` collection:
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `assets` ← Change this
- JSON: Same as above

#### For `companymeetings` collection:
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `companymeetings` ← Change this
- JSON: Same as above

#### For `dailygoals` collection:
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `dailygoals` ← Change this
- JSON: Same as above

---

## ✅ How to Verify Indexes are Created

### Method 1: In MongoDB Atlas UI

1. Go to **Atlas Search** (left sidebar)
2. You should see a list of indexes:

```
Index Name          Collection        Status
vector_index        employees         Active ✅
vector_index        departments       Active ✅
vector_index        announcements     Active ✅
vector_index        assets            Active ✅
vector_index        companymeetings   Active ✅
vector_index        dailygoals        Active ✅
```

### Method 2: Run Test Script

Once all indexes show "Active", run:

```bash
node scripts/test-vector-search.js
```

**Expected Output:**
```
🧪 Testing Vector Search

📋 Test 1: Search for employees

Query: "software developer with React experience"

✅ Found 3 employees:

1. John Doe
   Email: john@example.com
   Designation: Software Engineer
   Department: Engineering
   Search Score: 0.8542

2. Jane Smith
   Email: jane@example.com
   Designation: Frontend Developer
   Department: Engineering
   Search Score: 0.7891

...
```

---

## 🚨 Common Issues

### Issue 1: "No vector embeddings were detected"

**This is NORMAL!** MongoDB Atlas shows this warning when creating the index because it's checking for embeddings. Ignore it and click "Create Search Index" anyway.

Your embeddings ARE there (we verified with the check script).

### Issue 2: Index stuck on "Building"

**Solution:** Wait 5-10 minutes. Large collections take longer. Refresh the page.

### Issue 3: Can't find "Atlas Search" or "Search"

**Solution:** 
- Look for "Search" in the left sidebar
- Or click on your cluster name, then look for tabs at the top
- Or go to: Cluster → Collections → Search Indexes tab

### Issue 4: JSON syntax error

**Solution:** Make sure you copied the ENTIRE JSON including the opening `{` and closing `}`

---

## 📊 What Each Field Means

### Vector Field:
```json
{
  "type": "vector",
  "path": "embedding",
  "numDimensions": 1536,
  "similarity": "cosine"
}
```

- **path**: `embedding` - Where the vector is stored in your documents
- **numDimensions**: `1536` - OpenAI embedding size (must match!)
- **similarity**: `cosine` - How to measure similarity (0-1 scale)

### Filter Fields:
```json
{
  "type": "filter",
  "path": "metadata.department"
}
```

These allow you to filter searches (e.g., "only search Engineering department")

---

## 🎉 After Creating Indexes

Once all indexes are "Active":

### 1. Test Vector Search
```bash
node scripts/test-vector-search.js
```

### 2. Start Your App
```bash
npm run dev
```

### 3. Test MAYA Chat with Context
```bash
curl -X POST http://localhost:3000/api/maya/chat-with-context \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Who are the software developers?",
    "useVectorContext": true
  }'
```

### 4. Use MAYA in Your App

MAYA will now automatically:
- 🔍 Search your HRMS data semantically
- 🧠 Find relevant employees, departments, etc.
- 💬 Give accurate answers based on your data

---

## 📞 Need Help?

If you're stuck:

1. **Check the status:** Go to Atlas Search and verify indexes are "Active"
2. **Run the check script:** `node scripts/check-vector-setup.js`
3. **Check the logs:** Look for error messages in MongoDB Atlas
4. **Verify embeddings:** Go to Collections → employees → View a document → Look for `embedding` field

---

## ✅ Checklist

Before moving on, make sure:

- [ ] Logged into MongoDB Atlas
- [ ] Found "Atlas Search" or "Search" in sidebar
- [ ] Created index for `employees` collection
- [ ] Created index for `departments` collection
- [ ] Created index for `announcements` collection
- [ ] Created index for `assets` collection
- [ ] Created index for `companymeetings` collection
- [ ] Created index for `dailygoals` collection
- [ ] All indexes show "Active" status
- [ ] Ran test script successfully

---

**Once all indexes are "Active", you're done! MAYA will have full vector search capabilities!** 🚀

