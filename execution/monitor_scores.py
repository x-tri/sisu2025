#!/usr/bin/env python3
"""
SISU 2025 - Real-time Score Monitoring Script

This script monitors cut scores and partial scores for SISU 2025 courses
and updates the database in real-time.

Usage:
    # Run once
    python3 monitor_scores.py

    # Run as daemon (every 30 minutes)
    python3 monitor_scores.py --daemon --interval 30

    # Monitor specific courses only
    python3 monitor_scores.py --courses 48,916,555
"""

import os
import sys
import time
import argparse
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from src.decoder import decode_course

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
MEUSISU_API = "https://meusisu.com/api"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}


def log(message: str):
    """Print with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}", flush=True)


def get_all_course_codes() -> list:
    """Get all course codes from the database"""
    codes = []
    offset = 0
    limit = 1000
    
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=id,code&offset={offset}&limit={limit}",
            headers=HEADERS
        )
        if resp.status_code != 200:
            log(f"Error fetching courses: {resp.status_code}")
            break
            
        data = resp.json()
        if not data:
            break
            
        codes.extend([(c['id'], c['code']) for c in data if c.get('code')])
        
        if len(data) < limit:
            break
        offset += limit
    
    return codes


def fetch_course_data(code: int):
    """Fetch course data from MeuSISU API"""
    try:
        url = f"{MEUSISU_API}/getCourseData?courseCode={code}"
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200 and resp.content:
            return decode_course(resp.content)
    except Exception as e:
        pass
    return None


def update_cut_scores(course_id: int, code: int) -> dict:
    """Fetch and update cut scores for a course, returns stats"""
    stats = {"updated": 0, "unchanged": 0, "errors": 0}
    
    course_data = fetch_course_data(code)
    if not course_data or not course_data.years:
        return stats
    
    # Only process 2025 data
    year_2025 = None
    for year_data in course_data.years:
        if year_data.year == 2025:
            year_2025 = year_data
            break
    
    if not year_2025 or not year_2025.modalities:
        return stats
    
    for modality in year_2025.modalities:
        payload = {
            "course_id": course_id,
            "year": 2025,
            "modality_code": modality.code,
            "modality_name": modality.name,
            "cut_score": modality.cut_score,
            "applicants": modality.applicants,
            "vacancies": modality.vacancies,
            "partial_scores": modality.partial_scores,
        }
        
        try:
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=payload
            )
            if resp.status_code in [200, 201]:
                stats["updated"] += 1
            else:
                stats["errors"] += 1
        except Exception as e:
            stats["errors"] += 1
    
    return stats


def run_monitoring_cycle(course_codes: list = None, max_workers: int = 15):
    """Run a single monitoring cycle for all courses"""
    log("=" * 60)
    log("Starting monitoring cycle...")
    log("=" * 60)
    
    if course_codes is None:
        log("Fetching all course codes from database...")
        courses = get_all_course_codes()
    else:
        # Resolve course IDs from codes
        courses = []
        for code in course_codes:
            resp = requests.get(
                f"{SUPABASE_URL}/rest/v1/courses?select=id,code&code=eq.{code}",
                headers=HEADERS
            )
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    courses.append((data[0]['id'], data[0]['code']))
    
    log(f"Monitoring {len(courses)} courses...")
    
    total_updated = 0
    total_errors = 0
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}
        for course_id, code in courses:
            future = executor.submit(update_cut_scores, course_id, code)
            futures[future] = (course_id, code)
        
        completed = 0
        for future in as_completed(futures):
            completed += 1
            course_id, code = futures[future]
            try:
                stats = future.result()
                total_updated += stats["updated"]
                total_errors += stats["errors"]
                
                if stats["updated"] > 0:
                    log(f"  [{completed}/{len(courses)}] Course {code}: {stats['updated']} modalities updated")
            except Exception as e:
                log(f"  Error processing course {code}: {e}")
                total_errors += 1
            
            # Progress update every 100 courses
            if completed % 100 == 0:
                log(f"  Progress: {completed}/{len(courses)} courses processed...")
    
    log("=" * 60)
    log(f"Cycle complete!")
    log(f"  Total modalities updated: {total_updated}")
    log(f"  Total errors: {total_errors}")
    log("=" * 60)
    
    return total_updated, total_errors


def run_daemon(interval_minutes: int, course_codes: list = None):
    """Run as a daemon, updating every N minutes"""
    log(f"Starting daemon mode - updating every {interval_minutes} minutes")
    log("Press Ctrl+C to stop")
    
    cycle = 1
    while True:
        log(f"\n🔄 Cycle #{cycle}")
        run_monitoring_cycle(course_codes)
        
        log(f"\n⏳ Sleeping for {interval_minutes} minutes...")
        time.sleep(interval_minutes * 60)
        cycle += 1


def main():
    parser = argparse.ArgumentParser(description="SISU 2025 Score Monitoring")
    parser.add_argument("--daemon", action="store_true", help="Run as daemon")
    parser.add_argument("--interval", type=int, default=30, help="Update interval in minutes (default: 30)")
    parser.add_argument("--courses", type=str, help="Comma-separated list of course codes to monitor")
    parser.add_argument("--workers", type=int, default=15, help="Number of parallel workers (default: 15)")
    
    args = parser.parse_args()
    
    # Parse course codes if provided
    course_codes = None
    if args.courses:
        course_codes = [int(c.strip()) for c in args.courses.split(",")]
        log(f"Monitoring specific courses: {course_codes}")
    
    if args.daemon:
        run_daemon(args.interval, course_codes)
    else:
        run_monitoring_cycle(course_codes, args.workers)


if __name__ == "__main__":
    main()
