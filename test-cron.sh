#!/bin/bash
echo "Testing Cron Endpoint..."
echo ""
echo "CRON_SECRET from .env:"
grep "CRON_SECRET=" .env | cut -d'=' -f2
echo ""
echo "Making request to cron endpoint..."
CRON_SECRET=$(grep "CRON_SECRET=" .env | cut -d'=' -f2)
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  http://localhost:3000/api/cron/process-scheduled-notifications \
  -w "\n\nHTTP Status: %{http_code}\n"
