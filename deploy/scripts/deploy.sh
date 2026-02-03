#!/bin/bash
# XTRI SISU 2026 - Deploy Script
# Usage: ./deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="x-sisu-2026"
DEPLOY_DIR="/opt/${PROJECT_NAME}"
PORT="8082"

echo -e "${GREEN}=== XTRI SISU 2026 - Deploy Script ===${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Check if docker and docker compose are installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create deploy directory if it doesn't exist
echo -e "${YELLOW}Creating deploy directory...${NC}"
mkdir -p ${DEPLOY_DIR}

# Check if .env file exists
if [ ! -f "${DEPLOY_DIR}/.env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example ${DEPLOY_DIR}/.env
    echo -e "${RED}WARNING: Please edit ${DEPLOY_DIR}/.env with your actual values before continuing!${NC}"
    exit 1
fi

# Pull latest changes (if using git)
if [ -d ".git" ]; then
    echo -e "${YELLOW}Pulling latest changes...${NC}"
    git pull
fi

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker compose -f docker-compose.yml down || true

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Health check
echo -e "${YELLOW}Running health checks...${NC}"

# Check Nginx
if curl -f http://localhost:${PORT}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nginx is healthy${NC}"
else
    echo -e "${RED}✗ Nginx health check failed${NC}"
fi

# Check containers
if docker ps | grep -q "sisu-frontend"; then
    echo -e "${GREEN}✓ Frontend container is running${NC}"
else
    echo -e "${RED}✗ Frontend container is not running${NC}"
fi

if docker ps | grep -q "sisu-backend"; then
    echo -e "${GREEN}✓ Backend container is running${NC}"
else
    echo -e "${RED}✗ Backend container is not running${NC}"
fi

if docker ps | grep -q "sisu-nginx"; then
    echo -e "${GREEN}✓ Nginx container is running${NC}"
else
    echo -e "${RED}✗ Nginx container is not running${NC}"
fi

echo -e "${GREEN}=== Deploy completed! ===${NC}"
echo -e "Application should be accessible at: http://localhost:${PORT}"
echo -e ""
echo -e "Useful commands:"
echo -e "  View logs: ${YELLOW}docker logs sisu-frontend --tail 50${NC}"
echo -e "  Restart:   ${YELLOW}docker compose restart${NC}"
echo -e "  Stop:      ${YELLOW}docker compose down${NC}"
