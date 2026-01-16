"""
Telegram Notifications
Telegram Bot API support
"""
import logging
import requests

from .base import NotificationChannel

logger = logging.getLogger(__name__)


class TelegramNotifier(NotificationChannel):
    """Telegram Bot notification channel"""

    API_BASE = "https://api.telegram.org/bot"

    def __init__(self, config: dict):
        super().__init__(config)
        self.bot_token = config.get('bot_token', '')
        self.chat_id = config.get('chat_id', '')

    def is_configured(self) -> bool:
        return bool(self.bot_token and self.chat_id)

    def _send(self, title: str, message: str, data: str = "") -> bool:
        """Send notification via Telegram Bot API"""
        # Format message with Markdown
        text = f"*{self._escape_markdown(title)}*\n{self._escape_markdown(message)}"
        if data:
            text += f"\n```\n{data}\n```"

        url = f"{self.API_BASE}{self.bot_token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown"
        }

        try:
            response = requests.post(url, json=payload, timeout=10)
            result = response.json()
            return result.get('ok', False)
        except requests.RequestException as e:
            logger.error(f"Telegram request failed: {e}")
            return False

    def _escape_markdown(self, text: str) -> str:
        """Escape special Markdown characters"""
        chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
        for char in chars:
            text = text.replace(char, f'\\{char}')
        return text
