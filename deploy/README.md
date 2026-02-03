# XTRI SISU 2026 - Deploy Guide

Guia completo para deploy do XTRI SISU 2026 usando Docker Compose + Nginx.

## 📁 Estrutura de Arquivos

```
deploy/
├── docker-compose.yml              # Orquestração dos containers
├── docker-compose.override.yml     # Configuração de desenvolvimento
├── .env.example                   # Template de variáveis de ambiente
├── README.md                      # Este arquivo
├── Makefile                       # Comandos automatizados
├── nginx/
│   └── nginx.conf                 # Configuração do reverse proxy
├── frontend/
│   └── Dockerfile                 # Next.js standalone
├── backend/
│   └── Dockerfile                 # Python/FastAPI
└── scripts/
    ├── deploy.sh                  # Deploy automatizado
    ├── setup-ssl.sh              # Configuração SSL com Certbot
    ├── build-local.sh            # Teste de build local
    ├── backup.sh                 # Backup de dados
    └── monitor.sh                # Monitoramento do sistema
```

## 🚀 Deploy Rápido (Hostinger/Coolify)

### Opção 1: Deploy Automatizado (Recomendado)

```bash
# 1. Acessar servidor
ssh root@IP_DO_HOSTINGER

# 2. Criar diretório
mkdir -p /opt/x-sisu-2026
cd /opt/x-sisu-2026

# 3. Clonar repositório
git clone SEU_REPO.git .

# 4. Configurar variáveis de ambiente
cp deploy/.env.example deploy/.env
nano deploy/.env  # Editar com suas credenciais

# 5. Executar deploy
cd deploy
sudo ./scripts/deploy.sh
```

### Opção 2: Usando Makefile

```bash
cd /opt/x-sisu-2026/deploy

# Ver comandos disponíveis
make help

# Build e start
make build
make up

# Ver logs
make logs

# Testar endpoints
make test
```

### Opção 3: Docker Compose Manual

```bash
cd /opt/x-sisu-2026/deploy

# Criar .env
nano .env

# Build e start
docker compose up -d --build

# Ver status
docker ps
docker compose logs -f
```

## 🔧 Configuração do .env

```env
# Supabase Configuration
SUPABASE_URL=https://rqzxcturezryjbwsptld.supabase.co
SUPABASE_SERVICE_KEY=sua_service_key_aqui
SUPABASE_ANON_KEY=sua_anon_key_aqui

# Frontend Public Variables
NEXT_PUBLIC_SUPABASE_URL=https://rqzxcturezryjbwsptld.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Optional: Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
WEBHOOK_URL=
```

## 🔒 Configurar SSL (HTTPS)

### Opção 1: Script Automatizado

```bash
cd /opt/x-sisu-2026/deploy
sudo ./scripts/setup-ssl.sh sisu2026.xtri.com.br
```

### Opção 2: Certbot Manual

```bash
# Instalar Certbot
apt-get install -y certbot

# Obter certificado
certbot certonly --standalone -d sisu2026.xtri.com.br

# Copiar para o projeto
mkdir -p /opt/x-sisu-2026/ssl
cp /etc/letsencrypt/live/sisu2026.xtri.com.br/fullchain.pem /opt/x-sisu-2026/ssl/
cp /etc/letsencrypt/live/sisu2026.xtri.com.br/privkey.pem /opt/x-sisu-2026/ssl/

# Atualizar docker-compose.yml para usar SSL
# (editar nginx service para usar porta 443 e montar certificados)
```

## 🧪 Teste Local Antes do Deploy

```bash
cd /opt/x-sisu-2026/deploy

# Testar build local
./scripts/build-local.sh

# Ou usar Makefile
make build-local
```

## 📝 Comandos Úteis

### Makefile

```bash
make help           # Lista todos os comandos
make build          # Buildar containers
make up             # Iniciar serviços
make down           # Parar serviços
make restart        # Reiniciar serviços
make logs           # Ver todos os logs
make logs-backend   # Logs do backend
make logs-frontend  # Logs do frontend
make shell-backend  # Acessar shell do backend
make shell-frontend # Acessar shell do frontend
make test           # Testar endpoints
make deploy         # Deploy completo
make ssl DOMAIN=... # Configurar SSL
```

