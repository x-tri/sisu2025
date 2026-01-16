"""
Webhook Notifications
Discord and Slack compatible webhook support
"""
import logging
import requests

from .base import NotificationChannel

logger = logging.getLogger(__name__)


class WebhookNotifier(NotificationChannel):
    """Webhook notification channel (Discord/Slack compatible)"""

    def __init__(self, config: dict):
        super().__init__(config)
        self.url = config.get('url', '')

    def is_configured(self) -> bool:
        return bool(self.url)

    def _send(self, title: str, message: str, data: str = "") -> bool:
        """Send notification via webhook POST request"""
        # Format for Discord/Slack compatibility
        content = f"**{title}**\n{message}"
        if data:
            content += f"\n```\n{data}\n```"

        payload = {"content": content}

        try:
            response = requests.post(
                self.url,
                json=payload,
                timeout=10
            )
            return response.status_code in (200, 204)
        except requests.RequestException as e:
            logger.error(f"Webhook request failed: {e}")
            return False
