#!/usr/bin/env python3
"""
Testes avançados para API MeuSISU
Múltiplas estratégias de acesso
"""
import urllib.request
import urllib.error
import ssl
import json
import time
from typing import Optional, Tuple

API_BASE = "https://meusisu.com/api"
COURSE_ID = 37

class APITester:
    def __init__(self):
        self.results = []
        
    def log(self, test_name: str, status: str, details: str = ""):
        print(f"\n{'='*60}")
        print(f"🧪 {test_name}")
        print(f"Status: {status}")
        if details:
            print(f"Detalhes: {details}")
        print('='*60)
        
    def test_1_basic_timeout(self) -> Tuple[bool, str]:
        """Teste básico com timeout aumentado"""
        import socket
        socket.setdefaulttimeout(30)
        
        try:
            url = f"{API_BASE}/getCourseData?courseCode={COURSE_ID}"
            req = urllib.request.Request(url)
            response = urllib.request.urlopen(req, timeout=30)
            data = response.read()
            return True, f"✅ SUCESSO! {len(data)} bytes"
        except Exception as e:
            return False, f"❌ {type(e).__name__}: {str(e)[:100]}"
    
    def test_2_browser_headers(self) -> Tuple[bool, str]:
        """Teste com headers de navegador real"""
        try:
            url = f"{API_BASE}/getCourseData?courseCode={COURSE_ID}"
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/x-protobuf,application/octet-stream,*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Referer': 'https://meusisu.com/',
                    'Origin': 'https://meusisu.com',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Cache-Control': 'no-cache',
                }
            )
            response = urllib.request.urlopen(req, timeout=20)
            data = response.read()
            return True, f"✅ SUCESSO! {len(data)} bytes | Content-Type: {response.headers.get('Content-Type', 'N/A')}"
        except Exception as e:
            return False, f"❌ {type(e).__name__}: {str(e)[:100]}"
    
    def test_3_session_cookies(self) -> Tuple[bool, str]:
        """Teste com sessão e cookies"""
        try:
            import http.cookiejar
            
            # Primeiro, acessa a página principal para pegar cookies
            cj = http.cookiejar.CookieJar()
            opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
            
            # Acessa página principal
            opener.open("https://meusisu.com", timeout=10)
            
            # Agora tenta a API
            url = f"{API_BASE}/getCourseData?courseCode={COURSE_ID}"
            req = urllib.request.Request(
                url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/x-protobuf,*/*',
                    'Referer': 'https://meusisu.com/',
                    'X-Requested-With': 'XMLHttpRequest',
                }
            )
            response = opener.open(req, timeout=20)
            data = response.read()
            return True, f"✅ SUCESSO COM COOKIES! {len(data)} bytes"
        except Exception as e:
            return False, f"❌ {type(e).__name__}: {str(e)[:100]}"
    
    def test_4_post_method(self) -> Tuple[bool, str]:
        """Teste com POST ao invés de GET"""
        try:
            url = API_BASE + "/getCourseData"
            data = json.dumps({"courseCode": COURSE_ID}).encode()
            req = urllib.request.Request(
                url,
                data=data,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0',
                },
                method='POST'
            )
            response = urllib.request.urlopen(req, timeout=15)
            result = response.read()
            return True, f"✅ POST FUNCIONA! {len(result)} bytes"
        except Exception as e:
            return False, f"❌ {type(e).__name__}: {str(e)[:100]}"
    
    def test_5_alternative_endpoints(self) -> Tuple[bool, str]:
        """Testar endpoints alternativos"""
        endpoints = [
            "/courseData",
            "/course",
            "/v2/getCourseData",
            "/api/v1/course",
            "/data/course",
        ]
        
        results = []
        for endpoint in endpoints:
            try:
                url = f"https://meusisu.com{endpoint}?courseCode={COURSE_ID}"
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                response = urllib.request.urlopen(req, timeout=10)
                data = response.read()
                results.append(f"✅ {endpoint}: {len(data)} bytes")
            except Exception as e:
                results.append(f"❌ {endpoint}: {type(e).__name__}")
        
        return len([r for r in results if r.startswith("✅")]) > 0, "\n".join(results)
    
    def test_6_ssl_bypass(self) -> Tuple[bool, str]:
        """Teste com SSL context personalizado"""
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            url = f"{API_BASE}/getCourseData?courseCode={COURSE_ID}"
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0'}
            )
            response = urllib.request.urlopen(req, context=ctx, timeout=20)
            data = response.read()
            return True, f"✅ SUCESSO! {len(data)} bytes"
        except Exception as e:
            return False, f"❌ {type(e).__name__}: {str(e)[:100]}"
    
    def run_all_tests(self):
        """Executa todos os testes"""
        print("\n" + "="*70)
        print("🚀 INICIANDO TESTES AVANÇADOS API MeuSISU")
        print("="*70)
        
        tests = [
            ("Teste 1: Timeout Aumentado", self.test_1_basic_timeout),
            ("Teste 2: Headers de Navegador", self.test_2_browser_headers),
            ("Teste 3: Sessão com Cookies", self.test_3_session_cookies),
            ("Teste 4: Método POST", self.test_4_post_method),
            ("Teste 5: Endpoints Alternativos", self.test_5_alternative_endpoints),
            ("Teste 6: SSL Bypass", self.test_6_ssl_bypass),
        ]
        
        success_count = 0
        for name, test_func in tests:
            print(f"\n{'='*70}")
            print(f"🧪 {name}")
            print('='*70)
            try:
                success, details = test_func()
                print(details)
                if success:
                    success_count += 1
            except Exception as e:
                print(f"❌ ERRO CRÍTICO: {e}")
        
        print(f"\n{'='*70}")
        print(f"📊 RESULTADO: {success_count}/{len(tests)} testes bem-sucedidos")
        print("="*70)

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
