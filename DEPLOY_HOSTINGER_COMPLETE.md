# 🚀 Deploy XTRI SISU 2026 - Hostinger VPS (Guia Completo)

## 📋 Informações do Servidor

- **VPS Hostinger:** 212.85.19.50
- **Domínio:** xtrisisu.com
- **API:** api.xtrisisu.com
- **Repositório:** https://github.com/x-tri/sisu2025.git

## ✅ Status Atual

| Serviço | URL | Status |
|---------|-----|--------|
| Frontend | http://xtrisisu.com | ✅ Online |
| API | http://api.xtrisisu.com | ✅ Online |
| API Health | http://api.xtrisisu.com/health | ✅ Online |

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      VPS Hostinger                       │
│                    212.85.19.50                         │
├─────────────────────────────────────────────────────────┤
│  Traefik (Portas 80/443)                                │
│  ├─ xtrisisu.com → xtrisisu-frontend:3000              │
│  └─ api.xtrisisu.com → xtrisisu-backend:8000           │
│                                                          │
│  Docker Containers:                                     │
│  ├─ xtrisisu-frontend (porta 3001)                     │
│  ├─ xtrisisu-backend (porta 8001)                      │
│                                                          │
│  Supabase (Externo)                                     │
│  └─ https://sisymqzxvuktdcbsbpbp.supabase.co          │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Deploy Automático

Execute na VPS:

```bash
cd /var/www/xtrisisu
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build

# Configurar Traefik
docker cp traefik-xtrisisu.yml coolify-proxy:/traefik/dynamic/xtrisisu.yml
```

## 🔍 Verificação

```bash
# Testar API
curl http://api.xtrisisu.com/health

# Testar Frontend
curl http://xtrisisu.com
```

## 🆘 Troubleshooting

### Erro 404
Verificar se o arquivo de configuração do Traefik está no lugar:
```bash
docker exec coolify-proxy ls -la /traefik/dynamic/
```

### Container unhealthy
```bash
docker logs xtrisisu-frontend
docker logs xtrisisu-backend
```

### SSL não funciona
O Traefik tenta gerar certificados automaticamente. Verificar logs:
```bash
docker logs coolify-proxy | grep -i "acme\|certificate"
```

## 📝 Comandos Úteis

```bash
# Ver logs
docker logs -f xtrisisu-frontend
docker logs -f xtrisisu-backend

# Reiniciar
docker compose -f docker-compose.prod.yml restart

# Parar
docker compose -f docker-compose.prod.yml down

# Atualizar
git pull && docker compose -f docker-compose.prod.yml up -d --build
```
