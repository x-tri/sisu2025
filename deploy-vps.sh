#!/bin/bash
# Deploy XTRI SISU 2026 na VPS Hostinger
# Execute na VPS: ./deploy-vps.sh

set -e

echo "🚀 XTRI SISU 2026 - Deploy na VPS"
echo "===================================="
echo ""

# Diretório do projeto
PROJECT_DIR="/var/www/xtrisisu"
GIT_REPO="https://github.com/x-tri/sisu2025.git"

echo "📁 Diretório do projeto: $PROJECT_DIR"
echo ""

# 1. Clonar ou atualizar repositório
echo "📥 Baixando código fonte..."
if [ -d "$PROJECT_DIR" ]; then
    echo "  Atualizando repositório existente..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "  Clonando repositório..."
    git clone "$GIT_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi
echo "✅ Código atualizado"
echo ""

# 2. Verificar Docker
echo "🐳 Verificando Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose não está instalado"
    exit 1
fi
echo "✅ Docker OK"
echo ""

# 3. Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker stop xtrisisu-backend xtrisisu-frontend 2>/dev/null || true
docker rm xtrisisu-backend xtrisisu-frontend 2>/dev/null || true
echo "✅ Containers parados"
echo ""

# 4. Build e deploy
echo "🔨 Fazendo build dos containers..."
export SUPABASE_URL="https://sisymqzxvuktdcbsbpbp.supabase.co"
export SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_KEY:-}"

docker-compose -f docker-compose.prod.yml build --no-cache
echo "✅ Build completo"
echo ""

# 5. Iniciar serviços
echo "▶️  Iniciando serviços..."
docker-compose -f docker-compose.prod.yml up -d
echo "✅ Serviços iniciados"
echo ""

# 6. Verificar status
echo "🔍 Verificando status..."
sleep 5

# Verificar backend
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Backend: http://localhost:8000 (OK)"
else
    echo "⚠️  Backend: http://localhost:8000 (Aguardando...)"
fi

# Verificar frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend: http://localhost:3000 (OK)"
else
    echo "⚠️  Frontend: http://localhost:3000 (Aguardando...)"
fi

echo ""
echo "🎉 Deploy concluído!"
echo ""
echo "📋 Informações:"
echo "  - Backend API: http://localhost:8000"
echo "  - Frontend: http://localhost:3000"
echo ""
echo "📝 Comandos úteis:"
echo "  Ver logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  Parar: docker-compose -f docker-compose.prod.yml down"
echo "  Reiniciar: docker-compose -f docker-compose.prod.yml restart"
echo ""
echo "⚠️  IMPORTANTE: Configure o DNS apontando xtrisisu.com para este servidor"
echo ""
