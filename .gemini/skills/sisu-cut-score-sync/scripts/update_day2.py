#!/usr/bin/env python3
"""
SISU Day 2 Update Script
Specifically updates partial_scores with Day 2 data for all courses.
"""

import os
import sys
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Add project root to path
sys.path.insert(0, str(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))))
from src.decoder.course import decode_course

# Configuration
SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"
MEUSISU_API = "https://meusisu.com/api"
TARGET_YEAR = 2026

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates,return=minimal"
}

def log(msg, level="INFO"):
    timestamp = datetime.now().strftime('%H:%M:%S')
    prefix = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌"}.get(level, "")
    print(f"[{timestamp}] {prefix} {msg}", flush=True)

def get_supabase_courses():
    """Get all course codes from Supabase"""
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
    
    return all_courses

def sync_course(course):
    """Sync cut scores for a single course"""
    course_id = course['id']
    code = course['code']
    
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=15)
        if resp.status_code != 200:
            return {"code": code, "status": "api_error", "updated": 0}
        
        course_data = decode_course(resp.content)
        if not course_data or not course_data.years:
            return {"code": code, "status": "no_data", "updated": 0}
        
        # Find TARGET_YEAR data
        year_data = None
        for y in course_data.years:
            if y.year == TARGET_YEAR:
                year_data = y
                break
        
        if not year_data or not year_data.modalities:
            return {"code": code, "status": "no_year", "updated": 0}
        
        updated = 0
        has_day2 = False
        
        for modality in year_data.modalities:
            # Check if we have Day 2 data
            if modality.partial_scores:
                days = [p.get('day') for p in modality.partial_scores]
                if '2' in days or 2 in days:
                    has_day2 = True
            
            payload = {
                "course_id": course_id,
                "year": TARGET_YEAR,
                "modality_code": modality.code,
                "modality_name": modality.name,
                "cut_score": modality.cut_score,
                "applicants": modality.applicants,
                "vacancies": modality.vacancies,
                "partial_scores": modality.partial_scores or [],
            }
            
            # Use upsert with on_conflict
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores?on_conflict=course_id,year,modality_code",
                headers=HEADERS,
                json=payload
            )
            
            if resp.status_code in [200, 201]:
                updated += 1
        
        return {"code": code, "status": "ok", "updated": updated, "has_day2": has_day2}
        
    except Exception as e:
        return {"code": code, "status": "error", "updated": 0, "error": str(e)}

def main():
    log("=" * 60)
    log(f"🚀 SISU {TARGET_YEAR} - Day 2 Update")
    log("=" * 60)
    
    log("Buscando cursos do Supabase...")
    courses = get_supabase_courses()
    log(f"{len(courses)} cursos encontrados", "SUCCESS")
    
    if not courses:
        log("Nenhum curso encontrado. Abortando.", "ERROR")
        return
    
    log(f"Sincronizando {len(courses)} cursos...")
    
    stats = {
        "total": 0,
        "updated": 0,
        "with_day2": 0,
        "errors": 0
    }
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(sync_course, c): c for c in courses}
        
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            stats["total"] += 1
            
            if result["status"] == "ok":
                stats["updated"] += result["updated"]
                if result.get("has_day2"):
                    stats["with_day2"] += 1
            elif result["status"] in ["api_error", "error"]:
                stats["errors"] += 1
            
            if (i + 1) % 500 == 0:
                log(f"Processados {i+1}/{len(courses)} cursos... ({stats['with_day2']} com Dia 2)")
    
    log("")
    log("=" * 60)
    log("📊 RESULTADO DA SINCRONIZAÇÃO DO DIA 2", "SUCCESS")
    log("=" * 60)
    log(f"   Cursos processados: {stats['total']}")
    log(f"   Registros atualizados: {stats['updated']}")
    log(f"   Cursos com Dia 2: {stats['with_day2']}")
    log(f"   Erros: {stats['errors']}")
    log("=" * 60)
    
    if stats["with_day2"] > 0:
        log("")
        log(f"✅ {stats['with_day2']} cursos agora têm dados do Dia 2!", "SUCCESS")
        log("   Os gráficos do frontend devem mostrar os dois dias.", "SUCCESS")
    else:
        log("")
        log("⚠️  Nenhum curso com Dia 2 encontrado ainda.", "WARNING")
        log("   O MEC pode não ter liberado os dados ainda.", "WARNING")

if __name__ == "__main__":
    main()
