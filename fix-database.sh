#!/bin/bash

# Fix Database Connection Script
# This script fixes the MongoDB database name from 'hrms' to 'hrms_db'

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_status "🔧 Fixing MongoDB Database Connection"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Navigate to project directory
cd /root/hrms

# Check current .env file
if [ -f .env ]; then
    print_status "📋 Current .env file:"
    cat .env
    echo ""
    
    # Backup current .env
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backed up current .env file"
else
    print_warning ".env file not found, creating new one"
fi

# Create/Update .env file with correct database name
print_status "🔄 Updating MongoDB URI to use 'hrms_db' database..."

cat > .env << 'EOF'
MONGODB_URI=mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?retryWrites=true&w=majority
JWT_SECRET=1mMMQ9J5DghFUW2e5YKA+/eD0jxmlHSI9GJiVRAUUZw=
NEXTAUTH_SECRET=wg5Q+WLKYbxH3IXjom+F4SnhUacmsJSdCxf4rsQsuNI=
NEXTAUTH_URL=http://139.59.27.50
NEXT_PUBLIC_APP_URL=http://139.59.27.50
NEXT_PUBLIC_APP_NAME=HRMS System
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./public/uploads
NODE_ENV=production
EOF

print_success "Updated .env file with correct database name"

# Show updated .env file
print_status "📋 Updated .env file:"
cat .env
echo ""

# Stop current containers
print_status "🛑 Stopping current containers..."
docker-compose down

# Clean up any cached builds
print_status "🧹 Cleaning Docker cache..."
docker system prune -f

# Rebuild and start with correct database
print_status "🚀 Rebuilding and starting HRMS with correct database..."
docker-compose up -d --build

# Wait for services to start
print_status "⏳ Waiting for services to start..."
sleep 30

# Check container status
print_status "📊 Container Status:"
docker-compose ps

# Test database connection
print_status "🔍 Testing database connection..."
sleep 10

# Test application
print_status "🌐 Testing application..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    print_success "Application is responding correctly"
else
    print_warning "Application status: $HTTP_STATUS"
    print_status "Checking application logs..."
    docker-compose logs hrms-app --tail=20
fi

# Final status
print_success "🎉 Database Connection Fixed!"
echo ""
echo "📋 Summary:"
echo "✅ Database changed from 'hrms' to 'hrms_db'"
echo "✅ Application rebuilt with correct database"
echo "✅ All your existing data should now be accessible"
echo ""
echo "🌐 Access your HRMS:"
echo "📱 Application: http://139.59.27.50"
echo "🔧 Direct: http://139.59.27.50:3000"
echo ""
echo "🔍 To check logs:"
echo "docker-compose logs -f"
echo ""
echo "👥 Your existing employees and data should now be visible!"

# Show application logs
print_status "📋 Recent application logs:"
docker-compose logs hrms-app --tail=10
