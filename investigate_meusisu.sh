#!/bin/bash
# Investigação completa da API MeuSISU
# Testando múltiplas abordagens

echo "=============================================="
echo "🔍 INVESTIGAÇÃO API MeuSISU - FASE 1"
echo "=============================================="

API_BASE="https://meusisu.com/api"
COURSE_ID="37"

# 1. Verificar DNS e infraestrutura
echo -e "\n🌐 1. VERIFICANDO INFRAESTRUTURA..."
echo "----------------------------------------------"
nslookup meusisu.com 2>/dev/null | head -5
dig +short meusisu.com 2>/dev/null | head -3

# 2. Verificar headers de segurança
echo -e "\n🔒 2. VERIFICANDO HEADERS DE SEGURANÇA..."
echo "----------------------------------------------"
curl -sI "https://meusisu.com" --max-time 10 2>&1 | grep -iE "server|cloudflare|cf-|x-|strict|content" | head -15

# 3. Testar endpoint com diferentes métodos
echo -e "\n📡 3. TESTANDO ENDPOINTS..."
echo "----------------------------------------------"

# Teste básico
echo -n "GET /api: "
curl -s -o /dev/null -w "%{http_code} | %{time_total}s" --max-time 10 "$API_BASE" 2>&1

echo -e "\nGET /api/getCourseData: "
curl -s -o /dev/null -w "%{http_code} | %{time_total}s | size: %{size_download}\n" \
  --max-time 15 "$API_BASE/getCourseData?courseCode=$COURSE_ID" 2>&1

echo -e "\n✅ FASE 1 CONCLUÍDA"
