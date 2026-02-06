#!/usr/bin/env python3
"""
REALTIME MONITOR SISU
Detecta mudanças em tempo real nas notas de corte!
"""
import requests
import time
import json
import hashlib
from datetime import datetime
from typing import Dict, Optional, Callable
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | 🔔 | %(message)s'
)
logger = logging.getLogger(__name__)

API_BASE = "https://d3hf41n0t98fq2.cloudfront.net/api"

class ChangeDetector:
    """Detector de mudanças nas notas de corte"""
    
    def __init__(self, check_interval: int = 60):
        self.check_interval = check_interval
        self.last_hashes: Dict[int, str] = {}
        self.callbacks: list = []
    
    def fetch_course(self, course_code: int) -> Optional[bytes]:
        """Busca dados do curso"""
        try:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://meusisu.com/',
                'Accept': 'application/x-protobuf,*/*',
            }
            response = requests.get(
                f"{API_BASE}/courseData?courseCode={course_code}",
                headers=headers, timeout=20, verify=False
            )
            if response.status_code == 200:
                return response.content
        except Exception as e:
            logger.error(f"Erro ao buscar curso {course_code}: {e}")
        return None
    
    def compute_hash(self, data: bytes) -> str:
        """Calcula hash dos dados"""
        return hashlib.md5(data).hexdigest()
    
    def check_for_changes(self, course_code: int) -> bool:
        """Verifica se houve mudanças no curso"""
        data = self.fetch_course(course_code)
        if not data:
            return False
        
        current_hash = self.compute_hash(data)
        
        if course_code in self.last_hashes:
            if self.last_hashes[course_code] != current_hash:
                logger.info(f"🚨 MUDANÇA DETECTADA no curso {course_code}!")
                logger.info(f"   Hash anterior: {self.last_hashes[course_code][:16]}...")
                logger.info(f"   Hash atual: {current_hash[:16]}...")
                self.last_hashes[course_code] = current_hash
                return True
        else:
            logger.info(f"📊 Primeira leitura do curso {course_code}")
            self.last_hashes[course_code] = current_hash
        
        return False
    
    def monitor_courses(self, course_codes: list, on_change: Callable = None):
        """Monitora cursos continuamente"""
        logger.info(f"🔍 Iniciando monitoramento de {len(course_codes)} cursos")
        logger.info(f"   Intervalo: {self.check_interval}s")
        logger.info("   Pressione Ctrl+C para parar")
        
        try:
            while True:
                changes_detected = 0
                
                for code in course_codes:
                    if self.check_for_changes(code):
                        changes_detected += 1
                        if on_change:
                            on_change(code)
                    
                    time.sleep(1)  # Delay entre requisições
                
                if changes_detected > 0:
                    logger.info(f"✅ {changes_detected} mudanças detectadas nesta rodada")
                
                logger.info(f"⏱️  Próxima verificação em {self.check_interval}s...")
                time.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            logger.info("\n👋 Monitoramento encerrado pelo usuário")

def main():
    # Cursos importantes para monitorar
    important_courses = [
        37,   # Medicina UnB
        38,   # Medicina USP
        39,   # Medicina UNICAMP
        100,  # Engenharia
        200,  # Direito
        300,  # Administração
    ]
    
    detector = ChangeDetector(check_interval=60)
    
    def on_change(course_code):
        logger.info(f"🎯 Ação executada para curso {course_code}")
        # Aqui pode enviar notificação, email, etc.
    
    detector.monitor_courses(important_courses, on_change=on_change)

if __name__ == "__main__":
    main()
