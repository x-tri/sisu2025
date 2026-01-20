
import sys
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Add src to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.decoder import decode_course
from src.decoder.protobuf import parse_message
from src.utils.config import load_config

# Load config
config = load_config()
SUPABASE_KEY = config.supabase_service_key

if not SUPABASE_KEY:
    print("Error: SUPABASE_SERVICE_KEY not found in settings")
    sys.exit(1)

# RO index based on previous file
RO_INDEX = 22

def extract_course_codes(protobuf_data):
    """Extract course codes from protobuf data"""
    codes = []
    try:
        msg = parse_message(protobuf_data)
        if 2 in msg:
            for item_type, item_value in msg[2]:
                if item_type == 'message' and isinstance(item_value, dict):
                    if 8 in item_value:
                        for vtype, vval in item_value[8]:
                            if vtype == 'varint':
                                codes.append(vval)
                                break
    except Exception:
        pass
    return codes

def get_ro_codes():
    print(f"Fetching codes for RO (index {RO_INDEX})...")
    all_codes = []
    page = 0
    while True:
        url = f"https://meusisu.com/api/searchMainPage?estado={RO_INDEX}&pag={page}"
        print(f"  Requesting page {page}...", end='\r')
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200 and response.content:
                codes = extract_course_codes(response.content)
                if not codes:
                    break
                all_codes.extend(codes)
                page += 1
                time.sleep(0.1)
            else:
                print(f"\n  Status {response.status_code} for page {page}")
                break
        except Exception as e:
            print(f"\n  Error fetching page {page}: {e}")
            break
    
    print(f"\nFound {len(all_codes)} codes for RO.")
    return all_codes

def fetch_and_insert(code):
    try:
        url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
        response = requests.get(url, timeout=10)
        if response.status_code != 200: return False

        course = decode_course(response.content)
        if not course or not course.course_name: return False

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal,resolution=merge-duplicates"
        }
        
        payload = {
            "code": code,
            "name": course.course_name,
            "university": course.university,
            "campus": course.campus,
            "city": course.city,
            "state": "RO", # Force RO if missing
            "schedule": course.schedule,
            "degree": course.degree,
            "latitude": course.latitude,
            "longitude": course.longitude
        }
        
        # Override state if present in course data
        if course.state: payload["state"] = course.state

        resp = requests.post(f"{SUPABASE_URL}/rest/v1/courses", headers=headers, json=payload)
        return resp.status_code in [200, 201]
    except Exception:
        return False

def main():
    codes = get_ro_codes()
    if not codes:
        print("No codes found for RO. Check index or API.")
        return

    print(f"Importing {len(codes)} courses for RO...")
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_and_insert, code): code for code in codes}
        count = 0
        for future in as_completed(futures):
            if future.result():
                count += 1
            print(f"Progress: {count}/{len(codes)}", end='\r')
    
    print(f"\nDone. Imported {count} courses.")

if __name__ == "__main__":
    main()
