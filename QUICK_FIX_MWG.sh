#!/bin/bash

# Quick Fix Script for mwg.talio.in
# This script attempts to fix common issues and deploy with SSL

set -e

echo "=========================================="
echo "Quick Fix & Deploy for mwg.talio.in"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root: sudo ./QUICK_FIX_MWG.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}Step 1: Stopping existing containers...${NC}"
docker-compose down || true
echo -e "${GREEN}✓ Containers stopped${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking environment file...${NC}"
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found!${NC}"
    echo "Creating .env from template..."
    cp .env.example .env 2>/dev/null || echo "Please create .env file manually"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verifying critical environment variables...${NC}"
if grep -q "MONGODB_URI=mongodb" .env; then
    echo -e "${GREEN}✓ MONGODB_URI is set${NC}"
else
    echo -e "${RED}✗ MONGODB_URI not set in .env${NC}"
    exit 1
fi

if grep -q "mwg.talio.in" .env; then
    echo -e "${GREEN}✓ Domain configured for mwg.talio.in${NC}"
else
    echo -e "${YELLOW}⚠ Updating domain to mwg.talio.in...${NC}"
    sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://mwg.talio.in|g' .env
    sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://mwg.talio.in|g' .env
fi
echo ""

echo -e "${YELLOW}Step 4: Cleaning up old Docker resources...${NC}"
docker system prune -f
echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

echo -e "${YELLOW}Step 5: Building application...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

echo -e "${YELLOW}Step 6: Checking for SSL certificates...${NC}"
if [ -d "certbot/conf/live/mwg.talio.in" ]; then
    echo -e "${GREEN}✓ SSL certificates found${NC}"
    echo -e "${YELLOW}Starting application with SSL...${NC}"
    docker-compose up -d
else
    echo -e "${YELLOW}⚠ SSL certificates not found${NC}"
    echo -e "${YELLOW}Setting up SSL certificates...${NC}"
    
    # Make SSL setup script executable
    chmod +x setup-ssl-mwg.sh
    
    # Run SSL setup
    ./setup-ssl-mwg.sh
fi
echo ""

echo -e "${YELLOW}Step 7: Waiting for application to start...${NC}"
sleep 10
echo ""

echo -e "${YELLOW}Step 8: Checking application status...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
    docker-compose ps
else
    echo -e "${RED}✗ Containers failed to start${NC}"
    echo "Checking logs..."
    docker-compose logs --tail=50
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 9: Testing application...${NC}"
sleep 5
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Application is responding${NC}"
else
    echo -e "${RED}✗ Application is not responding${NC}"
    echo "Checking logs..."
    docker-compose logs hrms-app --tail=30
fi
echo ""

echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${GREEN}Your application should be accessible at:${NC}"
echo -e "${GREEN}https://mwg.talio.in${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Check if site is accessible: https://mwg.talio.in"
echo "2. View logs: docker-compose logs -f"
echo "3. Check status: docker-compose ps"
echo ""
echo -e "${YELLOW}If you encounter issues:${NC}"
echo "1. Run diagnostics: sudo bash diagnose-backend.sh"
echo "2. Check deployment guide: DEPLOY_MWG_TALIO.md"
echo "3. View application logs: docker-compose logs hrms-app --tail=100"
echo ""
echo -e "${GREEN}Monitoring commands:${NC}"
echo "  docker-compose logs -f          # Follow all logs"
echo "  docker-compose logs hrms-app    # Application logs"
echo "  docker-compose ps               # Container status"
echo "  docker-compose restart          # Restart all services"
echo ""

