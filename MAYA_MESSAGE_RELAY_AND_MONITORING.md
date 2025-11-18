# MAYA Message Relay & Screen Monitoring System ✅

## Summary

MAYA now has **real-time message relay** and **screen monitoring** capabilities! Users can ask MAYA to send messages to other users, and authorized users can monitor what others are doing on their screens.

---

## 🎯 New Features

### 1. **Message Relay System**
MAYA can relay messages from one user to another(s) with real-time delivery and voice activation.

**How it works:**
1. User asks MAYA to send a message (e.g., "Tell John about the meeting")
2. MAYA sends the message through the relay system
3. MAYA **activates on the recipient's screen**
4. MAYA **speaks the message** to the recipient
5. Recipient hears: "Message from [Sender]: [Your message]"

**Features:**
- ✅ Real-time delivery via Socket.IO
- ✅ MAYA activates on recipient's screen
- ✅ MAYA speaks the message aloud
- ✅ Support for multiple recipients
- ✅ Priority levels (low, normal, high, urgent)
- ✅ Hierarchy-based access control
- ✅ Delivery confirmation
- ✅ Message history and tracking

### 2. **Screen Monitoring System**
Authorized users can monitor what other users are doing in real-time.

**How it works:**
1. User asks MAYA "What is John doing?"
2. MAYA checks if user has permission (hierarchy-based)
3. MAYA sends screen capture request to John's session
4. John's browser captures screenshot automatically
5. Screenshot is analyzed by AI
6. MAYA reports back: "John is working on the attendance report in Excel"

**Features:**
- ✅ Real-time screen capture
- ✅ AI-powered activity analysis
- ✅ Hierarchy-based authorization
- ✅ GOD admin can monitor anyone
- ✅ Automatic screenshot capture
- ✅ Privacy-compliant logging
- ✅ Auto-delete after 7 days

---

## 🔐 Authorization & Hierarchy

### Message Relay Authorization:
- **GOD Admin**: Can send messages to ANYONE
- **Admin/HR**: Can send messages to anyone below them
- **Manager**: Can send messages to their team
- **Department Head**: Can send messages to department members
- **Employee**: Can send messages to peers

### Screen Monitoring Authorization:
- **GOD Admin**: Can monitor ANYONE
- **Admin/HR**: Can monitor anyone below them
- **Manager**: Can monitor their team members
- **Department Head**: Can monitor department members
- **Employee**: CANNOT monitor others

**Hierarchy Levels:**
```
god_admin (999) → Can access everyone
admin (5) → Can access hr, manager, employee
hr (4) → Can access manager, employee
department_head (3) → Can access manager, employee
manager (2) → Can access employee
employee (1) → Can access only themselves
```

---

## 📝 Database Models

### 1. **MayaMessage Model**
Stores message relay data:
- Sender information
- Recipients (multiple supported)
- Message content and priority
- Delivery status (pending, delivered, read, spoken)
- MAYA behavior settings (shouldSpeak, shouldActivate)
- Auto-expires after 24 hours

### 2. **ScreenMonitor Model**
Stores screen monitoring logs:
- Requester information
- Target user information
- Screenshot data (base64 or URL)
- AI-generated summary
- Authorization status
- Compliance flags
- Auto-expires after 7 days

---

## 🔌 API Endpoints

### 1. **POST /api/maya/relay-message**
Send a message through MAYA to one or more users.

**Request:**
```json
{
  "recipientEmails": ["john@company.com", "jane@company.com"],
  "message": "Team meeting at 3pm in conference room",
  "priority": "high",
  "shouldSpeak": true,
  "shouldActivate": true
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123",
  "deliveredTo": 2,
  "message": "Message sent successfully"
}
```

### 2. **POST /api/maya/monitor-screen**
Request to monitor a user's screen.

**Request:**
```json
{
  "targetUserEmail": "john@company.com",
  "reason": "Checking work progress"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "req_123",
  "targetUser": "John Doe",
  "status": "pending",
  "message": "Screen monitoring request sent"
}
```

