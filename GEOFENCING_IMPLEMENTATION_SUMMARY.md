# Geofencing Implementation Summary

## Overview
Comprehensive geofencing functionality has been implemented for the Tailo HRMS application, supporting multiple office locations, break timings, attendance integration, and real-time notifications.

## ✅ Completed Features

### 1. Database Models

#### **GeofenceLocation Model** (`models/GeofenceLocation.js`)
- Support for multiple office locations
- Each location has:
  - Name, description, address
  - Center coordinates (latitude, longitude)
  - Radius in meters
  - Active/inactive status
  - Primary location flag
  - Strict mode enforcement
  - Allowed departments and employees
  - Location-specific working hours
  - Break timings configuration
  - Statistics tracking

#### **Updated CompanySettings Model** (`models/CompanySettings.js`)
- Added `useMultipleLocations` flag
- Added global `breakTimings` array
- Maintained backward compatibility with single location

#### **Updated Attendance Model** (`models/Attendance.js`)
- Added geofence location reference for check-in/check-out
- Added `geofenceValidated` flag
- Added `geofenceOverride` for manual approvals
- Stores location name for quick access

#### **Updated GeofenceLog Model** (`models/GeofenceLog.js`)
- Added reference to specific geofence location
- Added `checkedLocations` array for debugging
- Added `duringBreakTime` flag
- Added `breakTimingName` field

### 2. API Routes

#### **Geofence Location Management**
- `POST /api/geofence/locations` - Create new location
- `GET /api/geofence/locations` - List all locations (with activeOnly filter)
- `GET /api/geofence/locations/:id` - Get specific location
- `PUT /api/geofence/locations/:id` - Update location
- `DELETE /api/geofence/locations/:id` - Soft delete location (sets isActive=false)

**Features:**
- Only admin and HR can create/update/delete locations
- Automatic primary location management (only one can be primary)
- Cannot delete primary location
- Populates related data (departments, employees, creator)

#### **Enhanced Geofence Log API** (`app/api/geofence/log/route.js`)
- Checks employee against ALL active geofence locations
- Considers employee within geofence if within ANY allowed location
- Respects break timings (skips geofencing during breaks)
- Stores which location employee is at
- Stores all checked locations for debugging
- Returns closest location and distance

**Break Timing Logic:**
- Checks current time against all active break timings
- Respects day-of-week configuration
- Geofencing is paused during break times

**Multiple Location Logic:**
- Fetches all active locations
- Filters by allowed departments/employees
- Calculates distance to each location
- Returns closest location (within or outside geofence)

#### **Enhanced Attendance API** (`app/api/attendance/route.js`)
- Validates geofence location on check-in
- Stores geofence location reference
- Enforces strict mode (blocks check-in if outside geofence)
- Stores location data for both check-in and check-out
- Skips validation for work-from-home employees

**Check-in Validation:**
- If strict mode enabled and employee outside all geofences → reject check-in
- Returns distance and closest location name in error message
- Stores geofence location ID and name in attendance record

#### **Enhanced Geofence Approval API** (`app/api/geofence/approve/route.js`)
- Sends push notifications to employee
- Emits Socket.IO events for real-time updates
- Supports approval/rejection with comments
- Only managers, HR, and admin can approve

### 3. Frontend UI

#### **Geofence Locations Management Page** (`app/dashboard/settings/geofence-locations/page.js`)
- List view of all geofence locations
- Card-based layout with location details
- Add/Edit/Delete functionality
- Modal for creating/editing locations
- Google Maps integration for visual location selection
- Break timings configuration per location
- Primary location indicator
- Active/inactive status badges
- Strict mode toggle

**Features:**
- Drag marker on map to set location
- Edit radius by dragging circle
- Click on map to set new center
- Add multiple break timings per location
- Configure break timing days and hours
- Real-time map updates

#### **Updated Settings Page** (`app/dashboard/settings/page.js`)
- Added "Use Multiple Geofence Locations" toggle
- Link to manage locations page
- Maintains backward compatibility with single location

### 4. Client-Side Geofencing

#### **Enhanced useGeofencing Hook** (`hooks/useGeofencing.js`)
- Added break timing check function
- Skips geofencing during break times
- Relies on server API for multiple location checks
- Shows location name in notifications
- Periodic location logging (every 15 minutes)

**Break Timing Logic:**
- Checks if current time is within any active break timing
- Respects day-of-week configuration
- Returns early if during break (no geofencing)

### 5. Android Background Location Tracking

#### **Enhanced LocationTrackingService** (`android/app/src/main/java/sbs/zenova/twa/services/LocationTrackingService.kt`)
- Sends location to server API every 5 minutes
- Receives geofence status from server
- Shows notifications when outside geofence
- Dismisses notifications when back inside
- Periodic reminders (every 15 minutes) if still outside
- Uses OkHttp for API calls
- Coroutines for async operations

