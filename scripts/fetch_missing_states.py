#!/usr/bin/env python3
"""
Fetch courses for missing states from MeuSISU API.
Missing: AP, CE, GO, MS, RO, RR, TO
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from src.decoder import decode_course

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

MISSING_STATES = ['Amapá', 'Ceará', 'Goiás', 'Mato Grosso do Sul', 'Rondônia', 'Roraima', 'Tocantins']

def get_existing_codes():
    """Get existing course codes from database"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}"
    }
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=code",
        headers=headers
    )
    if response.status_code == 200:
        return set(c['code'] for c in response.json() if c.get('code'))
    return set()

def fetch_course(code):
    """Fetch a single course from MeuSISU"""
    try:
        url = f"https://api.meusisu.com/api/courses/{code}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200 and response.content:
            course = decode_course(response.content)
            if course and course.course_name:
                return course, code
    except Exception:
        pass
    return None, code

def insert_course(course, code):
    """Insert course into Supabase"""
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    state = course.state or ''

    payload = {
        "code": code,
        "name": course.course_name,
        "institution": course.university,
        "campus": course.campus,
        "city": course.city,
        "state": state,
        "shift": course.schedule,
        "modality": course.degree,
        "grade": course.degree,
        "raw_data": course.to_dict()
    }

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/courses",
        headers=headers,
        json=payload
    )
    return response.status_code in [200, 201], state

def main():
    print("Fetching existing courses...", flush=True)
    existing = get_existing_codes()
    print(f"Existing: {len(existing)} courses", flush=True)

    found_states = set()
    new_courses = 0

    # Search in ranges that might have the missing states
    ranges = [
        (2500, 4000),
        (4000, 5500),
        (5500, 7000),
        (7000, 8500),
        (8500, 10000),
    ]

    for start, end in ranges:
        codes_to_fetch = [c for c in range(start, end) if c not in existing]

        if not codes_to_fetch:
            continue

        print(f"\nSearching range {start}-{end} ({len(codes_to_fetch)} codes)...", flush=True)

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(fetch_course, code): code for code in codes_to_fetch}

            batch_count = 0
            for future in as_completed(futures):
                course, code = future.result()
                if course:
                    success, state = insert_course(course, code)
                    if success:
                        new_courses += 1
                        existing.add(code)

                        if state in MISSING_STATES and state not in found_states:
                            found_states.add(state)
                            print(f"FOUND: {state}", flush=True)

                        batch_count += 1
                        if batch_count % 50 == 0:
                            print(f"  Added {batch_count} courses, found states: {list(found_states)}", flush=True)

                time.sleep(0.02)  # Small delay to avoid rate limiting

        # Check if we found all missing states
        missing_now = set(MISSING_STATES) - found_states
        if not missing_now:
            print(f"\nAll missing states found!", flush=True)
            break
        else:
            print(f"\nStill missing: {list(missing_now)}", flush=True)

    print(f"\n=== COMPLETE ===", flush=True)
    print(f"New courses added: {new_courses}", flush=True)
    print(f"Found states: {list(found_states)}", flush=True)
    print(f"Still missing: {list(set(MISSING_STATES) - found_states)}", flush=True)

if __name__ == "__main__":
    main()
