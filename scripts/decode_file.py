#!/usr/bin/env python3
"""
Decode File
Decode a single protobuf file and display the contents
"""
import sys
import json
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.decoder import decode_course


def main():
    if len(sys.argv) < 2:
        print("Uso: python decode_file.py <arquivo.bin>")
        print("Exemplo: python decode_file.py data/raw/37_20250119_120000.bin")
        sys.exit(1)

    filepath = Path(sys.argv[1])
    if not filepath.exists():
        print(f"Arquivo nao encontrado: {filepath}")
        sys.exit(1)

    print(f"Decodificando: {filepath}")
    print("=" * 60)

    data = filepath.read_bytes()
    course = decode_course(data)

    # Print as JSON
    print(json.dumps(course.to_dict(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
