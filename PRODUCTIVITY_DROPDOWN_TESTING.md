# Testing Guide: Productivity Monitoring Dropdown

## How to Test the New Dropdown Feature

### 1. **Login as Admin**
```
Email: admin@hrms.com
Password: admin123
```

### 2. **Navigate to Productivity Monitoring**
- Go to Dashboard → Productivity → Monitoring Dashboard
- You should see a **purple gradient section** at the top

### 3. **Test Dropdown Display**
Expected UI:
```
┌─────────────────────────────────────────────────────────────┐
│ 👁️ Instant Screenshot Capture                              │
│    Capture screenshots on-demand from employees             │
│                                                              │
│    [Select Employee... ▼]  [Capture Now]                   │
└─────────────────────────────────────────────────────────────┘
```

### 4. **Test Employee List**
Click the dropdown, you should see:
```
Select Employee...
📸 Capture All (X employees)
──────────
John Doe (EMP001) - Senior Developer
Jane Smith (EMP002) - Team Lead
...
```

### 5. **Test Single Employee Capture**
- Select an employee from dropdown
- Click "Capture Now"
- You should see toast: "Requesting instant capture from [Name]..."
- Button should show loading state
- After capture, monitoring data should refresh

### 6. **Test Capture All**
- Select "📸 Capture All (X employees)"
- Click "Capture Now"
- You should see toast: "Initiating capture for X employees..."
- Progress toasts will appear
- Final result: "Capture requested for X employees!"

### 7. **Test Department Head Access**
Login as Department Head:
- Should see only employees from their department
- "Capture All" should show correct department count

### 8. **Test Regular Employee**
Login as Employee:
- Should NOT see the dropdown
- Only monitoring cards visible

### 9. **Test Monitoring Cards**
Verify:
- ❌ No "Instant Capture" button on individual cards
- ✅ Only "Show Details" button visible
- ✅ Cards are cleaner and less cluttered

### 10. **Test Modal**
Click "Show Details" on any card:
- Should open modal with screenshot
- Productivity score, insights, and tips displayed
- No changes to modal functionality

## Expected Behavior Matrix

| User Role | Can See Dropdown | Can Capture | Scope |
|-----------|-----------------|-------------|-------|
| God Admin | ✅ Yes | ✅ All employees | Organization-wide |
| Admin | ✅ Yes | ✅ All employees | Organization-wide |
| Dept Head | ✅ Yes | ✅ Department only | Department-scoped |
| Manager | ❌ No | ❌ | N/A |
| Employee | ❌ No | ❌ | N/A |

## API Calls to Monitor

### Single Capture:
```http
POST /api/productivity/instant-capture
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetUserId": "user_id_here"
}
```

### Fetch Accessible Employees:
```http
GET /api/employees?status=active
Authorization: Bearer <token>

OR (for dept heads)

GET /api/employees?status=active&department=dept_id
Authorization: Bearer <token>
```

## Toast Messages to Verify

✅ Success Messages:
- "Requesting instant capture from John Doe..."
- "Instant capture requested! Waiting for screenshot..."
- "Capture requested for 15 employees!"
- "Screenshot captured and analyzed successfully!"

❌ Error Messages:
- "Please select an employee to capture"
- "No employees available to capture"
- "Failed to request instant capture"
- "Failed to capture 2 employees"

⏳ Loading Messages:
- "Initiating capture for 15 employees..."

## Browser Console Checks

### On Page Load:
```javascript
// Should see these fetch calls
GET /api/employees
GET /api/employees?status=active // or with &department=X
GET /api/productivity/monitor?limit=500
```

### On Single Capture:
```javascript
POST /api/productivity/instant-capture
// After delay
GET /api/productivity/instant-capture?requestId=xxx
```

### On Capture All:
```javascript
// Multiple sequential requests
POST /api/productivity/instant-capture (for employee 1)
POST /api/productivity/instant-capture (for employee 2)
POST /api/productivity/instant-capture (for employee 3)
...
```

## Edge Cases to Test

1. **Empty Employee List**
   - Department head with no employees in department
   - Should show "Select Employee..." with 0 employees

2. **Network Failure**
   - Disconnect network
   - Try to capture
   - Should show error toast

3. **Concurrent Captures**
   - Select employee
   - Click "Capture Now"
   - Immediately try another capture
   - Button should be disabled during first capture

4. **Permission Boundary**
   - Dept Head trying to access another department
   - API should reject with 403

5. **Missing User Data**
   - Employee without userId
   - Should handle gracefully

## Visual Regression Checks

Before vs After comparison:

### Before:
- Monitoring cards had TWO buttons (Instant Capture + Show Details)
- Purple button on every non-own card
- Cluttered appearance

### After:
- Monitoring cards have ONE button (Show Details only)
- Purple dropdown section at top
- Clean, minimal cards

## Performance Metrics

Measure these:
1. **Dropdown Load Time** - Should populate instantly
2. **Single Capture Response** - < 2 seconds
3. **Bulk Capture Time** - Depends on employee count (~1s per employee)
4. **UI Responsiveness** - No lag during capture operations

## Known Limitations

- Bulk capture is sequential (not parallel) to avoid server overload
- No progress bar for individual employee in bulk capture
- 3-second delay before auto-refresh after bulk capture
- Cannot cancel bulk capture once started

## Browser Compatibility

Test in:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

Dropdown select should render consistently across browsers.

---

**Testing Status**: Ready for QA Testing
