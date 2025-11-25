#!/bin/bash

# Quick Setup Script for HRMS PWA on Digital Ocean
# Run this on your Ubuntu server: curl -fsSL https://raw.githubusercontent.com/deependr20/hrms/main/quick-setup.sh | bash

echo "🚀 HRMS PWA Quick Setup for Digital Ocean Ubuntu Server"
echo "======================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}[INFO]${NC} Starting automated deployment..."

# Update system
echo -e "${BLUE}[INFO]${NC} Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}[INFO]${NC} Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${BLUE}[INFO]${NC} Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Install Git
sudo apt install git -y

# Clone repository
echo -e "${BLUE}[INFO]${NC} Cloning HRMS repository..."
cd /home/$USER
rm -rf hrms
git clone https://github.com/deependr20/hrms.git
cd hrms

# Create environment file
echo -e "${YELLOW}[SETUP]${NC} Creating environment configuration..."
cat > .env << 'EOF'
# MongoDB Configuration - UPDATE WITH YOUR ACTUAL MONGODB URI
MONGODB_URI=mongodb+srv://hrms:your-password@your-cluster.mongodb.net/hrms?

# JWT Configuration - UPDATE WITH SECURE RANDOM STRING
JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random-at-least-32-characters

# NextAuth Configuration - UPDATE WITH SECURE RANDOM STRING
NEXTAUTH_SECRET=your-nextauth-secret-key-here-also-make-it-random-32-chars
NEXTAUTH_URL=http://localhost:3000

# Node Environment
NODE_ENV=production
EOF

# Make scripts executable
chmod +x deploy.sh
chmod +x quick-setup.sh

# Configure firewall
echo -e "${BLUE}[INFO]${NC} Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo -e "${GREEN}[SUCCESS]${NC} Quick setup completed!"
echo ""
echo "📝 NEXT STEPS:"
echo "1. Edit environment file: nano .env"
echo "2. Update MongoDB URI, JWT_SECRET, and NEXTAUTH_SECRET"
echo "3. Run deployment: ./deploy.sh"
echo ""
echo -e "${YELLOW}[IMPORTANT]${NC} You MUST update the .env file before deploying!"
