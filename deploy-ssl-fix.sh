#!/bin/bash

# Quick SSL Fix Deployment Script for IP 209.38.126.55
# This script fixes the nginx configuration and deploys SSL

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

print_status "🚀 Starting SSL Fix Deployment for 209.38.126.55"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Navigate to project directory
cd /root/hrms

print_status "🔄 Stopping current containers..."
docker-compose down

print_status "🔧 Creating fixed nginx SSL configuration..."
cat > nginx.ssl.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream hrms_app {
        server hrms-hrms-app-1:3000;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        
        # SSL Security Settings
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # Main application
        location / {
            proxy_pass http://hrms_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF

print_status "🔐 Ensuring SSL certificates exist..."
if [ ! -f ssl/fullchain.pem ] || [ ! -f ssl/privkey.pem ]; then
    print_status "📜 Creating SSL certificates for 209.38.126.55..."
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=HRMS/CN=209.38.126.55"
    print_success "SSL certificates created!"
else
    print_success "SSL certificates already exist!"
fi

print_status "🔧 Updating environment for HTTPS..."
sed -i 's|http://|https://|g' .env
sed -i 's|139\.59\.27\.50|209.38.126.55|g' .env

print_status "🚀 Starting HRMS with SSL..."
docker-compose up -d

print_status "⏳ Waiting for containers to start..."
sleep 15

print_status "🔍 Testing SSL setup..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://209.38.126.55 || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    print_success "HTTPS is working! Status: $HTTP_STATUS"
else
    print_warning "HTTPS status: $HTTP_STATUS"
fi

REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://209.38.126.55 || echo "000")
if [ "$REDIRECT_STATUS" = "301" ] || [ "$REDIRECT_STATUS" = "302" ]; then
    print_success "HTTP to HTTPS redirect working! Status: $REDIRECT_STATUS"
else
    print_warning "HTTP redirect status: $REDIRECT_STATUS"
fi

print_success "🎉 SSL Fix Deployment Complete!"
echo ""
echo "📋 Access Information:"
echo "🌐 HTTPS URL: https://209.38.126.55"
echo "🔒 HTTP URL: http://209.38.126.55 (redirects to HTTPS)"
echo ""
print_warning "⚠️  Using self-signed certificate - browsers will show security warning"
print_warning "⚠️  Click 'Advanced' → 'Proceed to 209.38.126.55 (unsafe)' in browser"
echo ""
echo "🔍 To check logs: docker-compose logs -f"
echo "🔧 To check status: docker-compose ps"