**Features:**
- Foreground service with persistent notification
- High-priority geofence violation notifications
- Shows distance and location name
- Prompts for reason if approval required
- Auto-dismisses when back inside geofence

### 6. Real-Time Notifications

#### **Socket.IO Integration**
- Added `geofence-approval` event
- Emitted from approval API to employee
- Handled in SocketContext
- Displayed as in-app notification
- Android app receives via NotificationService

**Notification Flow:**
1. Manager approves/rejects request
2. API sends push notification
3. API emits Socket.IO event
4. Web app shows in-app notification
5. Android app shows system notification

#### **Updated Contexts**
- `SocketContext.js` - Added `onGeofenceApproval` callback
- `InAppNotificationContext.js` - Listens for geofence approval events
- Shows approval/rejection with icon (✅/❌)

#### **Android NotificationService**
- Added `geofence-approval` event listener
- Shows notification with approval/rejection status
- Includes reviewer comments

## 🔧 Configuration

### Setting Up Multiple Locations

1. **Enable Geofencing:**
   - Go to Settings → Geofencing Settings
   - Enable "Enable Geofencing" checkbox

2. **Enable Multiple Locations:**
   - Enable "Use Multiple Geofence Locations" checkbox
   - Click "Manage Locations" button

3. **Add Locations:**
   - Click "Add Location" button
   - Enter location name, address, description
   - Set coordinates on map (drag marker or click)
   - Set radius (in meters)
   - Configure break timings (optional)
   - Set as primary (optional)
   - Enable strict mode (optional)
   - Save

4. **Configure Break Timings:**
   - In location modal, click "Add Break"
   - Enter break name (e.g., "Lunch Break")
   - Set start and end time
   - Select days of week (optional)
   - Add multiple breaks as needed

### Attendance Integration

- When strict mode is enabled, employees MUST be within a geofence location to check in
- Check-in stores which location employee is at
- Check-out also stores location
- Attendance record shows geofence validation status

### Approval Workflow

1. Employee goes outside geofence during work hours
2. System logs location and creates out-of-premises request
3. Employee provides reason via popup
4. Manager receives notification
5. Manager approves/rejects with comments
6. Employee receives real-time notification

## 📱 Mobile App Features

### Background Location Tracking
- Runs as foreground service
- Updates every 5 minutes
- Sends location to server
- Receives geofence status
- Shows notifications

### Geofence Violation Notifications
- High-priority notifications
- Shows distance from office
- Shows closest location name
- Prompts for reason if needed
- Auto-dismisses when back inside

## 🔐 Security & Permissions

### API Permissions
- Only admin and HR can manage locations
- Managers can approve requests for their team
- Employees can only view their own logs

### Location Permissions
- Requires fine location permission
- Background location permission for Android
- Geolocation API for web

## 📊 Data Tracking

### GeofenceLog
- Tracks all location updates
- Stores which location employee is at
- Stores all checked locations
- Tracks break timing status
- Stores approval/rejection status

### Attendance
- Links to geofence location
- Stores validation status
- Stores override approvals

## 🚀 Next Steps (Optional Enhancements)

1. **Analytics Dashboard:**
   - Show geofence compliance metrics
   - Track most used locations
   - Identify frequent violations

2. **Geofence Reports:**
   - Export geofence logs
   - Generate compliance reports
   - Track break timing usage

3. **Advanced Features:**
   - Geofence scheduling (different locations for different times)
   - Employee-specific geofence rules
   - Automatic location detection based on IP/WiFi

4. **Testing:**
   - Test with multiple locations
   - Test break timings
   - Test attendance integration
   - Test notifications end-to-end

## 📝 Testing Checklist

- [ ] Create multiple geofence locations
- [ ] Set one as primary
- [ ] Configure break timings
- [ ] Test check-in within geofence
- [ ] Test check-in outside geofence (strict mode)
- [ ] Test location logging during work hours
- [ ] Test location logging during break time (should skip)
- [ ] Test going outside geofence (should create request)
- [ ] Test approval workflow
- [ ] Test rejection workflow
- [ ] Test real-time notifications (web)
- [ ] Test real-time notifications (Android)
- [ ] Test background location tracking (Android)
- [ ] Test geofence violation notifications (Android)

## 🎉 Summary

The geofencing system now supports:
- ✅ Multiple office locations
- ✅ Break timings (geofencing paused during breaks)
- ✅ Attendance integration with validation
- ✅ Real-time approval/rejection notifications
- ✅ Android background location tracking
- ✅ Comprehensive UI for managing locations
- ✅ Socket.IO real-time updates
- ✅ Push notifications
- ✅ Strict mode enforcement
- ✅ Location-specific settings

All requirements from the user have been implemented successfully!

