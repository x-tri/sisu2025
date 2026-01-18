#!/usr/bin/env python3
"""
Fetch ALL courses from MeuSISU API and import to Supabase
This script discovers valid course codes and imports them
"""
import sys
import time
import json
import logging
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.decoder import decode_course
from src.monitor.fetcher import CourseFetcher
from src.storage import SupabaseClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

# Course code range to check - based on observed codes, max seems to be around 17000
MIN_CODE = 1
MAX_CODE = 20000
BATCH_SIZE = 100
MAX_WORKERS = 10


def fetch_course_safe(fetcher: CourseFetcher, code: int) -> tuple[int, dict | None]:
    """Safely fetch a course, returning (code, data) tuple"""
    try:
        course = fetcher.fetch_course(code)
        if course and course.course_name:
            return (code, course.to_dict())
    except Exception as e:
        pass
    return (code, None)


def discover_valid_codes(start: int, end: int) -> list[int]:
    """Discover valid course codes in a range"""
    valid_codes = []
    fetcher = CourseFetcher()

    logger.info(f"Discovering courses from {start} to {end}...")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(fetch_course_safe, fetcher, code): code
            for code in range(start, end + 1)
        }

        for future in as_completed(futures):
            code, data = future.result()
            if data:
                valid_codes.append(code)
                if len(valid_codes) % 100 == 0:
                    logger.info(f"Found {len(valid_codes)} valid courses so far...")

    fetcher.close()
    return sorted(valid_codes)


def import_courses_to_supabase(codes: list[int], client: SupabaseClient, fetcher: CourseFetcher):
    """Import courses to Supabase"""
    total = len(codes)
    imported = 0
    errors = 0

    for i, code in enumerate(codes):
        try:
            course = fetcher.fetch_course(code)
            if course:
                data = course.to_dict()
                client.save_course_data(code, data)
                imported += 1

            if (i + 1) % 50 == 0:
                logger.info(f"Progress: {i + 1}/{total} - Imported: {imported}, Errors: {errors}")

        except Exception as e:
            errors += 1
            logger.error(f"Error importing course {code}: {e}")

        # Rate limiting
        time.sleep(0.1)

    return imported, errors


def main():
    print("=" * 60)
    print("MeuSISU Course Importer")
    print("=" * 60)

    # Initialize clients
    client = SupabaseClient(url=SUPABASE_URL, service_key=SERVICE_KEY)

    if not client.test_connection():
        print("❌ Failed to connect to Supabase")
        return 1

    print("✅ Connected to Supabase\n")

    # Check existing courses
    existing = client._get("courses", params={"select": "code", "limit": 10000})
    existing_codes = {c["code"] for c in existing}
    print(f"📊 Found {len(existing_codes)} existing courses in database\n")

    # Discover valid course codes in batches
    all_valid_codes = []

    print(f"🔍 Discovering valid course codes ({MIN_CODE} to {MAX_CODE})...")

    for start in range(MIN_CODE, MAX_CODE + 1, 1000):
        end = min(start + 999, MAX_CODE)
        codes = discover_valid_codes(start, end)
        all_valid_codes.extend(codes)
        print(f"   Range {start}-{end}: Found {len(codes)} courses (Total: {len(all_valid_codes)})")

    print(f"\n✅ Total valid courses found: {len(all_valid_codes)}")

    # Filter out existing codes
    new_codes = [c for c in all_valid_codes if c not in existing_codes]
    print(f"📝 New courses to import: {len(new_codes)}")

    if not new_codes:
        print("\n✨ Database is up to date!")
        return 0

    # Import new courses
    print(f"\n📥 Importing {len(new_codes)} new courses...")

    fetcher = CourseFetcher()
    imported, errors = import_courses_to_supabase(new_codes, client, fetcher)
    fetcher.close()

    print("\n" + "=" * 60)
    print(f"✅ Import complete!")
    print(f"   Imported: {imported}")
    print(f"   Errors: {errors}")
    print("=" * 60)

    return 0


if __name__ == "__main__":
    sys.exit(main())
