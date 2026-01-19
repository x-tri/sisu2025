
import os
import requests
import json
from collections import Counter

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def audit_modalities():
    print("=== AUDITORIA DE MODALIDADES (COTAS) ===\n")
    
    # 1. Check distinct modality names
    print("1. Modalidades distintas no banco:")
    endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?select=modality_name&limit=10000"
    resp = requests.get(endpoint, headers=HEADERS)
    data = resp.json()
    
    modalities = Counter(d['modality_name'] for d in data)
    for mod, count in modalities.most_common(20):
        print(f"   {mod}: {count} registros")
    
    print(f"\nTotal de modalidades distintas: {len(modalities)}")
    
    # 2. Check if quotas have cut_score populated
    print("\n2. Verificando preenchimento de notas de corte por tipo:")
    for mod in list(modalities.keys())[:10]:
        endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?select=cut_score&modality_name=eq.{mod}&limit=100"
        resp = requests.get(endpoint, headers=HEADERS)
        scores = resp.json()
        filled = sum(1 for s in scores if s['cut_score'] and s['cut_score'] > 0)
        print(f"   {mod[:50]}: {filled}/{len(scores)} preenchidos")
    
    # 3. Check a specific course (UFMA Medicina) for all modalities
    print("\n3. Exemplo: UFMA Medicina (Code 5206) - Todas modalidades 2024:")
    endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?select=modality_code,modality_name,cut_score,vacancies&course_id=eq.5204&year=eq.2024"
    resp = requests.get(endpoint, headers=HEADERS)
    scores = resp.json()
    print(f"   Total de modalidades para este curso: {len(scores)}")
    for s in scores[:15]:
        print(f"   [{s['modality_code']}] {s['modality_name'][:40]}: {s['cut_score']} ({s['vacancies']} vagas)")

if __name__ == "__main__":
    audit_modalities()
