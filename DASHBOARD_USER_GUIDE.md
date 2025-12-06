# Customizable Dashboard - User Guide

## 🎯 Welcome to Your Customizable Dashboard!

Your dashboard is now **fully customizable**! You can add, remove, and rearrange widgets to create the perfect workspace for your role.

## 🚀 Quick Start

### View Your Dashboard
1. Navigate to `http://localhost:3000/dashboard`
2. You'll see your default widgets based on your role (Admin, HR, Manager, or Employee)
3. All widgets are interactive and show real-time data

### Enter Edit Mode
1. Click the **"Customize"** button in the top-right corner
2. Your dashboard enters edit mode:
   - Drag handles appear on each widget (⋮⋮ icon)
   - Remove buttons appear (✕ icon)
   - "Add Widget" and "Reset" buttons become visible

### Reorder Widgets
1. **Click and hold** the drag handle (⋮⋮) on any widget
2. **Drag** the widget to your desired position
3. **Release** to drop the widget in the new location
4. Layout saves automatically!

### Remove Widgets
1. **Hover** over any widget to see the controls
2. Click the **✕ (X)** button in the top-right corner
3. Widget is immediately removed
4. Change saves automatically!

### Add New Widgets
1. Click the **"Add Widget"** button
2. A beautiful modal opens showing all available widgets
3. **Search** for widgets using the search bar
4. **Filter** by category using the tabs:
   - 📊 All Widgets
   - ⏰ Attendance
   - 👥 Employees
   - 🏖️ Leave
   - 💰 Payroll
   - 📈 Performance
   - 📁 Projects
   - ⚡ Quick Access
   - 📊 Analytics
   - 🔔 Notifications

5. **Click** any widget to add it to your dashboard
6. Already-added widgets are highlighted in blue
7. Close the modal when done

### Reset to Defaults
1. Click the **"Reset"** button
2. Confirm the action
3. Your dashboard restores to the default widgets for your role
4. Custom layout is cleared

### Exit Edit Mode
1. Click the **"Done"** button (or "Customize" again)
2. Edit controls hide
3. Your layout is saved
4. Dashboard returns to normal view

## 📦 Available Widgets by Category

### ⏰ Attendance Widgets
- **Check In/Out** - Clock in/out with profile display
- **Quick Glance** - Today's attendance summary (4 stats)
- **Attendance Summary** - Monthly attendance statistics
- **Team Attendance** - See your team's status for today

### 👥 Employee Widgets
- **Employee Directory** - Searchable list of all employees
- **Employee Profile** - Your profile information
- **Organization Chart** - Company hierarchy view

### 🏖️ Leave Widgets
- **Leave Requests** - Recent leave requests with approve/reject
- **Leave Balance** - Your leave balance by type
- **Leave Calendar** - Visual calendar of team leave
- **Leave Approvals** - Pending approvals (Manager/HR/Admin)

### 💰 Payroll Widgets
- **Payroll Summary** - Overview of payroll information
- **My Payslips** - Access recent payslips
- **Upcoming Payroll** - Next payroll date and amount

### 📈 Performance Widgets
- **My Goals** - Current performance goals
- **Performance Reviews** - Recent reviews and feedback
- **KPI Stats** - Key performance indicators

### 📁 Project Widgets
- **Project Tasks** - Your assigned tasks
- **Project Progress** - Active project status
- **Project Timeline** - Upcoming milestones

### ⚡ Quick Access Widgets
- **Quick Actions** - Frequently used actions
- **Shortcuts** - Custom shortcuts
- **Favorites** - Bookmarked pages

### 📊 Analytics Widgets
- **Department Chart** - Department distribution
- **Attendance Trends** - Historical attendance data
- **Performance Insights** - Team performance analytics

### 🔔 Notification Widgets
- **Announcements** - Company-wide announcements
- **Alerts** - Important notifications
- **Birthdays** - Upcoming team birthdays
- **Recent Activities** - Activity feed

## 🎨 Customization Tips

### For Admins
**Recommended Widgets:**
- Check In/Out
- KPI Stats (all statistics)
- Leave Requests (with approve/reject)
- Department Chart
- Employee Directory
- Quick Actions (admin actions)
- Project Tasks
- Announcements

### For HR
**Recommended Widgets:**
- Employee Directory
- Leave Requests
- Leave Approvals
- Attendance Summary
- Department Chart
- Quick Actions (HR actions)
- Announcements
- Birthdays

