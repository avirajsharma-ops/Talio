# MAYA Godmother - Quick Start Guide 🚀

## 🎯 What You Need to Know

MAYA is now the **Godmother** of your HRMS database! She can:
- ✅ Read, create, update, and delete data from all collections
- ✅ Navigate between HRMS pages
- ✅ Perform actions based on your role and permissions
- ✅ Understand natural language commands

---

## ⚡ Quick Setup (5 Minutes)

### Step 1: Verify Environment Variables
Make sure these are in your `.env` file:

```env
# OpenAI (Required for MAYA)
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key
NEXT_PUBLIC_OPENAI_MODEL=gpt-4o
NEXT_PUBLIC_OPENAI_API_URL=https://api.openai.com/v1/chat/completions

# ElevenLabs (Optional - for voice)
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-elevenlabs-api-key
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=your-voice-id
NEXT_PUBLIC_ELEVENLABS_API_URL=https://api.elevenlabs.io/v1/text-to-speech/

# Tavily (Optional - for web search)
NEXT_PUBLIC_TAVILY_API_KEY=your-tavily-api-key

# MongoDB
MONGODB_URI=your-mongodb-connection-string
MONGODB_DB_NAME=hrms_db

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
```

### Step 2: Install Dependencies (if not already done)
```bash
cd Talio
npm install
```

### Step 3: Start the Application
```bash
npm run dev
```

### Step 4: Login
- Open `http://localhost:3000`
- Login with any user account (Admin, HR, Manager, or Employee)

### Step 5: Click on MAYA
- Look for the animated blob in the bottom-right corner
- Click it to open MAYA's interface

---

## 💬 Try These Commands

### 🎯 MAYA's Smart Data Access
MAYA automatically prioritizes data sources:
1. **Database First** - Always checks database for data
2. **DOM Inspection** - Silently reads current page (you won't even notice!)
3. **Screenshot** - Captures screen when you ask

**You don't need to specify - MAYA knows what to do!**

### For Admins:
```
"Show me all employees"
"Create a new announcement about the holiday party"
"Update employee status to inactive for John Doe"
"Take me to the payroll page"
"Show me all pending leave requests"
"What's on this page?" (MAYA will silently check DOM)
"Check my screen" (MAYA will analyze current page)
```

### For HR:
```
"Show me all employees in the Engineering department"
"Approve the leave request for Jane Smith"
"Create a new leave type called Sick Leave"
"Take me to the recruitment page"
"Show me attendance for this week"
```

### For Managers:
```
"Show me my team members"
"Create a task for Sarah to complete the report by Friday"
"Approve leave for my team member John"
"Take me to the tasks page"
"Show me my team's attendance"
```

### For Employees:
```
"Show me my profile"
"Apply for leave from December 20 to December 25"
"Submit an expense claim for $50 for office supplies"
"Show me my tasks"
"Take me to the announcements page"
"What's on this page?" (MAYA analyzes current page)
"Check my screen" (MAYA reads DOM silently)
```

### 📸 Screen & Page Analysis:
```
"What's on this page?" - MAYA silently reads DOM and tells you
"Check my screen" - MAYA analyzes current page content
"Study this page" - MAYA provides insights about current page
"Take a screenshot" - MAYA captures and analyzes your screen
"See my screen" - MAYA captures screenshot for visual analysis
```

**Note:** MAYA NEVER refuses screen access - she has full permission!

---

## 🔐 Permission Levels

| Role | Read | Create | Update | Delete |
|------|------|--------|--------|--------|
| **Admin** | Everything | Everything | Everything | Everything |
| **HR** | Most collections | HR-related | HR-related | Limited |
| **Dept Head** | Department data | Tasks, Reviews | Department data | None |
| **Manager** | Team data | Tasks | Team data | None |
| **Employee** | Own data | Leave, Expenses | Own tasks | None |

---

## 🎨 MAYA Interface

### Main Features:
- **Blob Animation** - Organic, animated blob that responds to voice
- **Chat Interface** - Type or speak your commands
- **Voice Input** - Say "Hey Maya" to activate voice mode
- **PIP Mode** - Picture-in-Picture window for multitasking
- **Navigation** - MAYA can switch pages for you

### Controls:
- **Click Blob** - Open/close MAYA
- **Microphone Icon** - Enable voice input
- **Keyboard Icon** - Switch to text input
- **PIP Icon** - Open in Picture-in-Picture mode
- **Close Icon** - Minimize MAYA

---

## 🐛 Troubleshooting

### MAYA doesn't respond
1. Check browser console for errors
2. Verify OpenAI API key is set
3. Make sure you're logged in
4. Check network tab for failed API calls

### "Authentication required" error
- Make sure you're logged in
- Check if token exists in localStorage
- Try logging out and back in

### "Permission denied" error
- This is normal! Your role doesn't have permission for that action
- Contact your admin if you need access

### Navigation doesn't work
- Verify the page exists
- Check if your role has access to that page
- Look for JavaScript errors in console

### Database action fails
- Check MongoDB connection
- Verify collection name is correct
- Check data format matches schema

---

## 📚 Documentation

For more details, see:
- **MAYA_DATABASE_ACCESS.md** - Complete user guide
- **MAYA_TESTING_GUIDE.md** - Testing scenarios
- **MAYA_GODMOTHER_IMPLEMENTATION.md** - Technical details

---

## 🎓 Tips for Best Results

1. **Be Specific** - "Show me active employees in Engineering" is better than "Show employees"
2. **Use Natural Language** - MAYA understands conversational commands
3. **Confirm Deletions** - MAYA will ask before deleting anything
4. **Check Results** - Always verify MAYA's actions
5. **Ask for Help** - MAYA can explain what she can do

---

## 🚀 Advanced Usage

### Direct JavaScript API
```javascript
// Execute database action
await mayaExecuteAction('read', 'employees', {status: 'active'});

// Navigate to page
await mayaNavigate('/dashboard/attendance');

// Get available pages
await mayaGetAvailablePages();
```

### Custom Queries
```
"Show me employees who joined in the last 30 days"
"Find all tasks that are overdue"
"Get leave requests pending for more than 3 days"
```

---

## ⚠️ Important Reminders

1. **Backup Data** before testing delete operations
2. **Monitor Activity Logs** - All actions are logged
3. **Respect Permissions** - Don't try to bypass role restrictions
4. **Report Issues** - If something doesn't work, report it
5. **Train Your Team** - Make sure everyone knows how to use MAYA

---

## 🎉 You're Ready!

MAYA is now ready to help you manage your HRMS! Start with simple commands and explore her capabilities.

**Need Help?** Just ask MAYA: "What can you do?"

---

**Last Updated:** November 17, 2024  
**Version:** 1.0.0  
**Status:** ✅ Ready to Use

