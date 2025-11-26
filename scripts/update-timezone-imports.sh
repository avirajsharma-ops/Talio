#!/bin/bash
# Update timezone across all frontend files to use IST

echo "🌍 Updating timezone to IST across the app..."

# Files to update
FRONTEND_FILES=(
  "app/dashboard/maya/employee-chats/page.js"
  "app/dashboard/maya/activity-history/page.js"
  "app/dashboard/maya/chat-history/page.js"
  "app/dashboard/attendance/page.js"
  "app/dashboard/attendance/report/page.js"
  "app/dashboard/team/task-approvals/page.js"
  "app/dashboard/tasks/[id]/page.js"
  "app/dashboard/tasks/assign/page.js"
  "app/dashboard/leave/apply/page.js"
  "app/dashboard/documents/page.js"
  "app/dashboard/expenses/page.js"
  "app/dashboard/payroll/payslips/page.js"
  "app/dashboard/chat/page.js"
  "components/dashboards/AdminDashboard.js"
  "components/dashboards/ManagerDashboard.js"
  "components/dashboards/EmployeeDashboard.js"
  "components/tasks/TaskDashboard.js"
  "lib/activityLogger.js"
)

# Add IST imports to files that need them
for file in "${FRONTEND_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 Adding IST imports to $file..."
    
    # Check if it's a JavaScript/JSX file and add imports if not present
    if ! grep -q "from '@/lib/timezone'" "$file"; then
      # For client components (use client)
      if grep -q "'use client'" "$file"; then
        sed -i.tzbackup "/'use client'/a\\
import { formatISTDate, formatISTTime, formatISTDateTime, formatISTDateShort, getISTTimeAgo, getCurrentISTDate } from '@/lib/timezone'
" "$file"
      # For regular imports (after other imports)
      elif grep -q "^import" "$file"; then
        sed -i.tzbackup "/^import.*from/a\\
import { formatISTDate, formatISTTime, formatISTDateTime, formatISTDateShort, getISTTimeAgo, getCurrentISTDate } from '@/lib/timezone'
" "$file" 
      fi
      
      echo "  ✅ Added IST imports"
    fi
  fi
done

echo ""
echo "✅ Timezone import updates complete!"
echo "⚠️  Note: Manual formatting updates still required for date display logic"
echo "📚 Use these IST functions:"
echo "  - formatISTDateTime(date) - Full date & time"
echo "  - formatISTDateShort(date) - Short date (Jan 15, 2024)"
echo "  - formatISTTime(date) - Time only"
echo "  - getISTTimeAgo(date) - Relative time (5 mins ago)"
echo "  - getCurrentISTDate() - Current IST date"
