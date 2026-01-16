#!/usr/bin/env python3
"""
Import existing course data to Supabase
Reads JSON files from data/processed and uploads to the database
"""
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.storage import SupabaseClient

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpc3ltcXp4dnVrdGRjYnNicGJwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODYwNTk0MSwiZXhwIjoyMDg0MTgxOTQxfQ.yDWKET6qMOKukkFrRGL8UW4C4qK4BtcVmoJQpI2lG9o"


def main():
    print("Conectando ao Supabase...")
    client = SupabaseClient(url=SUPABASE_URL, service_key=SERVICE_KEY)

    if not client.test_connection():
        print("❌ Falha na conexão")
        return 1

    print("✅ Conectado\n")

    # Find all JSON files in data/processed
    data_dir = Path(__file__).parent.parent / "data" / "processed"
    json_files = list(data_dir.glob("*_latest.json"))

    print(f"Encontrados {len(json_files)} arquivos JSON\n")

    for json_file in json_files:
        # Extract course code from filename (e.g., 37_latest.json -> 37)
        try:
            code = int(json_file.stem.split("_")[0])
        except ValueError:
            print(f"⚠️  Ignorando {json_file.name} (código inválido)")
            continue

        print(f"Importando curso {code}...")

        try:
            data = json.loads(json_file.read_text())
            course_id = client.save_course_data(code, data)
            print(f"  ✅ {data.get('course_name', 'N/A')} -> id {course_id}")
        except Exception as e:
            print(f"  ❌ Erro: {e}")

    print("\n✅ Importação concluída!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
