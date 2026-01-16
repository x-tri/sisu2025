"""
Base Notification Channel
Abstract interface for all notification channels
"""
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class NotificationChannel(ABC):
    """Abstract base class for notification channels"""

    def __init__(self, config: dict):
        self.config = config
        self._enabled = config.get('enabled', False)

    @property
    def enabled(self) -> bool:
        return self._enabled and self.is_configured()

    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the channel has all required configuration"""
        pass

    @abstractmethod
    def _send(self, title: str, message: str, data: str = "") -> bool:
        """Internal send implementation"""
        pass

    def send(self, title: str, message: str, data: str = "") -> bool:
        """Send notification if enabled and configured.

        Args:
            title: Notification title
            message: Main message body
            data: Additional data (e.g., scores)

        Returns:
            True if sent successfully, False otherwise
        """
        if not self.enabled:
            return False

        try:
            return self._send(title, message, data)
        except Exception as e:
            logger.error(f"{self.__class__.__name__} failed: {e}")
            return False
