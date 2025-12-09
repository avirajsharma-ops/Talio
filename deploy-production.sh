#!/bin/bash

# ============================================
# Talio HRMS - Production Deployment Script
# ============================================
# One-command deployment for Ubuntu/Debian servers
# Installs all dependencies automatically
# SSL certificates persist across Docker rebuilds
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="app.talio.in"
APP_DIR=$(pwd)

# Default options
FRESH_INSTALL=false
SETUP_SSL=false
SKIP_DEPS=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fresh)
            FRESH_INSTALL=true
            shift
            ;;
        --ssl)
            SETUP_SSL=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --domain)
            DOMAIN="$2"
            shift 2
            ;;
        --help)
            echo "Talio HRMS - Production Deployment Script"
            echo ""
            echo "Usage: ./deploy-production.sh [options]"
            echo ""
            echo "Options:"
            echo "  --fresh       Fresh install (includes database seeding)"
            echo "  --ssl         Set up SSL with Certbot"
            echo "  --domain      Your domain name (default: app.talio.in)"
            echo "  --skip-deps   Skip dependency installation"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./deploy-production.sh --fresh --ssl"
            echo "  ./deploy-production.sh --ssl --domain app.example.com"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Install system dependencies
install_dependencies() {
    log_info "Installing system dependencies..."
    
    # Update package list
    apt-get update -qq
    
    # Install essential packages
    apt-get install -y -qq \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        git \
        ufw \
        software-properties-common \
        > /dev/null 2>&1
    
    log_success "System dependencies installed"
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_success "Docker is already installed"
        return
    fi
    
    log_info "Installing Docker..."
    
    # Remove old versions
    apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null || true
    chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installed successfully"
}

# Install Nginx
install_nginx() {
    if command -v nginx &> /dev/null; then
        log_success "Nginx is already installed"
        return
    fi
    
    log_info "Installing Nginx..."
    apt-get install -y -qq nginx > /dev/null 2>&1
    systemctl start nginx
    systemctl enable nginx
    log_success "Nginx installed successfully"
}

# Install Certbot
install_certbot() {
    if command -v certbot &> /dev/null; then
        log_success "Certbot is already installed"
        return
    fi
    
    log_info "Installing Certbot..."
    apt-get install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
    log_success "Certbot installed successfully"
}

# Configure firewall
configure_firewall() {
    log_info "Configuring firewall..."
    
    ufw --force reset > /dev/null 2>&1
    ufw default deny incoming > /dev/null 2>&1
    ufw default allow outgoing > /dev/null 2>&1
    ufw allow ssh > /dev/null 2>&1
    ufw allow 'Nginx Full' > /dev/null 2>&1
    ufw --force enable > /dev/null 2>&1
    
    log_success "Firewall configured"
}

# Check and create .env file
check_env_file() {
    log_info "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_warning ".env file not found. Creating from .env.example..."
            cp .env.example .env
            log_error "Please edit .env file with your production values!"
            echo ""
            echo "Required variables to set in .env:"
            echo "  - MONGODB_URI=your_mongodb_connection_string"
            echo "  - JWT_SECRET=your_secure_jwt_secret"
            echo "  - NEXTAUTH_SECRET=your_secure_nextauth_secret"
            echo "  - NEXTAUTH_URL=https://${DOMAIN}"
            echo ""
            echo "Run: nano .env"
            echo "Then run this script again."
            exit 1
        else
            log_error ".env file not found!"
            exit 1
        fi
    fi
    
    # Validate required vars
    source .env 2>/dev/null || true
    
    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI is not set in .env file"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is not set in .env file"
        exit 1
    fi
    
    log_success "Environment configuration validated"
}

