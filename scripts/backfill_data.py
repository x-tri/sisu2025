#!/usr/bin/env python3
"""
Backfill Data
Reprocess raw binary files to regenerate JSON data
"""
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import load_config
from src.decoder import decode_course
from src.storage.history import HistoryManager
import json


def main():
    print("=" * 60)
    print("  SISU Monitor - Backfill de Dados")
    print("=" * 60)

    config = load_config()
    history = HistoryManager(config.data_dir)

    raw_dir = config.data_dir / "raw"
    processed_dir = config.data_dir / "processed"

    # Find all raw files
    raw_files = list(raw_dir.glob("*.bin"))
    print(f"\nArquivos raw encontrados: {len(raw_files)}")

    if not raw_files:
        print("Nenhum arquivo para processar.")
        return

    processed = 0
    errors = 0

    for raw_file in sorted(raw_files):
        print(f"  Processando: {raw_file.name}...", end=" ")

        try:
            data = raw_file.read_bytes()
            course = decode_course(data)

            # Save processed JSON
            json_file = processed_dir / raw_file.name.replace('.bin', '.json')
            json_file.write_text(json.dumps(course.to_dict(), indent=2, ensure_ascii=False))

            print("OK")
            processed += 1
        except Exception as e:
            print(f"ERRO: {e}")
            errors += 1

    print("\n" + "=" * 60)
    print(f"Processados: {processed}")
    print(f"Erros: {errors}")
    print("=" * 60)


if __name__ == "__main__":
    main()
