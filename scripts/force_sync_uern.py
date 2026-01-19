
import os
import requests
import json
import sys
sys.path.insert(0, str(os.path.dirname(os.path.dirname(__file__))))
from src.decoder.course import decode_course

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")
MEUSISU_API = "https://meusisu.com/api"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

def sync_uern():
    print("Fetching UERN courses from Supabase...")
    # Using the full name that worked in check_completeness
    params = {
        "select": "id,code,name",
        "university": "ilike.*Universidade do Estado do Rio Grande do Norte*"
    }
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/courses", headers=HEADERS, params=params)
    courses = resp.json()
    print(f"Found {len(courses)} UERN courses. Syncing...")
    
    total_added = 0
    for i, course in enumerate(courses):
        # Sync logic (simplified from full_data_sync)
        code = course['code']
        course_id = course['id']
        
        try:
            r = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=10)
            if r.status_code != 200:
                print(f"Failed to fetch {code}")
                continue
                
            decoded = decode_course(r.content)
            if not decoded or not decoded.years:
                continue
                
            # Insert cut scores for all years found
            added_for_course = 0
            for year_data in decoded.years:
                if not year_data.modalities:
                    continue
                for mod in year_data.modalities:
                    payload = {
                        "course_id": course_id,
                        "year": year_data.year,
                        "modality_code": mod.code,
                        "modality_name": mod.name,
                        "cut_score": mod.cut_score,
                        "applicants": mod.applicants,
                        "vacancies": mod.vacancies,
                        "partial_scores": mod.partial_scores
                    }
                    p = requests.post(f"{SUPABASE_URL}/rest/v1/cut_scores", headers=HEADERS, json=payload)
                    if p.status_code in [200, 201]:
                        added_for_course += 1
                        
            print(f"[{i+1}/{len(courses)}] {course['name']}: Synced {added_for_course} records")
            total_added += added_for_course
            
        except Exception as e:
            print(f"Error {code}: {e}")
            
    print(f"Total Added: {total_added}")

if __name__ == "__main__":
    sync_uern()
