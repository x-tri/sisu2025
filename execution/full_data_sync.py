#!/usr/bin/env python3
"""
Full Data Audit & Sync Script
Compares Supabase with MeuSISU API and fills missing data.
"""

import os
import sys
import json
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from time import sleep

sys.path.insert(0, str(os.path.dirname(os.path.dirname(__file__))))

from src.decoder.course import decode_course, decode_students

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

# ============================================================================
# PHASE 1: Get all course codes from MeuSISU
# ============================================================================

def get_meusisu_all_courses():
    """Fetch all course codes from MeuSISU search API"""
    print("\n=== PHASE 1: Fetching all courses from MeuSISU ===")
    
    # MeuSISU has a search endpoint that returns all courses
    # We'll try to get them by searching with empty query or specific patterns
    all_courses = []
    
    # Try fetching from their courses list endpoint
    try:
        # This endpoint returns all basic course info
        resp = requests.get(f"{MEUSISU_API}/getAllCourses", timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            print(f"  Found {len(data)} courses from getAllCourses")
            return data
    except Exception as e:
        print(f"  getAllCourses failed: {e}")
    
    # Fallback: Get from states/cities/universities cascade
    print("  Falling back to cascade fetch...")
    
    # Get states list
    states_resp = requests.get(f"{MEUSISU_API}/getStates", timeout=10)
    if states_resp.status_code != 200:
        print("  Could not get states list")
        return []
    
    states = states_resp.json()
    print(f"  Found {len(states)} states")
    
    # For each state, get courses
    for state in states[:5]:  # Limit for testing
        try:
            courses_resp = requests.get(f"{MEUSISU_API}/getCoursesByState?state={state}", timeout=30)
            if courses_resp.status_code == 200:
                state_courses = courses_resp.json()
                all_courses.extend(state_courses)
                print(f"    {state}: {len(state_courses)} courses")
        except Exception as e:
            print(f"    Error for state {state}: {e}")
        sleep(0.2)  # Rate limiting
    
    return all_courses

# ============================================================================
# PHASE 2: Get current Supabase state
# ============================================================================

def get_supabase_courses():
    """Get all courses currently in Supabase"""
    print("\n=== PHASE 2: Fetching current Supabase data ===")
    
    all_courses = []
    offset = 0
    limit = 1000
    
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,city,state&order=id&offset={offset}&limit={limit}",
            headers=HEADERS
        )
        if resp.status_code != 200:
            print(f"  Error fetching courses: {resp.text}")
            break
        
        batch = resp.json()
        if not batch:
            break
        
        all_courses.extend(batch)
        offset += limit
        print(f"  Fetched {len(all_courses)} courses...")
    
    print(f"  Total courses in Supabase: {len(all_courses)}")
    return all_courses

def get_supabase_weights():
    """Get all course weights in Supabase"""
    all_weights = []
    offset = 0
    limit = 1000
    
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/course_weights?select=course_id,year&order=course_id&offset={offset}&limit={limit}",
            headers=HEADERS
        )
        if resp.status_code != 200:
            break
        
        batch = resp.json()
        if not batch:
            break
        
        all_weights.extend(batch)
        offset += limit
    
    # Create a set of (course_id, year) tuples
    weight_set = set((w['course_id'], w['year']) for w in all_weights)
    print(f"  Total weight records in Supabase: {len(all_weights)}")
    return weight_set

# ============================================================================
# PHASE 3: Fetch and sync missing data
# ============================================================================

def fetch_course_data(code: int):
    """Fetch full course data from MeuSISU API"""
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=10)
        if resp.status_code != 200:
            return None
        return decode_course(resp.content)
    except Exception as e:
        print(f"    Error fetching code {code}: {e}")
        return None

