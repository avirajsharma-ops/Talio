# ⚡ Vector DB Quick Start - 5 Minutes Setup

Get MAYA's semantic search running in 5 minutes!

---

## 🎯 What You're Setting Up

MAYA will be able to:
- 🔍 **Semantic Search**: "Find employees with React skills" (not just keyword matching)
- 🧠 **Smart Recommendations**: "Show me similar projects to Project X"
- 💬 **Context-Aware Responses**: MAYA understands meaning, not just keywords

---

## ⚡ Quick Setup (5 Steps)

### Step 1: Install Dependencies (1 minute)

```bash
cd Talio
npm install openai mongodb @xenova/transformers
```

### Step 2: Add Environment Variables (30 seconds)

Add to `.env.local`:

```env
MONGODB_URI=mongodb+srv://your-connection-string
MONGODB_DB_NAME=hrms_db
OPENAI_API_KEY=sk-your-openai-api-key
```

### Step 3: Create Vector Index in MongoDB Atlas (2 minutes)

**You're already on this screen!** Here's what to do:

1. **Index Name**: `vector_index`
2. **Database**: `hrms_db`
3. **Collection**: Start with `announcements` (easiest to test)
4. **Index Definition**:

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

5. Click **"Create Search Index"**

**Repeat for these collections:**
- `employees`
- `assets`
- `dailygoals`
- `companymeetings`

### Step 4: Generate Embeddings (1-2 minutes)

**Option A: OpenAI (Best Quality)**

```bash
node scripts/generate-embeddings-openai.js
```

**Option B: FREE (No Cost)**

```bash
node scripts/generate-embeddings-free.js
```

**What this does:**
- Reads your existing data
- Generates vector embeddings
- Stores them back in MongoDB

### Step 5: Test It! (30 seconds)

```bash
# Start your Next.js app
npm run dev

# In another terminal, test the API
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "company announcements about events",
    "type": "announcements",
    "limit": 5
  }'
```

**Expected Response:**

```json
{
  "query": "company announcements about events",
  "type": "announcements",
  "count": 5,
  "results": [
    {
      "id": "...",
      "collection": "announcements",
      "score": 0.89,
      "data": {
        "title": "Annual Company Picnic",
        "description": "Join us for our annual company event...",
        ...
      }
    },
    ...
  ]
}
```

---

## 🎉 You're Done!

MAYA now has semantic search capabilities!

---

## 🧪 Test Examples

### Test 1: Find Employees by Skills

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "frontend developers with React experience",
    "type": "employees"
  }'
```

### Test 2: Search Announcements

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "holiday schedule and time off",
    "type": "announcements"
  }'
```

### Test 3: Multi-Collection Search

```bash
curl -X POST http://localhost:3000/api/maya/vector-search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "project deadlines this month",
    "type": "multi"
  }'
```

---

## 🔧 Troubleshooting

### "Index not found"
- Wait 2-3 minutes for index to build in MongoDB Atlas
- Refresh the Atlas UI to check index status

### "No results"
- Make sure you ran the embedding generation script
- Check if documents have `embedding` field in MongoDB

### "OpenAI API error"
- Verify your `OPENAI_API_KEY` in `.env.local`
- Check your OpenAI account has credits

### "Out of memory"
- Use the FREE embeddings option instead
- Process one collection at a time

---

## 📊 What's Happening Behind the Scenes

### Traditional Search (Keyword Matching)
```
Query: "React developers"
Matches: Documents containing exact words "React" and "developers"
❌ Misses: "Frontend engineers with React.js experience"
```

### Vector Search (Semantic Understanding)
```
Query: "React developers"
Matches: 
  ✅ "Frontend engineers with React.js experience"
  ✅ "UI developers skilled in React and TypeScript"
  ✅ "JavaScript developers specializing in React"
  ✅ "Software engineers with React Native background"
```

**Vector search understands MEANING, not just keywords!**

---

## 💰 Cost Breakdown

### OpenAI Embeddings
- **Model**: `text-embedding-3-small`
- **Cost**: $0.00002 per 1K tokens
- **Example**: 
  - 1,000 documents = ~$0.002 (less than 1 cent)
  - 10,000 documents = ~$0.02 (2 cents)
  - 100,000 documents = ~$0.20 (20 cents)

### FREE Embeddings
- **Model**: `all-MiniLM-L6-v2` (Hugging Face)
- **Cost**: $0 (runs on your machine)
- **Trade-off**: Slightly lower quality, but still very good!

---

## 🚀 Next Steps

1. ✅ **Test the API** - Make sure it's working
2. ✅ **Integrate with MAYA** - Update MAYA's AI to use vector search
3. ✅ **Monitor Performance** - Check search quality and speed
4. ✅ **Optimize** - Fine-tune based on user feedback

---

## 📚 Full Documentation

For detailed information, see:
- `VECTOR_DB_SETUP_GUIDE.md` - Complete setup guide
- `scripts/generate-embeddings-openai.js` - OpenAI embedding script
- `scripts/generate-embeddings-free.js` - FREE embedding script
- `lib/vectorSearch.js` - Vector search library
- `app/api/maya/vector-search/route.js` - API endpoint

---

## 🎯 MongoDB Atlas Index Configuration

**Copy this JSON for your vector index:**

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
    },
    {
      "type": "filter",
      "path": "metadata.date"
    }
  ]
}
```

**For FREE embeddings, change `numDimensions` to `384`**

---

**Questions? Check the full guide or ask MAYA!** 🤖

