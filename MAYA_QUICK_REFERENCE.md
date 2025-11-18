# MAYA Quick Reference Guide 🚀

## 🎯 What MAYA Can Do

### 1. **Click Buttons** (Actually clicks them!)
```
User: "Check me in"
MAYA: [Clicks "Check In" button] → "Done!"
```

### 2. **Fill & Submit Forms**
```
User: "Apply for leave Dec 20-25"
MAYA: [Clicks button, fills form, submits] → "Leave applied!"
```

### 3. **Access All Data** (with role-based filtering)
```
User: "Show me employee salaries"
MAYA: [Queries all salaries, filters by role, shows appropriate data]
```

### 4. **Use Location**
```
User: "Check me in"
MAYA: [Gets location, clicks check-in button] → "Checked in at Office!"
```

### 5. **Read Screen**
```
User: "What's on this page?"
MAYA: [Silently reads DOM] → "You're on the dashboard..."
```

---

## 🔧 UI Interaction Functions

### `find_and_click` (Most Common)
Finds and clicks button by text.

```javascript
interact_with_ui({
  action: 'find_and_click',
  selector: 'Check In'
})
```

### `click_button` (Specific Selector)
Clicks button by CSS selector.

```javascript
interact_with_ui({
  action: 'click_button',
  selector: '#check-in-btn'
})
```

### `fill_form` (Fill Multiple Fields)
Fills form with data.

```javascript
interact_with_ui({
  action: 'fill_form',
  formData: {
    startDate: '2024-12-20',
    endDate: '2024-12-25',
    reason: 'Vacation'
  }
})
```

### `submit_form` (Submit Form)
Submits a form.

```javascript
interact_with_ui({
  action: 'submit_form',
  selector: 'form'
})
```

---

## 📋 Common Use Cases

### Check In
```
User: "Check me in"
MAYA: interact_with_ui({ action: 'find_and_click', selector: 'Check In' })
Result: ✅ Actually checked in
```

### Apply Leave
```
User: "Apply leave Dec 20-25"
MAYA: 
  1. interact_with_ui({ action: 'find_and_click', selector: 'Apply Leave' })
  2. interact_with_ui({ action: 'fill_form', formData: {...} })
  3. interact_with_ui({ action: 'submit_form' })
Result: ✅ Leave application submitted
```

### Submit Expense
```
User: "Submit $50 lunch expense"
MAYA:
  1. interact_with_ui({ action: 'find_and_click', selector: 'Submit Expense' })
  2. interact_with_ui({ action: 'fill_form', formData: {amount: 50, ...} })
  3. interact_with_ui({ action: 'submit_form' })
Result: ✅ Expense submitted
```

### Get Data
```
User: "Show me employees"
MAYA: execute_database_action({ action: 'read', collection: 'employees' })
Result: ✅ Employee list (filtered by role)
```

### Get Location
```
User: "Where am I?"
MAYA: get_user_location()
Result: ✅ Current location
```

---

## ⚠️ Important Rules

### Rule 1: NEVER Fake Actions
```
❌ "I've checked you in!" (without clicking)
✅ [Click button] → "Done! I've checked you in!"
```

### Rule 2: Perform First, Confirm Second
```
❌ Confirm → (maybe) perform
✅ Perform → Confirm
```

### Rule 3: Use UI for Visible Actions
```
❌ API call for check-in (when button is visible)
✅ Click the "Check In" button
```

### Rule 4: Be Honest About Failures
```
❌ "Done!" (when button not found)
✅ "I couldn't find the button. Can you help?"
```

---

## 🎯 Data Access Priority

1. **Database First** - Always check database for data
2. **DOM Second** - Silently read current page if needed
3. **Screenshot Last** - Capture screen as last resort

---

## 🔐 Security Model

- MAYA has FULL READ access to ALL data
- Filters results based on user role when presenting
- Users only see what they're authorized to see
- All actions logged and audited

---

## 📁 Key Files

- `app/api/maya/chat/route.js` - Chat API with function calling
- `public/maya-enhanced.js` - UI interaction system
- `lib/mayaContext.js` - System prompts and instructions
- `lib/mayaPermissions.js` - Permission and filtering logic

---

## 🚀 Quick Test

```bash
# Build the project
npm run build

# Start dev server
npm run dev

# Test MAYA
1. Open dashboard
2. Say: "Check me in"
3. Watch MAYA click the button
4. Verify check-in registered
```

---

## 📚 Full Documentation

- `MAYA_COMPLETE_UPDATE_SUMMARY.md` - Complete feature list
- `MAYA_UI_INTERACTION_SYSTEM.md` - UI interaction details
- `MAYA_FULL_DATABASE_ACCESS.md` - Database access model
- `MAYA_QUICK_REFERENCE.md` - This file

---

**MAYA is ready to use!** 🎉

