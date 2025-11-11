#!/bin/bash

# Deploy Clock In/Out Fix to Server
# Run this on your Hostinger VPS

echo "🚀 Deploying Clock In/Out Fix..."
echo ""

# Stop Apache2
echo "1️⃣ Stopping Apache2..."
sudo systemctl stop apache2 2>/dev/null
sudo systemctl disable apache2 2>/dev/null
echo "✅ Apache2 stopped"
echo ""

# Check if port 80 is free
echo "2️⃣ Checking port 80..."
if sudo lsof -i :80 > /dev/null 2>&1; then
    echo "⚠️  Port 80 is still in use. Killing processes..."
    sudo lsof -i :80 | grep LISTEN | awk '{print $2}' | xargs -r sudo kill -9
    sleep 2
fi
echo "✅ Port 80 is free"
echo ""

# Navigate to project directory
cd /root/Tailo || exit 1

# Stop containers
echo "3️⃣ Stopping Docker containers..."
docker-compose down
echo "✅ Containers stopped"
echo ""

# Rebuild and start
echo "4️⃣ Rebuilding and starting containers..."
docker-compose up -d --build
echo ""

# Wait for containers to start
echo "5️⃣ Waiting for containers to start..."
sleep 5
echo ""

# Check status
echo "6️⃣ Container Status:"
docker-compose ps
echo ""

# Show logs
echo "7️⃣ Application Logs (last 30 lines):"
docker-compose logs hrms-app --tail=30
echo ""

echo "✅ Deployment complete!"
echo ""
echo "🌐 Visit: https://zenova.sbs"
echo "📊 Check browser console for debug logs"
echo "📝 Look for these logs when clicking buttons:"
echo "   - 🔵 Check In button clicked"
echo "   - 🔴 Check Out button clicked"
echo "   - Button disabled status"
echo "   - Location request status"
echo ""

