# SSL Certificate Setup for zenova.sbs

This guide explains how to set up automatic SSL certificates using Let's Encrypt for your Talio HRMS application.

## Prerequisites

1. **Domain DNS Configuration**: Ensure `zenova.sbs` and `www.zenova.sbs` point to your server's IP address
2. **Docker and Docker Compose** installed on your server
3. **Ports 80 and 443** open on your server firewall

## Initial SSL Certificate Setup

### Step 1: Clone/Pull the Repository on Your Server

```bash
cd /path/to/your/project
git pull origin main
```

### Step 2: Make the SSL Setup Script Executable

```bash
chmod +x init-letsencrypt.sh
```

### Step 3: Run the SSL Initialization Script

```bash
./init-letsencrypt.sh
```

This script will:
- Download recommended TLS parameters from certbot
- Create a dummy certificate to start nginx
- Request a real Let's Encrypt certificate for zenova.sbs and www.zenova.sbs
- Configure automatic certificate renewal

### Step 4: Start Your Application

```bash
docker-compose up -d
```

## How It Works

### Automatic Certificate Renewal

The `certbot` container automatically renews your SSL certificates every 12 hours. The certificates are valid for 90 days, and certbot will renew them when they have 30 days or less remaining.

### Configuration Files

1. **docker-compose.yml**: Defines three services:
   - `hrms-app`: Your Next.js application
   - `nginx`: Reverse proxy with SSL termination
   - `certbot`: Automatic certificate management

2. **nginx.ssl.conf**: Nginx configuration with:
   - HTTP to HTTPS redirect
   - SSL certificate configuration
   - Security headers
   - Proxy settings for your app

3. **init-letsencrypt.sh**: One-time setup script for initial certificate generation

### Certificate Storage

Certificates are stored in `./certbot/conf/` and are mounted as volumes in the nginx container. This means:
- Certificates persist across container restarts
- Certificates are automatically renewed
- No manual intervention needed

## Deployment Workflow

### Every Time You Push Code

1. **On Your Local Machine:**
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. **On Your Server:**
   ```bash
   cd /path/to/your/project
   git pull origin main
   docker-compose down
   docker-compose build --no-cache
   docker-compose up -d
   ```

### SSL Certificates Will:
- ✅ Automatically persist across deployments
- ✅ Automatically renew before expiration
- ✅ Work immediately without manual setup

## Troubleshooting

### Check Certificate Status

```bash
docker-compose exec certbot certbot certificates
```

### Manually Renew Certificate

```bash
docker-compose exec certbot certbot renew
```

### View Nginx Logs

```bash
docker-compose logs nginx
```

### View Certbot Logs

```bash
docker-compose logs certbot
```

### Test SSL Configuration

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=zenova.sbs

## Important Notes

1. **Email Address**: The script uses `avi2001raj@gmail.com` for Let's Encrypt notifications
2. **Rate Limits**: Let's Encrypt has rate limits (50 certificates per domain per week)
3. **Staging Mode**: If testing, set `staging=1` in `init-letsencrypt.sh` to avoid rate limits
4. **Certificate Validity**: Certificates are valid for 90 days and auto-renew at 60 days

## Security Features

Your SSL setup includes:
- ✅ TLS 1.2 and 1.3 support
- ✅ Strong cipher suites
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Automatic HTTP to HTTPS redirect
- ✅ SSL session caching
- ✅ OCSP stapling

## File Structure

```
.
├── docker-compose.yml          # Docker services configuration
├── nginx.ssl.conf              # Nginx SSL configuration
├── init-letsencrypt.sh         # SSL setup script
├── certbot/                    # Certificate storage (auto-created)
│   ├── conf/                   # Certificate files
│   └── www/                    # ACME challenge files
└── SSL_SETUP.md               # This file
```

## Quick Reference Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Rebuild and restart
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# View logs
docker-compose logs -f

# Check certificate expiry
docker-compose exec certbot certbot certificates

# Force certificate renewal
docker-compose exec certbot certbot renew --force-renewal
```

## Support

If you encounter any issues:
1. Check that your domain DNS is correctly configured
2. Ensure ports 80 and 443 are open
3. Review nginx and certbot logs
4. Verify the `.env` file has correct values

Your SSL certificates will now automatically renew and persist across all deployments! 🎉

