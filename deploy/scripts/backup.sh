#!/bin/bash
# XTRI SISU 2026 - Backup Script
# Usage: ./scripts/backup.sh [backup_dir]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${1:-/opt/backups/x-sisu-2026}"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="sisu2026_backup_${DATE}"
RETENTION_DAYS=30

echo -e "${BLUE}=== XTRI SISU 2026 - Backup ===${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup Docker volumes
echo -e "${YELLOW}Creating Docker volume backup...${NC}"
docker run --rm \
    -v x-sisu-2026_sisu-network:/data \
    -v "$BACKUP_DIR:/backup" \
    alpine tar czf "/backup/${BACKUP_NAME}_volumes.tar.gz" -C /data .

# Backup configuration
echo -e "${YELLOW}Creating configuration backup...${NC}"
tar czf "$BACKUP_DIR/${BACKUP_NAME}_config.tar.gz" \
    -C "$(dirname "$0")/.." \
    docker-compose.yml \
    .env \
    nginx/ \
    2>/dev/null || true

# Backup database (if using Supabase, export data via API)
echo -e "${YELLOW}Creating database export...${NC}"
# This would need to be customized based on your Supabase setup
# For now, we'll just create a placeholder
echo "Database backup via Supabase dashboard or API" > "$BACKUP_DIR/${BACKUP_NAME}_database.txt"

# Clean old backups
echo -e "${YELLOW}Cleaning old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "$BACKUP_DIR" -name "sisu2026_backup_*" -type f -mtime +$RETENTION_DAYS -delete

# List backups
echo -e "${GREEN}=== Backup Complete ===${NC}"
echo -e "Backup location: ${BLUE}$BACKUP_DIR${NC}"
echo -e "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -10

echo ""
echo -e "${YELLOW}To restore from backup:${NC}"
echo -e "  1. Stop containers: ${BLUE}docker compose down${NC}"
echo -e "  2. Restore volumes: ${BLUE}docker run --rm -v x-sisu-2026_sisu-network:/data -v $BACKUP_DIR:/backup alpine tar xzf /backup/${BACKUP_NAME}_volumes.tar.gz -C /data${NC}"
echo -e "  3. Start containers: ${BLUE}docker compose up -d${NC}"
