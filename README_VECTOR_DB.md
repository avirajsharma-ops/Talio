# 🎯 MAYA Vector Database - Complete System

## 📦 What's Included

I've created a complete, production-ready vector database system for MAYA. Here's everything:

### ✅ Core Files Created

1. **`lib/vectorSearch.js`** - Vector search library
2. **`lib/mayaVectorContext.js`** - Automatic context retrieval for MAYA
3. **`app/api/maya/vector-search/route.js`** - Vector search API endpoint
4. **`app/api/maya/chat-with-context/route.js`** - MAYA chat with automatic context
5. **`scripts/generate-embeddings-openai.js`** - OpenAI embedding generator
6. **`scripts/generate-embeddings-free.js`** - FREE embedding generator
7. **`scripts/setup-vector-db.js`** - Interactive setup wizard

### 📚 Documentation Created

1. **`COMPLETE_VECTOR_SETUP_GUIDE.md`** ← **START HERE!**
2. **`MONGODB_ATLAS_VECTOR_SETUP.md`** - MongoDB Atlas setup guide
3. **`VECTOR_DB_QUICK_START.md`** - 5-minute quick start
4. **`EMBEDDINGS_COMPARISON.md`** - OpenAI vs FREE comparison

---

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
npm install openai mongodb @xenova/transformers
```

### Step 2: MongoDB Atlas Setup

**You're already on the right screen!** Just paste this JSON:

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

**Settings:**
- Index Name: `vector_index`
- Database: `hrms_db`
- Collection: `announcements` (then repeat for others)

### Step 3: Generate Embeddings

```bash
# Option A: OpenAI (best quality, ~$0.02 per 10K docs)
node scripts/generate-embeddings-openai.js

# Option B: FREE (no cost)
node scripts/generate-embeddings-free.js
```

---

## 🎯 How MAYA Uses Vector Search

### Automatic Context Retrieval

When a user asks MAYA a question, the system automatically:

1. **Detects intent** - Is this about employees, announcements, assets, etc.?
2. **Searches vector DB** - Finds semantically similar content
3. **Retrieves top 5 results** - Most relevant information
4. **Builds context** - Formats data for MAYA
5. **Generates response** - MAYA answers with accurate, contextual information

### Example Flow

```
User: "Who are the React developers in Engineering?"
    ↓
MAYA detects: Employee search
    ↓
Vector search: "React developers Engineering"
    ↓
Returns: Top 5 matching employees
    ↓
MAYA responds: "Here are the React developers in Engineering:
  1. John Doe - Senior Frontend Engineer, React/TypeScript
  2. Jane Smith - UI Developer, React Native specialist
  ..."
```

---

## 📊 API Endpoints

### 1. Vector Search API

**Endpoint:** `POST /api/maya/vector-search`

**Request:**
```json
{
  "query": "React developers",
  "type": "employees",
  "filters": { "department": "Engineering" },
  "limit": 10
}
```

**Response:**
```json
{
  "query": "React developers",
  "type": "employees",
  "count": 5,
  "results": [...]
}
```

### 2. MAYA Chat with Context

**Endpoint:** `POST /api/maya/chat-with-context`

**Request:**
```json
{
  "message": "Find React developers in Engineering",
  "useVectorContext": true
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here are the React developers in Engineering: ..."
}
```

---

## 🔍 Search Types

MAYA automatically detects query intent:

| Query Contains | Search Type | Collections Searched |
|----------------|-------------|---------------------|
| employee, staff, developer | `employees` | employees |
| announcement, event, news | `announcements` | announcements |
| asset, equipment, laptop | `assets` | assets |
| meeting, agenda, discussion | `meetings` | companymeetings |
| goal, objective, deadline | `goals` | dailygoals |
| (anything else) | `multi` | all collections |

---

## 💡 Key Features

### 1. Semantic Understanding

**Traditional Search:**
```
Query: "React developers"
Finds: Only exact matches for "React" and "developers"
```

**Vector Search:**
```
Query: "React developers"
Finds:
  ✅ "Frontend engineers with React.js"
  ✅ "UI developers skilled in React"
  ✅ "JavaScript developers (React focus)"
  ✅ "Software engineers - React Native"
```

### 2. Automatic Context

MAYA automatically retrieves relevant context without you having to specify:

```javascript
// You just send the message
{ message: "What events are coming up?" }

// MAYA automatically:
// 1. Searches announcements
// 2. Finds relevant events
// 3. Includes context in response
```

### 3. Filtered Search

Search with filters:

```javascript
{
  query: "developers",
  type: "employees",
  filters: {
    department: "Engineering",
    status: "active"
  }
}
```

---

## 📁 File Structure

```
Talio/
├── lib/
│   ├── mongodb.js                    # MongoDB connection
│   ├── vectorSearch.js               # Vector search functions
│   └── mayaVectorContext.js          # Context builder for MAYA
├── app/api/maya/
│   ├── vector-search/route.js        # Vector search API
│   └── chat-with-context/route.js    # MAYA chat with context
├── scripts/
│   ├── generate-embeddings-openai.js # OpenAI embeddings
│   ├── generate-embeddings-free.js   # FREE embeddings
│   └── setup-vector-db.js            # Setup wizard
└── docs/
    ├── COMPLETE_VECTOR_SETUP_GUIDE.md
    ├── MONGODB_ATLAS_VECTOR_SETUP.md
    ├── VECTOR_DB_QUICK_START.md
    └── EMBEDDINGS_COMPARISON.md
```

---

## 🧪 Testing

### Test Vector Search

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "company events",
    "type": "announcements"
  }'
```

### Test MAYA Chat

```bash
curl -X POST http://localhost:3000/api/maya/chat-with-context \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What company events are coming up?",
    "useVectorContext": true
  }'
```

---

## 💰 Cost Breakdown

### OpenAI Embeddings
- **One-time cost:** ~$0.02 per 10,000 documents
- **Search cost:** $0 (searches are free!)
- **Example:** 50,000 HRMS documents = ~$0.10 total

### FREE Embeddings
- **Cost:** $0
- **Trade-off:** Slightly lower quality (but still very good!)

---

## 🎉 What You Get

After setup, MAYA will:

✅ **Understand meaning**, not just keywords
✅ **Find relevant information** from your HRMS data
✅ **Give accurate answers** based on real data
✅ **Search across all collections** automatically
✅ **Provide context-aware responses**
✅ **Handle complex queries** intelligently

---

## 📖 Next Steps

1. **Read:** `COMPLETE_VECTOR_SETUP_GUIDE.md`
2. **Follow:** MongoDB Atlas setup instructions
3. **Run:** Embedding generation script
4. **Test:** API endpoints
5. **Enjoy:** MAYA's smart responses!

---

## 🆘 Need Help?

- **Setup Issues:** See `MONGODB_ATLAS_VECTOR_SETUP.md`
- **Embedding Questions:** See `EMBEDDINGS_COMPARISON.md`
- **Quick Start:** See `VECTOR_DB_QUICK_START.md`
- **Troubleshooting:** Check the guides for common issues

---

**Ready to get started? Open `COMPLETE_VECTOR_SETUP_GUIDE.md` and follow the steps!** 🚀

