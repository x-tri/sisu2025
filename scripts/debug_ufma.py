
import os
import requests
import json

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def debug_ufma():
    print("Searching for UFMA Medicina (Broad)...")
    # Find course
    params = {
        "select": "id,code,name,university,campus,city",
        "name": "eq.Medicina",
        "university": "ilike.*Maranh*"
    }
    resp = requests.get(f"{SUPABASE_URL}/rest/v1/courses", headers=HEADERS, params=params)
    courses = resp.json()

    print(f"Found {len(courses)} courses.")
    for c in courses:
        print(f"ID: {c['id']} | Code: {c['code']} | {c['university']} | {c['campus']} | {c['city']}")
        
        # Check cut scores
        r = requests.get(f"{SUPABASE_URL}/rest/v1/cut_scores?course_id=eq.{c['id']}&order=year.asc", headers=HEADERS)
        scores = r.json()
        print(f"  Total Cut Score Records: {len(scores)}")
        
        years = {}
        for s in scores:
            y = s['year']
            mod = s['modality_name']
            if y not in years: years[y] = []
            years[y].append(f"{mod} ({s['cut_score']})")
            
        for y in sorted(years.keys()):
            print(f"  {y}: {len(years[y])} records")
            # print(f"    {years[y]}") 

        # Check for duplicates in Ampla Concorrencia
        print("  Checking Ampla Concorrencia duplicates...")
        ampla_counts = {}
        for s in scores:
            if 'ampla' in s['modality_name'].lower():
                key = f"{s['year']}"
                ampla_counts[key] = ampla_counts.get(key, 0) + 1
        
        for k, v in ampla_counts.items():
            if v > 1:
                print(f"    WARNING: {k} has {v} Ampla records!")
                # Print details of duplicates
                for s in scores:
                    if s['year'] == int(k) and 'ampla' in s['modality_name'].lower():
                         print(f"      ID: {s['id']} | Score: {s['cut_score']} | Updated: {s.get('created_at')}")

if __name__ == "__main__":
    debug_ufma()
