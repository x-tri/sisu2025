#!/usr/bin/env python3
"""
Crawler avançado para análise do site MeuSISU
Extrai: HTML, JS, cookies, headers, endpoints de API
"""
import urllib.request
import urllib.parse
import urllib.error
import re
import json
import ssl
from urllib.parse import urljoin, urlparse
from typing import List, Dict, Set, Optional
import http.cookiejar

class MeuSisuCrawler:
    def __init__(self):
        self.base_url = "https://meusisu.com"
        self.api_base = "https://meusisu.com/api"
        self.visited_urls: Set[str] = set()
        self.api_endpoints: Set[str] = set()
        self.js_files: List[str] = []
        self.cookies: Dict[str, str] = {}
        self.headers_found: Dict[str, str] = {}
        self.tokens_found: List[str] = []
        self.html_content = ""
        
        # Configurar contexto SSL
        self.ctx = ssl.create_default_context()
        self.ctx.check_hostname = False
        self.ctx.verify_mode = ssl.CERT_NONE
        
        # Cookie jar
        self.cookie_jar = http.cookiejar.CookieJar()
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.cookie_jar),
            urllib.request.HTTPSHandler(context=self.ctx)
        )
        
        # Headers padrão de navegador
        self.default_headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        }
    
    def fetch_page(self, url: str, headers: Optional[Dict] = None, timeout: int = 15) -> Optional[str]:
        """Baixa uma página do site"""
        try:
            req_headers = headers or self.default_headers
            req = urllib.request.Request(url, headers=req_headers)
            response = self.opener.open(req, timeout=timeout)
            
            # Capturar cookies
            for cookie in self.cookie_jar:
                self.cookies[cookie.name] = cookie.value
            
            # Ler conteúdo
            content = response.read()
            
            # Tentar decodificar
            try:
                return content.decode('utf-8')
            except:
                try:
                    return content.decode('latin-1')
                except:
                    return content.decode('utf-8', errors='ignore')
                    
        except Exception as e:
            print(f"  ❌ Erro ao buscar {url}: {type(e).__name__}")
            return None
    
    def analyze_main_page(self):
        """Analisa a página principal em busca de pistas"""
        print("\n" + "="*70)
        print("🔍 FASE 1: Analisando página principal")
        print("="*70)
        
        html = self.fetch_page(self.base_url)
        if not html:
            print("❌ Não foi possível carregar a página principal")
            return
        
        self.html_content = html
        print(f"✅ Página carregada: {len(html)} bytes")
        
        # 1. Procurar por arquivos JS
        print("\n📁 Arquivos JavaScript encontrados:")
        js_patterns = [
            r'<script[^>]+src=["\']([^"\']+\.js)["\']',
            r'src=["\']([^"\']+\/[^"\']*\.js)["\']',
        ]
        for pattern in js_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                full_url = urljoin(self.base_url, match)
                if full_url not in self.js_files:
                    self.js_files.append(full_url)
                    print(f"  📄 {full_url}")
        
        # 2. Procurar por endpoints de API no HTML
        print("\n🔗 Endpoints de API no HTML:")
        api_patterns = [
            r'["\'](\/api\/[^"\']+)["\']',
            r'["\'](https:\/\/meusisu\.com\/api\/[^"\']+)["\']',
            r'fetch\(["\']([^"\']*api[^"\']*)["\']',
            r'axios\.[get|post]+\(["\']([^"\']*api[^"\']*)["\']',
            r'url:\s*["\']([^"\']*api[^"\']*)["\']',
        ]
        for pattern in api_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches:
                if match.startswith('/'):
                    match = self.base_url + match
                if 'meusisu.com/api' in match and match not in self.api_endpoints:
                    self.api_endpoints.add(match)
                    print(f"  🔌 {match}")
        
        # 3. Procurar por tokens/chaves
        print("\n🔑 Tokens/Keys encontrados:")
        token_patterns = [
            (r'api[_-]?key["\']?\s*[:=]\s*["\']([^"\']+)["\']', 'API Key'),
            (r'token["\']?\s*[:=]\s*["\']([^"\']+)["\']', 'Token'),
            (r'authorization["\']?\s*[:=]\s*["\']([^"\']+)["\']', 'Authorization'),
            (r'Bearer\s+([a-zA-Z0-9_\-\.]+)', 'Bearer Token'),
            (r'[a-f0-9]{32}', 'Hash MD5-like'),
            (r'eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*', 'JWT Token'),
        ]
        for pattern, name in token_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches[:5]:  # Limitar a 5 por tipo
                print(f"  {name}: {match[:50]}...")
                self.tokens_found.append(f"{name}: {match[:50]}")
        
        # 4. Procurar por variáveis de configuração
        print("\n⚙️  Configurações encontradas:")
        config_patterns = [
            r'window\.__[A-Z_]+__\s*=\s*({[^;]+})',
            r'const\s+config\s*=\s*({[^;]+})',
            r'var\s+CONFIG\s*=\s*({[^;]+})',
        ]
        for pattern in config_patterns:
            matches = re.findall(pattern, html, re.IGNORECASE)
            for match in matches[:3]:
                print(f"  📝 {match[:100]}...")
    
    def analyze_js_files(self):
        """Analisa arquivos JS em busca de endpoints e tokens"""
        print("\n" + "="*70)
        print("🔍 FASE 2: Analisando arquivos JavaScript")
        print("="*70)
        
        if not self.js_files:
            print("⚠️  Nenhum arquivo JS encontrado na página principal")
            return
        
        for js_url in self.js_files[:5]:  # Limitar a 5 arquivos
            print(f"\n📥 Baixando: {js_url}")
            js_content = self.fetch_page(js_url, timeout=10)
            if not js_content:
                continue
            
            print(f"   Tamanho: {len(js_content)} bytes")
            
            # Procurar por endpoints de API
            api_matches = re.findall(r'["\'](\/api\/[^"\']+)["\']', js_content)
            for match in api_matches:
                full_url = self.base_url + match
                if full_url not in self.api_endpoints:
                    self.api_endpoints.add(full_url)
                    print(f"   🔌 API: {match}")
            
            # Procurar por fetch/axios calls
            fetch_pattern = r'(?:fetch|axios\.get|axios\.post)\(["\']([^"\']+)["\']'
            fetch_matches = re.findall(fetch_pattern, js_content)
            for match in fetch_matches:
                if 'api' in match.lower():
                    print(f"   📡 Fetch: {match[:80]}")
            
            # Procurar por tokens
            jwt_matches = re.findall(r'eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*', js_content)
            if jwt_matches:
                print(f"   🔑 JWT encontrado: {jwt_matches[0][:50]}...")
    
    def test_api_with_cookies(self):
        """Testa endpoints de API com os cookies coletados"""
        print("\n" + "="*70)
        print("🔍 FASE 3: Testando APIs com cookies de sessão")
        print("="*70)
        
        print(f"\n🍪 Cookies coletados ({len(self.cookies)}):")
        for name, value in self.cookies.items():
            print(f"   {name}: {value[:30]}...")
        
        # Testar endpoints com cookies
        test_urls = [
            f"{self.api_base}/getCourseData?courseCode=37",
            f"{self.api_base}/getAllCourses",
            f"{self.api_base}/searchMainPage?estado=SP&pag=1",
        ]
        
        print("\n🧪 Testando endpoints com sessão:")
        for url in test_urls:
            print(f"\n   Testando: {url}")
            try:
                req = urllib.request.Request(
                    url,
                    headers={**self.default_headers, 'Referer': self.base_url}
                )
                response = self.opener.open(req, timeout=15)
                data = response.read()
                print(f"   ✅ SUCESSO! {len(data)} bytes")
                
                # Tentar detectar tipo
                if data[:2] == b'\x08\x01' or data[:4] == b'\x08\x02\x12':
                    print(f"   📦 Tipo: Protobuf")
                elif b'{' in data[:100]:
                    print(f"   📄 Tipo: JSON")
                else:
                    print(f"   ❓ Tipo: Desconhecido - {data[:20].hex()}")
                    
            except Exception as e:
                print(f"   ❌ {type(e).__name__}: {str(e)[:60]}")
    
    def check_html_for_clues(self):
        """Analisa o HTML profundamente por pistas"""
        print("\n" + "="*70)
        print("🔍 FASE 4: Análise profunda do HTML")
        print("="*70)
        
        if not self.html_content:
            return
        
        # Procurar por meta tags
        print("\n📋 Meta tags relevantes:")
        meta_tags = re.findall(r'<meta[^>]+name=["\']([^"\']+)["\'][^>]+content=["\']([^"\']*)["\']', 
                               self.html_content, re.IGNORECASE)
        for name, content in meta_tags:
            if any(keyword in name.lower() for keyword in ['api', 'token', 'key', 'config', 'csrf']):
                print(f"   {name}: {content[:50]}")
        
        # Procurar por data attributes
        print("\n📊 Data attributes:")
        data_attrs = re.findall(r'data-[a-z-]+=["\']([^"\']+)["\']', self.html_content, re.IGNORECASE)
        for attr in data_attrs[:10]:
            if len(attr) > 10:  # Ignorar valores curtos
                print(f"   {attr[:60]}")
        
        # Procurar por script inline
        print("\n📝 Scripts inline (primeiros 500 chars):")
        scripts = re.findall(r'<script[^>]*>(.*?)</script>', self.html_content, re.DOTALL | re.IGNORECASE)
        for i, script in enumerate(scripts[:3]):
            if len(script) > 50:
                print(f"\n   Script {i+1} ({len(script)} chars):")
                print(f"   {script[:300]}...")
    
    def run_full_analysis(self):
        """Executa análise completa"""
        print("\n" + "="*70)
        print("🕷️  MEUSISU CRAWLER - ANÁLISE COMPLETA")
        print("="*70)
        
        self.analyze_main_page()
        self.analyze_js_files()
        self.check_html_for_clues()
        self.test_api_with_cookies()
        
        # Resumo final
        print("\n" + "="*70)
        print("📊 RESUMO DA ANÁLISE")
        print("="*70)
        print(f"\n✅ Página principal: Carregada ({len(self.html_content)} bytes)")
        print(f"📁 Arquivos JS encontrados: {len(self.js_files)}")
        print(f"🔌 Endpoints de API encontrados: {len(self.api_endpoints)}")
        print(f"🍪 Cookies coletados: {len(self.cookies)}")
        print(f"🔑 Tokens encontrados: {len(self.tokens_found)}")
        
        if self.api_endpoints:
            print("\n🔗 Todos os endpoints de API:")
            for endpoint in sorted(self.api_endpoints):
                print(f"   {endpoint}")

if __name__ == "__main__":
    crawler = MeuSisuCrawler()
    crawler.run_full_analysis()
