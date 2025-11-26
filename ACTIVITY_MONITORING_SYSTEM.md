# Comprehensive Employee Activity Monitoring System

## Overview
A complete activity tracking system for Talio HRMS that monitors employee productivity through:
- **Keystroke logging** with full text capture for MAYA context
- **Mouse activity tracking** (clicks, scrolls, movements)
- **Window/application usage** with time-spent analytics
- **Automatic screenshots** every 30 seconds with AI analysis
- **Real-time activity dashboards** with hourly/daily/weekly/monthly summaries

## Architecture

### 1. Chrome Extension
**Location**: `/extension/`

**Components**:
- `manifest.json` - Extension configuration
- `background.js` - Service worker handling:
  - Window/tab tracking
  - Periodic screenshot capture (every 30 seconds)
  - Activity batch flushing
  - Session management
- `content.js` - Page-level tracking:
  - Keyboard event capture
  - Mouse event capture
  - Activity buffering and batching
- `popup.html/js` - Extension UI showing tracking status

**Auto-Installation**:
- Extension prompts installation on first Tailo website access
- Automatically starts tracking on browser startup
- Persists authentication across sessions

### 2. Database Models
**Location**: `/models/`

**KeystrokeLog.js**:
- Stores individual keystrokes with timestamps
- Reconstructs typed text for MAYA context
- Calculates WPM and productivity scores
- Full-text search indexed for quick retrieval

**MouseActivityLog.js**:
- Tracks clicks, scrolls, mouse movements
- Calculates activity levels (idle to very-high)
- Links mouse activity to specific windows

**WindowActivityLog.js**:
- Tracks active window/tab focus time
- Categorizes applications (productive, neutral, distraction, etc.)
- Productivity scoring per application
- Time-spent analytics

**ApplicationUsageLog.js**:
- Daily aggregation of application usage
- Most-used apps tracking
- Productivity averages
- Department-level comparisons

**AutoScreenCapture.js**:
- Stores screenshots (base64)
- OpenAI Vision analysis results
- Activity categorization
- Links to keystroke/window logs

### 3. API Endpoints

#### POST /api/activity/batch
Receives batched activity from extension.

**Request Body**:
```json
{
  "keystrokes": [{
    "sessionId": "session_123",
    "keystrokes": [{ "key": "a", "timestamp": "..." }],
    "textContent": "Sample typed text",
    "windowTitle": "VS Code",
    "url": "vscode://...",
    "domain": "localhost",
    "startTime": "2025-11-26T10:00:00Z",
    "endTime": "2025-11-26T10:05:00Z"
  }],
  "mouse": [{
    "events": [{ "type": "click", "x": 100, "y": 200 }],
    "windowTitle": "Chrome",
    "url": "https://github.com",
    "domain": "github.com"
  }],
  "windows": [{
    "windowTitle": "Slack",
    "url": "https://app.slack.com",
    "domain": "slack.com",
    "focusStartTime": "2025-11-26T10:00:00Z",
    "focusEndTime": "2025-11-26T10:10:00Z",
    "timeSpent": 600000
  }]
}
```

**Response**:
```json
{
  "success": true,
  "results": {
    "keystrokes": 1,
    "mouse": 1,
    "windows": 1
  }
}
```

#### POST /api/activity/screenshot
Receives and analyzes automatic screenshots.

**Request Body**:
```json
{
  "screenshot": "data:image/png;base64,...",
  "capturedAt": "2025-11-26T10:00:00Z",
  "windowTitle": "VS Code - main.js",
  "url": "vscode://...",
  "domain": "localhost",
  "sessionId": "session_123"
}
```

**OpenAI Vision Analysis**:
- Summary of what employee is doing
- Detected applications
- Activity type (coding, browsing, email, etc.)
- Productivity level
- Visible content types
- OCR text extraction

**Response**:
```json
{
  "success": true,
  "captureId": "673...",
  "analysis": {
    "summary": "Employee writing JavaScript code in VS Code",
    "productivity": "highly-productive",
    "activity": "coding"
  }
}
```

#### GET /api/activity/summary
Comprehensive activity summary with filters.

