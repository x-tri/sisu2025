#!/usr/bin/env python3
"""
SISU 2025 Monitor
Monitoramento de notas de corte em tempo real

Uso:
    python main.py              # Inicia o monitoramento
    python main.py --test       # Testa notificacoes
    python main.py --once       # Executa apenas uma iteracao
"""
import argparse
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.utils.config import load_config
from src.utils.logging import setup_logging
from src.monitor.runner import SISUMonitor
from src.notifications.manager import NotificationManager


def main():
    parser = argparse.ArgumentParser(
        description='SISU 2025 Monitor - Monitoramento de notas de corte'
    )
    parser.add_argument(
        '--test',
        action='store_true',
        help='Testar notificacoes'
    )
    parser.add_argument(
        '--once',
        action='store_true',
        help='Executar apenas uma iteracao'
    )
    parser.add_argument(
        '--config',
        type=Path,
        default=None,
        help='Diretorio de configuracao'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Ativar modo debug'
    )

    args = parser.parse_args()

    # Load configuration
    config_dir = args.config or Path(__file__).parent / "config"
    config = load_config(config_dir)

    # Setup logging
    log_level = "DEBUG" if args.debug else config.log_level
    setup_logging(
        log_level=log_level,
        log_dir=config.log_dir,
        log_to_file=True
    )

    # Test mode
    if args.test:
        print("Testando notificacoes...")
        manager = NotificationManager(config.notifications)
        results = manager.test_all()
        for channel, success in results.items():
            status = "OK" if success else "FALHOU"
            print(f"  {channel}: {status}")
        return

    # Validate courses
    if not config.courses:
        print("ERRO: Nenhum curso configurado!")
        print(f"Edite o arquivo: {config_dir / 'courses.json'}")
        sys.exit(1)

    # Create and run monitor
    monitor = SISUMonitor(config)

    if args.once:
        monitor.run_once()
    else:
        monitor.run()


if __name__ == "__main__":
    main()
