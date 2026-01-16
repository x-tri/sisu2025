"""Cut score tracking models"""
from enum import Enum
from typing import Optional
from pydantic import BaseModel, computed_field


class ChangeType(str, Enum):
    """Type of score change"""
    INCREASE = "increase"
    DECREASE = "decrease"
    NEW = "new"


class CutScore(BaseModel):
    """Current cut score for a modality"""
    modality: str
    score: Optional[float] = None
    applicants: Optional[int] = None
    vacancies: Optional[int] = None

    @property
    def competition_ratio(self) -> Optional[float]:
        """Calculate applicants per vacancy"""
        if self.applicants and self.vacancies and self.vacancies > 0:
            return round(self.applicants / self.vacancies, 2)
        return None

    class Config:
        frozen = True


class ScoreChange(BaseModel):
    """Represents a change in cut score"""
    modality: str
    old_score: Optional[float] = None
    new_score: float
    change_type: ChangeType

    @computed_field
    @property
    def difference(self) -> Optional[float]:
        """Calculate score difference"""
        if self.old_score is not None:
            return round(self.new_score - self.old_score, 2)
        return None

    @property
    def arrow(self) -> str:
        """Get visual indicator for change"""
        if self.change_type == ChangeType.INCREASE:
            return "↑"
        elif self.change_type == ChangeType.DECREASE:
            return "↓"
        else:
            return "🆕"

    def format(self) -> str:
        """Format change for display"""
        if self.change_type == ChangeType.NEW:
            return f"{self.arrow} {self.modality}: NOVO -> {self.new_score:.2f}"
        diff_str = f"{self.difference:+.2f}" if self.difference else ""
        return f"{self.arrow} {self.modality}: {self.old_score:.2f} -> {self.new_score:.2f} ({diff_str})"

    class Config:
        frozen = True
