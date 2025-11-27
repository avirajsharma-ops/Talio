#!/bin/bash

# Script to add dynamic export to API routes

echo "🔧 Fixing dynamic API routes..."

# List of API route files that need dynamic export
routes=(
  "app/api/dashboard/manager-stats/route.js"
  "app/api/employees/list/route.js"
  "app/api/dashboard/hr-stats/route.js"
  "app/api/attendance/summary/route.js"
  "app/api/activity/summary/route.js"
  "app/api/dashboard/employee-stats/route.js"
  "app/api/maya/daily-summary/route.js"
  "app/api/chat/unread/route.js"
  "app/api/profile/route.js"
  "app/api/productivity/chat-history/route.js"
  "app/api/settings/preferences/route.js"
  "app/api/tasks/history/route.js"
  "app/api/settings/company/route.js"
  "app/api/team/check-head/route.js"
  "app/api/performance/calculate/route.js"
  "app/api/tasks/dashboard/route.js"
  "app/api/search/route.js"
  "app/api/team/pending-requests/route.js"
  "app/api/users/route.js"
  "app/api/team/members/route.js"
  "app/api/notifications/process/route.js"
  "app/api/test-user/route.js"
)

for route in "${routes[@]}"; do
  file="/Users/apple/Desktop/Tailo/$route"
  
  if [ -f "$file" ]; then
    # Check if already has dynamic export
    if grep -q "export const dynamic" "$file"; then
      echo "⏭️  Skipping $route (already has dynamic export)"
    else
      # Add dynamic export after imports
      echo "✅ Adding dynamic export to $route"
      
      # Create temp file with dynamic export added after imports
      awk '
        BEGIN { added = 0 }
        /^import/ { print; next }
        !added && !/^import/ && !/^$/ && !/^\/\// {
          print "\nexport const dynamic = '\''force-dynamic'\''\n"
          added = 1
        }
        { print }
      ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
    fi
  else
    echo "⚠️  File not found: $route"
  fi
done

echo "✨ Done! All API routes fixed."
