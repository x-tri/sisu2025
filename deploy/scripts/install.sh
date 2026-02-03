#!/bin/bash
# XTRI SISU 2026 - Complete Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/deploy/scripts/install.sh | sudo bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="x-sisu-2026"
INSTALL_DIR="/opt/${PROJECT_NAME}"
REPO_URL="${REPO_URL:-https://github.com/user/repo.git}"
PORT="${PORT:-8082}"

echo -e "${BLUE}=== XTRI SISU 2026 - Installation Script ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo -e "${RED}Cannot detect OS${NC}"
    exit 1
fi

echo -e "${YELLOW}Detected OS: $OS $VER${NC}"

# Install Docker
echo -e "${BLUE}Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    case $OS in
        "Ubuntu"|"Debian GNU/Linux")
            apt-get update
            apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
            curl -fsSL https://download.docker.com/linux/$ID/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$ID $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            ;;
        "CentOS Linux"|"Red Hat Enterprise Linux"|"Fedora")
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
            systemctl start docker
            systemctl enable docker
            ;;
        *)
            echo -e "${YELLOW}Installing Docker via convenience script...${NC}"
            curl -fsSL https://get.docker.com | sh
            ;;
    esac
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Install Docker Compose
echo -e "${BLUE}Installing Docker Compose...${NC}"
if ! docker compose version &> /dev/null; then
    if ! docker-compose version &> /dev/null; then
        # Install docker-compose standalone
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    fi
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Install additional tools
echo -e "${BLUE}Installing additional tools...${NC}"
case $OS in
    "Ubuntu"|"Debian GNU/Linux")
        apt-get install -y git curl jq
        ;;
    "CentOS Linux"|"Red Hat Enterprise Linux"|"Fedora")
        yum install -y git curl jq
        ;;
esac
echo -e "${GREEN}✓ Tools installed${NC}"

# Create project directory
echo -e "${BLUE}Creating project directory...${NC}"
mkdir -p $INSTALL_DIR
cd $INSTALL_DIR

# Clone repository
echo -e "${BLUE}Cloning repository...${NC}"
if [ -d ".git" ]; then
    git pull
else
    git clone $REPO_URL .
fi
echo -e "${GREEN}✓ Repository cloned${NC}"

# Setup environment
echo -e "${BLUE}Setting up environment...${NC}"
cd $INSTALL_DIR/deploy

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Please edit .env file with your credentials:${NC}"
    echo -e "  ${BLUE}nano $INSTALL_DIR/deploy/.env${NC}"
    echo ""
    echo -e "Required variables:"
    echo -e "  - SUPABASE_URL"
    echo -e "  - SUPABASE_SERVICE_KEY"
    echo -e "  - SUPABASE_ANON_KEY"
    echo -e "  - NEXT_PUBLIC_SUPABASE_URL"
    echo -e "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo ""
    read -p "Press Enter to continue after editing .env..."
fi

# Build and start
echo -e "${BLUE}Building and starting services...${NC}"
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# Wait for services
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Health check
echo -e "${BLUE}Running health checks...${NC}"
HEALTHY=true

if curl -sf http://localhost:$PORT/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    HEALTHY=false
fi

# Check containers
for container in sisu-frontend sisu-backend sisu-nginx; do
    if docker ps | grep -q $container; then
        echo -e "${GREEN}✓ $container is running${NC}"
    else
        echo -e "${RED}✗ $container is not running${NC}"
        HEALTHY=false
    fi
done

if [ "$HEALTHY" = true ]; then
    echo ""
    echo -e "${GREEN}=== Installation Complete ===${NC}"
    echo -e "Application is running at: ${BLUE}http://localhost:$PORT${NC}"
    echo ""
    echo -e "Useful commands:"
    echo -e "  View logs:    ${YELLOW}cd $INSTALL_DIR/deploy && make logs${NC}"
    echo -e "  Restart:      ${YELLOW}cd $INSTALL_DIR/deploy && make restart${NC}"
    echo -e "  Update:       ${YELLOW}cd $INSTALL_DIR && git pull && cd deploy && make deploy${NC}"
    echo -e "  Setup SSL:    ${YELLOW}cd $INSTALL_DIR/deploy && sudo ./scripts/setup-ssl.sh your-domain.com${NC}"
    echo ""
    echo -e "Monitor: ${YELLOW}./scripts/monitor.sh${NC}"
    echo -e "Backup:  ${YELLOW}./scripts/backup.sh${NC}"
else
    echo ""
    echo -e "${RED}=== Installation Issues Detected ===${NC}"
    echo -e "Check logs: ${YELLOW}cd $INSTALL_DIR/deploy && make logs${NC}"
    exit 1
fi