# Configure Nginx for the domain (HTTP only initially)
configure_nginx_http() {
    log_info "Configuring Nginx (HTTP) for ${DOMAIN}..."
    
    # Create certbot webroot directory
    mkdir -p /var/www/certbot
    
    # Create HTTP-only Nginx config for initial setup and SSL challenge
    cat > /etc/nginx/sites-available/talio <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # For Certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy to app
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    # Socket.IO
    location /api/socketio {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 86400;
    }
}
EOF

    # Enable site
    rm -f /etc/nginx/sites-enabled/default
    ln -sf /etc/nginx/sites-available/talio /etc/nginx/sites-enabled/talio
    
    # Test and reload
    nginx -t
    systemctl reload nginx
    
    log_success "Nginx HTTP configured"
}

# Configure Nginx with SSL
configure_nginx_ssl() {
    log_info "Configuring Nginx with SSL for ${DOMAIN}..."
    
    # Create full SSL Nginx config
    cat > /etc/nginx/sites-available/talio <<EOF
# Talio HRMS - Nginx Configuration with SSL
# SSL certificates managed by Certbot (persist across Docker rebuilds)

upstream talio_app {
    server 127.0.0.1:3000;
    keepalive 64;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    # For Certbot challenges
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN};

    # SSL certificates (managed by Certbot - outside Docker)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # SSL configuration
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Proxy settings
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_cache_bypass \$http_upgrade;
    proxy_read_timeout 86400;
    proxy_send_timeout 86400;

    # Main application
    location / {
        proxy_pass http://talio_app;
    }

    # Socket.IO - WebSocket support
    location /api/socketio {
        proxy_pass http://talio_app;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://talio_app;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }

    # Favicon caching
    location /favicon.ico {
        proxy_pass http://talio_app;
        proxy_cache_valid 7d;
    }
}
EOF

    # Test and reload
    nginx -t
    systemctl reload nginx
    
    log_success "Nginx SSL configured"
}

# Obtain SSL certificate
obtain_ssl_certificate() {
    log_info "Obtaining SSL certificate for ${DOMAIN}..."
    
    # Create certbot webroot directory
    mkdir -p /var/www/certbot
    
    # Check if certificate already exists
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        log_success "SSL certificate already exists - reusing it"
        configure_nginx_ssl
        return
    fi
    
    # Obtain certificate using webroot method
    certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email admin@${DOMAIN} \
        --agree-tos \
        --no-eff-email \
        -d ${DOMAIN}
    
    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained"
        
        # Update Nginx config to use SSL
        configure_nginx_ssl
        
        # Set up auto-renewal
        setup_ssl_renewal
    else
        log_error "Failed to obtain SSL certificate"
        log_warning "The app will continue to work on HTTP"
        log_info "You can try again later with: certbot --nginx -d ${DOMAIN}"
    fi
}

# Setup SSL auto-renewal
setup_ssl_renewal() {
    log_info "Setting up SSL auto-renewal..."
    
    # Create renewal hook to reload nginx
    mkdir -p /etc/letsencrypt/renewal-hooks/deploy
    cat > /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh <<EOF
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
    
    # Create cron job for renewal
    cat > /etc/cron.d/certbot-renew <<EOF
# Renew SSL certificates twice daily
0 0,12 * * * root certbot renew --quiet
EOF
    
    # Test renewal
    certbot renew --dry-run > /dev/null 2>&1 || true
    
    log_success "SSL auto-renewal configured"
}

# Pull latest code
pull_latest_code() {
    log_info "Pulling latest code..."
    
    if [ -d .git ]; then
        git fetch origin
        git pull origin main
        log_success "Code updated"
    else
        log_warning "Not a git repository - skipping pull"
    fi
}

