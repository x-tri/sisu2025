import os
import requests
import json

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def get_coverage_stats():
    print("=" * 70)
    print("SISU 2025 - Database Coverage Analysis")
    print("=" * 70)
    
    # Get unique states
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=state&state=not.is.null",
        headers=HEADERS
    )
    states = set(c['state'] for c in resp.json() if c.get('state'))
    
    # Get unique cities
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=city&city=not.is.null",
        headers=HEADERS
    )
    cities = set(c['city'] for c in resp.json() if c.get('city'))
    
    # Get unique universities
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=university&university=not.is.null",
        headers=HEADERS
    )
    universities = set(c['university'] for c in resp.json() if c.get('university'))
    
    # Get total courses
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=id",
        headers={**HEADERS, "Prefer": "count=exact"}
    )
    total_courses = resp.headers.get('content-range', '0-0/0').split('/')[1]
    
    # Get total cut scores
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?select=id&limit=1",
        headers={**HEADERS, "Prefer": "count=exact"}
    )
    total_cut_scores = resp.headers.get('content-range', '0-0/0').split('/')[1]
    
    # Get courses with weights
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/course_weights?select=course_id",
        headers=HEADERS
    )
    courses_with_weights = set(w['course_id'] for w in resp.json())
    
    # Get courses with cut scores
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?select=course_id",
        headers=HEADERS
    )
    courses_with_cut_scores = set(cs['course_id'] for cs in resp.json())
    
    print("\n📊 COBERTURA DOS DADOS:")
    print(f"\n🗺️  Estados: {len(states)} de 27 estados brasileiros")
    print(f"   Estados encontrados: {sorted(states)[:10]}{'...' if len(states) > 10 else ''}")
    
    print(f"\n🏙️  Cidades: {len(cities)} cidades")
    print(f"   Exemplos: {sorted(list(cities))[:5]}")
    
    print(f"\n🏛️  Universidades: {len(universities)} instituições")
    print(f"   Exemplos: {sorted(list(universities))[:3]}")
    
    print(f"\n📚 Cursos: {total_courses} cursos cadastrados")
    print(f"   Com pesos (weights): {len(courses_with_weights)} cursos")
    print(f"   Com notas de corte: {len(courses_with_cut_scores)} cursos")
    
    print(f"\n📈 Notas de Corte: {total_cut_scores} registros")
    
    # Calculate coverage percentage
    if int(total_courses) > 0:
        weight_coverage = (len(courses_with_weights) / int(total_courses)) * 100
        cut_score_coverage = (len(courses_with_cut_scores) / int(total_courses)) * 100
        
        print(f"\n✅ Completude:")
        print(f"   Pesos: {weight_coverage:.1f}% dos cursos")
        print(f"   Notas de corte: {cut_score_coverage:.1f}% dos cursos")
    
    # Check for missing states
    all_br_states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
                     'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
                     'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']
    
    missing_states = set(all_br_states) - states
    if missing_states:
        print(f"\n⚠️  Estados faltando: {sorted(missing_states)}")
    else:
        print(f"\n✅ Todos os 27 estados estão representados!")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    get_coverage_stats()
