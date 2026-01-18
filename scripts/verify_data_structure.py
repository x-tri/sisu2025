import os
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

print("Verificando estrutura dos dados...\n")

# Sample a few courses
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,state,city,university&limit=5",
    headers=HEADERS
)
print("📚 Amostra de Cursos:")
for c in resp.json():
    print(f"  ID: {c['id']}, Code: {c['code']}, Nome: {c['name'][:40]}, Estado: {c.get('state', 'N/A')}")

# Sample cut scores
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/cut_scores?select=id,course_id,year,modality_name,cut_score&limit=5&order=id.desc",
    headers=HEADERS
)
print("\n📊 Amostra de Notas de Corte:")
for cs in resp.json():
    print(f"  ID: {cs['id']}, Course ID: {cs['course_id']}, Ano: {cs['year']}, Nota: {cs.get('cut_score', 'N/A')}")

# Check if course_ids in cut_scores match courses table
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/cut_scores?select=course_id&limit=1000",
    headers=HEADERS
)
cut_score_course_ids = set(cs['course_id'] for cs in resp.json())

resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/courses?select=id&limit=1000",
    headers=HEADERS
)
course_ids = set(c['id'] for c in resp.json())

matching = cut_score_course_ids & course_ids
print(f"\n🔗 IDs em comum (primeiros 1000): {len(matching)} de {len(cut_score_course_ids)} course_ids em cut_scores")

# Check state distribution
resp = requests.get(
    f"{SUPABASE_URL}/rest/v1/courses?select=state&state=not.is.null&limit=10000",
    headers=HEADERS
)
states = {}
for c in resp.json():
    state = c.get('state')
    if state:
        states[state] = states.get(state, 0) + 1

print(f"\n🗺️  Distribuição por Estado (top 10):")
for state, count in sorted(states.items(), key=lambda x: -x[1])[:10]:
    print(f"  {state}: {count} cursos")

print(f"\n📌 Total de estados únicos: {len(states)}")
print(f"   Estados: {sorted(states.keys())}")
