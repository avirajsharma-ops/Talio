# 🚀 Vector Database Setup Guide for MAYA

Complete guide to set up semantic search capabilities for MAYA using MongoDB Atlas Vector Search.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [MongoDB Atlas Vector Search Setup](#mongodb-atlas-vector-search-setup)
3. [Generate Embeddings](#generate-embeddings)
4. [Integrate with MAYA](#integrate-with-maya)
5. [Testing](#testing)
6. [Usage Examples](#usage-examples)

---

## Prerequisites

### 1. MongoDB Atlas Account
- ✅ You already have this (visible in your screenshot)
- ✅ Cluster: `TalioCluster`
- ✅ Database: `hrms_db`

### 2. Install Dependencies

```bash
cd Talio

# For OpenAI embeddings (recommended)
npm install openai

# For FREE embeddings (alternative)
npm install @xenova/transformers

# MongoDB driver (if not already installed)
npm install mongodb
```

### 3. Environment Variables

Add to your `.env.local`:

```env
# MongoDB
MONGODB_URI=your-mongodb-atlas-connection-string
MONGODB_DB_NAME=hrms_db

# OpenAI (for embeddings)
OPENAI_API_KEY=your-openai-api-key
```

---

## MongoDB Atlas Vector Search Setup

### Step 1: Create Vector Search Index

You're already on this screen! Here's what to do:

#### 1.1 Index Configuration

**Index Name:** `vector_index`

**For OpenAI Embeddings (1536 dimensions):**

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
    },
    {
      "type": "filter",
      "path": "metadata.status"
    }
  ]
}
```

**For FREE Embeddings (384 dimensions):**

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

#### 1.2 Collections to Index

Create the `vector_index` on these collections:

- ✅ `employees`
- ✅ `announcements`
- ✅ `assets`
- ✅ `attendances`
- ✅ `companymeetings`
- ✅ `dailygoals`
- ✅ `departments`

**Repeat the index creation for each collection!**

---

## Generate Embeddings

You have two options:

### Option A: OpenAI Embeddings (Recommended)

**Pros:**
- ✅ Best quality
- ✅ 1536 dimensions
- ✅ Better semantic understanding

**Cons:**
- ❌ Costs ~$0.0001 per 1K tokens (~$0.10 for 10K documents)

**Run:**

```bash
node scripts/generate-embeddings-openai.js
```

### Option B: FREE Embeddings (Budget-Friendly)

**Pros:**
- ✅ Completely free
- ✅ Runs locally
- ✅ No API costs

**Cons:**
- ❌ Lower quality than OpenAI
- ❌ 384 dimensions
- ❌ Slower on first run (downloads model)

**Run:**

```bash
node scripts/generate-embeddings-free.js
```

### What the Script Does

1. Connects to your MongoDB database
2. Reads all documents from each collection
3. Creates text representation from specified fields
4. Generates vector embeddings
5. Stores embeddings back in MongoDB with metadata

**Example Output:**

```
🚀 Starting embedding generation...

✅ Connected to MongoDB

📊 Processing collection: employees
Found 150 documents
✅ Processed 1/150: 507f1f77bcf86cd799439011
✅ Processed 2/150: 507f1f77bcf86cd799439012
...
✅ Collection employees complete:
   - Processed: 150
   - Errors: 0

📊 Processing collection: announcements
...

🎉 All collections processed successfully!
```

---

## Integrate with MAYA

### Step 1: Update MAYA Runtime

The vector search API is already created at `/api/maya/vector-search`.

### Step 2: Test the API

```bash
# Test with curl
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Find employees with React skills",
    "type": "employees",
    "limit": 5
  }'
```

### Step 3: Use in MAYA

MAYA can now use semantic search by calling:

```javascript
// In MAYA runtime
async function mayaSemanticSearch(query, type = 'all') {
  const response = await fetch('/api/maya/vector-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: query,
      type: type,
      limit: 10,
    }),
  });
  
  const data = await response.json();
  return data.results;
}
```

---

## Testing

### Test 1: Search Employees

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "software engineers with Python experience",
    "type": "employees",
    "filters": { "department": "Engineering" },
    "limit": 5
  }'
```

### Test 2: Search Announcements

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "company events and celebrations",
    "type": "announcements",
    "limit": 10
  }'
```

### Test 3: Multi-Collection Search

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type": application/json" \
  -d '{
    "query": "project deadlines and goals",
    "type": "multi",
    "collections": ["dailygoals", "companymeetings"],
    "limit": 10
  }'
```

---

## Usage Examples

### Example 1: Find Similar Employees

**User asks MAYA:** "Find employees similar to John Doe"

**MAYA calls:**
```javascript
const results = await mayaSemanticSearch(
  "John Doe software engineer React Node.js",
  "employees"
);
```

### Example 2: Search Company Knowledge

**User asks MAYA:** "What were the key points from last month's meetings?"

**MAYA calls:**
```javascript
const results = await mayaSemanticSearch(
  "key points decisions last month meetings",
  "meetings"
);
```

### Example 3: Find Relevant Assets

**User asks MAYA:** "Find laptops available for assignment"

**MAYA calls:**
```javascript
const results = await mayaSemanticSearch(
  "laptops available unassigned",
  "assets"
);
```

---

## Next Steps

1. ✅ Create vector indexes in MongoDB Atlas (you're doing this now!)
2. ✅ Run embedding generation script
3. ✅ Test the API endpoints
4. ✅ Integrate with MAYA's AI responses
5. ✅ Monitor and optimize

---

## Troubleshooting

### Issue: "Index not found"
- Make sure you created the `vector_index` on each collection
- Wait a few minutes for index to build

### Issue: "No results returned"
- Check if embeddings were generated (look for `embedding` field in documents)
- Verify index dimensions match embedding dimensions (1536 for OpenAI, 384 for free)

### Issue: "Out of memory"
- Process collections one at a time
- Reduce batch size in embedding script

---

## Cost Estimation

### OpenAI Embeddings
- Model: `text-embedding-3-small`
- Cost: $0.00002 per 1K tokens
- Example: 10,000 documents × 100 tokens each = 1M tokens = $0.02

### FREE Embeddings
- Model: `all-MiniLM-L6-v2`
- Cost: $0 (runs locally)
- Trade-off: Slightly lower quality

---

**Ready to get started? Follow the steps above!** 🚀

