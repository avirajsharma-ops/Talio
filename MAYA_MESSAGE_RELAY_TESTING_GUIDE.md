# MAYA Message Relay & Screen Monitoring - Testing Guide

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Ensure MongoDB is running and connected**

3. **Have at least 2 user accounts:**
   - GOD Admin: `avi2001raj@gmail.com` / `Mansiavi@2001`
   - Regular User: Any employee account

---

## Test 1: Message Relay - Basic Flow

### Setup:
- Open 2 browser windows/tabs
- Window 1: Login as GOD Admin (`avi2001raj@gmail.com`)
- Window 2: Login as a regular employee

### Test Steps:

**In Window 1 (GOD Admin):**
1. Activate MAYA (say "Hey Maya" or click the blob)
2. Say: "Tell [employee name] about the team meeting at 3pm"
3. Wait for MAYA's confirmation

**Expected Result:**
- MAYA should respond: "Message sent to [employee name]"

**In Window 2 (Employee):**
1. Watch for MAYA to activate automatically
2. MAYA should appear on screen
3. MAYA should speak: "Message from [GOD Admin name]: Team meeting at 3pm"

**Verification:**
- ✅ Message delivered in real-time
- ✅ MAYA activated on recipient's screen
- ✅ MAYA spoke the message aloud
- ✅ Recipient heard the full message

---

## Test 2: Message Relay - Multiple Recipients

### Test Steps:

**As GOD Admin:**
1. Activate MAYA
2. Say: "Send a message to John and Sarah: Please submit your reports by EOD"

**Expected Result:**
- MAYA confirms: "Message sent to 2 recipients"
- Both John and Sarah receive the message
- MAYA activates on both screens
- Both hear the message

**Verification:**
- ✅ Multiple recipients supported
- ✅ All recipients receive message
- ✅ Real-time delivery to all

---

## Test 3: Message Relay - Priority Levels

### Test Steps:

**As GOD Admin:**
1. Say: "Send an urgent message to HR: Emergency meeting in 5 minutes"

**Expected Result:**
- MAYA sends with "urgent" priority
- Message delivered immediately
- MAYA activates with urgency

**Verification:**
- ✅ Priority level set correctly
- ✅ Urgent messages delivered immediately

---

## Test 4: Message Relay - Hierarchy Check

### Test Steps:

**As Regular Employee:**
1. Login as employee
2. Try to send message to a manager or admin
3. Say: "Tell the CEO about my idea"

**Expected Result:**
- If employee has access: Message sent
- If employee doesn't have access: MAYA says "You don't have permission to message this user"

**Verification:**
- ✅ Hierarchy rules enforced
- ✅ Unauthorized messages blocked
- ✅ Clear error message

---

## Test 5: Screen Monitoring - GOD Admin

### Setup:
- Window 1: GOD Admin logged in
- Window 2: Regular employee working on something

### Test Steps:

**In Window 1 (GOD Admin):**
1. Activate MAYA
2. Say: "What is [employee name] doing right now?"
3. Wait for MAYA's response

**Expected Result:**
- MAYA responds: "Capturing screen for [employee name]..."
- After a few seconds: "John is working on the attendance dashboard and appears to be reviewing employee check-in records"

