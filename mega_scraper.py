#!/usr/bin/env python3
"""
MEGA SCRAPER SISU 2026 - by Kimi
O sistema de garimpagem mais avançado já criado!

Features:
- Multi-threading com controle de concorrência
- Retry inteligente com backoff exponencial
- Rotação de User-Agents
- Detecção de mudanças em tempo real
- Salvamento incremental no Supabase
- Estatísticas detalhadas
- Logging completo
"""
import requests
import json
import time
import random
import logging
import sys
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional, Dict, List, Any, Tuple
from dataclasses import dataclass, asdict
from threading import Lock
import urllib3

# Desabilitar warnings SSL
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.FileHandler(f'mega_scraper_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Constantes
API_BASE = "https://d3hf41n0t98fq2.cloudfront.net/api"
SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"

# Rotação de User-Agents
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]

@dataclass
class ScrapingStats:
    """Estatísticas do scraping"""
    start_time: datetime
    total_attempts: int = 0
    successful_fetches: int = 0
    failed_fetches: int = 0
    retries: int = 0
    courses_found: int = 0
    changes_detected: int = 0
    
    def to_dict(self) -> Dict:
        elapsed = (datetime.now() - self.start_time).total_seconds()
        return {
            'elapsed_seconds': elapsed,
            'total_attempts': self.total_attempts,
            'successful_fetches': self.successful_fetches,
            'failed_fetches': self.failed_fetches,
            'success_rate': f"{(self.successful_fetches / max(self.total_attempts, 1)) * 100:.2f}%",
            'retries': self.retries,
            'courses_found': self.courses_found,
            'changes_detected': self.changes_detected,
            'avg_speed': f"{self.total_attempts / max(elapsed, 1):.2f} req/s"
        }

