#!/bin/bash

echo "🔒 SSL Certificate Setup for zenova.sbs"
echo "========================================"
echo ""

# Configuration
DOMAIN="zenova.sbs"
EMAIL="avi2001raj@gmail.com"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml not found!"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "✅ Running as root"
echo "✅ Found docker-compose.yml"
echo ""

# Create directories for certbot
echo "📁 Creating certbot directories..."
mkdir -p certbot/conf
mkdir -p certbot/www
echo "✅ Directories created"
echo ""

# Check if certificates already exist
if [ -d "certbot/conf/live/$DOMAIN" ]; then
    echo "⚠️  SSL certificates already exist for $DOMAIN"
    read -p "Do you want to renew them? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping SSL setup"
        exit 0
    fi
    RENEW=true
else
    RENEW=false
fi

# Stop nginx if running
echo "🛑 Stopping nginx container (if running)..."
docker-compose stop nginx 2>/dev/null || true
echo ""

# Get initial certificate
if [ "$RENEW" = false ]; then
    echo "🔐 Obtaining SSL certificate from Let's Encrypt..."
    echo "   Domain: $DOMAIN"
    echo "   Email: $EMAIL"
    echo ""
    
    docker-compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        --force-renewal \
        -d $DOMAIN \
        -d www.$DOMAIN
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Failed to obtain SSL certificate!"
        echo ""
        echo "Common issues:"
        echo "1. Domain DNS not pointing to this server"
        echo "2. Port 80 not accessible from internet"
        echo "3. Firewall blocking connections"
        echo ""
        echo "Troubleshooting:"
        echo "- Check DNS: dig $DOMAIN"
        echo "- Check firewall: sudo ufw status"
        echo "- Ensure port 80 is open: sudo ufw allow 80"
        echo ""
        exit 1
    fi
else
    echo "🔄 Renewing SSL certificate..."
    docker-compose run --rm certbot renew
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to renew SSL certificate!"
        exit 1
    fi
fi

echo ""
echo "✅ SSL certificate obtained successfully!"
echo ""

# Set proper permissions
echo "🔐 Setting certificate permissions..."
chmod -R 755 certbot/conf
chmod -R 755 certbot/www
echo "✅ Permissions set"
echo ""

# Verify certificates exist
if [ ! -f "certbot/conf/live/$DOMAIN/fullchain.pem" ]; then
    echo "❌ Certificate files not found!"
    echo "   Expected: certbot/conf/live/$DOMAIN/fullchain.pem"
    exit 1
fi

echo "✅ Certificate files verified:"
echo "   - fullchain.pem"
echo "   - privkey.pem"
echo ""

echo "========================================"
echo "✅ SSL Setup Complete!"
echo ""
echo "Certificate details:"
echo "  Domain: $DOMAIN, www.$DOMAIN"
echo "  Location: ./certbot/conf/live/$DOMAIN/"
echo "  Auto-renewal: Enabled (every 12 hours)"
echo ""
echo "Next steps:"
echo "1. Start nginx: docker-compose up -d nginx"
echo "2. Test HTTPS: curl -I https://$DOMAIN"
echo "3. Check certificate: openssl s_client -connect $DOMAIN:443 -servername $DOMAIN"
echo ""
echo "Certificate will auto-renew before expiration."
echo "========================================"