### Docker Compose

```bash
# Desenvolvimento (com hot reload)
docker compose -f docker-compose.yml -f docker-compose.override.yml up

# Produção
docker compose up -d

# Ver logs
docker compose logs -f
docker logs sisu-backend --tail 100
docker logs sisu-frontend --tail 100

# Restart
docker compose restart

# Parar tudo
docker compose down

# Rebuild completo
docker compose down
docker compose build --no-cache
docker compose up -d
```

### Monitoramento

```bash
# Monitoramento do sistema
./scripts/monitor.sh

# Ou via Makefile
make monitor

# Ver recursos
docker stats

# Health check
curl http://localhost:8082/health
curl http://localhost:8082/api/courses?limit=5
```

### Backup

```bash
# Criar backup
./scripts/backup.sh /opt/backups

# Backup automático (adicionar ao crontab)
0 2 * * * /opt/x-sisu-2026/deploy/scripts/backup.sh /opt/backups
```

## 🔧 Troubleshooting

### Container não inicia

```bash
# Verificar logs
docker logs sisu-backend --tail 50
docker logs sisu-frontend --tail 50

# Verificar se portas estão livres
netstat -tlnp | grep 8082

# Verificar variáveis de ambiente
docker exec sisu-backend env
docker exec sisu-frontend env
```

### Erro de conexão com Supabase

```bash
# Testar conexão do container
docker exec -it sisu-backend python -c "
from src.storage.supabase_client import SupabaseClient
client = SupabaseClient()
print('Connected:', client.test_connection())
"

# Verificar se as variáveis estão configuradas
docker exec sisu-backend env | grep SUPABASE
```

### Problemas de permissão

```bash
# Ajustar permissões
chown -R 1000:1000 /opt/x-sisu-2026/data
chmod -R 755 /opt/x-sisu-2026/data

# Permissões Docker
usermod -aG docker $USER
```

### Erro de NaN no JSON

O backend já tem tratamento automático de NaN via `SafeJSONResponse`. Se ainda houver problemas:

```python
# Verificar logs do backend
docker logs sisu-backend --tail 100 | grep -i "nan\|error"
```

## 🔄 Atualização do Código

```bash
cd /opt/x-sisu-2026

# Pull das mudanças
git pull

# Rebuild e restart
cd deploy
make deploy
# ou
docker compose down && docker compose up -d --build

# Verificar status
make test
```

## 📊 Portas Utilizadas

| Serviço  | Porta Interna | Porta Externa | Descrição           |
|----------|---------------|---------------|---------------------|
| Nginx    | 80            | 8082          | Reverse proxy       |
| Frontend | 3000          | -             | Next.js app         |
| Backend  | 8000          | -             | FastAPI             |

## 🌐 Configuração de Domínio

No painel do Hostinger/DNS:

1. Crie um registro A apontando para o IP do servidor:
   ```
   Type: A
   Name: sisu2026
   Value: IP_DO_SERVIDOR
   TTL: 3600
   ```

2. Aguarde propagação DNS (pode levar até 24h)

3. Configure o SSL conforme seção acima

4. Teste: `curl https://sisu2026.xtri.com.br/health`

## 🚀 Deploy no Coolify

1. No Coolify, criar novo projeto
2. Selecionar "Docker Compose"
3. Configurar:
   - Repository: seu repo
   - Base Directory: `deploy`
   - Docker Compose File: `docker-compose.yml`
4. Adicionar variáveis de ambiente do `.env`
5. Deploy!

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `make logs` ou `docker logs <container>`
2. Teste a API: `curl http://localhost:8082/health`
3. Verifique variáveis: `docker exec sisu-backend env`
4. Execute o monitor: `./scripts/monitor.sh`
5. Teste localmente: `./scripts/build-local.sh`

## 📚 Referências

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Coolify Docs](https://coolify.io/docs/)
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
