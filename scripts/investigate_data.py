
import sys
import requests

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

def get_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }

def run_investigation():
    headers = get_headers()
    
    print("--- INVESTIGANDO DADOS NO SUPABASE ---")
    
    # 1. Total de cursos
    print("\n1. Contagem Geral:")
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/courses?select=count", headers=headers)
        total_courses = r.headers.get("Content-Range", "/0").split("/")[1]
        print(f"Total de Cursos: {total_courses}")
    except Exception as e:
        print(f"Erro ao contar cursos: {e}")

    # 2. Total de pesos e notas de corte
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=count", headers=headers)
        total_weights = r.headers.get("Content-Range", "/0").split("/")[1]
        print(f"Total de Pesos: {total_weights}")
        
        r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=count", headers=headers)
        total_scores = r.headers.get("Content-Range", "/0").split("/")[1]
        print(f"Total de Notas de Corte: {total_scores}")
    except Exception as e:
        print(f"Erro ao contar dados: {e}")

    # 3. Cursos SEM pesos para 2025
    print("\n2. Amostra de Cursos sem Pesos (2025):")
    # Pega IDs de cursos com pesos para 2025
    # Simplificação: Pega cursos que tem entrada na tabela course_weights com year=2025
    try:
        r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=course_id&year=eq.2025", headers=headers)
        courses_with_weights_2025 = set(item['course_id'] for item in r.json())
        print(f"Cursos com pesos cadastrados para 2025: {len(courses_with_weights_2025)}")
        
        # Pega amostra de cursos aleatórios
        r = requests.get(f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name&limit=20", headers=headers)
        sample_courses = r.json()
        
        missing_count = 0
        print("\nVerificando amostra de 20 cursos:")
        for course in sample_courses:
            has_weight = course['id'] in courses_with_weights_2025
            status = "✅ OK" if has_weight else "❌ SEM PESO"
            if not has_weight: missing_count += 1
            print(f"- {course['name']} (ID: {course['id']}, Code: {course['code']}): {status}")
            
    except Exception as e:
        print(f"Erro na análise de 2025: {e}")

if __name__ == "__main__":
    run_investigation()
