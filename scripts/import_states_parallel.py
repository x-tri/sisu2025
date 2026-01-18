#!/usr/bin/env python3
"""
Import courses for missing states from MeuSISU using correct API - Parallel Version
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

# Only process remaining states to save time looking up existing ones
TARGET_STATES = ['RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO']

def get_existing_codes():
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
    all_codes = []
    page = 0
    while True:
        url = f"https://meusisu.com/api/searchMainPage?estado={state_idx}&pag={page}"
        try:
            response = requests.get(url, timeout=15)
            if response.status_code == 200 and response.content:
                codes = extract_course_codes(response.content)
                if not codes: break
                all_codes.extend(codes)
                page += 1
            else:
                break
        except:
            break
    return all_codes

def fetch_and_insert(code):
    try:
        url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
        response = requests.get(url, timeout=10)
        if response.status_code != 200: 
            with print_lock:
                print(f"    Failed code {code}: API status {response.status_code}", flush=True)
            return False

        course = decode_course(response.content)
        if not course or not course.course_name: 
            with print_lock:
                print(f"    Failed code {code}: Decode failed", flush=True)
            return False

        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
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
            with print_lock:
                print(f"    Failed code {code}: DB Insert {resp.status_code} - {resp.text}", flush=True)
            return False
            
        return True
    except Exception as e:
        with print_lock:
            print(f"    Failed code {code}: Exception {e}", flush=True)
        return False


def main():
    print("Fetching existing courses...", flush=True)
    existing = get_existing_codes()
    print(f"Existing: {len(existing)} courses", flush=True)

    for state in TARGET_STATES:
        state_idx = STATE_INDICES.get(state)
        print(f"\n=== {state} ===", flush=True)
        
        codes = get_course_codes_for_state(state_idx)
        new_codes = [c for c in codes if c not in existing]
        print(f"  Found {len(codes)} codes, {len(new_codes)} new", flush=True)
        
        if not new_codes: continue

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_and_insert, code): code for code in new_codes}
            processed = 0
            completed_success = 0
            
            for future in as_completed(futures):
                processed += 1
                if future.result():
                    completed_success += 1
                    existing.add(futures[future])
                
                if processed % 10 == 0 or processed == len(new_codes):
                    print(f"  Progress: {processed}/{len(new_codes)} (Success: {completed_success})", flush=True)
        
        print(f"  Finished {state}: {completed_success} imported", flush=True)


if __name__ == "__main__":
    main()
