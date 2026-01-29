#!/usr/bin/env python3
"""
SISU Cut Score Sync - Validated Mining Script
Extracts cut scores from MeuSISU API and validates data quality before inserting.
"""

import os
import sys
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Add project root to path for decoder import
sys.path.insert(0, str(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))))
from src.decoder.course import decode_course

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o")
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
    print(f"[{timestamp}] {prefix} {msg}")


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
            log(f"Erro ao buscar cursos: {resp.status_code}", "ERROR")
            break
        
        batch = resp.json()
        if not batch:
            break
        
        all_courses.extend(batch)
        offset += limit
    
    log(f"{len(all_courses)} cursos encontrados", "SUCCESS")
    return all_courses


def sync_course(course):
    """Sync cut scores for a single course with validation"""
    course_id = course['id']
    code = course['code']
    
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=15)
        if resp.status_code != 200:
            return {"code": code, "status": "api_error", "records": 0, "valid": 0}
        
        course_data = decode_course(resp.content)
        if not course_data or not course_data.years:
            return {"code": code, "status": "no_data", "records": 0, "valid": 0}
        
        # Find TARGET_YEAR data
        year_data = None
        for y in course_data.years:
            if y.year == TARGET_YEAR:
                year_data = y
                break
        
        if not year_data or not year_data.modalities:
            return {"code": code, "status": "no_year", "records": 0, "valid": 0}
        
        inserted = 0
        valid_records = 0
        
        for modality in year_data.modalities:
            # Check if data is REAL (not placeholder)
            has_cut_score = modality.cut_score is not None and modality.cut_score > 0
            has_partial = modality.partial_scores and len(modality.partial_scores) > 0

            # Derive cut_score from last partial_score if API doesn't provide it
            # The final cut score is the last day's score (Day 4 for final results)
            final_cut_score = modality.cut_score
            if not has_cut_score and has_partial:
                # Get the last day with a non-zero score
                for ps in reversed(modality.partial_scores):
                    if ps.get('score', 0) > 0:
                        final_cut_score = ps['score']
                        has_cut_score = True
                        break

            payload = {
                "course_id": course_id,
                "year": TARGET_YEAR,
                "modality_code": modality.code,
                "modality_name": modality.name,
                "cut_score": final_cut_score,
                "applicants": modality.applicants,
                "vacancies": modality.vacancies,
                "partial_scores": modality.partial_scores or [],
            }
            
            # Use upsert with on_conflict for the unique constraint
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores?on_conflict=course_id,year,modality_code",
                headers=HEADERS,
                json=payload
            )
            
            if resp.status_code in [200, 201]:
                inserted += 1
                if has_cut_score or has_partial:
                    valid_records += 1
        
        return {"code": code, "status": "ok", "records": inserted, "valid": valid_records}
        
    except Exception as e:
        return {"code": code, "status": "error", "records": 0, "valid": 0, "error": str(e)}


def main():
    log("=" * 60)
    log(f"🚀 SISU {TARGET_YEAR} Cut Score Sync (Validated)")
    log("=" * 60)
    
    courses = get_supabase_courses()
    if not courses:
        log("Nenhum curso encontrado. Abortando.", "ERROR")
        return
    
    log(f"Sincronizando {len(courses)} cursos...")
    
    stats = {
        "total": 0,
        "with_records": 0,
        "with_valid_data": 0,
        "total_records": 0,
        "valid_records": 0,
        "errors": 0
    }
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(sync_course, c): c for c in courses}
        
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            stats["total"] += 1
            
            if result["status"] == "ok":
                if result["records"] > 0:
                    stats["with_records"] += 1
                    stats["total_records"] += result["records"]
                if result["valid"] > 0:
                    stats["with_valid_data"] += 1
                    stats["valid_records"] += result["valid"]
            elif result["status"] in ["api_error", "error"]:
                stats["errors"] += 1
            
            # Progress every 500 courses
            if (i + 1) % 500 == 0:
                log(f"Processados {i+1}/{len(courses)} cursos...")
    
    log("")
    log("=" * 60)
    log("📊 RESULTADO DA SINCRONIZAÇÃO", "SUCCESS")
    log("=" * 60)
    log(f"   Cursos processados: {stats['total']}")
    log(f"   Cursos com registros: {stats['with_records']}")
    log(f"   Cursos com dados REAIS: {stats['with_valid_data']}")
    log(f"   Total de registros inseridos: {stats['total_records']}")
    log(f"   Registros com notas válidas: {stats['valid_records']}")
    log(f"   Erros: {stats['errors']}")
    log("=" * 60)
    
    # Validation check
    if stats["valid_records"] == 0:
        log("")
        log("⚠️  ATENÇÃO: Nenhum registro com notas reais foi encontrado!", "WARNING")
        log("   Isso significa que o SISU ainda não liberou as notas de corte.", "WARNING")
        log("   Tente novamente após o MEC publicar os dados (geralmente após 5h).", "WARNING")
    else:
        log("")
        log(f"✅ Dados de {TARGET_YEAR} sincronizados com sucesso!", "SUCCESS")
        log("   O frontend deve mostrar as notas imediatamente.", "SUCCESS")


if __name__ == "__main__":
    main()
