# 🚀 Deploy XTRI SISU 2026 - Hostinger VPS (Guia Completo)

## 📋 Informações do Servidor

- **VPS Hostinger:** 212.85.19.50
- **Coolify API:** 1|r13O3inF977HixYKdpJ39a1lIfuMYz96iqT9qZgNb4a92d36
- **Domínio:** xtrisisu.com
- **Repositório:** https://github.com/x-tri/sisu2025.git

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      VPS Hostinger                       │
│                    212.85.19.50                         │
├─────────────────────────────────────────────────────────┤
│  Coolify (Porta 8000)                                   │
│  ├─ Traefik (Proxy Reverso + SSL)                       │
│  │   ├─ xtrisisu.com → Frontend (Porta 3000)           │
│  │   └─ api.xtrisisu.com → Backend (Porta 8000)        │
│  │                                                       │
│  ├─ Frontend (Next.js)                                  │
│  │   └─ Container: xtrisisu-frontend                    │
│  │                                                       │
│  └─ Backend (FastAPI)                                   │
│      └─ Container: xtrisisu-backend                     │
│                                                          │
│  Supabase (Externo)                                     │
│  └─ https://sisymqzxvuktdcbsbpbp.supabase.co           │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Pré-requisitos na VPS

### 1. Acessar a VPS
```bash
ssh root@212.85.19.50
```

### 2. Verificar instalações
```bash
# Verificar Docker
docker --version
docker-compose --version

# Verificar Coolify
curl http://localhost:8000
```

## 📦 Deploy Automático

### Opção 1: Script de Deploy Direto (Recomendado)

```bash
# Copiar script para VPS
scp deploy-vps.sh root@212.85.19.50:/root/

# Conectar e executar
ssh root@212.85.19.50
cd /root
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Opção 2: Deploy via Coolify UI

1. Acesse: `http://212.85.19.50:8000`
2. Faça login com as credenciais do Coolify
3. Siga os passos na seção "Configuração Manual"

### Opção 3: Deploy via Coolify API

```bash
# Executar script de deploy via API
curl -X POST http://212.85.19.50:8000/api/v1/deploy \
  -H "Authorization: Bearer 1|r13O3inF977HixYKdpJ39a1lIfuMYz96iqT9qZgNb4a92d36" \
  -H "Content-Type: application/json" \
  -d '{
    "repository": "https://github.com/x-tri/sisu2025.git",
    "branch": "main",
    "docker_compose_location": "docker-compose.prod.yml"
  }'
```

## ⚙️ Configuração Manual (Passo a Passo)

### 1. Criar Projeto no Coolify

```bash
# Acesse o painel
http://212.85.19.50:8000

# Clique em "+ New" → "Project"
# Nome: xtrisisu
# Descrição: XTRI SISU 2026 - Monitoramento de Notas
```

### 2. Configurar Backend (API)

```bash
# No Coolify, crie um novo serviço:
# Type: Docker Compose
# Name: xtrisisu-backend

# Docker Compose Content:
cat << 'EOF'
version: '3.8'
services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: xtrisisu-backend
    restart: unless-stopped
    environment:
      - SUPABASE_URL=https://sisymqzxvuktdcbsbpbp.supabase.co
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    networks:
      - coolify
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
networks:
  coolify:
    external: true
EOF

# Domínio: api.xtrisisu.com
# Porta: 8000
```

### 3. Configurar Variáveis de Ambiente (Backend)

```bash
SUPABASE_URL=https://sisymqzxvuktdcbsbpbp.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o
```

### 4. Configurar Frontend

```bash
# No Coolify, crie outro serviço:
# Type: Docker Compose
# Name: xtrisisu-frontend
# Base Directory: web

# Docker Compose Content:
cat << 'EOF'
version: '3.8'
services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: xtrisisu-frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
      - API_URL=https://api.xtrisisu.com
    depends_on:
      - backend
    networks:
      - coolify
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
networks:
  coolify:
    external: true
EOF

# Domínio: xtrisisu.com
# Porta: 3000
```

### 5. Configurar SSL (Let's Encrypt)

No Coolify, ative SSL para ambos os domínios:
- `xtrisisu.com`
- `api.xtrisisu.com`

## 🌐 Configuração DNS

No painel do seu registrador de domínio:

| Tipo | Host | Valor | TTL |
|------|------|-------|-----|
| A | @ | 212.85.19.50 | 3600 |
| A | www | 212.85.19.50 | 3600 |
| A | api | 212.85.19.50 | 3600 |
| CNAME | * | xtrisisu.com | 3600 |

## 🔍 Verificação Pós-Deploy

### Verificar Backend
```bash
curl http://212.85.19.50:8000/health
# Esperado: {"status":"healthy","database":"connected"}

curl http://api.xtrisisu.com/health
# Esperado: {"status":"healthy","database":"connected"}
```

### Verificar Frontend
```bash
curl http://212.85.19.50:3000
# Esperado: HTML da página

curl https://xtrisisu.com
# Esperado: HTML da página com SSL
```

### Verificar Logs
```bash
# Backend
docker logs xtrisisu-backend

# Frontend
docker logs xtrisisu-frontend

# Todos os serviços
docker-compose -f docker-compose.prod.yml logs -f
```

## 🆘 Troubleshooting

### Erro: "Connection refused"
```bash
# Verificar se containers estão rodando
docker ps

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml restart
```

### Erro: "SSL Certificate Error"
```bash
# Aguardar propagação DNS (pode levar até 24h)
# Verificar certificado
openssl s_client -connect xtrisisu.com:443 -servername xtrisisu.com
```

### Erro: "Database not configured"
```bash
# Verificar variáveis de ambiente
docker exec xtrisisu-backend env | grep SUPABASE

# Verificar se Supabase está acessível
curl https://sisymqzxvuktdcbsbpbp.supabase.co/rest/v1/
```

### Limpar e Recomeçar
```bash
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a -f
docker-compose -f docker-compose.prod.yml up -d --build
```

## 📊 Monitoramento

### Health Checks
- Backend: `http://api.xtrisisu.com/health`
- Frontend: `http://xtrisisu.com`

### Métricas Docker
```bash
docker stats
```

### Logs em Tempo Real
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔄 Atualização

Para atualizar após push no GitHub:

```bash
ssh root@212.85.19.50
cd /var/www/xtrisisu
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
```

Ou pelo Coolify:
1. Acesse o serviço
2. Clique em "Redeploy"

## 📞 Suporte

- **Coolify Docs:** https://coolify.io/docs/
- **Hostinger VPS Docs:** https://www.hostinger.com/vps-hosting
- **Repositório:** https://github.com/x-tri/sisu2025
