#!/bin/bash

# Quick Deploy Script - Fix Backend 500 Error
# Run this on your Hostinger VPS

echo "=========================================="
echo "Deploying Backend Fix for mwg.talio.in"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd ~/Talio || { echo "Error: Talio directory not found"; exit 1; }

echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
git pull origin main

echo ""
echo -e "${YELLOW}Step 2: Fixing environment variables...${NC}"
sed -i 's|NEXTAUTH_URL=http://|NEXTAUTH_URL=https://|g' .env
sed -i 's|NEXT_PUBLIC_APP_URL=http://|NEXT_PUBLIC_APP_URL=https://|g' .env
sed -i 's|mwg.talio.in/|mwg.talio.in|g' .env

echo "Updated URLs:"
cat .env | grep -E "NEXTAUTH_URL|NEXT_PUBLIC_APP_URL"

echo ""
echo -e "${YELLOW}Step 3: Stopping containers...${NC}"
docker-compose down

echo ""
echo -e "${YELLOW}Step 4: Rebuilding application...${NC}"
docker-compose build --no-cache

echo ""
echo -e "${YELLOW}Step 5: Starting containers...${NC}"
docker-compose up -d

echo ""
echo -e "${YELLOW}Step 6: Waiting for application to start...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}Step 7: Checking status...${NC}"
docker-compose ps

echo ""
echo -e "${YELLOW}Step 8: Checking logs...${NC}"
docker-compose logs hrms-app --tail=30

echo ""
echo -e "${GREEN}=========================================="
echo "Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo "Your application should now be working at:"
echo "https://mwg.talio.in"
echo ""
echo "To monitor logs:"
echo "  docker-compose logs -f hrms-app"
echo ""