**Query Parameters**:
- `period`: hourly | daily | weekly | monthly
- `employeeId`: (optional) For managers/admins
- `date`: ISO date string (defaults to today)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "daily",
    "startDate": "2025-11-26T00:00:00Z",
    "endDate": "2025-11-26T23:59:59Z",
    "employee": { "id": "...", "name": "John Doe" },
    "keystrokes": {
      "total": 15234,
      "words": 3421,
      "averageWPM": 45
    },
    "mouse": {
      "clicks": 892,
      "scrolls": 234
    },
    "windows": {
      "uniqueApplications": 12,
      "totalSwitches": 156,
      "totalTimeSpent": 25200000,
      "productivityScore": 78,
      "topApplications": [
        { "name": "VS Code", "timeSpent": 14400000, "category": "productive" }
      ]
    },
    "screenshots": {
      "total": 960,
      "productivityBreakdown": {
        "highly-productive": 432,
        "productive": 312,
        "neutral": 156,
        "low-productivity": 48,
        "distraction": 12
      },
      "recentCaptures": [...]
    },
    "timeline": [
      { "hour": "09:00", "timeSpent": 3600000, "productivity": 85 },
      ...
    ]
  }
}
```

### 4. MAYA Integration

#### Context Enhancement
All keystroke text is indexed for MAYA's vector search:
- Full conversation history
- Code snippets typed
- Search queries
- Documentation viewed
- Communication content

#### Activity-Aware Responses
MAYA can answer:
- "What have I been working on today?"
- "Show me my productivity this week"
- "How much time did I spend on GitHub today?"
- "What was I doing at 2 PM?"

#### Proactive Insights
MAYA automatically:
- Detects prolonged distraction periods
- Suggests breaks after extended coding sessions
- Identifies productivity patterns
- Recommends optimal work times

### 5. Dashboard Integration
**Location**: `/app/dashboard/maya/activity-history/page.js`

**Features**:
- Real-time activity feed
- Filter by period (hourly/daily/weekly/monthly)
- Screenshot carousel with AI summaries
- Application usage charts
- Productivity trends
- Keystroke/mouse heatmaps
- Timeline visualization

**Role-Based Access**:
- **Employees**: View own activity only
- **Department Heads**: View department employees
- **Admins/HR**: View all employees

## Installation & Setup

### 1. Extension Installation

**Manual Installation** (Development):
```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select /extension/ folder
```

**Production Packaging**:
```bash
cd extension
zip -r talio-activity-monitor.zip . -x "*.git*" -x "*.DS_Store"
# Upload to Chrome Web Store
```

**Auto-Installation Flow**:
1. User visits Talio website
2. Popup prompts extension installation
3. Extension auto-starts tracking after login
4. Persists across browser restarts

### 2. API Configuration

**Environment Variables** (`.env.local`):
```env
# Already configured
OPENAI_API_KEY=sk-...  # For screenshot analysis
JWT_SECRET=your-secret
```

**Extension Configuration**:
Update `extension/background.js`:
```javascript
const CONFIG = {
  API_URL: 'https://app.tailo.work', // Production URL
  SCREENSHOT_INTERVAL: 30000, // 30 seconds
  ACTIVITY_BATCH_INTERVAL: 5000 // 5 seconds
};
```

### 3. Database Indexes

All models have optimized indexes created automatically. No manual setup required.

## Privacy & Compliance

### Data Collection Limits
- Screenshots: Max 10MB per capture
- Keystroke batches: Flushed every 5 seconds
- Mouse events: Throttled to prevent overload
- Window tracking: Only active window time

### Privacy Controls
- Sensitive data flagging (PII detection)
- Screenshot blur regions for sensitive content
- Role-based access controls
- Data retention policies (configurable)

### Compliance
- GDPR-compliant data handling
- Employee consent mechanisms
- Data deletion on employee exit
- Audit trail for all access

## Performance Optimizations

### Extension
- Batched API calls (reduces network overhead)
- Local buffering before transmission
- Throttled mouse tracking (100ms intervals)
- Compressed screenshot transmission

### API
- Aggregation pipelines for summaries
- Indexed database queries
- Cached productivity calculations
- Async OpenAI Vision processing

### Database
- Compound indexes for common queries
- Text indexes for full-text search
- TTL indexes for data retention
- Sharding-ready schema design

## Usage Examples

### Admin Viewing Employee Activity
```javascript
// GET /api/activity/summary?period=daily&employeeId=673abc...
// Returns full day summary with screenshots, apps, productivity
```

### Employee Checking Own Progress
```javascript
// GET /api/activity/summary?period=weekly
// Returns weekly breakdown, no employeeId needed
```

### MAYA Answering Activity Query
```javascript
// User: "What was I doing at 3 PM?"
// MAYA queries WindowActivityLog + AutoScreenCapture
// Responds with: "At 3 PM you were coding in VS Code (main.js), 
// working on the authentication module. Screenshot shows you were 
// implementing JWT verification."
```

## Troubleshooting

### Extension Not Tracking
1. Check authentication: localStorage has `token` and `user`
2. Verify permissions: Extension has all required permissions
3. Check console: Look for initialization messages
4. Reload extension: chrome://extensions/ → Reload

### Screenshots Not Capturing
1. Verify alarm is set: chrome.alarms.getAll()
2. Check API key: OPENAI_API_KEY configured
3. Monitor network: Check /api/activity/screenshot calls
4. Size limits: Ensure screenshots < 10MB

### API Errors
1. Authentication: Verify JWT token validity
2. Database: Check MongoDB connection
3. Rate limits: OpenAI API quota
4. Logs: Check server console for errors

## Future Enhancements

- [ ] Desktop application tracking (Electron wrapper)
- [ ] Mobile app activity tracking
- [ ] AI-powered productivity coaching
- [ ] Automatic distraction blocking
- [ ] Team productivity comparisons
- [ ] Gamification with productivity scores
- [ ] Integration with Jira/GitHub for context
- [ ] Smart notifications for long idle periods
- [ ] Automated time tracking for billing

## Security Notes

⚠️ **Important**: This system captures sensitive employee data including:
- Typed text (passwords, personal info)
- Screen content (confidential documents)
- Application usage (personal browsing)

**Recommendations**:
1. Clear employee consent required
2. Implement data encryption at rest
3. Regular security audits
4. Limit data retention (30-90 days)
5. Employee data export on request
6. Immediate data deletion on termination

## Support

For issues or questions:
- GitHub Issues: [repo]/issues
- Documentation: This file
- Team: Contact Talio development team
