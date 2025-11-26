#!/bin/bash

# SSL Setup Script for zenova.sbs using Certbot
# Run this ONCE to obtain SSL certificate

set -e

echo "🔒 Setting up SSL for zenova.sbs..."
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Please run as root: sudo bash setup-ssl-certbot.sh"
    exit 1
fi

# Install certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt update
    apt install certbot -y
    echo "✅ Certbot installed"
else
    echo "✅ Certbot already installed"
fi

# Create certbot directories
echo "📁 Creating certbot directories..."
mkdir -p ./certbot/conf
mkdir -p ./certbot/www
echo "✅ Directories created"

# Stop containers
echo "🛑 Stopping containers..."
docker-compose down
echo "✅ Containers stopped"

# Check if certificate already exists
if [ -d "./certbot/conf/live/zenova.sbs" ]; then
    echo "⚠️  Certificate already exists!"
    read -p "Do you want to renew it? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔄 Renewing certificate..."
        certbot renew --standalone
    fi
else
    echo "🔐 Obtaining SSL certificate for zenova.sbs..."
    echo ""
    echo "You will be asked for:"
    echo "  1. Email address (for urgent renewal and security notices)"
    echo "  2. Agreement to Terms of Service"
    echo ""
    
    # Obtain certificate
    certbot certonly --standalone \
        -d zenova.sbs \
        -d www.zenova.sbs \
        --config-dir ./certbot/conf \
        --work-dir ./certbot/work \
        --logs-dir ./certbot/logs
    
    if [ $? -eq 0 ]; then
        echo "✅ Certificate obtained successfully!"
    else
        echo "❌ Failed to obtain certificate"
        exit 1
    fi
fi

# Verify certificate
if [ -f "./certbot/conf/live/zenova.sbs/fullchain.pem" ]; then
    echo ""
    echo "✅ Certificate files found:"
    ls -la ./certbot/conf/live/zenova.sbs/
    echo ""
    
    # Show expiry date
    EXPIRY=$(openssl x509 -enddate -noout -in ./certbot/conf/live/zenova.sbs/fullchain.pem | cut -d= -f2)
    echo "📅 Certificate valid until: $EXPIRY"
else
    echo "❌ Certificate files not found!"
    exit 1
fi

# Start containers with SSL
echo ""
echo "🚀 Starting containers with SSL..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Test HTTPS
echo ""
echo "🧪 Testing HTTPS connection..."
if curl -f -k https://zenova.sbs > /dev/null 2>&1; then
    echo "✅ HTTPS is working!"
else
    echo "⚠️  HTTPS test failed (this is normal if DNS isn't pointing to this server yet)"
fi

# Final summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 SSL Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your HRMS is now configured for HTTPS!"
echo ""
echo "✅ Certificate location: ./certbot/conf/live/zenova.sbs/"
echo "✅ Auto-renewal: Certbot container renews every 12 hours"
echo ""
echo "🌐 Your application will be available at:"
echo "   https://zenova.sbs"
echo "   https://www.zenova.sbs"
echo ""
echo "📊 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Restart:       docker-compose restart"
echo "   Stop:          docker-compose down"
echo "   Start:         docker-compose up -d"
echo ""
echo "🔄 Certificate auto-renewal is handled by the certbot container"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

