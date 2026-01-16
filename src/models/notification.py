"""Notification data models"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NotificationPayload(BaseModel):
    """Notification content to be sent"""
    title: str
    message: str
    data: str = ""
    timestamp: datetime = Field(default_factory=datetime.now)
    priority: str = "normal"  # low, normal, high

    class Config:
        frozen = True


class NotificationResult(BaseModel):
    """Result of sending a notification"""
    channel: str
    success: bool
    error: Optional[str] = None
    sent_at: datetime = Field(default_factory=datetime.now)

    class Config:
        frozen = True


class NotificationBatch(BaseModel):
    """Results from sending to multiple channels"""
    payload: NotificationPayload
    results: list[NotificationResult] = Field(default_factory=list)

    @property
    def all_successful(self) -> bool:
        """Check if all channels succeeded"""
        return all(r.success for r in self.results)

    @property
    def successful_channels(self) -> list[str]:
        """Get list of channels that succeeded"""
        return [r.channel for r in self.results if r.success]

    @property
    def failed_channels(self) -> list[str]:
        """Get list of channels that failed"""
        return [r.channel for r in self.results if not r.success]
