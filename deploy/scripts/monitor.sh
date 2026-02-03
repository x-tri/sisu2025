#!/bin/bash
# XTRI SISU 2026 - Monitoring Script
# Usage: ./scripts/monitor.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT="${PORT:-8082}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"

echo -e "${BLUE}=== XTRI SISU 2026 - System Monitor ===${NC}"
echo "Timestamp: $(date)"
echo ""

# Check Docker
echo -e "${YELLOW}Docker Status:${NC}"
if docker ps &> /dev/null; then
    echo -e "${GREEN}✓ Docker is running${NC}"
else
    echo -e "${RED}✗ Docker is not running${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Container Status:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "(NAMES|sisu-)" || echo "No containers found"

echo ""
echo -e "${YELLOW}Health Checks:${NC}"

# Check Nginx
if curl -sf http://localhost:${PORT}/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Nginx health check passed${NC}"
else
    echo -e "${RED}✗ Nginx health check failed${NC}"
fi

# Check API
if curl -sf http://localhost:${PORT}/api/courses?limit=1 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API endpoint responding${NC}"
else
    echo -e "${RED}✗ API endpoint not responding${NC}"
fi

echo ""
echo -e "${YELLOW}Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "(NAME|sisu-)" || echo "No container stats available"

echo ""
echo -e "${YELLOW}Disk Usage:${NC}"
df -h /opt /var/lib/docker 2>/dev/null | grep -v "tmpfs" || df -h

echo ""
echo -e "${YELLOW}Recent Errors (last 50 lines):${NC}"
docker logs sisu-backend --tail 50 2>&1 | grep -i "error\|exception\|traceback" | tail -10 || echo "No recent errors found"

echo ""
echo -e "${BLUE}=== Monitor Complete ===${NC}"

# Send alert if configured and issues found
if [ -n "$ALERT_WEBHOOK" ]; then
    # Check for issues
    ISSUES=0
    if ! curl -sf http://localhost:${PORT}/health > /dev/null 2>&1; then
        ISSUES=$((ISSUES + 1))
    fi
    
    if [ $ISSUES -gt 0 ]; then
        curl -s -X POST -H "Content-Type: application/json" \
            -d "{\"text\":\"🚨 XTRI SISU 2026 - $ISSUES service(s) having issues\"}" \
            "$ALERT_WEBHOOK" > /dev/null 2>&1 || true
    fi
fi
