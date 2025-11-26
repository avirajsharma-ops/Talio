# MAYA Screen Monitoring - Quick Start Guide

## For Admins and Department Heads

### How to Monitor an Employee's Screen

#### Method 1: Ask MAYA (Recommended)
Simply ask MAYA in natural language:

```
"What is John Doe doing right now?"
"Show me Sarah's screen"
"Check what the development team is working on"
"Monitor employee john@company.com"
```

MAYA will:
1. Send a screen capture request to the employee
2. The employee will see a permission dialog
3. If approved, MAYA captures their screen
4. AI analyzes the screenshot
5. You get a detailed report of what they're doing

#### Method 2: Direct Navigation
1. Go to `/dashboard/maya/activity-history`
2. Click on any employee row
3. Click "View Details" to see their latest screen capture

### View Employee MAYA Chats

Navigate to: **`/dashboard/maya/employee-chats`**

Features:
- See all employees and their MAYA conversations
- Department heads see only their department
- Click any employee to view full chat history
- Search by name/email

### View Screen Monitoring Activity

Navigate to: **`/dashboard/maya/activity-history`**

Features:
- Complete log of all monitoring requests
- See who requested, who was monitored, when
- View screenshots and AI analysis
- Filter by employee, department, status
- Productivity level indicators
- Click "View Details" to see full screenshot and analysis

## For Employees

### What Happens When Your Screen is Monitored?

1. **Notification**: MAYA appears on your screen with a dialog
2. **Permission Request**: You see who requested and why
3. **Your Choice**: 
   - Click "Allow" to grant permission
   - Click "Deny" to refuse
4. **If Allowed**: Screenshot taken automatically and sent to requester
5. **Privacy**: You control when your screen is captured

### What Information is Captured?

- Screenshot of your current screen
- Applications/websites visible
- General activity type (coding, browsing, etc.)
- Productivity level (AI-estimated)

### Can I See My Own Chat History?

Yes! Go to `/dashboard/maya/chat-history` to see all your MAYA conversations.

## API Documentation

### Request Screen Monitoring

**Endpoint**: `POST /api/maya/screen-monitor/request`

**Headers**:
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

**Body**:
```json
{
  "employeeId": "507f1f77bcf86cd799439011",
  "reason": "Productivity check"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Screen monitoring request sent",
  "logId": "507f1f77bcf86cd799439012",
  "targetEmployee": {
    "id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@company.com",
    "department": "Engineering"
  }
}
```

### Get Monitoring History

**Endpoint**: `GET /api/maya/screen-monitor/history`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)
- `employeeId` (string): Filter by specific employee
- `includeScreenshot` (boolean): Include base64 screenshot data

**Response**:
```json
{
  "success": true,
  "logs": [
    {
      "_id": "...",
      "targetEmployeeName": "John Doe",
      "targetEmployeeEmail": "john@company.com",
      "requestedByName": "Jane Manager",
      "status": "analyzed",
      "analysis": {
        "summary": "Employee is working on a React component...",
        "productivityLevel": "high",
        "applications": ["VS Code", "Chrome"],
        "activity": "coding"
      },
      "createdAt": "2025-11-26T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### Get Employee Chats

**Endpoint**: `GET /api/maya/employee-chats`

**Query Parameters**:
- `page` (number): Page number
- `limit` (number): Results per page
- `employeeId` (string): Filter by specific employee
- `sessionId` (string): Get full conversation by session ID

**Response** (summary view):
```json
{
  "success": true,
  "chats": [
    {
      "_id": "...",
      "sessionId": "session_123_1234567890",
      "employeeId": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@company.com",
        "department": { "name": "Engineering" }
      },
      "totalMessages": 15,
      "lastMessageAt": "2025-11-26T10:30:00Z",
      "recentMessages": [
        {
          "role": "user",
          "content": "What's my attendance for this month?",
          "timestamp": "2025-11-26T10:29:00Z"
        }
      ]
    }
  ]
}
```

## Socket.IO Events

### Server to Client

**`maya:screen-capture-request`**
- Sent to employee when monitoring requested
- Payload: `{ logId, requestedBy, timestamp }`

**`maya:screen-analysis-complete`**
- Sent to requester when analysis done
- Payload: `{ logId, targetEmployee, summary, productivityLevel, timestamp }`

### Client to Server

**`maya:permission-denied`**
- Sent when employee denies permission
- Payload: `{ logId, userId, requestedBy }`

**`maya:screenshot-failed`**
- Sent when screenshot capture fails
- Payload: `{ logId, userId, error }`

## Permissions

### Admin / God Admin
✅ Monitor any employee
✅ View all monitoring logs
✅ Access all employee chats

### Department Head
✅ Monitor employees in their department
✅ View monitoring logs for their department
✅ Access employee chats in their department

### Manager / Employee
❌ Cannot request monitoring
❌ Cannot view others' chats
✅ Can view their own chat history

## Best Practices

1. **Transparency**: Always provide a clear reason for monitoring
2. **Respect Privacy**: Use monitoring for legitimate business purposes
3. **Regular Reviews**: Check activity history regularly for patterns
4. **Communication**: Inform team members about monitoring policies
5. **Data Security**: Screenshots contain sensitive data - handle appropriately

## Troubleshooting

### "Access denied" error?
- Check your role (must be admin or department_head)
- For dept heads: ensure you're monitoring your own department

### Employee not receiving notification?
- Verify they're logged in and Socket.IO connected
- Check they have MAYA open (blob visible)

### Screenshot not analyzing?
- Verify `OPENAI_API_KEY` is set in environment
- Check OpenAI API credits
- Ensure model is `gpt-4o`

### No screenshots visible?
- Check `includeScreenshot=true` query parameter
- Verify screenshot was captured (status should be `analyzed` not `pending`)

## Support

For issues or questions:
1. Check logs in browser console (MAYA: prefix)
2. Review server logs for API errors
3. Verify Socket.IO connection status
4. Contact system administrator
