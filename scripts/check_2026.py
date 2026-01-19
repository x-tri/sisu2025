
import os
import requests
import json
from collections import Counter

# Using the key found in audit_cotas.py logic
SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_2026():
    print("=== CURSOS COM DADOS DE 2026 ===\n")
    
    # 1. Get courses with year 2026 in cut_scores
    endpoint = f"{SUPABASE_URL}/rest/v1/cut_scores?select=course_id,cut_score&year=eq.2026&limit=1000&order=captured_at.desc"
    resp = requests.get(endpoint, headers=HEADERS)
    scores = resp.json()
    
    if not scores:
        print("Nenhum dado de 2026 encontrado na tabela cut_scores.")
        return

    course_ids = list(set([s['course_id'] for s in scores]))
    print(f"Encontrados {len(scores)} registros de corte para 2026.")
    print(f"Total de cursos únicos atualizados: {len(course_ids)}")
    
    # 2. Get names for these courses
    # Batch request if too many, but for now let's try strict limit
    ids_str = ",".join(map(str, course_ids[:20])) # First 20
    endpoint_courses = f"{SUPABASE_URL}/rest/v1/courses?select=id,name,university,campus&id=in.({ids_str})"
    resp_c = requests.get(endpoint_courses, headers=HEADERS)
    courses = resp_c.json()
    
    print("\n--- Exemplos de Cursos Atualizados (Top 20) ---")
    for c in courses:
        print(f"🆔 {c['id']} | 🎓 {c['name']} - {c['university']} ({c['campus']})")

if __name__ == "__main__":
    check_2026()
