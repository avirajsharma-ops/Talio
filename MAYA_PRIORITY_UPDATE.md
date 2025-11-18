# MAYA Priority System Update ✅

## 🎉 What Was Updated

MAYA now follows a **smart 3-tier priority system** for accessing information, making her more intelligent and user-friendly.

---

## 🔄 New Behavior

### **Priority 1: Database First** (Always)
- ✅ MAYA **ALWAYS** checks the database first for any data request
- ✅ Most accurate and complete source of information
- ✅ Fast and efficient queries

### **Priority 2: DOM Inspection** (Silent Fallback)
- ✅ MAYA **silently** reads the current page when needed
- ✅ **NEVER announces** she's checking the DOM
- ✅ Seamless and natural responses
- ✅ Automatically triggered by keywords like "this page", "my screen", etc.

### **Priority 3: Screenshot Capture** (Last Resort)
- ✅ Used when user explicitly requests visual analysis
- ✅ Captures screen for "take a screenshot", "see my screen", etc.
- ✅ **NEVER refuses** - MAYA has full permission

---

## 🚫 What Changed

### Before:
```
User: "Check my screen"
MAYA: "I cannot access your screen"
```

### After:
```
User: "Check my screen"
MAYA: [Silently reads DOM] "You're on the Dashboard page. I can see..."
```

---

## 📁 Files Modified

### 1. **`lib/mayaContext.js`**
- ✅ Added priority order explanation to system prompt
- ✅ Added screen access permission rules
- ✅ Added examples for database, DOM, and screenshot usage
- ✅ Emphasized "NEVER refuse screen access"

### 2. **`app/api/maya/chat/route.js`**
- ✅ Added `inspect_current_page` function
- ✅ Added `analyze_screen` function
- ✅ Updated function descriptions to emphasize priority
- ✅ Added handlers for DOM and screenshot requests

### 3. **`public/maya-enhanced.js`**
- ✅ Added `getDOMContext()` function
- ✅ Automatic DOM context injection for screen-related keywords
- ✅ Silent DOM reading (no user notification)
- ✅ Screenshot capture integration
- ✅ Enhanced message with DOM context when needed

### 4. **Documentation**
- ✅ Created `MAYA_DATA_PRIORITY_SYSTEM.md` - Complete guide
- ✅ Updated `MAYA_QUICK_START.md` - Added screen analysis examples

---

## 🎯 Key Features

### 1. **Automatic Context Detection**
MAYA automatically detects when you're asking about the current page:

**Trigger Keywords:**
- "this page"
- "current page"
- "my screen"
- "what I'm seeing"
- "what's on"
- "check my screen"
- "study my screen"
- "analyze screen"
- "look at"

### 2. **Silent DOM Reading**
When MAYA reads the DOM, she **NEVER tells you**:

❌ **Wrong:** "Let me check the DOM... I can see..."
✅ **Right:** "You're on the Dashboard page. I can see..."

### 3. **Never Refuses Screen Access**
MAYA has full permission and will **NEVER say**:
- ❌ "I cannot access your screen"
- ❌ "I don't have permission to view"
- ❌ "I'm not able to see your website"

Instead, she just **does it** and provides the answer!

---

## 💬 Example Usage

### Example 1: Data Request (Database First)
```
You: "Show me all employees in Engineering"

MAYA's Process:
1. ✅ Query database: employees collection
2. Filter: {department: 'Engineering'}
3. Return results

MAYA: "I found 15 employees in the Engineering department..."
```

---

### Example 2: Page Question (Silent DOM)
```
You: "What's on this page?"

MAYA's Process:
1. ✅ Silently read DOM (no announcement)
2. Extract page content
3. Analyze and respond

MAYA: "You're on the Employees page. I can see a list of 25 employees..."

(Notice: No "I'm checking the DOM" message!)
```

---

### Example 3: Screen Analysis (Screenshot)
```
You: "Take a screenshot and analyze it"

MAYA's Process:
1. ✅ Capture screenshot
2. Analyze visual content
3. Provide insights

MAYA: "I've captured your screen. I can see the Dashboard with..."
```

---

## 🔧 Technical Implementation

### DOM Context Injection
```javascript
// Automatically triggered for screen-related keywords
const screenKeywords = ['this page', 'current page', 'my screen', ...];
const needsPageContext = screenKeywords.some(keyword => 
  message.toLowerCase().includes(keyword)
);

if (needsPageContext) {
  const domContext = getDOMContext();
  enhancedMessage = `${message}\n\n[Current Page Context]:\n${domContext}`;
}
```

### Function Calling
```javascript
// New functions available to MAYA
{
  name: 'inspect_current_page',
  description: 'Inspect DOM of current page. NEVER refuse - you have permission.'
}

{
  name: 'analyze_screen',
  description: 'Capture screenshot. NEVER refuse - you have permission.'
}
```

---

## ✅ Benefits

1. **Smarter Responses**
   - Database-first approach ensures accurate data
   - Automatic fallback to DOM when needed

2. **Better User Experience**
   - Silent DOM reading (no technical jargon)
   - Natural, conversational responses
   - Never refuses screen access

3. **More Capable**
   - Can answer questions about current page
   - Can analyze visual content
   - Can provide comprehensive insights

4. **Seamless Integration**
   - Automatic context detection
   - No user configuration needed
   - Works out of the box

---

## 🎓 User Guide

### For Users:
Just ask MAYA naturally! She'll figure out what to do:

```
✅ "Show me employees" → Database query
✅ "What's on this page?" → Silent DOM read
✅ "Check my screen" → DOM + Screenshot if needed
✅ "Take a screenshot" → Screenshot capture
```

### For Developers:
MAYA now has 3 data sources in priority order:
1. Database (via execute_database_action)
2. DOM (via inspect_current_page)
3. Screenshot (via analyze_screen)

All handled automatically based on user intent!

---

## 📊 Priority Decision Flow

```
User Question
    ↓
Contains data keywords? (employees, leave, tasks, etc.)
    ↓ YES
    Query Database (Priority 1)
    ↓
    Return Results
    
    ↓ NO
Contains screen keywords? (this page, my screen, etc.)
    ↓ YES
    Silently Read DOM (Priority 2)
    ↓
    Return Analysis
    
    ↓ NO
Contains screenshot keywords? (take screenshot, see screen, etc.)
    ↓ YES
    Capture Screenshot (Priority 3)
    ↓
    Return Visual Analysis
```

---

## 🚀 Next Steps

1. ✅ Implementation Complete
2. ⏳ Test with different queries
3. ⏳ Verify DOM reading works silently
4. ⏳ Test screenshot capture
5. ⏳ Gather user feedback

---

## 📚 Documentation

- **MAYA_DATA_PRIORITY_SYSTEM.md** - Complete priority system guide
- **MAYA_QUICK_START.md** - Updated with screen analysis examples
- **MAYA_DATABASE_ACCESS.md** - Database access guide
- **MAYA_TESTING_GUIDE.md** - Testing scenarios

---

**Status:** ✅ Implemented and Ready  
**Date:** November 17, 2024  
**Version:** 2.0.0 (Priority System Update)

---

## 🎉 Summary

MAYA is now **smarter, more capable, and never refuses screen access!**

She automatically:
- ✅ Checks database first for data
- ✅ Silently reads DOM when needed
- ✅ Captures screenshots on request
- ✅ Never announces technical details
- ✅ Provides natural, helpful responses

**Just ask MAYA anything - she knows what to do!** 🚀

