#!/bin/bash
# XTRI SISU 2026 - SSL Setup Script using Certbot
# Usage: ./setup-ssl.sh <domain>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Usage: $0 <domain>${NC}"
    echo -e "Example: $0 sisu2026.xtri.com.br"
    exit 1
fi

echo -e "${GREEN}=== XTRI SISU 2026 - SSL Setup ===${NC}"
echo -e "Setting up SSL for domain: ${YELLOW}${DOMAIN}${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}Installing Certbot...${NC}"
    apt-get update
    apt-get install -y certbot
fi

# Obtain certificate
echo -e "${YELLOW}Obtaining SSL certificate...${NC}"
certbot certonly --standalone -d ${DOMAIN} --agree-tos --non-interactive --email admin@${DOMAIN}

# Create SSL directory in deploy
mkdir -p /opt/x-sisu-2026/ssl

# Copy certificates
cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem /opt/x-sisu-2026/ssl/
cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem /opt/x-sisu-2026/ssl/

# Update nginx config to use SSL
cat > /opt/x-sisu-2026/nginx/nginx-ssl.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name _;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }

        # API routes - proxy to backend
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Frontend - proxy to Next.js
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }
    }
}
EOF

echo -e "${YELLOW}Updating docker-compose to use SSL configuration...${NC}"

# Backup original docker-compose
cp /opt/x-sisu-2026/docker-compose.yml /opt/x-sisu-2026/docker-compose.yml.backup

# Update nginx volume to use SSL config and certificates
sed -i 's|./nginx/nginx.conf:/etc/nginx/nginx.conf:ro|./nginx/nginx-ssl.conf:/etc/nginx/nginx.conf:ro\n      - ./ssl:/etc/nginx/ssl:ro|' /opt/x-sisu-2026/docker-compose.yml

# Change port to 443
sed -i 's/"8082:80"/"80:80"\n      - "443:443"/' /opt/x-sisu-2026/docker-compose.yml

echo -e "${GREEN}=== SSL Setup completed! ===${NC}"
echo -e "Restarting containers with SSL..."
cd /opt/x-sisu-2026 && docker compose down && docker compose up -d

echo -e "${GREEN}SSL is now configured for ${DOMAIN}${NC}"
echo -e "Your site should be accessible at: https://${DOMAIN}"
