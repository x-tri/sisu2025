#!/bin/bash
# XTRI SISU 2026 - Local Build Test Script
# Usage: ./scripts/build-local.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== XTRI SISU 2026 - Local Build Test ===${NC}"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$DEPLOY_DIR")"

cd "$PROJECT_DIR"

# Check if .env exists
if [ ! -f "$DEPLOY_DIR/.env" ]; then
    echo -e "${YELLOW}Creating .env from template...${NC}"
    cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
    echo -e "${RED}WARNING: Please edit $DEPLOY_DIR/.env with your actual values!${NC}"
fi

# Load environment variables
export $(grep -v '^#' "$DEPLOY_DIR/.env" | xargs)

echo -e "${BLUE}Step 1: Testing Python dependencies...${NC}"
cd "$PROJECT_DIR"
python3 -c "
import sys
try:
    import fastapi
    import uvicorn
    import numpy
    import requests
    import pydantic
    print('✓ All Python dependencies are installed')
except ImportError as e:
    print(f'✗ Missing dependency: {e}')
    sys.exit(1)
"

echo -e "${BLUE}Step 2: Testing Python API...${NC}"
cd "$PROJECT_DIR"
timeout 5 python3 -c "
import sys
sys.path.insert(0, '.')
from src.api.main import app
print('✓ FastAPI app loads successfully')
" || echo -e "${YELLOW}⚠ Could not test API (timeout or error)${NC}"

echo -e "${BLUE}Step 3: Testing Node.js dependencies...${NC}"
cd "$PROJECT_DIR/web"
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing node_modules...${NC}"
    npm install
fi
echo -e "${GREEN}✓ Node.js dependencies OK${NC}"

echo -e "${BLUE}Step 4: Testing Next.js build...${NC}"
cd "$PROJECT_DIR/web"
if npm run build > /tmp/next-build.log 2>&1; then
    echo -e "${GREEN}✓ Next.js build successful${NC}"
else
    echo -e "${RED}✗ Next.js build failed${NC}"
    echo "Build log:"
    tail -50 /tmp/next-build.log
    exit 1
fi

echo -e "${BLUE}Step 5: Testing Docker...${NC}"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker is installed${NC}"
    
    # Test Docker Compose
    if docker compose version &> /dev/null || docker-compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose is installed${NC}"
    else
        echo -e "${RED}✗ Docker Compose is not installed${NC}"
    fi
else
    echo -e "${RED}✗ Docker is not installed${NC}"
fi

echo -e "${BLUE}Step 6: Building Docker images...${NC}"
cd "$DEPLOY_DIR"

# Build backend
echo -e "${YELLOW}Building backend image...${NC}"
docker build -f backend/Dockerfile -t x-sisu-2026-backend:test "$PROJECT_DIR" || {
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend image built${NC}"

# Build frontend
echo -e "${YELLOW}Building frontend image...${NC}"
docker build \
    --build-arg NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}" \
    --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" \
    -f frontend/Dockerfile -t x-sisu-2026-frontend:test "$PROJECT_DIR/web" || {
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend image built${NC}"

echo -e "${BLUE}Step 7: Testing Docker images...${NC}"

# Test backend
echo -e "${YELLOW}Testing backend container...${NC}"
docker run --rm -d \
    --name sisu-backend-test \
    -e SUPABASE_URL="${SUPABASE_URL:-}" \
    -e SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}" \
    -p 8000:8000 \
    x-sisu-2026-backend:test

sleep 5

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend health check passed${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    docker logs sisu-backend-test --tail 20
fi

docker stop sisu-backend-test > /dev/null 2>&1 || true

echo ""
echo -e "${GREEN}=== Build Test Complete ===${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Update $DEPLOY_DIR/.env with your credentials"
echo -e "  2. Run: ${BLUE}cd $DEPLOY_DIR && sudo ./scripts/deploy.sh${NC}"
echo -e "  3. Or manually: ${BLUE}cd $DEPLOY_DIR && docker compose up -d${NC}"
