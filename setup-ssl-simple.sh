#!/bin/bash

# Simple HRMS SSL Setup Script
# This script sets up SSL for your HRMS application with self-signed certificates as fallback

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

# Get server IP
SERVER_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || echo "209.38.126.55")

# Allow user to specify domain or use IP
if [ -n "$1" ]; then
    DOMAIN="$1"
    print_status "🌐 Using domain: $DOMAIN"
else
    DOMAIN="$SERVER_IP"
    print_status "📍 Using IP address: $SERVER_IP"
fi

print_status "🚀 Starting Simple HRMS SSL Setup"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "Please run this script as root (use sudo)"
    exit 1
fi

# Navigate to project directory
cd /root/hrms

# Create SSL directories
print_status "📁 Creating SSL directories..."
mkdir -p ssl
mkdir -p certbot/conf
mkdir -p certbot/www

# Stop current containers
print_status "🛑 Stopping current containers..."
docker-compose down || true

# Try Let's Encrypt first
print_status "🔐 Attempting Let's Encrypt SSL certificate..."

# Start temporary HTTP server for certificate generation
docker run -d --name temp-nginx -p 80:80 -v $(pwd)/certbot/www:/var/www/certbot nginx:alpine

# Wait for nginx to start
sleep 5

# Try to get Let's Encrypt certificate
LETSENCRYPT_SUCCESS=false
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email admin@$DOMAIN \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d $DOMAIN && LETSENCRYPT_SUCCESS=true

# Stop temporary nginx
docker stop temp-nginx && docker rm temp-nginx

if [ "$LETSENCRYPT_SUCCESS" = true ]; then
    print_success "Let's Encrypt certificate obtained successfully!"
    
    # Update nginx SSL config with Let's Encrypt certificates
    cp nginx.ssl.conf nginx.ssl.conf.backup
    sed -i "s|DOMAIN_PLACEHOLDER|$DOMAIN|g" nginx.ssl.conf
    
else
    print_warning "Let's Encrypt failed, creating self-signed certificate..."
    
    # Create self-signed certificate
    mkdir -p ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout ssl/privkey.pem \
        -out ssl/fullchain.pem \
        -subj "/C=US/ST=State/L=City/O=HRMS/CN=$DOMAIN"
    
    print_success "Self-signed certificate created!"
    
    # Create nginx config for self-signed certificates
    cat > nginx.ssl.conf << EOF
events {
    worker_connections 1024;
}

http {
    upstream hrms_app {
        server hrms-hrms-app-1:3000;
    }

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;

    # HTTP server - redirect to HTTPS
    server {
        listen 80;
        server_name _;

        # Redirect all traffic to HTTPS
        location / {
            return 301 https://\$host\$request_uri;
        }
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name _;

        # SSL Configuration - Self-signed
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

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://hrms_app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$server_name;
        }

        # Main application
        location / {
            proxy_pass http://hrms_app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$server_name;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF
fi

# Update environment for HTTPS
print_status "🔧 Updating environment configuration..."
if [ -f .env ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|g" .env
    if grep -q "NEXT_PUBLIC_APP_URL" .env; then
        sed -i "s|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://$DOMAIN|g" .env
    else
        echo "NEXT_PUBLIC_APP_URL=https://$DOMAIN" >> .env
    fi
    print_success "Environment updated for HTTPS"
fi

# Start with SSL
print_status "🚀 Starting HRMS with SSL..."
if [ "$LETSENCRYPT_SUCCESS" = true ]; then
    docker-compose -f docker-compose.ssl.yml up -d
else
    docker-compose up -d
fi

# Wait for services
sleep 30

# Test the setup
print_status "🔍 Testing SSL setup..."
HTTPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -k https://$DOMAIN || echo "000")
if [ "$HTTPS_STATUS" = "200" ]; then
    print_success "HTTPS is working!"
else
    print_warning "HTTPS status: $HTTPS_STATUS"
fi

print_success "🎉 HRMS SSL Setup Complete!"
echo ""
echo "📋 Access Information:"
echo "🌐 HTTPS URL: https://$DOMAIN"
echo "🔒 HTTP URL: http://$DOMAIN (redirects to HTTPS)"
echo ""
if [ "$LETSENCRYPT_SUCCESS" = false ]; then
    print_warning "⚠️  Using self-signed certificate - browsers will show security warning"
    print_warning "⚠️  For production, use a proper domain and run: sudo ./setup-ssl.sh yourdomain.com"
fi
echo ""
echo "🔍 To check logs: docker-compose logs -f"
