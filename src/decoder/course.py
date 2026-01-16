"""
SISU Course Data Decoder
Extracts structured course data from MeuSISU API protobuf responses
"""
from dataclasses import dataclass, field
from typing import Optional
from .protobuf import parse_message


@dataclass
class Modality:
    """Represents a SISU modality (quota category)"""
    name: str
    code: Optional[int] = None
    cut_score: Optional[float] = None
    applicants: Optional[int] = None
    vacancies: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            'name': self.name,
            'code': self.code,
            'cut_score': self.cut_score,
            'applicants': self.applicants,
            'vacancies': self.vacancies
        }


@dataclass
class YearData:
    """Represents SISU data for a specific year"""
    year: int
    modalities: list[Modality] = field(default_factory=list)
    weights: dict[str, float] = field(default_factory=dict)
    minimums: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            'year': self.year,
            'modalities': [m.to_dict() for m in self.modalities],
            'weights': self.weights,
            'minimums': self.minimums
        }


@dataclass
class Course:
    """Represents a SISU course offering"""
    state: Optional[str] = None
    city: Optional[str] = None
    university: Optional[str] = None
    campus: Optional[str] = None
    latitude: Optional[str] = None
    longitude: Optional[str] = None
    course_name: Optional[str] = None
    degree: Optional[str] = None
    schedule: Optional[str] = None
    years: list[YearData] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            'state': self.state,
            'city': self.city,
            'university': self.university,
            'campus': self.campus,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'course_name': self.course_name,
            'degree': self.degree,
            'schedule': self.schedule,
            'years': [y.to_dict() for y in self.years]
        }

    def get_latest_year(self) -> Optional[YearData]:
        """Get the most recent year data"""
        if not self.years:
            return None
        return max(self.years, key=lambda y: y.year)

    def get_cut_scores(self) -> dict[str, dict]:
        """Get cut scores from the latest year, with simplified modality names"""
        latest = self.get_latest_year()
        if not latest:
            return {}

        scores = {}
        for mod in latest.modalities:
            # Simplify modality name
            name = mod.name
            if 'Ampla' in name:
                key = 'AMPLA'
            elif 'pretos, pardos' in name.lower():
                if 'renda' in name.lower():
                    key = 'PPI_RENDA'
                else:
                    key = 'PPI'
            elif 'deficiência' in name.lower():
                key = 'PCD'
            elif 'renda' in name.lower():
                key = 'RENDA'
            else:
                key = name[:30]

            scores[key] = {
                'cut_score': mod.cut_score,
                'applicants': mod.applicants,
                'vacancies': mod.vacancies
            }

        return scores


def _extract_modality(msg: dict) -> Optional[Modality]:
    """Extract modality from parsed protobuf message"""
    name = None
    code = None
    cut_score = None
    applicants = None
    vacancies = None

    # Field 1: name
    if 1 in msg:
        for t, v in msg[1]:
            if t == 'string':
                name = v
                break

    if not name:
        return None

    # Field 2: code
    if 2 in msg:
        for t, v in msg[2]:
            if t == 'varint':
                code = v
                break

    # Field 5: cut_score
    if 5 in msg:
        for t, v in msg[5]:
            if t == 'string':
                try:
                    cut_score = float(v)
                except ValueError:
                    cut_score = None
                break

    # Field 6: applicants
    if 6 in msg:
        for t, v in msg[6]:
            if t == 'varint':
                applicants = v
                break

    # Field 7: vacancies (nested)
    if 7 in msg:
        for t, v in msg[7]:
            if t == 'message' and isinstance(v, dict) and 1 in v:
                for t2, v2 in v[1]:
                    if t2 == 'varint':
                        vacancies = v2
                        break
                break

    return Modality(
        name=name,
        code=code,
        cut_score=cut_score,
        applicants=applicants,
        vacancies=vacancies
    )


def _extract_weight(msg: dict) -> Optional[tuple[str, float]]:
    """Extract weight/minimum from parsed message"""
    name = None
    value = None

    if 1 in msg:
        for t, v in msg[1]:
            if t == 'string':
                name = v
                break

    if 2 in msg:
        for t, v in msg[2]:
            if t == 'float':
                value = v
                break

    if name:
        return (name, value)
    return None


def _extract_year_data(msg: dict) -> Optional[YearData]:
    """Extract year data from parsed message"""
    year = None
    modalities = []
    weights = {}
    minimums = {}

    # Field 1: year
    if 1 in msg:
        for t, v in msg[1]:
            if t == 'varint':
                year = v
                break

    if not year:
        return None

    # Field 2: contains modalities and weights
    if 2 in msg:
        for t, v in msg[2]:
            if t == 'message' and isinstance(v, dict):
                # Field 2 within: modalities
                if 2 in v:
                    for t2, v2 in v[2]:
                        if t2 == 'message' and isinstance(v2, dict):
                            mod = _extract_modality(v2)
                            if mod:
                                modalities.append(mod)

                # Field 3 within: weights and minimums
                if 3 in v:
                    for t3, v3 in v[3]:
                        if t3 == 'message' and isinstance(v3, dict):
                            weight = _extract_weight(v3)
                            if weight:
                                name, val = weight
                                if name.startswith('peso'):
                                    weights[name] = val
                                elif name.startswith('min'):
                                    minimums[name] = val

    return YearData(
        year=year,
        modalities=modalities,
        weights=weights,
        minimums=minimums
    )


def decode_course(data: bytes) -> Course:
    """Decode binary protobuf data into Course object.

    Args:
        data: Raw binary data from MeuSISU API

    Returns:
        Course object with all extracted data
    """
    msg = parse_message(data)

    # Field mapping for basic course info
    field_map = {
        1: 'state',
        2: 'city',
        3: 'university',
        4: 'campus',
        5: 'latitude',
        6: 'longitude',
        7: 'course_name',
        8: 'degree',
        9: 'schedule'
    }

    course_data = {}
    for field_num, key in field_map.items():
        if field_num in msg:
            for t, v in msg[field_num]:
                if t == 'string':
                    course_data[key] = v
                    break

    # Extract years from field 10
    years = []
    if 10 in msg:
        for t, v in msg[10]:
            if t == 'message' and isinstance(v, dict):
                year_data = _extract_year_data(v)
                if year_data:
                    years.append(year_data)

    return Course(
        state=course_data.get('state'),
        city=course_data.get('city'),
        university=course_data.get('university'),
        campus=course_data.get('campus'),
        latitude=course_data.get('latitude'),
        longitude=course_data.get('longitude'),
        course_name=course_data.get('course_name'),
        degree=course_data.get('degree'),
        schedule=course_data.get('schedule'),
        years=years
    )
