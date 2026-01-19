
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

def check_years(query):
    print(f"\nScanning Years for: {query}")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus&university=ilike.*{query}*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    if not courses:
        print("No courses found.")
        return

    ids = [c['id'] for c in courses]
    
    # Check Weights Years
    weights_years = {}
    r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=year&course_id=in.({','.join(map(str, ids[:20]) )})", headers=HEADERS) # Sample 20
    if r.status_code == 200:
        for w in r.json():
            y = w['year']
            weights_years[y] = weights_years.get(y, 0) + 1
            
    print("Weights Year Distribution (Sample 20 courses):")
    for y in sorted(weights_years.keys()):
        print(f"  {y}: {weights_years[y]} records")

    # Check Students Years
    students_years = {}
    r = requests.get(f"{SUPABASE_URL}/rest/v1/approved_students?select=year&course_id=in.({','.join(map(str, ids[:20]) )})", headers=HEADERS) # Sample 20
    if r.status_code == 200:
        for s in r.json():
            y = s['year']
            students_years[y] = students_years.get(y, 0) + 1
            
    print("Students Year Distribution (Sample 20 courses):")
    for y in sorted(students_years.keys()):
        print(f"  {y}: {students_years[y]} records")

if __name__ == "__main__":
    check_years("Universidade do Estado do Rio Grande do Norte")
    check_years("Universidade Federal Rural do Semi-Árido")
    # For UFRN Caicó
    print("\nScanning Years for: UFRN Caicó")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus&university=ilike.*Rio Grande do Norte*&campus=ilike.*Caic*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    ids = [c['id'] for c in courses]
    if ids:
        weights_years = {}
        r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=year&course_id=in.({','.join(map(str, ids))})", headers=HEADERS)
        for w in r.json():
            weights_years[w['year']] = weights_years.get(w['year'], 0) + 1
        print("Weights Year Distribution:")
        for y in sorted(weights_years.keys()):
            print(f"  {y}: {weights_years[y]}")

        students_years = {}
        r = requests.get(f"{SUPABASE_URL}/rest/v1/approved_students?select=year&course_id=in.({','.join(map(str, ids))})", headers=HEADERS)
        for s in r.json():
            students_years[s['year']] = students_years.get(s['year'], 0) + 1
        print("Students Year Distribution:")
        for y in sorted(students_years.keys()):
            print(f"  {y}: {students_years[y]}")
        
