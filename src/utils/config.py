"""
Configuration Loader
Loads and validates configuration from JSON files
"""
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class Config:
    """Application configuration"""
    # Courses
    courses: list[dict] = field(default_factory=list)

    # Polling
    poll_interval: int = 300
    critical_hours_enabled: bool = True
    critical_hours_start: int = 0
    critical_hours_end: int = 8
    critical_poll_interval: int = 60

    # API
    api_base_url: str = "https://meusisu.com/api"
    api_timeout: int = 30

    # Paths
    data_dir: Path = field(default_factory=lambda: Path("data"))
    log_dir: Path = field(default_factory=lambda: Path("logs"))

    # Logging
    log_level: str = "INFO"

    # Notifications (raw dict for flexibility)
    notifications: dict = field(default_factory=dict)


def load_config(config_dir: Optional[Path] = None) -> Config:
    """Load configuration from JSON files.

    Args:
        config_dir: Path to config directory (defaults to ./config)

    Returns:
        Config object with loaded settings
    """
    if config_dir is None:
        # Try to find config relative to script location
        config_dir = Path(__file__).parent.parent.parent / "config"

    config_dir = Path(config_dir)

    if not config_dir.exists():
        logger.warning(f"Config directory not found: {config_dir}")
        return Config()

    config = Config()

    # Load courses
    courses_file = config_dir / "courses.json"
    if courses_file.exists():
        data = json.loads(courses_file.read_text())
        courses_raw = data.get('courses', [])
        # Normalize: support both 'id' and 'code' fields
        config.courses = []
        for c in courses_raw:
            course = c.copy()
            # Ensure 'id' field exists (prefer 'code' over 'id')
            if 'code' in course:
                course['id'] = course['code']
            elif 'id' not in course:
                logger.warning(f"Course missing id/code: {course.get('name', 'unknown')}")
                continue
            config.courses.append(course)
        logger.info(f"Loaded {len(config.courses)} courses")

    # Load settings
    settings_file = config_dir / "settings.json"
    if settings_file.exists():
        data = json.loads(settings_file.read_text())
        config.poll_interval = data.get('poll_interval_seconds', 300)

        critical = data.get('critical_hours', {})
        config.critical_hours_enabled = critical.get('enabled', True)
        config.critical_hours_start = critical.get('start', 0)
        config.critical_hours_end = critical.get('end', 8)
        config.critical_poll_interval = critical.get('poll_interval_seconds', 60)

        api = data.get('api', {})
        config.api_base_url = api.get('base_url', config.api_base_url)
        config.api_timeout = api.get('timeout_seconds', config.api_timeout)

        config.log_level = data.get('log_level', 'INFO')

    # Load notifications
    notif_file = config_dir / "notifications.json"
    if notif_file.exists():
        config.notifications = json.loads(notif_file.read_text())
        logger.info("Loaded notification settings")

    # Set paths relative to project root
    project_root = config_dir.parent
    config.data_dir = project_root / "data"
    config.log_dir = project_root / "logs"

    return config


def save_courses(courses: list[dict], config_dir: Optional[Path] = None):
    """Save courses configuration.

    Args:
        courses: List of course dictionaries
        config_dir: Path to config directory
    """
    if config_dir is None:
        config_dir = Path(__file__).parent.parent.parent / "config"

    courses_file = Path(config_dir) / "courses.json"
    data = {
        "courses": courses,
        "_comment": "Encontre IDs em meusisu.com/curso/{id}"
    }
    courses_file.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    logger.info(f"Saved {len(courses)} courses")