def sync_course_weights(course_id: int, code: int, existing_weights: set):
    """Sync weights for a single course"""
    course_data = fetch_course_data(code)
    if not course_data or not course_data.years:
        return 0
    
    inserted = 0
    for year_data in course_data.years:
        # Skip if already exists
        if (course_id, year_data.year) in existing_weights:
            continue
        
        if not year_data.weights:
            continue
        
        payload = {
            "course_id": course_id,
            "year": year_data.year,
            "peso_red": year_data.weights.get('pesoRed'),
            "peso_ling": year_data.weights.get('pesoLing'),
            "peso_mat": year_data.weights.get('pesoMat'),
            "peso_ch": year_data.weights.get('pesoCh'),
            "peso_cn": year_data.weights.get('pesoCn'),
            "min_red": year_data.minimums.get('minRed') if year_data.minimums else None,
            "min_ling": year_data.minimums.get('minLing') if year_data.minimums else None,
            "min_mat": year_data.minimums.get('minMat') if year_data.minimums else None,
            "min_ch": year_data.minimums.get('minCh') if year_data.minimums else None,
            "min_cn": year_data.minimums.get('minCn') if year_data.minimums else None,
            "min_enem": year_data.minimums.get('minEnem') if year_data.minimums else None,
        }
        
        resp = requests.post(f"{SUPABASE_URL}/rest/v1/course_weights", headers=HEADERS, json=payload)
        if resp.status_code in [200, 201]:
            inserted += 1
    
    return inserted

def sync_course_cut_scores(course_id: int, code: int):
    """Sync cut scores for a single course"""
    course_data = fetch_course_data(code)
    if not course_data or not course_data.years:
        return 0
    
    inserted = 0
    for year_data in course_data.years:
        if not year_data.modalities:
            continue
        
        for modality in year_data.modalities:
            payload = {
                "course_id": course_id,
                "year": year_data.year,
                "modality_code": modality.code,
                "modality_name": modality.name,
                "cut_score": modality.cut_score,
                "applicants": modality.applicants,
                "vacancies": modality.vacancies,
                "partial_scores": modality.partial_scores,
            }
            
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=payload
            )
            if resp.status_code in [200, 201]:
                inserted += 1
    
    return inserted

