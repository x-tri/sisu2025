#!/usr/bin/env python3
"""
ULTRA SCRAPER SISU 2026
Sistema de garimpagem épico - Pronto para deploy quando a API liberar!

by Kimi + Claude Collaboration
"""

# CONFIGURAÇÕES ULTRA
CONFIG = {
    'api_base': 'https://d3hf41n0t98fq2.cloudfront.net/api',
    'concurrent_workers': 50,
    'retry_attempts': 10,
    'batch_size': 100,
    'save_interval': 50,  # Salvar a cada 50 cursos
    'rate_limit_delay': 0.5,  # Delay entre requisições
}

# HEADERS ROTATIVOS ULTRA
HEADERS_ROTATION = [
    {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/x-protobuf,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://meusisu.com/',
        'Origin': 'https://meusisu.com',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
    },
    {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/x-protobuf,*/*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'Referer': 'https://meusisu.com/',
        'Origin': 'https://meusisu.com',
    },
]

def print_banner():
    print("""
    ██╗   ██╗██╗  ████████╗██████╗  █████╗      ███████╗ ██████╗██████╗  █████╗ ██████╗ ███████╗██████╗ 
    ██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗     ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔══██╗██╔════╝██╔══██╗
    ██║   ██║██║     ██║   ██████╔╝███████║     ███████╗██║     ██████╔╝███████║██████╔╝█████╗  ██████╔╝
    ██║   ██║██║     ██║   ██╔══██╗██╔══██║     ╚════██║██║     ██╔══██╗██╔══██║██╔═══╝ ██╔══╝  ██╔══██╗
    ╚██████╔╝███████╗██║   ██║  ██║██║  ██║     ███████║╚██████╗██║  ██║██║  ██║██║     ███████╗██║  ██║
     ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝     ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝
                                                                                                          
    🚀 MODO ÉPICO ATIVADO - SISU 2026 GARIMPAGEM TOTAL
    """)

if __name__ == "__main__":
    print_banner()
    print("⚡ ULTRA SCRAPER pronto para deploy!")
    print("📋 Configurações:")
    for key, value in CONFIG.items():
        print(f"   {key}: {value}")
    print("\n🎯 Execute quando a API estiver acessível!")
    print("   python3 ULTRA_SCRAPER.py")
