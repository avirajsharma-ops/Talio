#!/bin/bash

echo "🔍 HRMS Status Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📦 1. Container Status:"
docker-compose ps
echo ""

echo "🌐 2. Testing HTTPS (zenova.sbs):"
curl -I https://zenova.sbs 2>&1 | head -5
echo ""

echo "🌐 3. Testing HTTP (should redirect):"
curl -I http://zenova.sbs 2>&1 | head -5
echo ""

echo "🔌 4. Testing localhost:3000 (app):"
curl -I http://localhost:3000 2>&1 | head -5
echo ""

echo "📋 5. Nginx Error Logs (last 20 lines):"
docker-compose logs --tail=20 nginx 2>&1 | tail -20
echo ""

echo "📋 6. App Error Logs (last 20 lines):"
docker-compose logs --tail=20 hrms-app 2>&1 | tail -20
echo ""

echo "🔐 7. SSL Certificate Check:"
if [ -f "./certbot/conf/live/zenova.sbs/fullchain.pem" ]; then
    echo "✅ Certificate exists"
    openssl x509 -enddate -noout -in ./certbot/conf/live/zenova.sbs/fullchain.pem
else
    echo "❌ Certificate NOT found"
fi
echo ""

echo "🔍 8. Nginx Config Test:"
docker-compose exec -T nginx nginx -t 2>&1
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

