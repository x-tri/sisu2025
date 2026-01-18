#!/usr/bin/env python3
"""
Import courses for missing states from MeuSISU using correct API.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
import time
from src.decoder import decode_course
from src.decoder.protobuf import parse_message

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

# State index mapping (1-based indices from MeuSISU API)
# Discovered via testing: indices are 1-based, not 0-based!
STATE_INDICES = {
    'AC': 1,   # Acre
    'AL': 2,   # Alagoas
    'AP': 3,   # Amapá
    'AM': 4,   # Amazonas
    'BA': 5,   # Bahia
    'CE': 6,   # Ceará
    'DF': 7,   # Distrito Federal
    'ES': 8,   # Espirito Santo
    'GO': 9,   # Goiás
    'MA': 10,  # Maranhão
    'MS': 11,  # Mato Grosso do Sul
    'MT': 12,  # Mato Grosso
    'MG': 13,  # Minas Gerais
    'PA': 14,  # Pará
    'PB': 15,  # Paraíba
    'PR': 16,  # Paraná
    'PE': 17,  # Pernambuco
    'PI': 18,  # Piauí
    'RJ': 19,  # Rio de Janeiro
    'RN': 20,  # Rio Grande do Norte
    'RS': 21,  # Rio Grande do Sul
    'RO': 22,  # Rondônia
    'RR': 23,  # Roraima
    'SC': 24,  # Santa Catarina
    'SP': 25,  # São Paulo
    'SE': 26,  # Sergipe
    'TO': 27,  # Tocantins
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

def extract_course_codes(protobuf_data):
    """Extract course codes from search results protobuf"""
    codes = []
    try:
        msg = parse_message(protobuf_data)
        # Field 2 contains course entries
        if 2 in msg:
            for item_type, item_value in msg[2]:
                if item_type == 'message' and isinstance(item_value, dict):
                    # Field 8 is the course code
                    if 8 in item_value:
                        for vtype, vval in item_value[8]:
                            if vtype == 'varint':
                                codes.append(vval)
                                break
    except Exception as e:
        print(f"  Parse error: {e}", flush=True)
    return codes

def get_course_codes_for_state(state_abbr):
    """Get all course codes for a state"""
    state_idx = STATE_INDICES.get(state_abbr)
    if state_idx is None:
        return []

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
                print(f"    Page {page}: {len(codes)} courses", flush=True)
                page += 1
                time.sleep(0.1)
            else:
                break
        except Exception as e:
            print(f"    Error: {e}", flush=True)
            break

    return all_codes

def fetch_course_details(code):
    """Fetch full course details using correct API endpoint"""
    try:
        url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200 and response.content:
            course = decode_course(response.content)
            if course and course.course_name:
                return course
    except Exception as e:
        pass
    return None

def insert_course(course, code):
    """Insert course into Supabase"""
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

    response = requests.post(
        f"{SUPABASE_URL}/rest/v1/courses",
        headers=headers,
        json=payload
    )
    return response.status_code in [200, 201]

def main():
    print("Fetching existing courses...", flush=True)
    existing = get_existing_codes()
    print(f"Existing: {len(existing)} courses", flush=True)

    total_new = 0
    state_counts = {}

    for state_abbr, state_idx in STATE_INDICES.items():
        print(f"\n=== {state_abbr} ===", flush=True)

        # Get course codes for this state
        codes = get_course_codes_for_state(state_abbr)
        print(f"  Found {len(codes)} course codes", flush=True)

        # Filter out existing codes
        new_codes = [c for c in codes if c not in existing]
        print(f"  New codes to import: {len(new_codes)}", flush=True)

        # Import each course
        imported = 0
        for code in new_codes:
            course = fetch_course_details(code)
            if course:
                if insert_course(course, code):
                    imported += 1
                    existing.add(code)
            time.sleep(0.05)

        state_counts[state_abbr] = imported
        total_new += imported
        print(f"  Imported: {imported} courses", flush=True)

    print(f"\n=== COMPLETE ===", flush=True)
    print(f"Total new courses: {total_new}", flush=True)
    print(f"\nBy state:", flush=True)
    for state, count in state_counts.items():
        print(f"  {state}: {count}", flush=True)

if __name__ == "__main__":
    main()
