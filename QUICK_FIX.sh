#!/bin/bash

echo "🚀 QUICK FIX - Database Connection Issue"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "   Please run this script from the project root directory"
    echo "   Example: cd ~/hrms && ./QUICK_FIX.sh"
    exit 1
fi

echo "✅ Found docker-compose.yml"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo ""
    echo "Creating .env file template..."
    cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/hrms_db
JWT_SECRET=CHANGE_THIS_TO_RANDOM_STRING
NEXTAUTH_SECRET=CHANGE_THIS_TO_RANDOM_STRING
NEXTAUTH_URL=https://zenova.sbs
NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
EOF
    
    echo "✅ Created .env file"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file and set your actual values!"
    echo ""
    echo "Generate secrets with:"
    echo "  openssl rand -base64 32"
    echo ""
    echo "Then edit .env:"
    echo "  nano .env"
    echo ""
    echo "After editing .env, run this script again."
    exit 1
fi

echo "✅ Found .env file"
echo ""

# Check if .env has dummy values
if grep -q "CHANGE_THIS" .env; then
    echo "⚠️  Warning: .env file contains placeholder values!"
    echo ""
    echo "Please edit .env and set real values:"
    echo "  nano .env"
    echo ""
    echo "Generate secrets with:"
    echo "  openssl rand -base64 32"
    echo ""
    read -p "Press Enter after you've updated .env, or Ctrl+C to exit..."
fi

# Check MONGODB_URI
if ! grep -q "MONGODB_URI=" .env; then
    echo "❌ Error: MONGODB_URI not found in .env"
    exit 1
fi

echo "✅ .env file looks good"
echo ""

# Pull latest code
echo "📥 Pulling latest code..."
git pull origin main
echo ""

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down -v
echo ""

# Remove old images
echo "🗑️  Removing old images..."
docker images | grep hrms | awk '{print $3}' | xargs -r docker rmi 2>/dev/null || true
echo ""

# Rebuild without cache
echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
docker-compose build --no-cache
echo ""

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d
echo ""

# Wait for containers to start
echo "⏳ Waiting for containers to start..."
sleep 5
echo ""

# Check container status
echo "📊 Container status:"
docker-compose ps
echo ""

# Run environment debug
echo "🔍 Checking environment variables..."
echo ""
docker-compose exec -T hrms-app node debug-env.js
echo ""

# Show logs
echo "📋 Recent logs:"
docker-compose logs hrms-app --tail=20
echo ""

echo "========================================"
echo "✅ Quick fix complete!"
echo ""
echo "Next steps:"
echo "1. Check the output above for any errors"
echo "2. If you see 'MongoDB connection successful', you're good!"
echo "3. Test your app: https://zenova.sbs"
echo "4. If still having issues, check: TROUBLESHOOT_NOW.md"
echo ""
echo "To view live logs:"
echo "  docker-compose logs -f hrms-app"
echo ""