### 3. **POST /api/maya/submit-screenshot**
Submit screenshot for a monitoring request (called automatically by client).

**Request:**
```json
{
  "requestId": "req_123",
  "screenshot": "data:image/png;base64,...",
  "currentPage": {
    "url": "https://app.com/dashboard",
    "title": "Dashboard",
    "path": "/dashboard"
  }
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "req_123",
  "summary": "User is viewing the attendance dashboard and appears to be reviewing employee check-in records."
}
```

---

## 🎤 MAYA Voice Commands

### Message Relay Examples:
```
"MAYA, tell John about the team meeting at 3pm"
"MAYA, inform Sarah that I'll be late"
"MAYA, send a message to the HR team about the policy update"
"MAYA, let Mike know the report is ready"
"MAYA, tell everyone in my team about the deadline"
```

### Screen Monitoring Examples:
```
"MAYA, what is John doing right now?"
"MAYA, check on Sarah's progress"
"MAYA, see what Mike is working on"
"MAYA, is the team at their desks?"
"MAYA, monitor John's screen"
```

---

## 🔧 Technical Implementation

### Socket.IO Events:

**Message Relay:**
- `maya:new-message` - New message received
- `maya:message-delivered` - Message delivered confirmation
- `maya:message-spoken` - Message spoken confirmation

**Screen Monitoring:**
- `maya:screen-capture-request` - Request screenshot from user
- `maya:screenshot-captured` - Screenshot captured
- `maya:screen-analysis-complete` - Analysis complete
- `maya:monitoring-acknowledged` - Request acknowledged

### Client-Side Integration:
- Socket.IO listeners in `maya-enhanced.js`
- Automatic screenshot capture on request
- MAYA activation and speech synthesis
- Real-time event handling

### Server-Side Integration:
- Socket.IO server in `server.js`
- Event handlers for all MAYA events
- Real-time message broadcasting
- Screenshot request routing

---

## 📊 Usage Flow

### Message Relay Flow:
```
1. User: "MAYA, tell John about the meeting"
2. MAYA: Calls send_message_to_user function
3. API: Creates MayaMessage in database
4. Socket.IO: Emits maya:new-message to John's session
5. John's Browser: Receives event
6. MAYA: Activates on John's screen
7. MAYA: Speaks "Message from [User]: Meeting at 3pm"
8. John's Browser: Emits maya:message-spoken
9. Database: Updates message status to 'spoken'
10. MAYA: Confirms to sender "Message delivered to John"
```

### Screen Monitoring Flow:
```
1. User: "MAYA, what is John doing?"
2. MAYA: Calls monitor_user_screen function
3. API: Checks authorization (hierarchy)
4. API: Creates ScreenMonitor record
5. Socket.IO: Emits maya:screen-capture-request to John's session
6. John's Browser: Captures screenshot automatically
7. John's Browser: Submits to /api/maya/submit-screenshot
8. API: Analyzes screenshot with GPT-4 Vision
9. API: Saves summary to database
10. Socket.IO: Emits maya:screen-analysis-complete to requester
11. MAYA: Reports "John is working on the attendance report"
```

---

## ✅ Build Status

```bash
✓ Compiled successfully
✓ All routes built
✓ No errors
✓ Message relay system ready
✓ Screen monitoring system ready
✓ Socket.IO events configured
✓ Ready for production
```

---

## 🎉 Summary

**MAYA can now:**
- ✅ Send messages between users with voice delivery
- ✅ Monitor user screens with AI analysis
- ✅ Activate on recipient's screen automatically
- ✅ Speak messages aloud to recipients
- ✅ Respect hierarchy and permissions
- ✅ Provide real-time activity monitoring
- ✅ Log all actions for compliance

**Status:** ✅ Complete and Ready for Use  
**Date:** November 17, 2024  
**Version:** 7.0.0 (Message Relay & Screen Monitoring)

