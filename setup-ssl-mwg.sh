#!/bin/bash

# SSL Setup Script for mwg.talio.in
# This script sets up Let's Encrypt SSL certificates for the Talio HRMS application

set -e

echo "=========================================="
echo "SSL Setup for mwg.talio.in"
echo "=========================================="

# Configuration
DOMAIN="mwg.talio.in"
EMAIL="avi2001raj@gmail.com"
STAGING=0  # Set to 1 for testing, 0 for production

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Creating directories...${NC}"
mkdir -p certbot/conf
mkdir -p certbot/www

echo -e "${YELLOW}Step 2: Stopping existing containers...${NC}"
docker-compose down || true

echo -e "${YELLOW}Step 3: Creating temporary nginx config for HTTP-01 challenge...${NC}"
cat > nginx-temp.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name mwg.talio.in www.mwg.talio.in;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 200 'SSL setup in progress...';
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo -e "${YELLOW}Step 4: Starting temporary nginx container...${NC}"
docker run -d --name temp-nginx \
    -p 80:80 \
    -v $(pwd)/nginx-temp.conf:/etc/nginx/nginx.conf:ro \
    -v $(pwd)/certbot/www:/var/www/certbot:ro \
    nginx:alpine

sleep 5

echo -e "${YELLOW}Step 5: Requesting SSL certificate from Let's Encrypt...${NC}"
if [ $STAGING -eq 1 ]; then
    echo -e "${YELLOW}Using staging server (for testing)${NC}"
    STAGING_ARG="--staging"
else
    echo -e "${GREEN}Using production server${NC}"
    STAGING_ARG=""
fi

docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    $STAGING_ARG \
    -d $DOMAIN \
    -d www.$DOMAIN

echo -e "${YELLOW}Step 6: Stopping temporary nginx...${NC}"
docker stop temp-nginx
docker rm temp-nginx
rm nginx-temp.conf

echo -e "${YELLOW}Step 7: Starting application with SSL...${NC}"
docker-compose up -d

echo -e "${GREEN}=========================================="
echo -e "SSL Setup Complete!"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}Your application is now running with SSL at:${NC}"
echo -e "${GREEN}https://mwg.talio.in${NC}"
echo ""
echo -e "${YELLOW}Certificate Details:${NC}"
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    certbot/certbot certificates

echo ""
echo -e "${YELLOW}Note: Certificates will auto-renew every 12 hours${NC}"
echo ""
echo -e "${GREEN}To check application status:${NC}"
echo "  docker-compose ps"
echo ""
echo -e "${GREEN}To view logs:${NC}"
echo "  docker-compose logs -f"
echo ""
echo -e "${GREEN}To restart:${NC}"
echo "  docker-compose restart"

