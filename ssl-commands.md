# 🔐 HRMS SSL Setup Commands

## 🚀 Quick SSL Setup (Automated)

Run this single command to set up SSL automatically:

```bash
cd /root/hrms
chmod +x setup-ssl.sh
./setup-ssl.sh
```

## 📋 Manual SSL Setup (Step by Step)

If you prefer manual setup, follow these commands:

### Step 1: Update Environment for HTTPS
```bash
cd /root/hrms

# Backup current environment
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Update for HTTPS (replace with your actual IP)
sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://199.59.27.50|g' .env
echo "NEXT_PUBLIC_APP_URL=https://199.59.27.50" >> .env
```

### Step 2: Create SSL Directories
```bash
mkdir -p ssl
mkdir -p certbot/conf
mkdir -p certbot/www
```

### Step 3: Stop Current Containers
```bash
docker-compose down
```

### Step 4: Generate SSL Certificate
```bash
# Start temporary HTTP-only setup for certificate generation
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email admin@199.59.27.50 \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d 199.59.27.50
```

### Step 5: Start SSL-Enabled HRMS
```bash
# Start with SSL configuration
docker-compose -f docker-compose.ssl.yml up -d
```

### Step 6: Verify Setup
```bash
# Check container status
docker-compose -f docker-compose.ssl.yml ps

# Test HTTP redirect
curl -I http://199.59.27.50

# Test HTTPS
curl -I -k https://199.59.27.50

# Check logs
docker-compose -f docker-compose.ssl.yml logs -f
```

## 🔧 Troubleshooting Commands

### If SSL Certificate Generation Fails
```bash
# Try with different method
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot certonly \
    --manual \
    --preferred-challenges http \
    --email admin@199.59.27.50 \
    --agree-tos \
    --no-eff-email \
    -d 199.59.27.50
```

### If Nginx Fails to Start
```bash
# Check nginx configuration
docker run --rm -v $(pwd)/nginx.ssl.conf:/etc/nginx/nginx.conf nginx:alpine nginx -t

# Check certificate files
ls -la certbot/conf/live/199.59.27.50/

# Use HTTP-only fallback
docker-compose up -d
```

### Certificate Renewal
```bash
# Manual renewal
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    -v $(pwd)/certbot/www:/var/www/certbot \
    certbot/certbot renew

# Reload nginx after renewal
docker-compose -f docker-compose.ssl.yml exec nginx nginx -s reload
```

## 📊 Monitoring Commands

### Check Certificate Status
```bash
# Check certificate expiry
docker run --rm \
    -v $(pwd)/certbot/conf:/etc/letsencrypt \
    certbot/certbot certificates

# Check SSL connection
openssl s_client -connect 199.59.27.50:443 -servername 199.59.27.50
```

### Check Application Status
```bash
# Container status
docker-compose -f docker-compose.ssl.yml ps

# Application logs
docker-compose -f docker-compose.ssl.yml logs hrms-app

# Nginx logs
docker-compose -f docker-compose.ssl.yml logs nginx

# Real-time logs
docker-compose -f docker-compose.ssl.yml logs -f
```

## 🎯 Expected Results

After successful setup:
- ✅ **HTTPS URL**: https://199.59.27.50 (secure)
- ✅ **HTTP Redirect**: http://199.59.27.50 → https://199.59.27.50
- ✅ **Direct Access**: http://199.59.27.50:3000 (still works)
- ✅ **Auto-Renewal**: Certificate renews automatically

## 🚨 Fallback to HTTP-Only

If SSL setup fails, use this fallback:
```bash
cd /root/hrms
docker-compose down
docker-compose up -d

# Access via HTTP
echo "HRMS available at: http://199.59.27.50"
```
