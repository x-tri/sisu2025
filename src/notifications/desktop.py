"""
Desktop Notifications
macOS and Linux desktop notification support
"""
import platform
import subprocess
import logging

from .base import NotificationChannel

logger = logging.getLogger(__name__)


class DesktopNotifier(NotificationChannel):
    """Desktop notification channel (macOS/Linux)"""

    def __init__(self, config: dict):
        super().__init__(config)
        self.sound_name = config.get('sound_name', 'Glass')
        self.system = platform.system()

    def is_configured(self) -> bool:
        return self.system in ('Darwin', 'Linux')

    def _send(self, title: str, message: str, data: str = "") -> bool:
        if self.system == "Darwin":
            return self._send_macos(title, message)
        elif self.system == "Linux":
            return self._send_linux(title, message)
        return False

    def _send_macos(self, title: str, message: str) -> bool:
        """Send notification via macOS osascript"""
        # Escape quotes in message
        title = title.replace('"', '\\"')
        message = message.replace('"', '\\"')

        script = f'display notification "{message}" with title "{title}" sound name "{self.sound_name}"'

        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0

    def _send_linux(self, title: str, message: str) -> bool:
        """Send notification via notify-send (Linux)"""
        result = subprocess.run(
            ["notify-send", title, message],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
