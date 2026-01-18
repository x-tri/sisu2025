#!/usr/bin/env python3
"""
Import ALL courses from MeuSISU using getAllCourses API
"""
import os
import sys
import requests
import json

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
    "Content-Type": "application/json"
}

def get_all_courses_from_meusisu():
    """Fetch all courses from MeuSISU API"""
    print("\n🔍 Fetching ALL courses from MeuSISU...")
    try:
        resp = requests.get(f"{MEUSISU_API}/getAllCourses", timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Found {len(data)} courses from MeuSISU")
            return data
        else:
            print(f"❌ HTTP {resp.status_code}: {resp.text}")
            return []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []

def import_courses_to_supabase(courses):
    """Import courses to Supabase"""
    print(f"\n📥 Importing {len(courses)} courses to Supabase...")
    
    # First get existing codes to avoid duplicates
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=code",
        headers=HEADERS
    )
    existing_codes = set(c['code'] for c in resp.json())
    print(f"   Found {len(existing_codes)} existing courses")
    
    new_courses = []
    for course in courses:
        if course.get('code') not in existing_codes:
            new_courses.append({
                'code': course['code'],
                'name': course.get('name', ''),
                'university': course.get('university', ''),
                'campus': course.get('campus', ''),
                'city': course.get('city', ''),
                'state': course.get('state', ''),
                'degree': course.get('degree', ''),
                'schedule': course.get('schedule', ''),
                'latitude': course.get('latitude'),
                'longitude': course.get('longitude')
            })
    
    if not new_courses:
        print("✅ No new courses to import!")
        return 0
    
    print(f"   Importing {len(new_courses)} NEW courses...")
    
    # Import in batches of 1000
    batch_size = 1000
    total_imported = 0
    
    for i in range(0, len(new_courses), batch_size):
        batch = new_courses[i:i+batch_size]
        try:
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/courses",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=batch
            )
            if resp.status_code in [200, 201]:
                total_imported += len(batch)
                print(f"   ✅ Batch {i//batch_size + 1}: Imported {len(batch)} courses")
            else:
                print(f"   ❌ Batch {i//batch_size + 1} failed: {resp.text}")
        except Exception as e:
            print(f"   ❌ Error on batch {i//batch_size + 1}: {e}")
    
    return total_imported

def main():
    print("=" * 70)
    print("SISU 2025 - Import ALL Courses from MeuSISU")
    print("=" * 70)
    
    # Get all courses from MeuSISU
    courses = get_all_courses_from_meusisu()
    
    if not courses:
        print("\n❌ No courses found!")
        return 1
    
    # Import to Supabase
    imported = import_courses_to_supabase(courses)
    
    print("\n" + "=" * 70)
    print(f"✅ IMPORT COMPLETE!")
    print(f"   Total courses imported: {imported}")
    print("=" * 70)
    
    # Verify states
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=state&state=not.is.null",
        headers=HEADERS
    )
    states = set(c['state'] for c in resp.json() if c.get('state'))
    print(f"\n📊 Estados agora no banco: {len(states)}")
    print(f"   {sorted(states)}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
