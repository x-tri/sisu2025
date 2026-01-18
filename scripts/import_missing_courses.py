#!/usr/bin/env python3
"""
Import specific courses for missing states from MeuSISU.
Uses API to find courses in states: CE, GO, MS, AP, RR, TO
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

# Target states with their full names
TARGET_STATES = {
    'Ceará': 'CE',
    'Goiás': 'GO',
    'Mato Grosso do Sul': 'MS',
    'Amapá': 'AP',
    'Roraima': 'RR',
    'Tocantins': 'TO'
}

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
    except Exception as e:
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
    state_counts = {state: 0 for state in TARGET_STATES}

    # Expanded search ranges including higher numbers
    # Based on course codes seen: 16495, 16665, etc.
    ranges = [
        (1, 500),
        (500, 1500),
        (1500, 2500),
        (10000, 12000),
        (12000, 14000),
        (14000, 16000),
        (16000, 18000),
        (18000, 20000),
    ]

    for start, end in ranges:
        codes_to_fetch = [c for c in range(start, end) if c not in existing]

        if not codes_to_fetch:
            continue

        print(f"\nSearching range {start}-{end} ({len(codes_to_fetch)} codes)...", flush=True)

        batch_new = 0
        with ThreadPoolExecutor(max_workers=15) as executor:
            futures = {executor.submit(fetch_course, code): code for code in codes_to_fetch}

            for future in as_completed(futures):
                course, code = future.result()
                if course:
                    state = course.state or ''

                    # Only insert if it's a target state or any state to fill gaps
                    success, state = insert_course(course, code)
                    if success:
                        new_courses += 1
                        batch_new += 1
                        existing.add(code)

                        if state in TARGET_STATES:
                            if state not in found_states:
                                found_states.add(state)
                                print(f"FOUND: {state} ({TARGET_STATES[state]})", flush=True)
                            state_counts[state] = state_counts.get(state, 0) + 1

                time.sleep(0.015)

        if batch_new > 0:
            print(f"  Added {batch_new} courses in this range", flush=True)

        # Show progress on target states
        found_abbrs = [TARGET_STATES[s] for s in found_states]
        missing_abbrs = [v for k, v in TARGET_STATES.items() if k not in found_states]
        print(f"  Found: {found_abbrs}, Missing: {missing_abbrs}", flush=True)

    print(f"\n=== COMPLETE ===", flush=True)
    print(f"New courses added: {new_courses}", flush=True)
    print(f"\nTarget state counts:", flush=True)
    for state, abbr in TARGET_STATES.items():
        count = state_counts.get(state, 0)
        print(f"  {abbr} ({state}): {count} courses", flush=True)

    missing = [v for k, v in TARGET_STATES.items() if k not in found_states]
    if missing:
        print(f"\nStill missing: {missing}", flush=True)
    else:
        print(f"\nAll target states found!", flush=True)

if __name__ == "__main__":
    main()
