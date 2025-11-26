# MAYA Training Database Considerations 🎓

## Current Training Approach

### System Prompt Based (Current Implementation)
MAYA is currently trained using **system prompts** that define her:
- Identity and personality
- Communication style
- Available capabilities
- Priority order for data access
- Permission levels

**Advantages:**
- ✅ Easy to update and maintain
- ✅ No additional infrastructure needed
- ✅ Immediate changes (just edit the prompt)
- ✅ Version controlled with code
- ✅ Works well for most scenarios

**Limitations:**
- ❌ No learning from interactions
- ❌ No personalization per user
- ❌ No historical context beyond conversation
- ❌ Can't improve responses over time

---

## When to Add a Training Database

### Scenarios That Would Benefit:

#### 1. **User-Specific Preferences**
```
Example:
- User A prefers detailed responses
- User B prefers brief summaries
- User C always asks about specific departments

Training DB would store these preferences and adapt responses.
```

#### 2. **Common Q&A Patterns**
```
Example:
- "How do I apply for leave?" → Store best response
- "Where is the payroll page?" → Store navigation path
- "Who is my manager?" → Store relationship data

Training DB would provide instant, consistent answers.
```

#### 3. **Company-Specific Knowledge**
```
Example:
- Company policies
- Department structures
- Custom workflows
- Internal terminology
- Office locations

Training DB would store company-specific context.
```

#### 4. **Historical Context**
```
Example:
- "Show me the same report as last week"
- "Apply leave like I did last month"
- "Check my usual check-in location"

Training DB would remember past interactions.
```

---

## Proposed Training Database Structure

### Option 1: Simple Q&A Database

```javascript
// Collection: maya_training
{
  _id: ObjectId,
  category: 'faq' | 'preference' | 'context' | 'workflow',
  question: String,
  answer: String,
  keywords: [String],
  userRole: String, // Which roles this applies to
  frequency: Number, // How often this is asked
  lastUsed: Date,
  createdAt: Date,
}
```

**Use Case:**
- Store frequently asked questions
- Provide instant answers
- Reduce API calls to OpenAI

---

### Option 2: User Interaction History

```javascript
// Collection: maya_interactions
{
  _id: ObjectId,
  userId: ObjectId,
  userMessage: String,
  mayaResponse: String,
  functionsCalled: [String],
  wasHelpful: Boolean, // User feedback
  context: {
    page: String,
    timestamp: Date,
    location: Object,
  },
  createdAt: Date,
}
```

**Use Case:**
- Learn from successful interactions
- Improve responses over time
- Personalize per user

---

### Option 3: Knowledge Base

```javascript
// Collection: maya_knowledge
{
  _id: ObjectId,
  topic: String,
  content: String,
  relatedTopics: [String],
  applicableRoles: [String],
  examples: [String],
  lastUpdated: Date,
}
```

**Use Case:**
- Store company policies
- Department information
- Custom workflows
- Internal documentation

---

## Recommended Approach

### Phase 1: Current (System Prompts Only) ✅
**Status:** Implemented
- Use system prompts for core behavior
- Function calling for actions
- No additional database needed

**Good For:**
- Initial deployment
- Testing and feedback
- Understanding usage patterns

---

### Phase 2: Add Interaction Logging (Recommended Next)
**Implementation:**
- Log all MAYA interactions to database
- Track which questions are asked most
- Monitor function usage
- Collect user feedback

**Benefits:**
- Understand usage patterns
- Identify common questions
- Find areas for improvement
- No changes to MAYA's behavior yet

**Implementation:**
```javascript
// Add to maya/chat/route.js
async function logInteraction(userId, message, response, functions) {
  await db.collection('maya_interactions').insertOne({
    userId,
    userMessage: message,
    mayaResponse: response,
    functionsCalled: functions,
    timestamp: new Date(),
  });
}
```

---

### Phase 3: Add FAQ Database (If Needed)
**When to Implement:**
- After 1-2 months of usage
- If you see repeated questions
- If response quality needs improvement

**Implementation:**
- Create `maya_training` collection
- Store common Q&A pairs
- Check training DB before calling OpenAI
- Fall back to OpenAI if no match

**Benefits:**
- Faster responses
- Consistent answers
- Reduced API costs
- Better accuracy for common questions

---

### Phase 4: Full Training System (Future)
**When to Implement:**
- After 6+ months of usage
- If you need advanced personalization
- If you want MAYA to learn continuously

**Features:**
- User preference learning
- Context-aware responses
- Historical pattern recognition
- Continuous improvement

---

## Cost-Benefit Analysis

### Current System (System Prompts)
**Cost:** $0 additional infrastructure
**Benefit:** Works well for most scenarios

### With Interaction Logging
**Cost:** Minimal (just database storage)
**Benefit:** Valuable insights, no behavior change

### With FAQ Database
**Cost:** Development time + storage
**Benefit:** Faster responses, reduced API costs

### With Full Training System
**Cost:** Significant development + ML infrastructure
**Benefit:** Advanced personalization, continuous learning

---

## Recommendation

### Start Here (Current):
1. ✅ Use system prompts (already implemented)
2. ✅ Function calling for actions (already implemented)
3. ⏳ Add interaction logging (next step)

### Add Later (If Needed):
4. ⏳ FAQ database for common questions
5. ⏳ User preference storage
6. ⏳ Knowledge base for company info

### Future (Advanced):
7. ⏳ Machine learning for personalization
8. ⏳ Continuous learning system
9. ⏳ Advanced context awareness

---

## Quick Implementation: Interaction Logging

### Step 1: Create Collection
```javascript
// MongoDB collection: maya_interactions
db.createCollection('maya_interactions');
db.maya_interactions.createIndex({ userId: 1, timestamp: -1 });
db.maya_interactions.createIndex({ timestamp: -1 });
```

### Step 2: Add Logging to API
```javascript
// In app/api/maya/chat/route.js
import { connectDB } from '@/lib/mongodb';

async function logInteraction(data) {
  const db = await connectDB();
  await db.collection('maya_interactions').insertOne({
    userId: data.userId,
    userMessage: data.message,
    mayaResponse: data.response,
    functionsCalled: data.functions || [],
    timestamp: new Date(),
    page: data.page,
  });
}
```

### Step 3: Analyze Data
```javascript
// Get most common questions
db.maya_interactions.aggregate([
  { $group: { _id: '$userMessage', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 20 }
]);

// Get most used functions
db.maya_interactions.aggregate([
  { $unwind: '$functionsCalled' },
  { $group: { _id: '$functionsCalled', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

---

## Summary

### Current Status: ✅ Good to Go
- System prompts work well
- No training DB needed immediately
- MAYA is fully functional

### Next Step: 📊 Add Logging
- Log interactions for insights
- Understand usage patterns
- Identify improvement areas

### Future: 🚀 Enhanced Training
- Add FAQ database if needed
- Implement user preferences
- Build knowledge base

**You don't need a separate training DB right now, but adding interaction logging would be valuable for future improvements!**

---

**Recommendation:** Start with current system, add interaction logging after deployment, evaluate need for training DB after 1-2 months of usage.

**Status:** Current system is sufficient ✅  
**Date:** November 17, 2024

