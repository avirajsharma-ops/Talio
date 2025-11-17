# 📘 MongoDB Atlas Vector Search Setup - Complete Guide

## Step-by-Step Instructions with Your Current Setup

Based on your screenshot, you're already on the right screen! Let me guide you through the exact steps.

---

## 🎯 What You're Creating

You're creating a **Vector Search Index** that allows MAYA to perform semantic search on your HRMS data.

**Current Status:** You're on the "Create Search Index" screen ✅

---

## 📋 Step 1: Index Configuration

### What to Enter:

#### 1. Index Name
```
vector_index
```
**Important:** Use exactly this name - the code expects `vector_index`

#### 2. Database
```
hrms_db
```
(This should already be selected based on your screenshot)

#### 3. Collection
**Start with:** `announcements`

(We'll create indexes for other collections later)

---

## 📋 Step 2: Index Definition

Click on **"JSON Editor"** tab (if not already selected)

### For OpenAI Embeddings (Recommended):

Copy and paste this EXACT JSON:

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
      "path": "metadata.createdAt"
    }
  ]
}
```

### For FREE Embeddings (Alternative):

If you're using the FREE embedding script, use this instead:

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

---

## 📋 Step 3: Create the Index

1. Click **"Create Search Index"** button
2. Wait 2-3 minutes for the index to build
3. You'll see a success message when it's ready

---

## 📋 Step 4: Repeat for Other Collections

You need to create the SAME index for these collections:

### Collections to Index:

1. ✅ `announcements` (you just did this!)
2. ⬜ `employees`
3. ⬜ `assets`
4. ⬜ `attendances`
5. ⬜ `chats`
6. ⬜ `companymeetings`
7. ⬜ `dailygoals`
8. ⬜ `departments`

### How to Create for Each Collection:

1. Go back to "Search & Vector Search" in MongoDB Atlas
2. Click "Create Search Index"
3. Select the next collection (e.g., `employees`)
4. Use the SAME index definition (copy-paste the JSON)
5. Click "Create Search Index"
6. Repeat for all collections

---

## 🔍 Understanding the Index Definition

### Vector Field:
```json
{
  "type": "vector",
  "path": "embedding",
  "numDimensions": 1536,
  "similarity": "cosine"
}
```

- **path**: `embedding` - This is where vector embeddings are stored
- **numDimensions**: `1536` - OpenAI embeddings size (or `384` for FREE)
- **similarity**: `cosine` - How to measure similarity between vectors

### Filter Fields:
```json
{
  "type": "filter",
  "path": "metadata.department"
}
```

These allow you to filter search results by metadata (e.g., only search Engineering department)

---

## ✅ Verification

### How to Check if Index is Ready:

1. Go to "Search & Vector Search" in MongoDB Atlas
2. You should see your indexes listed
3. Status should be "Active" (green)

### Expected Result:

```
Index Name: vector_index
Collection: announcements
Status: Active ✅
```

---

## 🚨 Common Issues

### Issue 1: "No vector embeddings were detected"

**This is NORMAL!** You'll see this warning because you haven't generated embeddings yet.

**Solution:** Ignore this warning for now. You'll generate embeddings in the next step.

### Issue 2: Index creation fails

**Possible causes:**
- Invalid JSON syntax
- Wrong number of dimensions
- Collection doesn't exist

**Solution:** Double-check the JSON and collection name

### Issue 3: Index stuck on "Building"

**Solution:** Wait 5-10 minutes. Large collections take longer.

---

## 📊 Index Status Meanings

| Status | Meaning | Action |
|--------|---------|--------|
| Building | Index is being created | Wait 2-10 minutes |
| Active | Index is ready to use | ✅ Good to go! |
| Failed | Index creation failed | Check error message |
| Deleting | Index is being removed | Wait for deletion |

---

## 🎯 Next Steps After Creating Indexes

Once you've created indexes for all collections:

1. ✅ Install dependencies
2. ✅ Add environment variables
3. ✅ Run embedding generation script
4. ✅ Test the API

See `VECTOR_DB_QUICK_START.md` for the complete workflow.

---

## 📸 Visual Guide

### Your Current Screen:

You should see:
- ✅ "Create Search Index" title
- ✅ Index Name field
- ✅ Database dropdown (hrms_db selected)
- ✅ Collection dropdown
- ✅ JSON Editor with index definition

### After Creating Index:

You'll see:
- ✅ Success message
- ✅ Index listed in "Search Indexes" tab
- ✅ Status: "Building" → "Active"

---

## 💡 Pro Tips

### Tip 1: Start Small
Create the index for `announcements` first, test it, then create for other collections.

### Tip 2: Use Same Index Name
Always use `vector_index` for consistency across all collections.

### Tip 3: Match Dimensions
Make sure `numDimensions` matches your embedding model:
- OpenAI: `1536`
- FREE: `384`

### Tip 4: Don't Worry About the Warning
The "no embeddings detected" warning is normal before running the embedding script.

---

## 🔄 If You Need to Recreate an Index

1. Go to "Search & Vector Search"
2. Find the index
3. Click "..." menu → "Delete Index"
4. Wait for deletion to complete
5. Create a new index with correct settings

---

## 📞 Need Help?

### Check These:

1. **Index Name:** Must be exactly `vector_index`
2. **Database:** Must be `hrms_db`
3. **Collection:** Must exist in your database
4. **JSON:** Must be valid (no syntax errors)
5. **Dimensions:** Must match your embedding model

### Still Stuck?

Check the MongoDB Atlas documentation or the error message in the Atlas UI.

---

## ✅ Checklist

Before moving to the next step, make sure:

- [ ] Index name is `vector_index`
- [ ] Database is `hrms_db`
- [ ] Collection is selected
- [ ] JSON definition is pasted correctly
- [ ] "Create Search Index" button is clicked
- [ ] Index status shows "Building" or "Active"

---

**Once your first index is "Active", proceed to the embedding generation step!** 🚀

