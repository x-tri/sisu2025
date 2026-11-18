#!/bin/bash
# XTRI SISU 2026 - Deploy Script for Coolify
# Usage: ./DEPLOY_COOLIFY.sh <coolify-api-token>

set -e

COOLIFY_URL="http://212.85.19.50:8000"
API_TOKEN="${1:?Uso: ./DEPLOY_COOLIFY.sh <coolify-api-token>}"
PROJECT_NAME="xtrisisu"

echo "🚀 Iniciando deploy do XTRI SISU 2026 na Hostinger..."
echo ""

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo "❌ jq não está instalado. Instalando..."
    apt-get update && apt-get install -y jq
fi

echo "📋 Configuração:"
echo "  - Coolify URL: $COOLIFY_URL"
echo "  - Projeto: $PROJECT_NAME"
echo "  - Domínio: xtrisisu.com"
echo ""

# 1. Criar projeto
echo "📦 Criando projeto..."
PROJECT_RESPONSE=$(curl -s -X POST "$COOLIFY_URL/api/v1/projects" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"name\": \"$PROJECT_NAME\",
        \"description\": \"XTRI SISU 2026 - Monitoramento de Notas de Corte\"
    }")

PROJECT_UUID=$(echo $PROJECT_RESPONSE | jq -r '.uuid // empty')

if [ -z "$PROJECT_UUID" ]; then
    echo "⚠️  Projeto já existe ou erro na criação. Buscando projeto existente..."
    PROJECTS=$(curl -s "$COOLIFY_URL/api/v1/projects" \
        -H "Authorization: Bearer $API_TOKEN")
    PROJECT_UUID=$(echo $PROJECTS | jq -r ".[] | select(.name == \"$PROJECT_NAME\") | .uuid")
fi

if [ -z "$PROJECT_UUID" ]; then
    echo "❌ Erro: Não foi possível criar ou encontrar o projeto"
    exit 1
fi

echo "✅ Projeto UUID: $PROJECT_UUID"
echo ""

# 2. Criar ambiente de produção
echo "🔧 Criando ambiente de produção..."
ENV_RESPONSE=$(curl -s -X POST "$COOLIFY_URL/api/v1/projects/$PROJECT_UUID/environments" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "production",
        "description": "Ambiente de produção"
    }')

ENV_UUID=$(echo $ENV_RESPONSE | jq -r '.uuid // empty')

if [ -z "$ENV_UUID" ]; then
    echo "⚠️  Ambiente já existe. Buscando ambiente existente..."
    ENVS=$(curl -s "$COOLIFY_URL/api/v1/projects/$PROJECT_UUID/environments" \
        -H "Authorization: Bearer $API_TOKEN")
    ENV_UUID=$(echo $ENVS | jq -r '.[] | select(.name == "production") | .uuid')
fi

if [ -z "$ENV_UUID" ]; then
    echo "❌ Erro: Não foi possível criar ou encontrar o ambiente"
    exit 1
fi

echo "✅ Ambiente UUID: $ENV_UUID"
echo ""

# 3. Criar serviço Backend
echo "🎯 Criando serviço Backend (API)..."
BACKEND_SERVICE=$(curl -s -X POST "$COOLIFY_URL/api/v1/services/docker-compose" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"project_uuid\": \"$PROJECT_UUID\",
        \"environment_uuid\": \"$ENV_UUID\",
        \"name\": \"xtrisisu-backend\",
        \"description\": \"Backend API FastAPI\",
        \"docker_compose_raw\": $(cat docker-compose.prod.yml | jq -Rs .),
        \"domains\": [\"api.xtrisisu.com\"],
        \"environment_variables\": {
            \"SUPABASE_URL\": \"https://sisymqzxvuktdcbsbpbp.supabase.co\",
            \"SUPABASE_SERVICE_KEY\": \"\"
        }
    }")

BACKEND_UUID=$(echo $BACKEND_SERVICE | jq -r '.uuid // empty')
echo "✅ Backend UUID: $BACKEND_UUID"
echo ""

# 4. Criar serviço Frontend
echo "🎨 Criando serviço Frontend (Next.js)..."
FRONTEND_SERVICE=$(curl -s -X POST "$COOLIFY_URL/api/v1/services/docker-compose" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"project_uuid\": \"$PROJECT_UUID\",
        \"environment_uuid\": \"$ENV_UUID\",
        \"name\": \"xtrisisu-frontend\",
        \"description\": \"Frontend Next.js\",
        \"docker_compose_raw\": $(cat coolify-config.yaml | jq -Rs .),
        \"domains\": [\"xtrisisu.com\", \"www.xtrisisu.com\"],
        \"environment_variables\": {
            \"NODE_ENV\": \"production\",
            \"NEXT_TELEMETRY_DISABLED\": \"1\",
            \"API_URL\": \"https://api.xtrisisu.com\"
        }
    }")

FRONTEND_UUID=$(echo $FRONTEND_SERVICE | jq -r '.uuid // empty')
echo "✅ Frontend UUID: $FRONTEND_UUID"
echo ""

echo "🎉 Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "  1. Configure o SUPABASE_SERVICE_KEY nas variáveis de ambiente do backend"
echo "  2. Inicie o deploy no painel do Coolify"
echo "  3. Configure o DNS apontando xtrisisu.com para 212.85.19.50"
echo ""
echo "🔗 Acesse: http://212.85.19.50:8000"
