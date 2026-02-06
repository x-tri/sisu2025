#!/usr/bin/env python3
"""
XTRI SISU 2026 - Quick Cut Score Sync
Sincroniza APENAS notas de corte (rápido, para uso durante o SISU)
"""

import os
import sys
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

sys.path.insert(0, str(os.path.dirname(os.path.dirname(__file__))))
from src.decoder.course import decode_course

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")
MEUSISU_API = "https://d3hf41n0t98fq2.cloudfront.net/api"
TARGET_YEAR = 2026  # Ano do SISU atual

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")

def get_supabase_courses():
    """Get all course codes from Supabase"""
    log("Buscando cursos do Supabase...")
    all_courses = []
    offset = 0
    limit = 1000
    
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name&order=id&offset={offset}&limit={limit}",
            headers=HEADERS
        )
        if resp.status_code != 200:
            break
        
        batch = resp.json()
        if not batch:
            break
        
        all_courses.extend(batch)
        offset += limit
    
    log(f"✓ {len(all_courses)} cursos encontrados")
    return all_courses

def sync_course_cut_scores(course):
    """Sync cut scores for a single course - ONLY for TARGET_YEAR"""
    course_id = course['id']
    code = course['code']
    
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=10)
        if resp.status_code != 200:
            return (code, 0, None)
        
        course_data = decode_course(resp.content)
        if not course_data or not course_data.years:
            return (code, 0, None)
        
        # Find TARGET_YEAR data
        year_data = None
        for y in course_data.years:
            if y.year == TARGET_YEAR:
                year_data = y
                break
        
        if not year_data or not year_data.modalities:
            return (code, 0, None)
        
        inserted = 0
        for modality in year_data.modalities:
            payload = {
                "course_id": course_id,
                "year": TARGET_YEAR,
                "modality_code": modality.code,
                "modality_name": modality.name,
                "cut_score": modality.cut_score,
                "applicants": modality.applicants,
                "vacancies": modality.vacancies,
                "partial_scores": modality.partial_scores,
            }
            
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores",
                headers=HEADERS,
                json=payload
            )
            if resp.status_code in [200, 201]:
                inserted += 1
        
        return (code, inserted, modality.partial_scores if year_data.modalities else None)
        
    except Exception as e:
        return (code, 0, str(e))

def main():
    log("=" * 50)
    log(f"🚀 XTRI SISU {TARGET_YEAR} - Quick Cut Score Sync")
    log("=" * 50)
    
    courses = get_supabase_courses()
    
    log(f"Sincronizando notas de corte de {TARGET_YEAR}...")
    
    total_updated = 0
    courses_with_data = 0
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(sync_course_cut_scores, c): c for c in courses}
        
        for i, future in enumerate(as_completed(futures)):
            code, count, extra = future.result()
            
            if count > 0:
                total_updated += count
                courses_with_data += 1
            
            # Progress every 100 courses
            if (i + 1) % 100 == 0:
                log(f"  Processados {i+1}/{len(courses)} cursos...")
    
    log("")
    log("=" * 50)
    log(f"✅ SINCRONIZAÇÃO COMPLETA")
    log(f"   Cursos processados: {len(courses)}")
    log(f"   Cursos com dados {TARGET_YEAR}: {courses_with_data}")
    log(f"   Total de registros atualizados: {total_updated}")
    log("=" * 50)

if __name__ == "__main__":
    main()
