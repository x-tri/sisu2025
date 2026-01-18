import sys
from pathlib import Path
import requests

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.decoder.course import decode_course
from src.utils.config import load_config
from src.decoder.course import decode_course
from src.utils.config import load_config

def update_course_weights(course_id: int, code: int):
    print(f"Updating course {course_id} (Code {code})...")
    
    # Fetch from API
    url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
    print(f"  Fetching {url}...")
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"  Error fetching: {e}")
        return False

    # Decode
    try:
        course_data = decode_course(response.content)
        if not course_data or not course_data.years:
            print("  No data decoded.")
            return False
            
        print(f"  Decoded {len(course_data.years)} years.")
    except Exception as e:
        print(f"  Error decoding: {e}")
        return False

    # Initialize Supabase
    print("  Connecting to Supabase...")
    # Re-instantiate properly if SupabaseClient handles env loading internally?
    # Let's check SupabaseClient implementation first.
    # Assuming it loads from env. If not, I'll need to pass credentials.
    
    # For now, let's look at how import scripts did it.
    # `src/storage/supabase.py` typically handles it. 
    
    # Actually, the import script `import_weights_missing.py` used `requests` directly. 
    # Let's stick to that for simplicity and speed in this fix script.
    
    from os import environ
    SUPABASE_URL = environ.get("SUPABASE_URL") or "https://sisymqzxvuktdcbsbpbp.supabase.co"
    SUPABASE_KEY = environ.get("SUPABASE_SERVICE_KEY")
    
    if not SUPABASE_KEY:
        print("  Error: SUPABASE_SERVICE_KEY not found in env.")
        return False
        
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
    }
    
    # Process 2025 weights (or latest)
    # The API often returns 2019 for everything if 2025 isn't specific?
    # No, UFRN usually has specific weights.
    
    updated = False
    for year_data in course_data.years:
        if not year_data.weights:
            continue
            
        print(f"  Found weights for {year_data.year}")
        
        payload = {
            "course_id": course_id,
            "year": year_data.year,
            "peso_red": year_data.weights.get('pesoRed'),
            "peso_ling": year_data.weights.get('pesoLing'),
            "peso_mat": year_data.weights.get('pesoMat'),
            "peso_ch": year_data.weights.get('pesoCh'),
            "peso_cn": year_data.weights.get('pesoCn'),
            "min_red": year_data.minimums.get('minRed'),
            "min_ling": year_data.minimums.get('minLing'),
            "min_mat": year_data.minimums.get('minMat'),
            "min_ch": year_data.minimums.get('minCh'),
            "min_cn": year_data.minimums.get('minCn'),
            "min_enem": year_data.minimums.get('minEnem'),
        }
        
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/course_weights", headers=headers, json=payload)
        if resp.status_code in [200, 201]:
            print("    Saved to Supabase.")
            updated = True
        else:
            print(f"    Error saving: {resp.status_code} {resp.text}")

    return updated

if __name__ == "__main__":
    # UFRN Medicina (Code 685) -> ID in DB?
    # We need to find the ID first.
    from os import environ
    SUPABASE_URL = environ.get("SUPABASE_URL") or "https://sisymqzxvuktdcbsbpbp.supabase.co"
    SUPABASE_KEY = environ.get("SUPABASE_SERVICE_KEY")
    
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    
    # Get ID for code 685
    r = requests.get(f"{SUPABASE_URL}/rest/v1/courses?code=eq.685&select=id,name", headers=headers)
    if r.status_code == 200 and r.json():
        course = r.json()[0]
        update_course_weights(course['id'], 685)
    else:
        print("Course 685 not found in DB")
