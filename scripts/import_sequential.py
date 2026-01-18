#!/usr/bin/env python3
"""
Sequential course importer with rate limiting
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.monitor.fetcher import CourseFetcher
from src.storage import SupabaseClient

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"


def main():
    client = SupabaseClient(url=SUPABASE_URL, service_key=SERVICE_KEY)
    fetcher = CourseFetcher()

    # Get existing codes
    existing = client._get("courses", params={"select": "code", "limit": 10000})
    existing_codes = {c["code"] for c in existing}
    print(f"Existing courses: {len(existing_codes)}")

    # Import range with rate limiting
    start, end = 1, 500
    imported = 0
    errors = 0
    states = set()

    print(f"Importing courses {start}-{end}...")

    for code in range(start, end + 1):
        if code in existing_codes:
            continue

        try:
            course = fetcher.fetch_course(code)
            if course and course.course_name:
                data = course.to_dict()
                client.save_course_data(code, data)
                imported += 1
                if data.get("state"):
                    states.add(data["state"])
                if imported % 20 == 0:
                    print(f"  {imported} imported, {len(states)} states")
        except Exception as e:
            errors += 1

        time.sleep(0.15)  # Rate limit: ~6 requests/sec

    print(f"\nDone! Imported: {imported}, Errors: {errors}")
    print(f"States found: {len(states)}")
    for s in sorted(states):
        print(f"  - {s}")

    fetcher.close()


if __name__ == "__main__":
    main()
