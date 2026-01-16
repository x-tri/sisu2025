"""
History Manager
Manages storage of raw data, processed data, and change history
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


class HistoryManager:
    """Manages historical data storage"""

    def __init__(self, data_dir: Path):
        self.data_dir = Path(data_dir)
        self.raw_dir = self.data_dir / "raw"
        self.processed_dir = self.data_dir / "processed"
        self.history_dir = self.data_dir / "history"

        # Ensure directories exist
        for d in [self.raw_dir, self.processed_dir, self.history_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def _timestamp(self) -> str:
        """Get current timestamp string"""
        return datetime.now().strftime("%Y%m%d_%H%M%S")

    def save_raw(self, course_id: int, data: bytes) -> Path:
        """Save raw binary data.

        Args:
            course_id: Course identifier
            data: Raw binary data

        Returns:
            Path to saved file
        """
        filename = f"{course_id}_{self._timestamp()}.bin"
        filepath = self.raw_dir / filename
        filepath.write_bytes(data)
        logger.debug(f"Saved raw data: {filepath}")
        return filepath

    def save_processed(self, course_id: int, data: dict) -> Path:
        """Save processed JSON data.

        Args:
            course_id: Course identifier
            data: Decoded course data

        Returns:
            Path to saved file
        """
        # Save timestamped version
        filename = f"{course_id}_{self._timestamp()}.json"
        filepath = self.processed_dir / filename
        filepath.write_text(json.dumps(data, indent=2, ensure_ascii=False))

        # Also save as latest
        latest = self.processed_dir / f"{course_id}_latest.json"
        latest.write_text(json.dumps(data, indent=2, ensure_ascii=False))

        logger.debug(f"Saved processed data: {filepath}")
        return filepath

    def save_change(self, course_id: int, changes: list) -> Path:
        """Save change history entry.

        Args:
            course_id: Course identifier
            changes: List of ScoreChange objects

        Returns:
            Path to history file
        """
        history_file = self.history_dir / f"{course_id}_changes.jsonl"

        entry = {
            "timestamp": datetime.now().isoformat(),
            "changes": [
                {
                    "modality": c.modality,
                    "old_score": c.old_score,
                    "new_score": c.new_score,
                    "change_type": c.change_type.value,
                    "difference": c.difference
                }
                for c in changes
            ]
        }

        with open(history_file, 'a') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")

        logger.debug(f"Saved change history: {history_file}")
        return history_file

    def get_latest(self, course_id: int) -> Optional[dict]:
        """Get latest processed data for a course.

        Args:
            course_id: Course identifier

        Returns:
            Decoded course data or None
        """
        latest = self.processed_dir / f"{course_id}_latest.json"
        if latest.exists():
            return json.loads(latest.read_text())
        return None

    def get_change_history(self, course_id: int) -> list[dict]:
        """Get change history for a course.

        Args:
            course_id: Course identifier

        Returns:
            List of change entries
        """
        history_file = self.history_dir / f"{course_id}_changes.jsonl"
        if not history_file.exists():
            return []

        entries = []
        with open(history_file, 'r') as f:
            for line in f:
                if line.strip():
                    entries.append(json.loads(line))
        return entries

    def list_courses(self) -> list[int]:
        """List all course IDs with stored data.

        Returns:
            List of course IDs
        """
        course_ids = set()
        for f in self.processed_dir.glob("*_latest.json"):
            try:
                course_id = int(f.stem.split('_')[0])
                course_ids.add(course_id)
            except ValueError:
                pass
        return sorted(course_ids)
