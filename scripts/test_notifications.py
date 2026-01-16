#!/usr/bin/env python3
"""
Test Notifications
Tests all configured notification channels
"""
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import load_config
from src.notifications.manager import NotificationManager


def main():
    print("=" * 50)
    print("  SISU Monitor - Teste de Notificacoes")
    print("=" * 50)

    config = load_config()
    manager = NotificationManager(config.notifications)

    enabled = manager.get_enabled_channels()
    print(f"\nCanais habilitados: {len(enabled)}")
    for channel in enabled:
        print(f"  - {channel}")

    if not enabled:
        print("\nNenhum canal habilitado!")
        print("Edite config/notifications.json para configurar")
        return

    print("\nEnviando notificacao de teste...")
    results = manager.test_all()

    print("\nResultados:")
    for channel, success in results.items():
        status = "OK" if success else "FALHOU"
        print(f"  {channel}: {status}")

    print("\n" + "=" * 50)


if __name__ == "__main__":
    main()