### For Managers
**Recommended Widgets:**
- Check In/Out
- Team Attendance
- Leave Approvals (for team)
- Project Tasks
- Performance KPIs
- Quick Glance
- Announcements

### For Employees
**Recommended Widgets:**
- Check In/Out
- Quick Glance
- Leave Balance
- My Payslips
- My Goals
- Project Tasks
- Announcements
- Birthdays

## 💡 Pro Tips

### Organize by Priority
1. Place most-used widgets at the top
2. Group related widgets together
3. Remove widgets you rarely use
4. Reorder as your needs change

### Create Your Workflow
1. **Morning Check-in**: Keep "Check In/Out" at top
2. **Quick Overview**: Add "Quick Glance" next
3. **Today's Focus**: Add "Project Tasks" or "Team Attendance"
4. **Approvals**: Keep "Leave Requests" visible for quick actions
5. **Communication**: Add "Announcements" to stay informed

### Mobile Usage
- Widgets stack vertically on mobile
- Drag-and-drop works with touch
- All features available on mobile
- Layout persists across devices

### Keyboard Shortcuts
- **Tab** - Navigate between widgets
- **Enter** - Activate focused widget
- **Arrow Keys** - Move focus
- **Esc** - Close modals

## 🔧 Troubleshooting

### Dashboard Not Loading?
- Check your internet connection
- Refresh the page (F5)
- Clear browser cache
- Check console for errors

### Widgets Not Saving?
- Ensure localStorage is enabled
- Check browser privacy settings
- Try different browser
- Contact IT support

### Widget Not Responding?
- Refresh the page
- Exit and re-enter edit mode
- Check if widget is loading (spinner)
- Wait for data to load

### Can't Find a Widget?
- Use search in Add Widget modal
- Check category tabs
- Verify your role has access
- Contact administrator

## 📱 Persistence & Privacy

### Data Storage
- Your layout is saved in **browser localStorage**
- Each user has their own layout
- Layouts are **per-user, per-browser**
- No data sent to server (privacy-friendly)

### Cross-Device Sync
- Currently layouts are **browser-specific**
- Different browsers = different layouts
- Same browser, same device = same layout
- Future: Cloud sync planned

### Data Security
- All widget data uses existing authentication
- No additional permissions needed
- Data follows HRMS security policies
- Layouts stored locally only

## 🌟 Best Practices

### Daily Use
1. Start day with "Check In/Out" widget
2. Check "Announcements" for updates
3. Review "Project Tasks" or "Team Attendance"
4. Use "Quick Actions" for common tasks
5. Monitor "Leave Requests" if approver

### Weekly Use
1. Review "Attendance Summary" for patterns
2. Check "Performance KPIs" progress
3. Update "My Goals" status
4. Review "Department Chart" for changes
5. Check "Upcoming Payroll" details

### Monthly Use
1. Review all "Performance" widgets
2. Check "Leave Balance" for planning
3. Review "Payslips" for accuracy
4. Reorganize dashboard if needs changed
5. Explore new widgets added

## 🎓 Advanced Features

### Widget Search
- Search by **widget name**
- Search by **description**
- Search by **keywords**
- Case-insensitive search
- Real-time filtering

### Category Filtering
- Click category tab to filter
- See widgets in that category only
- "All Widgets" shows everything
- Category count shown on tab

### Role-Based Widgets
- Only see widgets for your role
- Admins see all widgets
- Employees see relevant widgets
- HR/Managers see management widgets
- Automatic filtering by permission

### Smart Defaults
- First-time users get curated widgets
- Defaults based on role
- Best practice layouts
- Most useful widgets included
- Can customize immediately

## 📞 Support

### Need Help?
- **Email**: support@talio.com
- **Chat**: In-app support (coming soon)
- **Documentation**: Check CUSTOMIZABLE_DASHBOARD_COMPLETE.md
- **Training**: Video tutorials (coming soon)

### Feature Requests
- Submit via feedback form
- Email product@talio.com
- Join beta testing program
- Participate in user surveys

### Report Bugs
- Use bug report template
- Include screenshots
- Describe steps to reproduce
- Mention browser and OS

---

## 🎉 Enjoy Your Customized Dashboard!

Your dashboard is now a powerful, personalized workspace. Make it yours!

**Happy Customizing! 🚀**