# Deploy with Docker
deploy_docker() {
    log_info "Deploying with Docker..."
    
    # Stop existing containers gracefully
    log_info "Stopping existing containers..."
    docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
    
    # Build image
    log_info "Building Docker image (this may take 3-5 minutes)..."
    if docker compose build --no-cache 2>/dev/null; then
        :
    elif docker-compose build --no-cache 2>/dev/null; then
        :
    else
        log_error "Docker build failed"
        exit 1
    fi
    
    # Start containers
    log_info "Starting containers..."
    docker compose up -d 2>/dev/null || docker-compose up -d
    
    # Wait for startup
    log_info "Waiting for application to start..."
    sleep 15
    
    # Check status
    if docker compose ps 2>/dev/null | grep -q "Up" || docker-compose ps 2>/dev/null | grep -q "Up"; then
        log_success "Docker containers are running"
    else
        log_error "Docker containers failed to start"
        docker compose logs --tail=100 2>/dev/null || docker-compose logs --tail=100
        exit 1
    fi
}

# Seed database
seed_database() {
    log_info "Seeding database..."
    
    sleep 5
    docker compose exec -T app npm run seed 2>/dev/null || docker-compose exec -T app npm run seed || {
        log_warning "Database seeding had issues - you may need to run it manually"
    }
    
    log_success "Database seeding complete"
}

# Setup vector search
setup_vector_search() {
    log_info "Setting up vector search for MAYA AI..."
    
    docker compose exec -T app node scripts/setup-vector-db.js 2>/dev/null || true
    docker compose exec -T app node scripts/generate-embeddings-free.js 2>/dev/null || true
    
    log_success "Vector search setup complete"
}

# Health check
health_check() {
    log_info "Performing health check..."
    
    sleep 5
    
    for i in 1 2 3 4 5; do
        HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
        
        if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
            log_success "Application is running (HTTP $HTTP_STATUS)"
            return
        fi
        
        log_info "Waiting for app to start... (attempt $i/5)"
        sleep 5
    done
    
    log_warning "Application may still be starting - check logs with: docker compose logs -f"
}

# Show final status
show_status() {
    echo ""
    echo "============================================"
    echo -e "${GREEN}  Deployment Complete!${NC}"
    echo "============================================"
    echo ""
    echo "Docker Status:"
    docker compose ps 2>/dev/null || docker-compose ps
    echo ""
    echo "Useful commands:"
    echo "  View logs:     docker compose logs -f"
    echo "  Restart app:   docker compose restart"
    echo "  Stop app:      docker compose down"
    echo "  Rebuild:       docker compose up -d --build"
    echo "  Renew SSL:     certbot renew"
    echo ""
    echo "Application URLs:"
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        echo -e "  ${GREEN}https://${DOMAIN}${NC} (SSL enabled)"
    else
        echo "  http://${DOMAIN}"
        echo ""
        echo "To enable SSL later, run:"
        echo "  certbot --nginx -d ${DOMAIN}"
    fi
    echo ""
    echo "SSL certificates location: /etc/letsencrypt/live/${DOMAIN}/"
    echo "Certificates persist across Docker rebuilds!"
    echo ""
    echo "============================================"
}

# Main deployment flow
main() {
    echo ""
    echo "============================================"
    echo "  Talio HRMS - Production Deployment"
    echo "============================================"
    echo "  Domain: ${DOMAIN}"
    echo "  Fresh Install: ${FRESH_INSTALL}"
    echo "  Setup SSL: ${SETUP_SSL}"
    echo "============================================"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root: sudo ./deploy-production.sh [options]"
        exit 1
    fi
    
    # Install dependencies
    if ! $SKIP_DEPS; then
        install_dependencies
        install_docker
        install_nginx
        if $SETUP_SSL; then
            install_certbot
        fi
        configure_firewall
    fi
    
    # Check environment
    check_env_file
    
    # Pull latest code
    pull_latest_code
    
    # Configure Nginx (HTTP first)
    configure_nginx_http
    
    # Deploy Docker
    deploy_docker
    
    # Setup SSL if requested (after Docker is running for webroot challenge)
    if $SETUP_SSL; then
        obtain_ssl_certificate
    fi
    
    # Fresh install tasks
    if $FRESH_INSTALL; then
        seed_database
        setup_vector_search
    fi
    
    # Health check
    health_check
    
    # Show status
    show_status
}

# Run main
main
