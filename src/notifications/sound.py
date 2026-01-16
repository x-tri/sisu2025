"""
Sound Notifications
Audio alert support for macOS and Linux
"""
import platform
import subprocess
import logging

from .base import NotificationChannel

logger = logging.getLogger(__name__)


class SoundNotifier(NotificationChannel):
    """Sound alert notification channel"""

    MACOS_SOUND = "/System/Library/Sounds/Glass.aiff"
    LINUX_SOUND = "/usr/share/sounds/freedesktop/stereo/complete.oga"

    def __init__(self, config: dict):
        super().__init__(config)
        self.system = platform.system()

    def is_configured(self) -> bool:
        return self.system in ('Darwin', 'Linux')

    def _send(self, title: str, message: str, data: str = "") -> bool:
        if self.system == "Darwin":
            return self._play_macos()
        elif self.system == "Linux":
            return self._play_linux()

        # Fallback: terminal bell
        print("\a", end="", flush=True)
        return True

    def _play_macos(self) -> bool:
        """Play sound on macOS using afplay"""
        try:
            result = subprocess.run(
                ["afplay", self.MACOS_SOUND],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except FileNotFoundError:
            logger.warning("afplay not found")
            return False

    def _play_linux(self) -> bool:
        """Play sound on Linux using paplay"""
        try:
            result = subprocess.run(
                ["paplay", self.LINUX_SOUND],
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except FileNotFoundError:
            logger.warning("paplay not found")
            return False
