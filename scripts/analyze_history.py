#!/usr/bin/env python3
"""
Analyze History
Analyzes score change history and shows trends
"""
import sys
from pathlib import Path
from datetime import datetime

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.utils.config import load_config
from src.storage.history import HistoryManager


def main():
    print("=" * 60)
    print("  SISU Monitor - Analise de Historico")
    print("=" * 60)

    config = load_config()
    history = HistoryManager(config.data_dir)

    # List courses with data
    courses = history.list_courses()
    print(f"\nCursos com dados: {len(courses)}")

    for course_id in courses:
        print(f"\n{'='*40}")
        print(f"Curso ID: {course_id}")
        print("=" * 40)

        # Get latest data
        latest = history.get_latest(course_id)
        if latest:
            print(f"  Universidade: {latest.get('university', 'N/A')}")
            print(f"  Curso: {latest.get('course_name', 'N/A')}")
            print(f"  Local: {latest.get('city', 'N/A')}, {latest.get('state', 'N/A')}")

        # Get change history
        changes = history.get_change_history(course_id)
        if changes:
            print(f"\n  Historico de mudancas: {len(changes)} registros")
            for entry in changes[-5:]:  # Show last 5
                ts = entry.get('timestamp', '')
                try:
                    dt = datetime.fromisoformat(ts)
                    ts_fmt = dt.strftime("%d/%m %H:%M")
                except:
                    ts_fmt = ts[:16]

                for change in entry.get('changes', []):
                    mod = change.get('modality', '')
                    old = change.get('old_score', '')
                    new = change.get('new_score', '')
                    diff = change.get('difference', 0)
                    arrow = "+" if diff and diff > 0 else ""
                    print(f"    [{ts_fmt}] {mod}: {old} -> {new} ({arrow}{diff:.2f})")
        else:
            print("\n  Nenhuma mudanca registrada")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
