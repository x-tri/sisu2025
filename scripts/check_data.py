
import os
import requests
import json

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

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
        for c in courses[:5]:
            print(f" - {c['university']} | {c['name']} | {c['campus']} | {c['city']}")
        if len(courses) > 5:
            print(f" ... and {len(courses) - 5} more.")
    else:
        print(f"Error: {resp.status_code} - {resp.text}")

def search_campus(campus):
    print(f"Searching for campus: {campus}")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus,city&campus=ilike.*{campus}*"
    resp = requests.get(endpoint, headers=HEADERS)
    if resp.status_code == 200:
        courses = resp.json()
        print(f"Found {len(courses)} courses.")
        for c in courses[:5]:
            print(f" - {c['university']} | {c['name']} | {c['campus']} | {c['city']}")
    else:
        print(f"Error: {resp.status_code} - {resp.text}")

if __name__ == "__main__":
    print("--- Checking UERN ---")
    search_courses("UERN")
    
    print("\n--- Checking UFERSA ---")
    search_courses("UFERSA")
    
    print("\n--- Checking UFRN (filtering results manually for Caicó if needed) ---")
    # Search specific campus via API if possible or filter
    search_campus("Caic") # Caicó
