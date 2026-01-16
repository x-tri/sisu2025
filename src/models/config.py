"""Configuration models with validation"""
from pathlib import Path
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class CourseConfig(BaseModel):
    """Configuration for a monitored course"""
    id: int = Field(..., alias="code", description="Course code from meusisu.com")
    name: str
    modality: str = "ampla"
    priority: str = "normal"  # low, normal, high
    alert_threshold: Optional[float] = None
    notes: Optional[str] = None

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        if v not in ('low', 'normal', 'high'):
            raise ValueError('priority must be low, normal, or high')
        return v

    class Config:
        populate_by_name = True


class DesktopNotificationConfig(BaseModel):
    """Desktop notification settings"""
    enabled: bool = True
    sound_name: str = "Glass"


class SoundNotificationConfig(BaseModel):
    """Sound notification settings"""
    enabled: bool = True


class WebhookNotificationConfig(BaseModel):
    """Webhook notification settings"""
    enabled: bool = False
    url: str = ""


class TelegramNotificationConfig(BaseModel):
    """Telegram notification settings"""
    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""

    @property
    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)


class NotificationConfig(BaseModel):
    """All notification settings"""
    desktop: DesktopNotificationConfig = Field(default_factory=DesktopNotificationConfig)
    sound: SoundNotificationConfig = Field(default_factory=SoundNotificationConfig)
    webhook: WebhookNotificationConfig = Field(default_factory=WebhookNotificationConfig)
    telegram: TelegramNotificationConfig = Field(default_factory=TelegramNotificationConfig)


class CriticalHoursConfig(BaseModel):
    """Critical hours polling settings"""
    enabled: bool = True
    start: int = Field(0, ge=0, le=23)
    end: int = Field(8, ge=0, le=23)
    poll_interval_seconds: int = Field(60, ge=10)


class ApiConfig(BaseModel):
    """API settings"""
    base_url: str = "https://meusisu.com/api"
    timeout_seconds: int = Field(30, ge=5, le=120)


class Settings(BaseModel):
    """Main application settings"""
    poll_interval_seconds: int = Field(300, ge=30)
    critical_hours: CriticalHoursConfig = Field(default_factory=CriticalHoursConfig)
    api: ApiConfig = Field(default_factory=ApiConfig)
    data_retention_days: int = Field(30, ge=1)
    log_level: str = "INFO"

    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v):
        valid = ('DEBUG', 'INFO', 'WARNING', 'ERROR')
        if v.upper() not in valid:
            raise ValueError(f'log_level must be one of {valid}')
        return v.upper()
