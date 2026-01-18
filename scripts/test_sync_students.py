
import os
import sys
import requests
from pprint import pprint

sys.path.insert(0, str(os.path.dirname(os.path.dirname(__file__))))

from src.decoder.course import decode_students

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
MEUSISU_API = "https://meusisu.com/api"

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not set")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

def get_course_id(code):
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/courses?code=eq.{code}&select=id", headers=HEADERS)
    data = resp.json()
    if data:
        return data[0]['id']
    return None

def test_sync(code):
    course_id = get_course_id(code)
    if not course_id:
        print(f"Course {code} not found in Supabase")
        return

    print(f"Syncing students for course {code} (ID: {course_id})...")
    
    url = f"{MEUSISU_API}/courseDataStudents?courseCode={code}"
    print(f"Fetching {url}...")
    resp = requests.get(url, timeout=20)
    
    if resp.status_code != 200:
        print(f"Failed to fetch: {resp.status_code}")
        return

    students = decode_students(resp.content)
    print(f"Decoded {len(students)} students")
    
    if not students:
        return

    # Print first few
    for s in students[:5]:
        print(s)

    # Insert
    payload = []
    for s in students:
        payload.append({
            "course_id": course_id,
            "year": s.year,
            "modality_code": s.modality_code,
            "rank": s.rank,
            "name": s.name,
            "score": s.score,
            "bonus": s.bonus,
            "call_number": s.call_number,
            "status": "convocado"
        })
        
    print(f"Inserting {len(payload)} records...")
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/approved_students",
        headers=HEADERS,
        json=payload
    )
    
    if resp.status_code in [200, 201]:
        print("Success!")
    else:
        print(f"Error: {resp.text}")

if __name__ == "__main__":
    test_sync(6276) # Medicine UFMA
