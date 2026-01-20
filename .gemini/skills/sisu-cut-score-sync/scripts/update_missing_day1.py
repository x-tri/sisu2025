#!/usr/bin/env python3
"""
Update Missing Day 1 Scores
Refetches data for courses that are missing 'Day 1' in partial_scores for 2026.
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

def get_missing_courses():
    """Get course codes that are missing Day 1 data"""
    log("Identificando cursos com dados faltantes (Dia 1)...")
    
    # Query for distinct course codes where partial_scores does not contain day 1
    # We use a raw SQL query via RPC or just fetch all and filter? 
    # Fetching 6700 codes is fine via rest.
    
    # Actually, the SQL is complex for REST syntax. Let's try to use the join syntax if possible,
    # or just use a raw SQL execution if I had a tool for it in python, but I don't.
    # I'll fetch courses that have 'null' partials first, then maybe ones that lack "day": "1".
    
    # Alternative: Use the text search or RPC.
    # Since I can't easily do complex joins/filtering in the standard python client without an RPC,
    # I will fetch ALL 2026 cut_scores with minimal fields, then filter in python.
    # It might be heavy (300k rows) but manageable.
    
    log("Buscando metadados de 2026...")
    missing_codes = set()
    
    # Pagination loop
    offset = 0
    limit = 10000
    
    while True:
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/cut_scores?year=eq.{TARGET_YEAR}&select=course_id,partial_scores,courses(code)&offset={offset}&limit={limit}",
            headers=HEADERS
        )
        if resp.status_code != 200:
            log(f"Erro ao buscar dados: {resp.status_code}", "ERROR")
            break
            
        batch = resp.json()
        if not batch:
            break
            
        for row in batch:
            partials = row.get('partial_scores') or []
            has_day_1 = any(p.get('day') == "1" or p.get('day') == 1 for p in partials)
            
            if not has_day_1:
                # Add code to missing list
                if row.get('courses') and row['courses'].get('code'):
                    missing_codes.add(row['courses']['code'])
        
        offset += limit
        print(f"\rProcessados {offset} registros... Encontrados {len(missing_codes)} cursos incompletos", end="")
    
    print()
    log(f"Total de cursos para atualizar: {len(missing_codes)}", "SUCCESS")
    
    # Convert to list of dicts for compatibility with sync function
    # Only need id and code, but here we only have code. We can search by code or just use code.
    # The sync function needs 'id' for insertion.
    # I need to get the IDs for these codes.
    
    if not missing_codes:
        return []
        
    return list(missing_codes)

def get_course_ids(codes):
    """Fetch IDs for the given codes"""
    log("Resolvendo IDs dos cursos...")
    course_map = []
    
    # Chunking to avoid URL too long
    code_list = list(codes)
    chunk_size = 200
    
    for i in range(0, len(code_list), chunk_size):
        chunk = code_list[i:i+chunk_size]
        chunk = [str(c) for c in chunk]
        filter_str = ','.join(chunk)
        
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?code=in.({filter_str})&select=id,code",
            headers=HEADERS
        )
        
        if resp.status_code == 200:
            course_map.extend(resp.json())
            
    return course_map

def sync_course(course):
    """Sync cut scores for a single course"""
    course_id = course['id']
    code = course['code']
    
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={code}", timeout=15)
        if resp.status_code != 200:
            return {"code": code, "status": "api_error"}
        
        course_data = decode_course(resp.content)
        if not course_data or not course_data.years:
            return {"code": code, "status": "no_data"}
        
        # Find TARGET_YEAR data
        year_data = None
        for y in course_data.years:
            if y.year == TARGET_YEAR:
                year_data = y
                break
        
        if not year_data or not year_data.modalities:
            return {"code": code, "status": "no_year"}
        
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
                "partial_scores": modality.partial_scores or [],
            }
            
            resp = requests.post(
                f"{SUPABASE_URL}/rest/v1/cut_scores",
                headers=HEADERS,
                json=payload
            )
            
            if resp.status_code in [200, 201]:
                inserted += 1
        
        return {"code": code, "status": "ok", "records": inserted}
        
    except Exception as e:
        return {"code": code, "status": "error", "error": str(e)}

def main():
    log("=" * 60)
    log(f"🚀 SISU {TARGET_YEAR} - Update Missing Day 1")
    log("=" * 60)
    
    # 1. Get codes
    codes = get_missing_courses()
    if not codes:
        log("Tudo atualizado! Nenhum curso faltando dia 1.", "SUCCESS")
        return

    # 2. Get IDs
    courses_to_sync = get_course_ids(codes)
    log(f"Iniciando atualização de {len(courses_to_sync)} cursos...", "INFO")
    
    # 3. Process
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(sync_course, c): c for c in courses_to_sync}
        
        counts = {"ok": 0, "error": 0, "no_data": 0}
        
        for i, future in enumerate(as_completed(futures)):
            result = future.result()
            status = result["status"]
            
            if status == "ok":
                counts["ok"] += 1
            elif status == "error":
                counts["error"] += 1
            else:
                counts["no_data"] += 1
                
            if (i + 1) % 100 == 0:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Progresso: {i+1}/{len(courses_to_sync)} | OK: {counts['ok']} | Erros: {counts['error']}")
                
    log("=" * 60)
    log("Atualização Concluída!", "SUCCESS")
    log(f"Sucesso: {counts['ok']}")
    log(f"Erros: {counts['error']}")
    log(f"Sem dados: {counts['no_data']}")

if __name__ == "__main__":
    main()
