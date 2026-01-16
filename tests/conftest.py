"""Pytest configuration and fixtures"""
import json
from pathlib import Path
import pytest


# Fixtures directory
FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def fixtures_dir() -> Path:
    """Return path to fixtures directory"""
    return FIXTURES_DIR


@pytest.fixture
def sample_course_data() -> dict:
    """Sample decoded course data"""
    return {
        "state": "Distrito Federal",
        "city": "Brasilia",
        "university": "Universidade de Brasilia",
        "campus": "Campus Darcy Ribeiro",
        "latitude": "-15.7934036",
        "longitude": "-47.8823172",
        "course_name": "Medicina",
        "degree": "Bacharelado",
        "schedule": "Integral",
        "years": [
            {
                "year": 2024,
                "modalities": [
                    {
                        "name": "Ampla concorrencia",
                        "code": 1,
                        "cut_score": 780.50,
                        "applicants": 5000,
                        "vacancies": 40
                    },
                    {
                        "name": "Candidatos pretos, pardos ou indigenas",
                        "code": 2,
                        "cut_score": 720.30,
                        "applicants": 1500,
                        "vacancies": 20
                    }
                ],
                "weights": {
                    "pesoMat": 3.0,
                    "pesoCn": 3.0,
                    "pesoLing": 1.5,
                    "pesoCh": 1.5,
                    "pesoRed": 1.0
                },
                "minimums": {
                    "minMat": 400.0,
                    "minCn": 400.0,
                    "minLing": 400.0,
                    "minCh": 400.0,
                    "minRed": 400.0
                }
            }
        ]
    }


@pytest.fixture
def sample_scores() -> dict:
    """Sample cut scores dictionary"""
    return {
        "AMPLA": {
            "cut_score": 780.50,
            "applicants": 5000,
            "vacancies": 40
        },
        "PPI": {
            "cut_score": 720.30,
            "applicants": 1500,
            "vacancies": 20
        }
    }


@pytest.fixture
def sample_config() -> dict:
    """Sample configuration dictionary"""
    return {
        "courses": [
            {
                "code": 37,
                "name": "Medicina - UnB",
                "modality": "ampla",
                "priority": "high",
                "alert_threshold": 750.0
            }
        ]
    }


@pytest.fixture
def sample_notification_config() -> dict:
    """Sample notification configuration"""
    return {
        "desktop": {"enabled": True, "sound_name": "Glass"},
        "sound": {"enabled": True},
        "webhook": {"enabled": False, "url": ""},
        "telegram": {"enabled": False, "bot_token": "", "chat_id": ""}
    }


@pytest.fixture
def temp_data_dir(tmp_path) -> Path:
    """Create temporary data directory structure"""
    data_dir = tmp_path / "data"
    (data_dir / "raw").mkdir(parents=True)
    (data_dir / "processed").mkdir(parents=True)
    (data_dir / "history").mkdir(parents=True)
    (data_dir / "exports").mkdir(parents=True)
    return data_dir
