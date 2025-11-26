#!/bin/bash

# Backend Diagnostic Script for Talio HRMS
# This script helps diagnose 500 errors and backend issues

echo "=========================================="
echo "Talio HRMS Backend Diagnostics"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check 1: Docker Status
echo -e "${BLUE}[1/10] Checking Docker containers...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
    docker-compose ps
else
    echo -e "${RED}✗ Containers are not running${NC}"
    echo "Run: docker-compose up -d"
fi
echo ""

# Check 2: Environment File
echo -e "${BLUE}[2/10] Checking environment file...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"
    echo "Key variables:"
    grep -E "^(MONGODB_URI|NEXTAUTH_URL|NEXT_PUBLIC_APP_URL|NODE_ENV)=" .env | sed 's/=.*/=***/'
else
    echo -e "${RED}✗ .env file not found${NC}"
    echo "Create .env file with production settings"
fi
echo ""

# Check 3: Application Logs
echo -e "${BLUE}[3/10] Checking application logs (last 20 lines)...${NC}"
if docker-compose ps | grep -q "hrms-app"; then
    docker-compose logs hrms-app --tail=20
else
    echo -e "${RED}✗ Application container not running${NC}"
fi
echo ""

# Check 4: MongoDB Connection
echo -e "${BLUE}[4/10] Testing MongoDB connection...${NC}"
if docker-compose ps | grep -q "hrms-app"; then
    docker-compose exec -T hrms-app node -e "
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('❌ MONGODB_URI not set');
        process.exit(1);
    }
    console.log('Testing connection to MongoDB...');
    mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
        .then(() => {
            console.log('✅ MongoDB connection successful');
            process.exit(0);
        })
        .catch(err => {
            console.error('❌ MongoDB connection failed:', err.message);
            process.exit(1);
        });
    " 2>&1
else
    echo -e "${RED}✗ Cannot test - container not running${NC}"
fi
echo ""

# Check 5: Port Availability
echo -e "${BLUE}[5/10] Checking port availability...${NC}"
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    echo -e "${GREEN}✓ Port 80 is in use${NC}"
else
    echo -e "${RED}✗ Port 80 is not in use${NC}"
fi

if netstat -tuln 2>/dev/null | grep -q ":443 "; then
    echo -e "${GREEN}✓ Port 443 is in use${NC}"
else
    echo -e "${YELLOW}⚠ Port 443 is not in use (SSL not configured)${NC}"
fi
echo ""

# Check 6: Disk Space
echo -e "${BLUE}[6/10] Checking disk space...${NC}"
df -h / | tail -1 | awk '{
    used = substr($5, 1, length($5)-1);
    if (used > 90) {
        print "\033[0;31m✗ Disk usage critical: " $5 "\033[0m";
    } else if (used > 80) {
        print "\033[1;33m⚠ Disk usage high: " $5 "\033[0m";
    } else {
        print "\033[0;32m✓ Disk usage OK: " $5 "\033[0m";
    }
}'
echo ""

# Check 7: Memory Usage
echo -e "${BLUE}[7/10] Checking memory usage...${NC}"
free -h | grep Mem | awk '{
    used = $3;
    total = $2;
    print "Used: " used " / Total: " total;
}'
echo ""

# Check 8: Nginx Status
echo -e "${BLUE}[8/10] Checking nginx status...${NC}"
if docker-compose ps | grep -q "nginx"; then
    echo -e "${GREEN}✓ Nginx container is running${NC}"
    if docker-compose exec -T nginx nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
    else
        echo -e "${RED}✗ Nginx configuration has errors${NC}"
        docker-compose exec -T nginx nginx -t
    fi
else
    echo -e "${RED}✗ Nginx container not running${NC}"
fi
echo ""

# Check 9: SSL Certificates
echo -e "${BLUE}[9/10] Checking SSL certificates...${NC}"
if [ -d "certbot/conf/live/mwg.talio.in" ]; then
    echo -e "${GREEN}✓ SSL certificates found for mwg.talio.in${NC}"
    if [ -f "certbot/conf/live/mwg.talio.in/fullchain.pem" ]; then
        echo "Certificate expires:"
        openssl x509 -enddate -noout -in certbot/conf/live/mwg.talio.in/fullchain.pem 2>/dev/null || echo "Cannot read certificate"
    fi
else
    echo -e "${YELLOW}⚠ SSL certificates not found${NC}"
    echo "Run: sudo ./setup-ssl-mwg.sh"
fi
echo ""

# Check 10: Application Health
echo -e "${BLUE}[10/10] Testing application health...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓ Application is responding${NC}"
else
    echo -e "${RED}✗ Application is not responding${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}Diagnostic Summary${NC}"
echo "=========================================="
echo ""
echo "Common fixes for 500 errors:"
echo ""
echo "1. Check MongoDB connection:"
echo "   - Verify MONGODB_URI in .env"
echo "   - Check MongoDB Atlas IP whitelist"
echo "   - Test connection manually"
echo ""
echo "2. Rebuild application:"
echo "   docker-compose down"
echo "   docker-compose build --no-cache"
echo "   docker-compose up -d"
echo ""
echo "3. Check logs for specific errors:"
echo "   docker-compose logs hrms-app --tail=100"
echo ""
echo "4. Verify environment variables:"
echo "   docker-compose exec hrms-app env | grep -E 'MONGODB|NEXTAUTH|JWT'"
echo ""
echo "5. Clear Docker cache if needed:"
echo "   docker system prune -a"
echo ""
echo "=========================================="
echo "For detailed deployment guide, see:"
echo "DEPLOY_MWG_TALIO.md"
echo "=========================================="

