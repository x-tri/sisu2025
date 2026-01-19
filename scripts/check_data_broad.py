
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

def search_courses(query):
    print(f"Searching for: {query}")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus,city&university=ilike.*{query}*"
    resp = requests.get(endpoint, headers=HEADERS)
    if resp.status_code == 200:
        courses = resp.json()
        print(f"Found {len(courses)} courses.")
        universities = set(c['university'] for c in courses)
        for u in sorted(universities):
            print(f" - {u}")
    else:
        print(f"Error: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    print("--- Searching for 'Estadual do Rio Grande do Norte' ---")
    search_courses("Estadual do Rio Grande do Norte")
    
    print("\n--- Searching for 'Rural do Semi' ---")
    search_courses("Rural do Semi")
    
    print("\n--- Searching for 'Rio Grande do Norte' (All RN) ---")
    search_courses("Rio Grande do Norte")
