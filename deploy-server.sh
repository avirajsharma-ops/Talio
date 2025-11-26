#!/bin/bash

echo "🚀 Talio HRMS - Server Deployment Script"
echo "=========================================="
echo ""

# Configuration
MONGODB_URI="mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?"
NEXTAUTH_URL="https://zenova.sbs"
NEXT_PUBLIC_APP_URL="https://zenova.sbs"
NEXT_PUBLIC_APP_NAME="Talio HRMS"

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found!"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "✅ Found docker-compose.yml"
echo ""

# Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi
echo "✅ Code updated"
echo ""

# Generate secrets if .env doesn't exist or regenerate if requested
if [ ! -f ".env" ] || [ "$1" == "--regenerate-secrets" ]; then
    echo "🔐 Generating new secrets..."
    JWT_SECRET=$(openssl rand -base64 48)
    NEXTAUTH_SECRET=$(openssl rand -base64 48)
    
    # Create .env file
    cat > .env <<EOF
NODE_ENV=production
PORT=3000

# MongoDB Atlas connection
MONGODB_URI=$MONGODB_URI

# Authentication secrets
NEXTAUTH_URL=$NEXTAUTH_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET

# Public app configuration
NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME
EOF

    chmod 600 .env
    echo "✅ .env file created with new secrets"
else
    echo "ℹ️  .env file already exists, keeping existing secrets"
    echo "   (Use --regenerate-secrets flag to generate new ones)"
fi
echo ""

# Show .env content (masked)
echo "📋 Current .env configuration:"
cat .env | sed 's/\(SECRET=\).*/\1***HIDDEN***/g' | sed 's/\(aviraj\)@/***PASSWORD***@/g'
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
if [ $? -ne 0 ]; then
    echo "❌ Docker build failed!"
    exit 1
fi
echo "✅ Build complete"
echo ""

# Start containers
echo "🚀 Starting containers..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Failed to start containers!"
    exit 1
fi
echo "✅ Containers started"
echo ""

# Wait for containers to be ready
echo "⏳ Waiting for application to start..."
sleep 10
echo ""

# Check container status
echo "📊 Container status:"
docker-compose ps
echo ""

# Run environment diagnostics
echo "🔍 Running environment diagnostics..."
docker-compose exec -T hrms-app node debug-env.js
echo ""

# Show recent logs
echo "📋 Recent application logs:"
docker-compose logs hrms-app --tail=30
echo ""

echo "=========================================="
echo "✅ Deployment complete!"
echo ""
echo "🌐 Your application should be available at:"
echo "   https://zenova.sbs"
echo ""
echo "📊 Useful commands:"
echo "   View logs:        docker-compose logs -f hrms-app"
echo "   Restart:          docker-compose restart"
echo "   Stop:             docker-compose down"
echo "   Check status:     docker-compose ps"
echo ""
echo "🔧 Troubleshooting:"
echo "   If issues persist, check: TROUBLESHOOT_NOW.md"
echo ""

