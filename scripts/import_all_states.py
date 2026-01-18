#!/usr/bin/env python3
"""
Import courses for ALL 27 Brazilian states from MeuSISU API
"""

import sys
import os
import requests
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.decoder import decode_course
from src.decoder.protobuf import parse_message
import threading

print_lock = threading.Lock()

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

STATE_INDICES = {
    'AC': 1, 'AL': 2, 'AP': 3, 'AM': 4, 'BA': 5, 'CE': 6, 'DF': 7, 
    'ES': 8, 'GO': 9, 'MA': 10, 'MS': 11, 'MT': 12, 'MG': 13, 
    'PA': 14, 'PB': 15, 'PR': 16, 'PE': 17, 'PI': 18, 'RJ': 19, 
    'RN': 20, 'RS': 21, 'RO': 22, 'RR': 23, 'SC': 24, 'SP': 25, 
    'SE': 26, 'TO': 27
}

# Import ALL states
TARGET_STATES = list(STATE_INDICES.keys())

def get_existing_codes():
    """Get all existing course codes from Supabase"""
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    existing = set()
    offset = 0
    limit = 1000
    while True:
        response = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=code&offset={offset}&limit={limit}", 
            headers=headers
        )
        if response.status_code != 200:
            break
        data = response.json()
        if not data:
            break
        existing.update(c['code'] for c in data if c.get('code'))
        if len(data) < limit:
            break
        offset += limit
    return existing

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

def get_course_codes_for_state(state_idx):
    """Get all course codes for a state"""
    all_codes = []
    page = 0
    while True:
        url = f"https://meusisu.com/api/searchMainPage?estado={state_idx}&pag={page}"
        try:
            response = requests.get(url, timeout=15)
            if response.status_code == 200 and response.content:
                codes = extract_course_codes(response.content)
                if not codes: 
                    break
                all_codes.extend(codes)
                page += 1
                time.sleep(0.1)  # Rate limiting
            else:
                break
        except Exception as e:
            with print_lock:
                print(f"    Error fetching page {page}: {e}", flush=True)
            break
    return all_codes

def fetch_and_insert(code):
    """Fetch course data and insert into Supabase"""
    try:
        url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
        response = requests.get(url, timeout=10)
        if response.status_code != 200: 
            return False

        course = decode_course(response.content)
        if not course or not course.course_name: 
            return False

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
            "state": course.state,
            "schedule": course.schedule,
            "degree": course.degree,
            "latitude": course.latitude,
            "longitude": course.longitude
        }

        resp = requests.post(f"{SUPABASE_URL}/rest/v1/courses", headers=headers, json=payload)
        if resp.status_code not in [200, 201]:
            return False
            
        return True
    except Exception:
        return False

def main():
    print("=" * 70)
    print("SISU 2025 - Import ALL States")
    print("=" * 70)
    
    print("\n📊 Fetching existing courses from database...", flush=True)
    existing = get_existing_codes()
    print(f"   Found {len(existing)} existing courses\n", flush=True)

    total_imported = 0
    
    for state in sorted(TARGET_STATES):
        state_idx = STATE_INDICES.get(state)
        print(f"\n{'='*70}")
        print(f"🗺️  Processing State: {state} (index {state_idx})")
        print(f"{'='*70}", flush=True)
        
        print(f"   Fetching course codes...", flush=True)
        codes = get_course_codes_for_state(state_idx)
        new_codes = [c for c in codes if c not in existing]
        print(f"   ✅ Found {len(codes)} courses ({len(new_codes)} new)", flush=True)
        
        if not new_codes: 
            print(f"   ↪️  No new courses to import for {state}")
            continue

        print(f"   📥 Importing {len(new_codes)} courses...", flush=True)
        with ThreadPoolExecutor(max_workers=15) as executor:
            futures = {executor.submit(fetch_and_insert, code): code for code in new_codes}
            processed = 0
            completed_success = 0
            
            for future in as_completed(futures):
                processed += 1
                if future.result():
                    completed_success += 1
                    existing.add(futures[future])
                
                if processed % 50 == 0 or processed == len(new_codes):
                    print(f"      Progress: {processed}/{len(new_codes)} (✅ {completed_success} imported)", flush=True)
        
        total_imported += completed_success
        print(f"   ✅ State {state} complete: {completed_success} courses imported")
    
    print(f"\n{'='*70}")
    print(f"🎉 IMPORT COMPLETE!")
    print(f"   Total courses imported: {total_imported}")
    print(f"{'='*70}\n")
    
    # Verify final state count
    headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/courses?select=state&state=not.is.null", headers=headers)
    states = set(c['state'] for c in resp.json() if c.get('state'))
    print(f"📊 Estados agora no banco: {len(states)} de 27")
    print(f"   {sorted(states)}")

if __name__ == "__main__":
    main()
