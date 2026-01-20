#!/usr/bin/env python3
"""
Verify SISU data quality in Supabase.
Checks if 2026 data exists and has real values.
"""

import os
import sys
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")
TARGET_YEAR = 2026

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Prefer": "count=exact"
}


def verify():
    print(f"🔍 Verificando dados de {TARGET_YEAR} no Supabase...\n")
    
    # Total records
    r1 = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?year=eq.{TARGET_YEAR}&select=id",
        headers=HEADERS
    )
    total = r1.headers.get('content-range', '0/0').split('/')[-1]
    
    # With cut_score
    r2 = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?year=eq.{TARGET_YEAR}&cut_score=not.is.null&select=id",
        headers=HEADERS
    )
    with_score = r2.headers.get('content-range', '0/0').split('/')[-1]
    
    # Sample with partial_scores
    r3 = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?year=eq.{TARGET_YEAR}&select=course_id,modality_name,cut_score,partial_scores&limit=10",
        headers=HEADERS
    )
    sample = r3.json()
    
    with_partial = sum(1 for s in sample if s.get('partial_scores') and len(s['partial_scores']) > 0)
    
    print(f"📊 RESULTADO:")
    print(f"   Total de registros {TARGET_YEAR}: {total}")
    print(f"   Com cut_score preenchido: {with_score}")
    print(f"   Amostra com partial_scores: {with_partial}/10")
    print()
    
    if int(total) == 0:
        print("❌ Nenhum registro de 2026 encontrado. Execute o sync primeiro.")
        return False
    
    if int(with_score) == 0 and with_partial == 0:
        print("⚠️  Registros existem mas são placeholders (sem dados reais).")
        print("   O SISU ainda não liberou as notas de corte.")
        return False
    
    print("✅ Dados reais encontrados! O frontend deve exibir as notas.")
    
    # Show sample
    print("\n📋 Amostra de registros:")
    for s in sample[:3]:
        mod = s['modality_name'][:40] if s.get('modality_name') else 'N/A'
        score = s.get('cut_score') or 'null'
        partial = len(s.get('partial_scores') or [])
        print(f"   - {mod}: cut_score={score}, partial_days={partial}")
    
    return True


if __name__ == "__main__":
    success = verify()
    sys.exit(0 if success else 1)
