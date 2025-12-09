#!/bin/bash

# ============================================
# Talio HRMS - Production Deployment Script
# ============================================
# Usage: ./deploy-production.sh [options]
# Options:
#   --fresh       Fresh install (includes seeding)
#   --ssl         Set up SSL with Certbot
#   --no-docker   Deploy without Docker (use PM2)
#   --help        Show this help message
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
FRESH_INSTALL=false
SETUP_SSL=false
USE_DOCKER=true
DOMAIN="app.talio.in"

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
        --no-docker)
            USE_DOCKER=false
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
            echo "  --ssl         Set up SSL with Certbot (requires --domain)"
            echo "  --domain      Your domain name (e.g., app.example.com)"
            echo "  --no-docker   Deploy without Docker (uses PM2)"
            echo "  --help        Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./deploy-production.sh                    # Standard Docker deployment"
            echo "  ./deploy-production.sh --fresh            # Fresh install with seeding"
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

check_requirements() {
    log_info "Checking requirements..."
    
    if $USE_DOCKER; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed. Please install Docker first."
            echo "Run: curl -fsSL https://get.docker.com | sh"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
            log_error "Docker Compose is not installed."
            exit 1
        fi
        log_success "Docker is available"
    else
        if ! command -v node &> /dev/null; then
            log_error "Node.js is not installed. Please install Node.js 20+."
            echo "Run: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
            exit 1
        fi
        
        if ! command -v pm2 &> /dev/null; then
            log_warning "PM2 is not installed. Installing..."
            npm install -g pm2
        fi
        log_success "Node.js and PM2 are available"
    fi
}

check_env_file() {
    log_info "Checking environment configuration..."
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            log_warning ".env file not found. Creating from .env.example..."
            cp .env.example .env
            log_error "Please edit .env file with your production values before continuing."
            echo ""
            echo "Required variables:"
            echo "  - MONGODB_URI"
            echo "  - JWT_SECRET"
            echo "  - NEXTAUTH_SECRET"
            echo "  - NEXTAUTH_URL"
            echo ""
            echo "After editing, run this script again."
            exit 1
        else
            log_error ".env file not found and no .env.example available."
            exit 1
        fi
    fi
    
    # Check for required env vars
    source .env 2>/dev/null || true
    
    if [ -z "$MONGODB_URI" ]; then
        log_error "MONGODB_URI is not set in .env file"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is not set in .env file"
        exit 1
    fi
    
    log_success "Environment configuration looks good"
}

pull_latest_code() {
    log_info "Pulling latest code from repository..."
    
    if [ -d .git ]; then
        git fetch origin
        git pull origin main
        log_success "Code updated to latest version"
    else
        log_warning "Not a git repository. Skipping pull."
        log_info "To clone: git clone https://<YOUR_TOKEN>@github.com/avirajsharma-ops/Talio.git /var/www/talio"
    fi
}

deploy_with_docker() {
    log_info "Deploying with Docker..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose down 2>/dev/null || true
    
    # Remove old images to ensure fresh build
    log_info "Building new Docker image..."
    docker-compose build --no-cache
    
    # Start containers
    log_info "Starting containers..."
    docker-compose up -d
    
    # Wait for container to be healthy
    log_info "Waiting for application to start..."
    sleep 10
    
    # Check if container is running
    if docker-compose ps | grep -q "Up"; then
        log_success "Docker containers are running"
    else
        log_error "Docker containers failed to start"
        docker-compose logs --tail=50
        exit 1
    fi
}

deploy_without_docker() {
    log_info "Deploying without Docker (using PM2)..."
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci --production=false
    
    # Build the application
    log_info "Building application..."
    SKIP_ENV_VALIDATION=true npm run build
    
    # Stop existing PM2 process
    log_info "Restarting PM2 process..."
    pm2 delete talio 2>/dev/null || true
    
    # Start with PM2
    NODE_ENV=production pm2 start server.js --name "talio" -i max
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot
    pm2 startup 2>/dev/null || true
    
    log_success "Application deployed with PM2"
}

seed_database() {
    log_info "Seeding database..."
    
    if $USE_DOCKER; then
        # Wait for container to be ready
        sleep 5
        docker-compose exec -T app npm run seed
    else
        npm run seed
    fi
    
    log_success "Database seeded successfully"
}

setup_vector_search() {
    log_info "Setting up vector search for MAYA AI..."
    
    if $USE_DOCKER; then
        docker-compose exec -T app node scripts/setup-vector-db.js || true
        docker-compose exec -T app node scripts/generate-embeddings-free.js || true
    else
        node scripts/setup-vector-db.js || true
        node scripts/generate-embeddings-free.js || true
    fi
    
    log_success "Vector search setup complete"
}

setup_ssl() {
    if [ -z "$DOMAIN" ]; then
        log_error "Domain is required for SSL setup. Use --domain your-domain.com"
        exit 1
    fi
    
    log_info "Setting up SSL for $DOMAIN..."
    
    # Install Certbot if not present
    if ! command -v certbot &> /dev/null; then
        log_info "Installing Certbot..."
        sudo apt-get update
        sudo apt-get install -y certbot python3-certbot-nginx
    fi
    
    # Install Nginx if not present
    if ! command -v nginx &> /dev/null; then
        log_info "Installing Nginx..."
        sudo apt-get install -y nginx
    fi
    
    # Create Nginx configuration
    log_info "Creating Nginx configuration..."
    sudo tee /etc/nginx/sites-available/talio > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /api/socketio {
        proxy_pass http://localhost:3000;
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
    sudo ln -sf /etc/nginx/sites-available/talio /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    
    # Get SSL certificate
    log_info "Obtaining SSL certificate..."
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
        log_warning "Certbot failed. You may need to run it manually:"
        echo "sudo certbot --nginx -d $DOMAIN"
    }
    
    log_success "SSL setup complete for $DOMAIN"
}

health_check() {
    log_info "Performing health check..."
    
    sleep 5
    
    # Try to hit the health endpoint
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ]; then
        log_success "Application is running and responding (HTTP $HTTP_STATUS)"
    else
        log_warning "Application returned HTTP $HTTP_STATUS - it may still be starting up"
    fi
}

show_status() {
    echo ""
    echo "============================================"
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo "============================================"
    echo ""
    
    if $USE_DOCKER; then
        echo "Docker Status:"
        docker-compose ps
        echo ""
        echo "View logs: docker-compose logs -f"
    else
        echo "PM2 Status:"
        pm2 status
        echo ""
        echo "View logs: pm2 logs talio"
    fi
    
    echo ""
    echo "Application URL: http://localhost:3000"
    if [ -n "$DOMAIN" ]; then
        echo "Domain URL: https://$DOMAIN"
    fi
    echo ""
    echo "============================================"
}

# Main deployment flow
main() {
    echo ""
    echo "============================================"
    echo "  Talio HRMS - Production Deployment"
    echo "============================================"
    echo ""
    
    check_requirements
    check_env_file
    pull_latest_code
    
    if $USE_DOCKER; then
        deploy_with_docker
    else
        deploy_without_docker
    fi
    
    if $FRESH_INSTALL; then
        seed_database
        setup_vector_search
    fi
    
    if $SETUP_SSL; then
        setup_ssl
    fi
    
    health_check
    show_status
}

# Run main function
main
