"""
Score Change Tracker
Detects and reports changes in cut scores between fetches
"""
import hashlib
from dataclasses import dataclass
from typing import Optional
from enum import Enum


class ChangeType(Enum):
    INCREASE = "increase"
    DECREASE = "decrease"
    NEW = "new"


@dataclass
class ScoreChange:
    """Represents a change in a modality's cut score"""
    modality: str
    old_score: Optional[float]
    new_score: float
    change_type: ChangeType
    difference: Optional[float] = None

    def __post_init__(self):
        """Calculate difference if not provided"""
        if self.difference is None and self.old_score is not None:
            self.difference = round(self.new_score - self.old_score, 2)

    @property
    def arrow(self) -> str:
        if self.change_type == ChangeType.INCREASE:
            return "↑"
        elif self.change_type == ChangeType.DECREASE:
            return "↓"
        else:
            return "🆕"

    def format(self) -> str:
        if self.change_type == ChangeType.NEW:
            return f"{self.arrow} {self.modality}: NOVO -> {self.new_score}"
        else:
            diff_str = f"{self.difference:+.2f}" if self.difference else ""
            return f"{self.arrow} {self.modality}: {self.old_score:.2f} -> {self.new_score:.2f} ({diff_str})"


class ScoreTracker:
    """Tracks score changes across monitoring iterations"""

    def __init__(self):
        self._data_hashes: dict[int, str] = {}
        self._scores: dict[int, dict] = {}

    def compute_hash(self, data: bytes) -> str:
        """Compute MD5 hash of data for quick change detection"""
        return hashlib.md5(data).hexdigest()

    def has_data_changed(self, course_id: int, data: bytes) -> bool:
        """Check if raw data has changed since last check.

        Args:
            course_id: Course identifier
            data: Raw binary data

        Returns:
            True if data changed or is new
        """
        new_hash = self.compute_hash(data)
        old_hash = self._data_hashes.get(course_id)

        self._data_hashes[course_id] = new_hash

        if old_hash is None:
            return True  # New course
        return new_hash != old_hash

    def is_new_course(self, course_id: int) -> bool:
        """Check if this course has been seen before"""
        return course_id not in self._scores

    def compare_scores(self, course_id: int, new_scores: dict) -> list[ScoreChange]:
        """Compare new scores with stored scores and find changes.

        Args:
            course_id: Course identifier
            new_scores: Dict of modality -> score data

        Returns:
            List of ScoreChange objects for any changes detected
        """
        changes = []
        old_scores = self._scores.get(course_id, {})

        for modality, new_data in new_scores.items():
            new_cut = new_data.get('cut_score')
            if new_cut is None or new_cut == 'null':
                continue

            try:
                new_val = float(new_cut)
            except (ValueError, TypeError):
                continue

            old_data = old_scores.get(modality, {})
            old_cut = old_data.get('cut_score')

            if old_cut is None or old_cut == 'null':
                # New modality or first time seeing a score
                changes.append(ScoreChange(
                    modality=modality,
                    old_score=None,
                    new_score=new_val,
                    change_type=ChangeType.NEW
                ))
            else:
                try:
                    old_val = float(old_cut)
                    if old_val != new_val:
                        diff = new_val - old_val
                        change_type = ChangeType.INCREASE if diff > 0 else ChangeType.DECREASE
                        changes.append(ScoreChange(
                            modality=modality,
                            old_score=old_val,
                            new_score=new_val,
                            change_type=change_type,
                            difference=diff
                        ))
                except (ValueError, TypeError):
                    pass

        return changes

    def update_scores(self, course_id: int, scores: dict):
        """Store current scores for future comparison"""
        self._scores[course_id] = scores.copy()

    def get_stored_scores(self, course_id: int) -> dict:
        """Get stored scores for a course"""
        return self._scores.get(course_id, {})
