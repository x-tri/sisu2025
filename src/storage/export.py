"""
Export Manager
Export data to CSV and other formats
"""
import csv
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class ExportManager:
    """Exports data to various formats"""

    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.exports_dir = self.data_dir / "exports"
        self.exports_dir.mkdir(parents=True, exist_ok=True)

    def export_scores_csv(self, courses_data: list[dict], filename: Optional[str] = None) -> Path:
        """Export current scores to CSV.

        Args:
            courses_data: List of course dictionaries
            filename: Optional custom filename

        Returns:
            Path to exported file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scores_{timestamp}.csv"

        filepath = self.exports_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            # Header
            writer.writerow([
                'curso_id', 'curso_nome', 'universidade', 'cidade', 'estado',
                'modalidade', 'nota_corte', 'inscritos', 'vagas', 'ano'
            ])

            for course in courses_data:
                course_id = course.get('id', '')
                course_name = course.get('course_name', '')
                university = course.get('university', '')
                city = course.get('city', '')
                state = course.get('state', '')

                for year_data in course.get('years', []):
                    year = year_data.get('year', '')
                    for mod in year_data.get('modalities', []):
                        writer.writerow([
                            course_id,
                            course_name,
                            university,
                            city,
                            state,
                            mod.get('name', ''),
                            mod.get('cut_score', ''),
                            mod.get('applicants', ''),
                            mod.get('vacancies', ''),
                            year
                        ])

        logger.info(f"Exported scores to {filepath}")
        return filepath

    def export_history_csv(self, course_id: int, history: list[dict],
                          filename: Optional[str] = None) -> Path:
        """Export change history to CSV.

        Args:
            course_id: Course identifier
            history: List of change entries
            filename: Optional custom filename

        Returns:
            Path to exported file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"history_{course_id}_{timestamp}.csv"

        filepath = self.exports_dir / filename

        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            # Header
            writer.writerow([
                'timestamp', 'modalidade', 'nota_anterior', 'nota_nova',
                'diferenca', 'tipo_mudanca'
            ])

            for entry in history:
                timestamp = entry.get('timestamp', '')
                for change in entry.get('changes', []):
                    writer.writerow([
                        timestamp,
                        change.get('modality', ''),
                        change.get('old_score', ''),
                        change.get('new_score', ''),
                        change.get('difference', ''),
                        change.get('change_type', '')
                    ])

        logger.info(f"Exported history to {filepath}")
        return filepath

    def export_all_json(self, courses_data: list[dict], filename: Optional[str] = None) -> Path:
        """Export all data to single JSON file.

        Args:
            courses_data: List of course dictionaries
            filename: Optional custom filename

        Returns:
            Path to exported file
        """
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"all_data_{timestamp}.json"

        filepath = self.exports_dir / filename

        export_data = {
            "export_timestamp": datetime.now().isoformat(),
            "courses": courses_data
        }

        filepath.write_text(json.dumps(export_data, indent=2, ensure_ascii=False))
        logger.info(f"Exported all data to {filepath}")
        return filepath
