import requests
import json
import os

# We'll use the same key export as before
SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")

if not SUPABASE_KEY:
    print("Please set SUPABASE_SERVICE_KEY")
    exit(1)

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# 1. Get Course ID
r = requests.get(f"{SUPABASE_URL}/rest/v1/courses?code=eq.685&select=id,name", headers=headers)
print("Course:", r.text)

if r.status_code == 200 and len(r.json()) > 0:
    course_id = r.json()[0]['id']
    
    # 2. Get Weights
    r_weights = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?course_id=eq.{course_id}&select=*", headers=headers)
    print("Weights found:", len(r_weights.json()))
    print(json.dumps(r_weights.json(), indent=2))
else:
    print("Course not found")
