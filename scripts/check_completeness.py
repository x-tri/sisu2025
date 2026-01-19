
import os
import requests
import json
from collections import defaultdict

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_completeness(query):
    print(f"\nScanning: {query}")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus&university=ilike.*{query}*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    print(f"Total Courses: {len(courses)}")
    
    if not courses:
        return

    # Check weights, cut_scores, students for these courses
    # Batching IDs might be needed but for ~30-50 courses it's fine to check one by one or in small batches
    
    total_weights = 0
    total_cut_scores = 0
    total_students = 0
    
    # We can use 'in' filter if list is small, or iterate
    ids = [c['id'] for c in courses]
    
    # Chunking IDs to avoid URL length issues
    chunk_size = 50
    for i in range(0, len(ids), chunk_size):
        chunk = ids[i:i+chunk_size]
        ids_str = ",".join(map(str, chunk))
        
        # Check weights
        r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        count = int(r.headers.get('content-range', '0/0').split('/')[1])
        total_weights += count
        
        # Check cut_scores
        r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        count = int(r.headers.get('content-range', '0/0').split('/')[1])
        total_cut_scores += count

        # Check students
        r = requests.get(f"{SUPABASE_URL}/rest/v1/approved_students?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        count = int(r.headers.get('content-range', '0/0').split('/')[1])
        total_students += count
        
    print(f"  Weights: {total_weights} (Avg: {total_weights/len(courses):.1f})")
    print(f"  Cut Scores: {total_cut_scores} (Avg: {total_cut_scores/len(courses):.1f})")
    print(f"  Students: {total_students} (Avg: {total_students/len(courses):.1f})")

if __name__ == "__main__":
    check_completeness("Universidade do Estado do Rio Grande do Norte")
    check_completeness("Universidade Federal Rural do Semi-Árido")
    
    # Check UFRN Caicó specifically
    print("\nScanning: UFRN Caicó")
    endpoint = f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name,university,campus&university=ilike.*Rio Grande do Norte*&campus=ilike.*Caic*"
    resp = requests.get(endpoint, headers=HEADERS)
    courses = resp.json()
    print(f"Total Courses: {len(courses)}")
    if courses:
        ids_str = ",".join(map(str, [c['id'] for c in courses]))
        # Check counts
        r = requests.get(f"{SUPABASE_URL}/rest/v1/course_weights?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        w = int(r.headers.get('content-range', '0/0').split('/')[1])
        
        r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        c = int(r.headers.get('content-range', '0/0').split('/')[1])
        
        r = requests.get(f"{SUPABASE_URL}/rest/v1/approved_students?select=count&course_id=in.({ids_str})", headers={**HEADERS, "Range": "0-0", "Prefer": "count=exact"})
        s = int(r.headers.get('content-range', '0/0').split('/')[1])
        
        print(f"  Weights: {w} (Avg: {w/len(courses):.1f})")
        print(f"  Cut Scores: {c} (Avg: {c/len(courses):.1f})")
        print(f"  Students: {s} (Avg: {s/len(courses):.1f})")
