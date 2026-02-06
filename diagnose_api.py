#!/usr/bin/env python3
"""
Diagnóstico da API MeuSISU
Testa conectividade e identifica problemas
"""
import requests
import time
import sys

MEUSISU_API = "https://meusisu.com/api"

def test_endpoint(url, method="GET", timeout=10, headers=None):
    """Testa um endpoint específico"""
    print(f"\n{'='*60}")
    print(f"Testando: {method} {url}")
    print(f"Timeout: {timeout}s")
    print('='*60)
    
    try:
        start = time.time()
        if method == "GET":
            resp = requests.get(url, timeout=timeout, headers=headers, allow_redirects=True)
        else:
            resp = requests.request(method, url, timeout=timeout, headers=headers)
        elapsed = time.time() - start
        
        print(f"✓ Status: {resp.status_code}")
        print(f"✓ Tempo: {elapsed:.2f}s")
        print(f"✓ Content-Type: {resp.headers.get('content-type', 'N/A')}")
        print(f"✓ Content-Length: {len(resp.content)} bytes")
        
        if resp.status_code == 200:
            # Tenta detectar se é protobuf ou JSON
            content = resp.content
            if content[:2] == b'\x08\x01' or content[:2] == b'\x08\x02':
                print(f"✓ Tipo: Protobuf (provável)")
            elif b'{' in content[:100]:
                print(f"✓ Tipo: JSON (provável)")
            else:
                print(f"? Tipo: Desconhecido")
                print(f"  Primeiros bytes: {content[:20].hex()}")
        
        return True, resp
        
    except requests.exceptions.Timeout:
        print(f"✗ TIMEOUT após {timeout}s")
        return False, None
    except requests.exceptions.ConnectionError as e:
        print(f"✗ ERRO DE CONEXÃO: {e}")
        return False, None
    except requests.exceptions.HTTPError as e:
        print(f"✗ ERRO HTTP: {e}")
        return False, None
    except Exception as e:
        print(f"✗ ERRO: {type(e).__name__}: {e}")
        return False, None

def main():
    print("="*60)
    print("DIAGNÓSTICO API MeuSISU")
    print("="*60)
    
    # Teste 1: Endpoint base
    test_endpoint(f"{MEUSISU_API}", timeout=10)
    
    # Teste 2: getCourseData (endpoint principal)
    test_endpoint(f"{MEUSISU_API}/getCourseData?courseCode=1", timeout=15)
    
    # Teste 3: Testar com headers diferentes
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/x-protobuf,*/*",
        "Referer": "https://meusisu.com/"
    }
    test_endpoint(f"{MEUSISU_API}/getCourseData?courseCode=37", timeout=15, headers=headers)
    
    # Teste 4: Testar outro endpoint possível
    test_endpoint(f"{MEUSISU_API}/courseData?courseCode=1", timeout=10)
    
    print("\n" + "="*60)
    print("DIAGNÓSTICO COMPLETO")
    print("="*60)

if __name__ == "__main__":
    main()
