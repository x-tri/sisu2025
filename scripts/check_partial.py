
import os
import requests
import json

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_partial_scores(query):
    print(f"\nChecking Partial Scores for: {query}")
    # Get courses first
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,university&university=ilike.*{query}*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    if not courses:
        return

    ids = [c['id'] for c in courses]
    
    # Check 2024
    r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=id,partial_scores&year=eq.2024&course_id=in.({','.join(map(str, ids[:20]))})", headers=HEADERS)
    count_populated = 0
    total_checked = 0
    if r.status_code == 200:
        data = r.json()
        total_checked = len(data)
        for d in data:
            if d.get('partial_scores') and len(d['partial_scores']) > 0:
                count_populated += 1
    
    print(f"  2024 Partial Scores: {count_populated}/{total_checked} records populated")

    # Check 2025
    r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=id,partial_scores&year=eq.2025&course_id=in.({','.join(map(str, ids[:20]))})", headers=HEADERS)
    count_populated = 0
    total_checked = 0
    if r.status_code == 200:
        data = r.json()
        total_checked = len(data)
        for d in data:
            if d.get('partial_scores') and len(d['partial_scores']) > 0:
                count_populated += 1
    
    print(f"  2025 Partial Scores: {count_populated}/{total_checked} records populated")

if __name__ == "__main__":
    check_partial_scores("Universidade do Estado do Rio Grande do Norte")
    check_partial_scores("Universidade Federal Rural do Semi-Árido")
    # For UFRN Caicó
    print("\nChecking Partial Scores for: UFRN Caicó")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,university&university=ilike.*Rio Grande do Norte*&campus=ilike.*Caic*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    ids = [c['id'] for c in courses]
    # Check 2024
    r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=id,partial_scores&year=eq.2024&course_id=in.({','.join(map(str, ids))})", headers=HEADERS)
    count_populated = 0
    total_checked = 0
    if r.status_code == 200:
        data = r.json()
        total_checked = len(data)
        for d in data:
            if d.get('partial_scores') and len(d['partial_scores']) > 0:
                count_populated += 1
    print(f"  2024 Partial Scores: {count_populated}/{total_checked} records populated")
