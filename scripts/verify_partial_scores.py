
import os
import requests
import json
import sys

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_KEY not set")
    # Try to grab it from args or file if needed, but usually env is set in run_command
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def verify_data():
    print("Verifying Partial Scores in Database...")
    
    # Query for any cut_score that has non-empty partial_scores
    # We can't filter by length easily in REST, so we'll fetch a few and check in python
    # asking for partial_scores is not null might NOT work if it's JSONB, but let's try strict filtering if possible.
    # Actually, let's just fetch recent ones.
    
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/cut_scores?select=course_id,modality_name,partial_scores,year&limit=50&order=captured_at.desc",
        headers=HEADERS
    )
    
    if resp.status_code != 200:
        print(f"Error: {resp.status_code} - {resp.text}")
        return

    data = resp.json()
    found = 0
    for row in data:
        ps = row.get('partial_scores')
        if ps and isinstance(ps, list) and len(ps) > 0:
            print(f"\n[FOUND] Course ID {row['course_id']} ({row['year']}) - {row['modality_name']}")
            print(f"  Partial Scores: {len(ps)} entires")
            print(f"  Sample: {ps[0]}")
            found += 1
            if found >= 3:
                break
    
    if found == 0:
        print("\n[WARNING] No partial scores found in the last 50 cut_score records.")
    else:
        print(f"\n[SUCCESS] Found {found} records with partial scores populated.")

if __name__ == "__main__":
    verify_data()
