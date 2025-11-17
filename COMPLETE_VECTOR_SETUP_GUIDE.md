# 🎯 Complete Vector Database Setup for MAYA - Start Here!

## 📖 What This Guide Does

This guide will help you set up a complete vector database system so MAYA can:
- 🔍 **Understand meaning**, not just keywords
- 🧠 **Find relevant information** from your HRMS data
- 💬 **Give accurate answers** based on your actual data
- ⚡ **Search semantically** across all collections

---

## ⏱️ Time Required: 15-20 Minutes

- MongoDB Atlas Setup: 5 minutes
- Install Dependencies: 2 minutes
- Generate Embeddings: 5-10 minutes
- Testing: 3 minutes

---

## 🚀 Quick Start (3 Commands)

```bash
# 1. Install dependencies
npm install openai mongodb @xenova/transformers

# 2. Run setup wizard
node scripts/setup-vector-db.js

# 3. Test it!
npm run dev
```

---

## 📋 Detailed Step-by-Step Guide

### Step 1: Install Dependencies (2 minutes)

```bash
cd Talio
npm install openai mongodb @xenova/transformers
```

**What this installs:**
- `openai` - For generating embeddings (or skip if using FREE)
- `mongodb` - Database driver
- `@xenova/transformers` - For FREE embeddings

---

### Step 2: Set Up Environment Variables (1 minute)

Create or edit `.env.local`:

```env
# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=hrms_db

# OpenAI (optional - only if using OpenAI embeddings)
OPENAI_API_KEY=sk-your-api-key-here
```

**Get your MongoDB URI:**
1. Go to MongoDB Atlas
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your actual password

---

### Step 3: Create Vector Indexes in MongoDB Atlas (5 minutes)

**You're already on this screen!** Follow these exact steps:

#### 3.1 First Index (announcements)

1. **Index Name:** `vector_index`
2. **Database:** `hrms_db`
3. **Collection:** `announcements`
4. **Index Definition:** Click "JSON Editor" and paste:

**For OpenAI Embeddings (Recommended):**
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

**For FREE Embeddings (Budget-Friendly):**
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
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

5. Click **"Create Search Index"**
6. Wait 2-3 minutes for "Active" status

#### 3.2 Repeat for Other Collections

Create the SAME index for:
- ✅ `announcements` (done!)
- ⬜ `employees`
- ⬜ `assets`
- ⬜ `companymeetings`
- ⬜ `dailygoals`
- ⬜ `departments`

**Pro Tip:** You can copy-paste the same JSON for each collection!

---

### Step 4: Generate Embeddings (5-10 minutes)

Choose ONE option:

#### Option A: OpenAI Embeddings (Best Quality)

```bash
node scripts/generate-embeddings-openai.js
```

**Cost:** ~$0.02 per 10,000 documents (very cheap!)

#### Option B: FREE Embeddings (No Cost)

```bash
node scripts/generate-embeddings-free.js
```

**Cost:** $0 (runs on your computer)

**What this does:**
- Reads all your HRMS data
- Converts text to vector embeddings
- Stores embeddings in MongoDB
- Shows progress for each collection

**Expected Output:**
```
🚀 Starting embedding generation...
✅ Connected to MongoDB

📊 Processing collection: announcements
Found 50 documents
✅ Processed 1/50: 507f1f77bcf86cd799439011
✅ Processed 2/50: 507f1f77bcf86cd799439012
...
✅ Collection announcements complete:
   - Processed: 50
   - Errors: 0

🎉 All collections processed successfully!
```

---

### Step 5: Test the Setup (3 minutes)

#### 5.1 Start Your App

```bash
npm run dev
```

#### 5.2 Test Vector Search API

Open a new terminal and run:

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "company events and celebrations",
    "type": "announcements",
    "limit": 5
  }'
```

**Expected Response:**
```json
{
  "query": "company events and celebrations",
  "type": "announcements",
  "count": 5,
  "results": [
    {
      "id": "...",
      "collection": "announcements",
      "score": 0.89,
      "data": {
        "title": "Annual Company Picnic",
        "description": "Join us for fun and games...",
        ...
      }
    },
    ...
  ]
}
```

#### 5.3 Test MAYA Chat with Context

```bash
curl -X POST http://localhost:3000/api/maya/chat-with-context \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What company events are coming up?",
    "useVectorContext": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Based on the company announcements, here are the upcoming events: ..."
}
```

---

## ✅ Verification Checklist

Before considering setup complete, verify:

- [ ] All dependencies installed (`npm install` completed)
- [ ] `.env.local` has MongoDB URI and DB name
- [ ] Vector indexes created in MongoDB Atlas (status: "Active")
- [ ] Embedding script ran successfully (no errors)
- [ ] Documents in MongoDB have `embedding` field
- [ ] Vector search API returns results
- [ ] MAYA chat with context works

---

## 🎯 How MAYA Uses Vector Search

### Before Vector Search:
```
User: "Find React developers"
MAYA: Searches for exact keyword "React"
Result: Only finds documents with exact word "React"
```

### After Vector Search:
```
User: "Find React developers"
MAYA: Understands semantic meaning
Result: Finds:
  ✅ "Frontend engineers with React.js"
  ✅ "UI developers skilled in React"
  ✅ "JavaScript developers (React focus)"
  ✅ "Software engineers - React Native"
```

---

## 📊 Architecture Overview

```
User Question
    ↓
MAYA receives query
    ↓
Generate query embedding (1536-dim vector)
    ↓
MongoDB Atlas Vector Search
    ↓
Find similar embeddings (cosine similarity)
    ↓
Return top 5 most relevant results
    ↓
MAYA uses results as context
    ↓
Generate accurate response
    ↓
User gets answer based on real data!
```

---

## 🔧 Troubleshooting

### Issue: "Index not found"
**Solution:** Wait 2-3 minutes for index to build. Check status in Atlas.

### Issue: "No results returned"
**Solution:** Make sure embedding script completed. Check if documents have `embedding` field.

### Issue: "OpenAI API error"
**Solution:** Check your API key in `.env.local`. Verify you have credits.

### Issue: "Connection refused"
**Solution:** Check MongoDB URI. Make sure IP is whitelisted in Atlas.

---

## 📚 Additional Resources

- `MONGODB_ATLAS_VECTOR_SETUP.md` - Detailed MongoDB setup
- `VECTOR_DB_QUICK_START.md` - 5-minute quick start
- `EMBEDDINGS_COMPARISON.md` - OpenAI vs FREE comparison
- `scripts/generate-embeddings-openai.js` - OpenAI embedding script
- `scripts/generate-embeddings-free.js` - FREE embedding script

---

## 🎉 You're Done!

Once all steps are complete, MAYA will automatically use vector search to provide accurate, context-aware responses!

**Next Steps:**
1. ✅ Test with different queries
2. ✅ Monitor search quality
3. ✅ Add more collections as needed
4. ✅ Enjoy MAYA's smart responses!

---

**Questions? Check the troubleshooting section or review the detailed guides!** 🚀

