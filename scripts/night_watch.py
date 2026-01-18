#!/usr/bin/env python3
"""
SISU 2025 - Night Watch Monitor
Monitors for new SISU 2025 data between 00:00 and 07:00 on launch day.

Run this script on the night before SISU opens (19/01/2025).
It will check every 15 minutes for new data and sync as soon as it appears.

Usage:
    # Run manually
    python3 night_watch.py

    # Schedule to run at midnight
    # Add to crontab: 0 0 19 1 * cd /path/to/sisu2025 && python3 scripts/night_watch.py
"""

import os
import sys
from datetime import datetime, time
from time import sleep

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import requests
from src.decoder.course import decode_course

# Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://sisymqzxvuktdcbsbpbp.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
MEUSISU_API = "https://meusisu.com/api"

# Monitoring settings
CHECK_INTERVAL_MINUTES = 15  # Check every 15 minutes
END_HOUR = 7  # Stop at 07:00 (SISU opens at 08:00)
SAMPLE_COURSES = [48, 916, 555, 1234, 2000]  # Sample courses to check for new data

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}


def log(message: str, level: str = "INFO"):
    """Print with timestamp and level"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    icons = {"INFO": "ℹ️", "SUCCESS": "✅", "WARNING": "⚠️", "ERROR": "❌", "WATCH": "👁️"}
    icon = icons.get(level, "•")
    print(f"[{timestamp}] {icon} {message}", flush=True)


def check_for_2025_data(course_code: int) -> dict:
    """Check if a course has 2025 data available"""
    try:
        resp = requests.get(f"{MEUSISU_API}/getCourseData?courseCode={course_code}", timeout=10)
        if resp.status_code != 200:
            return {"found": False, "error": f"HTTP {resp.status_code}"}
        
        course_data = decode_course(resp.content)
        if not course_data or not course_data.years:
            return {"found": False, "error": "No data"}
        
        # Check for 2025 year data
        for year_data in course_data.years:
            if year_data.year == 2025:
                # Check if there are modalities with data
                if year_data.modalities:
                    for mod in year_data.modalities:
                        if mod.partial_scores or mod.cut_score or mod.applicants:
                            return {
                                "found": True,
                                "cut_score": mod.cut_score,
                                "applicants": mod.applicants,
                                "partial_scores": mod.partial_scores,
                                "modality": mod.name
                            }
        
        return {"found": False, "error": "2025 exists but no scores yet"}
        
    except Exception as e:
        return {"found": False, "error": str(e)}


def run_full_sync():
    """Run the full data sync script"""
    log("🚀 DADOS DETECTADOS! Iniciando sincronização completa...", "SUCCESS")
    
    # Import and run the full sync
    try:
        from scripts.full_data_sync import main as full_sync_main
        full_sync_main()
        log("Sincronização completa finalizada!", "SUCCESS")
    except Exception as e:
        log(f"Erro na sincronização: {e}", "ERROR")
        # Fallback: run as subprocess
        import subprocess
        subprocess.run([
            sys.executable, 
            os.path.join(os.path.dirname(__file__), "full_data_sync.py")
        ])


def main():
    print("=" * 60)
    print("🌙 SISU 2025 - Night Watch Monitor")
    print("=" * 60)
    log(f"Monitoramento iniciado")
    log(f"Verificando a cada {CHECK_INTERVAL_MINUTES} minutos")
    log(f"Encerra às {END_HOUR}:00 (SISU abre 08:00)")
    log(f"Cursos monitorados: {SAMPLE_COURSES}")
    print("=" * 60)
    
    data_found = False
    cycle = 0
    
    while True:
        cycle += 1
        current_time = datetime.now()
        
        # Check if we should stop (after 07:00)
        if current_time.hour >= END_HOUR:
            log(f"⏰ Horário limite atingido ({END_HOUR}:00). Encerrando monitoramento.", "WARNING")
            if not data_found:
                log("Nenhum dado de 2025 foi detectado durante o monitoramento.", "WARNING")
                log("O SISU provavelmente abrirá às 08:00. Execute o sync manualmente após a abertura.", "INFO")
            break
        
        # Log current check
        log(f"Ciclo #{cycle} - Verificando dados de 2025...", "WATCH")
        
        # Check sample courses for 2025 data
        for code in SAMPLE_COURSES:
            result = check_for_2025_data(code)
            
            if result["found"]:
                log(f"🎯 DADOS ENCONTRADOS no curso {code}!", "SUCCESS")
                log(f"   Nota de corte: {result.get('cut_score')}", "INFO")
                log(f"   Inscritos: {result.get('applicants')}", "INFO")
                log(f"   Parciais: {result.get('partial_scores')}", "INFO")
                
                data_found = True
                
                # Run full sync immediately
                run_full_sync()
                
                # After sync, continue monitoring for updates
                log("Continuando monitoramento para novas atualizações...", "INFO")
                break  # Break inner loop, continue outer loop
            else:
                # Only log errors if verbose
                pass
        
        if not data_found:
            log(f"Nenhum dado novo. Próxima verificação em {CHECK_INTERVAL_MINUTES} min...", "INFO")
        
        # Calculate time until next check
        next_check = datetime.now()
        next_check = next_check.replace(
            minute=(next_check.minute // CHECK_INTERVAL_MINUTES + 1) * CHECK_INTERVAL_MINUTES % 60,
            second=0,
            microsecond=0
        )
        if next_check <= datetime.now():
            next_check = next_check.replace(hour=next_check.hour + 1)
        
        sleep_seconds = (next_check - datetime.now()).total_seconds()
        if sleep_seconds > 0:
            log(f"💤 Dormindo até {next_check.strftime('%H:%M')}...", "INFO")
            sleep(min(sleep_seconds, CHECK_INTERVAL_MINUTES * 60))
    
    print("=" * 60)
    log("Monitoramento encerrado.", "INFO")
    print("=" * 60)


if __name__ == "__main__":
    main()
