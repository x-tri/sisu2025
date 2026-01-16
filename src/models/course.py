"""Course data models with Pydantic validation"""
from typing import Optional
from pydantic import BaseModel, Field


class Weight(BaseModel):
    """ENEM component weight"""
    name: str
    value: Optional[float] = None

    class Config:
        frozen = True


class Modality(BaseModel):
    """SISU quota modality (category)"""
    name: str
    code: Optional[int] = None
    cut_score: Optional[float] = None
    applicants: Optional[int] = None
    vacancies: Optional[int] = None

    @property
    def simplified_name(self) -> str:
        """Get simplified modality name for display"""
        name = self.name
        if 'Ampla' in name:
            return 'AMPLA'
        elif 'pretos, pardos' in name.lower():
            if 'renda' in name.lower():
                return 'PPI_RENDA'
            return 'PPI'
        elif 'deficiência' in name.lower():
            return 'PCD'
        elif 'renda' in name.lower():
            return 'RENDA'
        return name[:30]

    class Config:
        frozen = True


class YearData(BaseModel):
    """SISU data for a specific year"""
    year: int
    modalities: list[Modality] = Field(default_factory=list)
    weights: dict[str, Optional[float]] = Field(default_factory=dict)
    minimums: dict[str, Optional[float]] = Field(default_factory=dict)

    def get_modality(self, name: str) -> Optional[Modality]:
        """Find modality by name (partial match)"""
        for mod in self.modalities:
            if name.lower() in mod.name.lower():
                return mod
        return None

    class Config:
        frozen = True


class Course(BaseModel):
    """SISU course offering"""
    state: Optional[str] = None
    city: Optional[str] = None
    university: Optional[str] = None
    campus: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    course_name: Optional[str] = None
    degree: Optional[str] = None
    schedule: Optional[str] = None
    years: list[YearData] = Field(default_factory=list)

    @property
    def latest_year(self) -> Optional[YearData]:
        """Get most recent year data"""
        if not self.years:
            return None
        return max(self.years, key=lambda y: y.year)

    @property
    def location(self) -> str:
        """Get formatted location string"""
        parts = [self.city, self.state]
        return ", ".join(p for p in parts if p) or "N/A"

    def get_cut_scores(self) -> dict[str, dict]:
        """Get cut scores from latest year with simplified names"""
        latest = self.latest_year
        if not latest:
            return {}

        scores = {}
        for mod in latest.modalities:
            scores[mod.simplified_name] = {
                'cut_score': mod.cut_score,
                'applicants': mod.applicants,
                'vacancies': mod.vacancies
            }
        return scores

    class Config:
        frozen = True
