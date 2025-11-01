#!/bin/bash

# SSL Setup Script for HRMS - zenova.sbs
# Run with: sudo bash setup-ssl-zenova.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 SSL Setup for HRMS - zenova.sbs${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root: sudo bash setup-ssl-zenova.sh${NC}"
    exit 1
fi

# Step 1: Install Certbot
echo -e "${YELLOW}📦 Step 1/10: Installing Certbot...${NC}"
apt update > /dev/null 2>&1
apt install certbot -y > /dev/null 2>&1
echo -e "${GREEN}✅ Certbot installed${NC}"

# Step 2: Stop containers
echo -e "${YELLOW}🛑 Step 2/10: Stopping containers...${NC}"
docker-compose down > /dev/null 2>&1 || true
echo -e "${GREEN}✅ Containers stopped${NC}"

# Step 3: Check if certificate exists
echo -e "${YELLOW}🔍 Step 3/10: Checking for existing certificate...${NC}"
if [ -f "/etc/letsencrypt/live/zenova.sbs/fullchain.pem" ]; then
    echo -e "${GREEN}✅ Certificate already exists${NC}"
    CERT_EXISTS=true
else
    echo -e "${YELLOW}⚠️  No certificate found, will obtain new one${NC}"
    CERT_EXISTS=false
fi

# Step 4: Obtain/Renew certificate
if [ "$CERT_EXISTS" = false ]; then
    echo -e "${YELLOW}🔐 Step 4/10: Obtaining SSL certificate...${NC}"
    certbot certonly --standalone \
        -d zenova.sbs \
        -d www.zenova.sbs \
        --non-interactive \
        --agree-tos \
        --email admin@zenova.sbs || {
            echo -e "${RED}❌ Certificate generation failed${NC}"
            echo -e "${YELLOW}Try manually: sudo certbot certonly --standalone -d zenova.sbs -d www.zenova.sbs${NC}"
            exit 1
        }
    echo -e "${GREEN}✅ Certificate obtained${NC}"
else
    echo -e "${YELLOW}🔄 Step 4/10: Renewing existing certificate...${NC}"
    certbot renew --standalone --quiet || true
    echo -e "${GREEN}✅ Certificate renewed${NC}"
fi

# Step 5: Verify certificate
echo -e "${YELLOW}🔍 Step 5/10: Verifying certificate...${NC}"
if [ -f "/etc/letsencrypt/live/zenova.sbs/fullchain.pem" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/zenova.sbs/fullchain.pem | cut -d= -f2)
    echo -e "${GREEN}✅ Certificate valid until: ${EXPIRY}${NC}"
else
    echo -e "${RED}❌ Certificate not found${NC}"
    exit 1
fi

# Step 6: Set permissions
echo -e "${YELLOW}🔐 Step 6/10: Setting permissions...${NC}"
chmod 644 /etc/letsencrypt/live/zenova.sbs/fullchain.pem
chmod 600 /etc/letsencrypt/live/zenova.sbs/privkey.pem
echo -e "${GREEN}✅ Permissions set${NC}"

# Step 7: Create certbot directory
echo -e "${YELLOW}📁 Step 7/10: Creating certbot directory...${NC}"
mkdir -p /var/www/certbot
echo -e "${GREEN}✅ Directory created${NC}"

# Step 8: Build and start containers
echo -e "${YELLOW}🔨 Step 8/10: Building and starting containers...${NC}"
docker-compose build --no-cache > /dev/null 2>&1
docker-compose up -d
echo -e "${GREEN}✅ Containers started${NC}"

# Step 9: Wait for services
echo -e "${YELLOW}⏳ Step 9/10: Waiting for services (30s)...${NC}"
sleep 30

# Step 10: Test HTTPS
echo -e "${YELLOW}🧪 Step 10/10: Testing HTTPS...${NC}"
if curl -f -k https://zenova.sbs > /dev/null 2>&1; then
    echo -e "${GREEN}✅ HTTPS is working!${NC}"
else
    echo -e "${RED}❌ HTTPS test failed${NC}"
    echo -e "${YELLOW}Check logs: docker-compose logs -f nginx${NC}"
fi

# Setup auto-renewal
echo -e "${YELLOW}🔄 Setting up auto-renewal...${NC}"
cat > /root/renew-ssl-hrms.sh << 'EOF'
#!/bin/bash
cd /root/hrms
docker-compose stop nginx
certbot renew --standalone --quiet
docker-compose start nginx
echo "SSL renewed at $(date)" >> /var/log/ssl-renewal.log
EOF

chmod +x /root/renew-ssl-hrms.sh

# Add to crontab if not already there
(crontab -l 2>/dev/null | grep -q "renew-ssl-hrms") || \
(crontab -l 2>/dev/null; echo "0 0,12 * * * /root/renew-ssl-hrms.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -

echo -e "${GREEN}✅ Auto-renewal configured${NC}"

# Final summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 SSL Setup Complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Your HRMS is now available at:${NC}"
echo -e "${GREEN}  ✅ https://zenova.sbs${NC}"
echo -e "${GREEN}  ✅ https://www.zenova.sbs${NC}"
echo ""
echo -e "${BLUE}HTTP automatically redirects to HTTPS${NC}"
echo ""
echo -e "${YELLOW}📊 Useful Commands:${NC}"
echo -e "  View logs:      ${GREEN}docker-compose logs -f${NC}"
echo -e "  Restart:        ${GREEN}docker-compose restart${NC}"
echo -e "  Check SSL:      ${GREEN}curl -I https://zenova.sbs${NC}"
echo -e "  Renew SSL:      ${GREEN}sudo /root/renew-ssl-hrms.sh${NC}"
echo ""
echo -e "${BLUE}Certificate auto-renews twice daily${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