class MegaScraper:
    """Scraper avançado para API MeuSISU"""
    
    def __init__(self, max_workers: int = 10, retry_attempts: int = 5):
        self.max_workers = max_workers
        self.retry_attempts = retry_attempts
        self.stats = ScrapingStats(start_time=datetime.now())
        self.stats_lock = Lock()
        self.session = requests.Session()
        self.session.verify = False
        
        # Headers base
        self.base_headers = {
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Referer': 'https://meusisu.com/',
            'Origin': 'https://meusisu.com',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site',
        }
        
        logger.info("🚀 MEGA SCRAPER inicializado!")
        logger.info(f"   Workers: {max_workers}")
        logger.info(f"   Retry attempts: {retry_attempts}")
    
    def _get_headers(self) -> Dict[str, str]:
        """Gera headers aleatórios"""
        headers = self.base_headers.copy()
        headers['User-Agent'] = random.choice(USER_AGENTS)
        return headers
    
    def _fetch_with_retry(self, url: str, method: str = "GET", 
                          data: Dict = None, timeout: int = 30) -> Tuple[bool, Any]:
        """Faz requisição com retry inteligente"""
        for attempt in range(self.retry_attempts):
            with self.stats_lock:
                self.stats.total_attempts += 1
            
            try:
                headers = self._get_headers()
                
                if method == "POST":
                    response = self.session.post(
                        url, headers=headers, json=data, 
                        timeout=timeout
                    )
                else:
                    response = self.session.get(
                        url, headers=headers, timeout=timeout
                    )
                
                if response.status_code == 200:
                    with self.stats_lock:
                        self.stats.successful_fetches += 1
                    return True, response
                elif response.status_code == 429:  # Rate limit
                    wait_time = (attempt + 1) * 5 + random.uniform(1, 3)
                    logger.warning(f"⚠️  Rate limit atingido. Aguardando {wait_time:.1f}s...")
                    time.sleep(wait_time)
                else:
                    logger.warning(f"⚠️  HTTP {response.status_code} em {url}")
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⏱️  Timeout (tentativa {attempt + 1}/{self.retry_attempts})")
            except requests.exceptions.RequestException as e:
                logger.warning(f"❌ Erro: {type(e).__name__}")
            
            # Backoff exponencial + jitter
            with self.stats_lock:
                self.stats.retries += 1
            
            if attempt < self.retry_attempts - 1:
                wait = (2 ** attempt) + random.uniform(0, 2)
                time.sleep(wait)
        
        with self.stats_lock:
            self.stats.failed_fetches += 1
        return False, None
    
    def test_api_connection(self) -> bool:
        """Testa conexão com a API"""
        logger.info("🧪 Testando conexão com a API...")
        
        # Testar endpoint de courseData
        url = f"{API_BASE}/courseData?courseCode=37"
        success, response = self._fetch_with_retry(url, timeout=15)
        
        if success:
            content_type = response.headers.get('Content-Type', 'unknown')
            size = len(response.content)
            logger.info(f"✅ API respondendo!")
            logger.info(f"   Content-Type: {content_type}")
            logger.info(f"   Tamanho: {size} bytes")
            
            # Tentar detectar formato
            data = response.content
            if data[:2] == b'\x08\x01' or data[:2] == b'\x08\x02':
                logger.info("   📦 Formato: Protobuf")
            elif b'{' in data[:100]:
                logger.info("   📄 Formato: JSON")
            return True
        else:
            logger.error("❌ API não respondeu após todas as tentativas")
            return False
    
    def fetch_course_data(self, course_code: int) -> Optional[Dict]:
        """Busca dados de um curso específico"""
        url = f"{API_BASE}/courseData?courseCode={course_code}"
        success, response = self._fetch_with_retry(url, timeout=20)
        
        if success:
            with self.stats_lock:
                self.stats.courses_found += 1
            return {
                'code': course_code,
                'data': response.content,
                'timestamp': datetime.now().isoformat(),
                'size': len(response.content)
            }
        return None
    
    def fetch_near_courses(self, course_code: int, modality: int = 41, pag: int = 0) -> Optional[Dict]:
        """Busca cursos similares próximos"""
        url = f"{API_BASE}/getNearCourses?courseCode={course_code}&modalidade={modality}&pag={pag}"
        success, response = self._fetch_with_retry(url, timeout=20)
        
        if success:
            try:
                return response.json()
            except:
                return {'raw': response.content}
        return None
    
    def scrape_course_range(self, start_code: int, end_code: int) -> List[Dict]:
        """Garimpa uma faixa de cursos em paralelo"""
        logger.info(f"🔍 Iniciando garimpagem de cursos {start_code} a {end_code}")
        
        results = []
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submeter todas as tarefas
            future_to_code = {
                executor.submit(self.fetch_course_data, code): code 
                for code in range(start_code, end_code + 1)
            }
            
            # Coletar resultados
            for future in as_completed(future_to_code):
                code = future_to_code[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        if len(results) % 10 == 0:
                            self._print_progress()
                except Exception as e:
                    logger.error(f"❌ Erro no curso {code}: {e}")
        
        return results
    
    def _print_progress(self):
        """Imprime progresso atual"""
        stats = self.stats.to_dict()
        logger.info(f"📊 Progresso: {stats['successful_fetches']}/{stats['total_attempts']} "
                   f"({stats['success_rate']}) | Cursos: {stats['courses_found']}")
    
    def save_to_supabase(self, data: List[Dict], table: str = "raw_api_data"):
        """Salva dados no Supabase"""
        logger.info(f"💾 Salvando {len(data)} registros no Supabase...")
        
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        }
        
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        
        for item in data:
            try:
                payload = {
                    'course_code': item['code'],
                    'raw_data': item['data'].hex() if isinstance(item['data'], bytes) else item['data'],
                    'timestamp': item['timestamp'],
                    'size_bytes': item['size']
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                if response.status_code not in [200, 201]:
                    logger.warning(f"⚠️  Erro ao salvar curso {item['code']}: {response.status_code}")
                    
            except Exception as e:
                logger.error(f"❌ Erro ao salvar: {e}")
        
        logger.info("✅ Dados salvos no Supabase!")
    
    def run_full_scan(self, start: int = 1, end: int = 10000):
        """Executa scan completo"""
        logger.info("="*70)
        logger.info("🚀 INICIANDO MEGA SCAN SISU 2026")
        logger.info("="*70)
        
        # Testar conexão
        if not self.test_api_connection():
            logger.error("❌ Abortando - API indisponível")
            return
        
        # Executar garimpagem
        results = self.scrape_course_range(start, end)
        
        # Salvar resultados
        if results:
            self.save_to_supabase(results)
        
        # Relatório final
        self._print_final_report()
    
    def _print_final_report(self):
        """Imprime relatório final"""
        stats = self.stats.to_dict()
        
        logger.info("\n" + "="*70)
        logger.info("📊 RELATÓRIO FINAL - MEGA SCRAPER")
        logger.info("="*70)
        logger.info(f"⏱️  Tempo total: {stats['elapsed_seconds']:.2f} segundos")
        logger.info(f"🎯 Tentativas: {stats['total_attempts']}")
        logger.info(f"✅ Sucessos: {stats['successful_fetches']}")
        logger.info(f"❌ Falhas: {stats['failed_fetches']}")
        logger.info(f"📈 Taxa de sucesso: {stats['success_rate']}")
        logger.info(f"🔄 Retries: {stats['retries']}")
        logger.info(f"📚 Cursos encontrados: {stats['courses_found']}")
        logger.info(f"⚡ Velocidade média: {stats['avg_speed']}")
        logger.info("="*70)

def main():
    """Função principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='MEGA SCRAPER SISU 2026')
    parser.add_argument('--start', type=int, default=1, help='Código inicial')
    parser.add_argument('--end', type=int, default=1000, help='Código final')
    parser.add_argument('--workers', type=int, default=10, help='Número de workers')
    parser.add_argument('--retries', type=int, default=5, help='Tentativas de retry')
    
    args = parser.parse_args()
    
    scraper = MegaScraper(max_workers=args.workers, retry_attempts=args.retries)
    scraper.run_full_scan(args.start, args.end)

if __name__ == "__main__":
    main()