**In Window 2 (Employee):**
- Screenshot captured automatically (user doesn't see anything)
- No interruption to work

**Verification:**
- ✅ Screenshot captured automatically
- ✅ AI analysis provided
- ✅ Accurate summary of activity
- ✅ No user interruption

---

## Test 6: Screen Monitoring - Hierarchy Check

### Test Steps:

**As Regular Employee:**
1. Login as employee
2. Try to monitor another employee
3. Say: "What is John doing?"

**Expected Result:**
- MAYA responds: "You are not authorized to monitor this user"
- No screenshot captured
- Request denied

**Verification:**
- ✅ Hierarchy rules enforced
- ✅ Unauthorized monitoring blocked
- ✅ Clear error message

---

## Test 7: Screen Monitoring - Manager to Team

### Test Steps:

**As Manager:**
1. Login as manager
2. Say: "Check on my team member [name]"

**Expected Result:**
- If team member reports to this manager: Screenshot captured and analyzed
- If not: Permission denied

**Verification:**
- ✅ Manager can monitor their team
- ✅ Cannot monitor outside team
- ✅ Hierarchy respected

---

## Test 8: Combined - Message + Monitor

### Test Steps:

**As GOD Admin:**
1. Say: "What is John doing?"
2. Wait for response
3. Say: "Tell John to focus on the urgent task"

**Expected Result:**
- First: Screen monitoring shows John's activity
- Then: Message sent to John
- John receives message on his screen

**Verification:**
- ✅ Both features work together
- ✅ Sequential operations successful
- ✅ No conflicts

---

## Test 9: Database Verification

### Check MayaMessage Collection:

```javascript
// In MongoDB or via API
db.mayamessages.find().sort({createdAt: -1}).limit(10)
```

**Expected Fields:**
- sender, senderName, senderRole
- recipients array with status
- message content
- shouldSpeak, shouldActivate
- priority level
- timestamps

### Check ScreenMonitor Collection:

```javascript
db.screenmonitors.find().sort({createdAt: -1}).limit(10)
```

**Expected Fields:**
- requestedBy, targetUser
- screenshot (base64 data)
- summary (AI analysis)
- isAuthorized
- status
- expiresAt (7 days from creation)

---

## Test 10: Socket.IO Events

### Monitor Socket Events:

**In Browser Console:**
```javascript
// Listen for MAYA events
window.socket.on('maya:new-message', (data) => {
  console.log('New message:', data);
});

window.socket.on('maya:screen-capture-request', (data) => {
  console.log('Screen capture request:', data);
});

window.socket.on('maya:screen-analysis-complete', (data) => {
  console.log('Analysis complete:', data);
});
```

**Expected Events:**
- `maya:new-message` when message sent
- `maya:screen-capture-request` when monitoring requested
- `maya:screenshot-captured` when screenshot taken
- `maya:screen-analysis-complete` when analysis done

---

## Common Issues & Solutions

### Issue 1: MAYA doesn't activate on recipient's screen
**Solution:**
- Check Socket.IO connection
- Verify `maya-enhanced.js` is loaded
- Check browser console for errors

### Issue 2: Screenshot not captured
**Solution:**
- Check browser permissions
- Verify html2canvas library loaded
- Check console for errors

### Issue 3: Message not delivered
**Solution:**
- Check MongoDB connection
- Verify Socket.IO server running
- Check API endpoint `/api/maya/relay-message`

### Issue 4: Authorization errors
**Solution:**
- Verify user roles in database
- Check hierarchy levels
- Ensure GOD admin role is set correctly

---

## Success Criteria

✅ **Message Relay:**
- Messages delivered in real-time
- MAYA activates on recipient's screen
- MAYA speaks messages aloud
- Multiple recipients supported
- Hierarchy rules enforced

✅ **Screen Monitoring:**
- Screenshots captured automatically
- AI analysis accurate
- Hierarchy rules enforced
- GOD admin can monitor anyone
- Privacy compliance (7-day expiry)

✅ **Integration:**
- Both features work with existing MAYA
- No conflicts with other features
- Socket.IO events working
- Database records created correctly

---

## Next Steps After Testing

1. **If all tests pass:**
   - Mark testing task as complete
   - Deploy to production
   - Monitor logs for issues

2. **If issues found:**
   - Document the issue
   - Check relevant code
   - Fix and re-test

3. **Production Monitoring:**
   - Monitor Socket.IO connections
   - Check message delivery rates
   - Review monitoring logs
   - Ensure compliance with privacy policies

---

**Status:** Ready for Testing  
**Date:** November 17, 2024  
**Version:** 7.0.0

