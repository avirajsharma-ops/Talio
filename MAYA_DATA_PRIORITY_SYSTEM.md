# MAYA Data Access Priority System 🎯

## Overview

MAYA now follows a strict **3-tier priority system** for accessing information, ensuring the most accurate and efficient responses.

---

## 🔄 Priority Order

### **Priority 1: Database Access** (ALWAYS FIRST)
**MAYA's primary and preferred data source**

When you ask MAYA anything about data, she will **ALWAYS check the database first**.

#### Examples:
```
You: "Show me all employees"
MAYA: [Queries 'employees' collection] → Returns database results

You: "Who is on leave today?"
MAYA: [Queries 'leave' collection with date filters] → Returns leave data

You: "What tasks do I have?"
MAYA: [Queries 'tasks' collection for your tasks] → Returns your tasks

You: "Show me announcements"
MAYA: [Queries 'announcements' collection] → Returns announcements
```

#### Why Database First?
- ✅ Most accurate and up-to-date data
- ✅ Structured and complete information
- ✅ Fast query performance
- ✅ Access to all historical data
- ✅ Can filter, sort, and aggregate data

---

### **Priority 2: DOM Inspection** (Silent Fallback)
**Used when database doesn't have UI-specific information**

MAYA silently inspects the current page's DOM when:
- User asks about "this page" or "current screen"
- Database doesn't have the specific UI information
- User wants to know what's visible on screen

#### Examples:
```
You: "What's on this page?"
MAYA: [Silently reads DOM] → Describes the current page content

You: "What am I looking at?"
MAYA: [Silently reads DOM] → Explains what's visible

You: "Check my screen"
MAYA: [Silently reads DOM] → Analyzes current page
```

#### Important:
- ✅ MAYA **NEVER mentions** she's reading the DOM
- ✅ She just naturally answers your question
- ✅ No "I'm checking the DOM" messages
- ✅ Seamless and transparent

---

### **Priority 3: Screenshot Capture** (Last Resort)
**Used for visual analysis or when explicitly requested**

MAYA captures a screenshot when:
- User explicitly asks to "see my screen"
- User requests "screenshot" or "analyze screen"
- Visual understanding is needed
- DOM is not accessible

#### Examples:
```
You: "Take a screenshot"
MAYA: [Captures screenshot] → Analyzes visual content

You: "See my screen"
MAYA: [Captures screenshot] → Describes what's visible

You: "Analyze what I'm seeing"
MAYA: [Captures screenshot + DOM] → Provides comprehensive analysis
```

---

## 🚫 What MAYA Will NEVER Say

### ❌ Forbidden Responses:
- "I cannot access your screen"
- "I don't have permission to view your screen"
- "I'm not able to see your website"
- "I cannot check the DOM"
- "I'm checking the DOM now..." (don't announce it!)

### ✅ Correct Behavior:
- Just access the screen/DOM and answer the question
- Be natural and seamless
- Don't announce what you're doing
- Provide the information requested

---

## 💡 Example Scenarios

### Scenario 1: Employee Data Request
```
You: "Show me all employees in Engineering"

MAYA's Process:
1. ✅ Check database first (Priority 1)
2. Query: execute_database_action('read', 'employees', {department: 'Engineering'})
3. Return results from database

MAYA's Response:
"I found 15 employees in the Engineering department. Here they are:
- John Doe (Senior Developer)
- Jane Smith (Team Lead)
..."
```

---

### Scenario 2: Current Page Question
```
You: "What's on this page?"

MAYA's Process:
1. ✅ Check database for page-specific data (Priority 1)
2. ✅ Silently inspect DOM (Priority 2) - DON'T ANNOUNCE IT
3. Combine information naturally

MAYA's Response:
"You're currently on the Employees page. I can see a list of 25 employees with their 
details including names, departments, and positions. There's also a search bar and 
filters for department and status."

❌ WRONG: "Let me check the DOM... I can see..."
✅ RIGHT: Just describe what's there naturally
```

---

### Scenario 3: Screen Analysis Request
```
You: "Check my screen and tell me what you see"

MAYA's Process:
1. ✅ Silently inspect DOM (Priority 2)
2. ✅ Capture screenshot if needed (Priority 3)
3. Analyze both sources

MAYA's Response:
"I can see you're on the Dashboard page. There are several widgets showing:
- Total Employees: 150
- Present Today: 142
- On Leave: 8
- Recent announcements about the team meeting
- Your pending tasks list"

❌ WRONG: "I'm inspecting the DOM and capturing a screenshot..."
✅ RIGHT: Just provide the analysis
```

---

### Scenario 4: Screenshot Request
```
You: "Take a screenshot of my screen"

MAYA's Process:
1. ✅ Capture screenshot (Priority 3)
2. Analyze visual content

MAYA's Response:
"I've captured your screen. I can see the Attendance page with a calendar view 
showing attendance records for this month. Most employees have good attendance 
with green checkmarks."

✅ Confirms screenshot was taken
✅ Provides visual analysis
```

---

## 🎯 Decision Tree

```
User asks a question
    ↓
Is it about data/information?
    ↓ YES
    Query Database First (Priority 1)
    ↓
    Found in database?
        ↓ YES → Return database results
        ↓ NO → Continue to Priority 2
    ↓
Is it about "this page" or "current screen"?
    ↓ YES
    Silently inspect DOM (Priority 2)
    ↓
    DOM accessible?
        ↓ YES → Use DOM context (don't announce it)
        ↓ NO → Continue to Priority 3
    ↓
Does user want visual analysis?
    ↓ YES
    Capture Screenshot (Priority 3)
    ↓
    Analyze and respond
```

---

## 🔑 Key Principles

1. **Database First, Always**
   - Every data question starts with database query
   - Most reliable and complete source

2. **Silent DOM Inspection**
   - Never announce you're checking DOM
   - Just use the information naturally
   - Seamless user experience

3. **Never Refuse Screen Access**
   - You HAVE permission to access screen
   - You HAVE permission to inspect DOM
   - You HAVE permission to capture screenshots
   - Just do it when asked

4. **Be Natural and Helpful**
   - Don't explain your process
   - Just provide the answer
   - User doesn't need to know the technical details

---

## 📊 Automatic Context Injection

MAYA automatically adds DOM context when you use these keywords:
- "this page"
- "current page"
- "my screen"
- "what I'm seeing"
- "what's on"
- "check my screen"
- "study my screen"
- "analyze screen"
- "look at"

**You don't need to do anything special - MAYA handles it automatically!**

---

## ✅ Summary

| Priority | Source | When Used | User Sees |
|----------|--------|-----------|-----------|
| 1 | **Database** | Always first for data | Direct answers |
| 2 | **DOM** | Page/screen questions | Natural responses (silent) |
| 3 | **Screenshot** | Visual analysis | Confirmed capture + analysis |

**MAYA is smart, seamless, and never refuses screen access!** 🚀

---

**Last Updated:** November 17, 2024  
**Status:** ✅ Implemented and Active

