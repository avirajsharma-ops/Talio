#!/bin/bash

echo "🚀 Talio HRMS - Quick Start Script"
echo "===================================="
echo ""
echo "This script will set up everything from scratch!"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  Not running as root. Some commands may require sudo."
    echo ""
fi

read -p "Press Enter to continue or Ctrl+C to cancel..."
echo ""

# Step 1: Clean everything
echo "🧹 Step 1/7: Cleaning old installations..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true
rm -rf ~/hrms
echo "✅ Cleaned"
echo ""

# Step 2: Clone repository
echo "📥 Step 2/7: Cloning repository..."
cd ~
git clone https://github.com/avirajsharma-ops/Tailo.git hrms
cd hrms
echo "✅ Repository cloned"
echo ""

# Step 3: Create .env file
echo "🔐 Step 3/7: Creating environment file..."
JWT_SECRET=$(openssl rand -base64 48)
NEXTAUTH_SECRET=$(openssl rand -base64 48)

cat > .env <<EOF
NODE_ENV=production
PORT=3000

MONGODB_URI=mongodb+srv://avirajsharma_db_user:aviraj@taliocluster.mvnlgwj.mongodb.net/hrms_db?

NEXTAUTH_URL=https://zenova.sbs
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
JWT_SECRET=$JWT_SECRET

NEXT_PUBLIC_APP_URL=https://zenova.sbs
NEXT_PUBLIC_APP_NAME=Talio HRMS
EOF

chmod 600 .env
echo "✅ Environment file created"
echo ""

# Step 4: Build Docker image
echo "🏗️  Step 4/7: Building Docker image (this takes 5-10 minutes)..."
docker-compose build --no-cache
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Docker image built"
echo ""

# Step 5: Setup SSL
echo "🔒 Step 5/7: Setting up SSL certificates..."
chmod +x setup-ssl.sh
if [ "$EUID" -eq 0 ]; then
    ./setup-ssl.sh
else
    sudo ./setup-ssl.sh
fi
if [ $? -ne 0 ]; then
    echo "❌ SSL setup failed!"
    echo "   You can run it manually later: sudo ./setup-ssl.sh"
    read -p "Continue without SSL? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✅ SSL configured"
echo ""

# Step 6: Start services
echo "🚀 Step 6/7: Starting all services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "❌ Failed to start services!"
    exit 1
fi
echo "✅ Services started"
echo ""

# Step 7: Verify
echo "🔍 Step 7/7: Running diagnostics..."
sleep 10
docker-compose exec -T hrms-app node debug-env.js
echo ""

# Show status
echo "📊 Container Status:"
docker-compose ps
echo ""

echo "===================================="
echo "✅ Installation Complete!"
echo ""
echo "🌐 Your application is available at:"
echo "   https://zenova.sbs"
echo ""
echo "📋 Useful commands:"
echo "   View logs:    docker-compose logs -f"
echo "   Restart:      docker-compose restart"
echo "   Stop:         docker-compose down"
echo "   Status:       docker-compose ps"
echo ""
echo "📖 For detailed guide, see: FRESH_INSTALL.md"
echo "===================================="

