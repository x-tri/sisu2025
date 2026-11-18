#!/bin/bash
# =============================================================================
# SISU 2025 - Launch Script
# Run this on Sunday night (18/01) before going to sleep.
# It will wait until midnight and start monitoring.
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Supabase key must come from the environment (never commit it)
: "${SUPABASE_SERVICE_KEY:?Defina SUPABASE_SERVICE_KEY antes de rodar este script}"
export SUPABASE_SERVICE_KEY

# Log file
LOG_FILE="$PROJECT_DIR/logs/night_watch_$(date +%Y%m%d).log"
mkdir -p "$PROJECT_DIR/logs"

echo "=============================================="
echo "🌙 SISU 2025 - Night Watch Launcher"
echo "=============================================="
echo "Diretório: $PROJECT_DIR"
echo "Log: $LOG_FILE"
echo ""

# Check current time
CURRENT_HOUR=$(date +%H)
CURRENT_DATE=$(date +%Y-%m-%d)
TARGET_DATE="2026-01-20"  # Monday night -> Tuesday morning (SISU opens Monday 8am, first partial scores appear Monday night)

echo "Data atual: $CURRENT_DATE"
echo "Data alvo: $TARGET_DATE"
echo "Hora atual: $CURRENT_HOUR:$(date +%M)"
echo ""

# If before midnight on launch day, wait
if [[ "$CURRENT_DATE" < "$TARGET_DATE" ]]; then
    echo "⏳ Aguardando meia-noite de $TARGET_DATE..."
    echo "   (Você pode deixar este terminal aberto e ir dormir)"
    echo ""
    
    # Calculate seconds until midnight target date
    while [[ "$(date +%Y-%m-%d)" < "$TARGET_DATE" ]]; do
        sleep 60
        echo -ne "\r   Próxima verificação: $(date +%H:%M:%S)..."
    done
    echo ""
fi

echo ""
echo "🚀 Iniciando Night Watch Monitor..."
echo "=============================================="

# Run the Python script with logging
cd "$PROJECT_DIR"
python3 scripts/night_watch.py 2>&1 | tee -a "$LOG_FILE"

echo ""
echo "=============================================="
echo "✅ Night Watch encerrado. Verifique o log em:"
echo "   $LOG_FILE"
echo "=============================================="
