"""
Notification Manager
Orchestrates all notification channels
"""
import logging
from typing import Optional

from .desktop import DesktopNotifier
from .sound import SoundNotifier
from .webhook import WebhookNotifier
from .telegram import TelegramNotifier

logger = logging.getLogger(__name__)


class NotificationManager:
    """Manages and dispatches notifications to all configured channels"""

    def __init__(self, config: dict):
        self.channels = []

        # Initialize all notification channels
        if 'desktop' in config:
            self.channels.append(DesktopNotifier(config['desktop']))

        if 'sound' in config:
            self.channels.append(SoundNotifier(config['sound']))

        if 'webhook' in config:
            self.channels.append(WebhookNotifier(config['webhook']))

        if 'telegram' in config:
            self.channels.append(TelegramNotifier(config['telegram']))

        logger.info(f"Initialized {len(self.channels)} notification channels")

    def send_all(self, title: str, message: str, data: str = "") -> dict[str, bool]:
        """Send notification to all enabled channels.

        Args:
            title: Notification title
            message: Main message body
            data: Additional data (e.g., scores)

        Returns:
            Dict mapping channel name to success status
        """
        results = {}
        for channel in self.channels:
            name = channel.__class__.__name__
            if channel.enabled:
                success = channel.send(title, message, data)
                results[name] = success
                if success:
                    logger.debug(f"Sent notification via {name}")
                else:
                    logger.warning(f"Failed to send via {name}")
        return results

    def get_enabled_channels(self) -> list[str]:
        """Get list of enabled channel names"""
        return [c.__class__.__name__ for c in self.channels if c.enabled]

    def test_all(self) -> dict[str, bool]:
        """Test all enabled notification channels"""
        return self.send_all(
            title="SISU Monitor - Teste",
            message="Notificacoes configuradas com sucesso!",
            data="Este e um teste do sistema de notificacoes."
        )