def sync_course_students(course_id: int, code: int):
    """Sync approved students for a single course"""
    print(f"    Syncing students for course {code}...")
    try:
        # Retry logic for API requests
        session = requests.Session()
        adapter = requests.adapters.HTTPAdapter(max_retries=3)
        session.mount('https://', adapter)

        resp = session.get(f"{MEUSISU_API}/courseDataStudents?courseCode={code}", timeout=30)
        if resp.status_code != 200:
            return 0
            
        students = decode_students(resp.content)
        if not students:
            return 0

        # FILTER: Keep ONLY 2024 students as requested
        students_2024 = [s for s in students if s.year == 2024]
        
        if not students_2024:
            return 0
            
        # Delete existing students for this course to ensure clean slate for 2024
        requests.delete(f"{SUPABASE_URL}/rest/v1/approved_students?course_id=eq.{course_id}", headers=HEADERS)

        # Bulk insert
        payload = []
        for s in students_2024:
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
            
        # Send in batches of 1000
        total_inserted = 0
        batch_size = 1000
        for i in range(0, len(payload), batch_size):
            batch = payload[i:i+batch_size]
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/approved_students",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=batch
            )
            if resp.status_code in [200, 201]:
                total_inserted += len(batch)
            else:
                print(f"      Error batch insert: {resp.text}")
                
        return total_inserted
        
    except Exception as e:
        print(f"    Error syncing students for {code}: {e}")
        return 0


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("=" * 60)
    print("SISU 2025 - Full Data Audit & Sync")
    print("=" * 60)
    
    # Phase 2: Get Supabase state
    supabase_courses = get_supabase_courses()
    existing_weights = get_supabase_weights()
    
    # Create lookup by code
    courses_by_code = {c['code']: c for c in supabase_courses}
    
    # Count stats
    courses_without_weights = []
    for course in supabase_courses:
        has_weights = any((course['id'], year) in existing_weights for year in range(2019, 2026))
        if not has_weights:
            courses_without_weights.append(course)
    
    print(f"\n=== AUDIT RESULTS ===")
    print(f"  Total courses: {len(supabase_courses)}")
    print(f"  Courses missing weights: {len(courses_without_weights)}")
    print(f"  Unique states: {len(set(c['state'] for c in supabase_courses if c['state']))}")
    print(f"  Unique cities: {len(set(c['city'] for c in supabase_courses if c['city']))}")
    print(f"  Unique universities: {len(set(c['university'] for c in supabase_courses if c['university']))}")
    
    # Phase 3: Sync missing weights
    print(f"\n=== PHASE 3: Syncing missing weights ===")
    
    total_weights_added = 0
    with ThreadPoolExecutor(max_workers=15) as executor:
        futures = {}
        for course in courses_without_weights:
            future = executor.submit(sync_course_weights, course['id'], course['code'], existing_weights)
            futures[future] = course
        
        for i, future in enumerate(as_completed(futures)):
            course = futures[future]
            try:
                added = future.result()
                total_weights_added += added
                if added > 0:
                    print(f"  [{i+1}/{len(courses_without_weights)}] {course['name']}: +{added} weights")
            except Exception as e:
                print(f"  Error syncing {course['code']}: {e}")

    # Phase 3.5: Sync Cut Scores (incl. Partial Scores)
    print(f"\n=== PHASE 3.5: Syncing cut scores ===")
    total_scores_added = 0
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        # Sync for all courses, or maybe just the ones we touched? 
        # For now, let's sync for the same list 'courses_without_weights' to save time, 
        # BUT the user might have weights but NO partial scores.
        # To be safe, we should sync for ALL courses, but that's 5000+ courses.
        # I'll stick to 'courses_without_weights' + maybe a random set? 
        # No, the user probably wants it for the course they are looking at.
        # Let's sync for ALL courses but with a higher worker count or trust the user to run it selectively?
        # The prompt is 'front outdated'.
        # I will sync for 'courses_without_weights' AND `courses_to_sync_students` (which is ALL).
        # Let's use `supabase_courses` (ALL).
        
        for course in supabase_courses:
            future = executor.submit(sync_course_cut_scores, course['id'], course['code'])
            futures[future] = course
            
        for i, future in enumerate(as_completed(futures)):
            course = futures[future]
            try:
                added = future.result()
                total_scores_added += added
                if added > 0:
                    print(f"  [{i+1}/{len(supabase_courses)}] {course['name']}: +{added} scores")
                if (i+1) % 100 == 0:
                    print(f"  Processed {i+1} courses...")
            except Exception as e:
                print(f"  Error syncing scores {course['code']}: {e}")

    # Phase 4: Sync Students
    print(f"\n=== PHASE 4: Syncing students ===")
    total_students_added = 0
    # Process only a subset or all depending on needs. 
    # For now, let's process the ones we just synced weights for, or all if needed.
    # To keep it fast for this run, let's stick to the same list or a specific test list
    
    # Let's do a quick check of how many courses have students in Supabase
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/approved_students?select=course_id&limit=1", headers=HEADERS)
    has_students = False 
    
    courses_to_sync_students = list(courses_by_code.values()) # Sync all
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for course in courses_to_sync_students:
            # We can check if it already has data to save time, but upsert is safe
            future = executor.submit(sync_course_students, course['id'], course['code'])
            futures[future] = course
        
        for i, future in enumerate(as_completed(futures)):
            course = futures[future]
            try:
                added = future.result()
                total_students_added += added
                if added > 0:
                    print(f"  [{i+1}/{len(courses_to_sync_students)}] {course['name']}: +{added} students")
            except Exception as e:
                print(f"  Error syncing students {course['code']}: {e}")

    print(f"\n=== SYNC COMPLETE ===")
    print(f"  Total weights added: {total_weights_added}")
    print(f"  Total cut scores added: {total_scores_added}")
    print(f"  Total students added: {total_students_added}")


if __name__ == "__main__":
    main()
