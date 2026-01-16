"""Tests for notification system"""
import pytest


class TestNotificationChannel:
    """Tests for notification channels"""

    def test_desktop_notifier_not_enabled(self, sample_notification_config):
        """Test desktop notifier when disabled"""
        from src.notifications.desktop import DesktopNotifier

        config = {'enabled': False, 'sound_name': 'Glass'}
        notifier = DesktopNotifier(config)

        assert notifier.enabled is False

    def test_webhook_notifier_not_configured(self):
        """Test webhook notifier without URL"""
        from src.notifications.webhook import WebhookNotifier

        config = {'enabled': True, 'url': ''}
        notifier = WebhookNotifier(config)

        assert notifier.is_configured() is False
        assert notifier.enabled is False

    def test_telegram_notifier_not_configured(self):
        """Test telegram notifier without credentials"""
        from src.notifications.telegram import TelegramNotifier

        config = {'enabled': True, 'bot_token': '', 'chat_id': ''}
        notifier = TelegramNotifier(config)

        assert notifier.is_configured() is False

    def test_telegram_notifier_configured(self):
        """Test telegram notifier with credentials"""
        from src.notifications.telegram import TelegramNotifier

        config = {
            'enabled': True,
            'bot_token': 'test_token',
            'chat_id': '123456'
        }
        notifier = TelegramNotifier(config)

        assert notifier.is_configured() is True


class TestNotificationManager:
    """Tests for notification manager"""

    def test_manager_initialization(self, sample_notification_config):
        """Test manager initializes all channels"""
        from src.notifications.manager import NotificationManager

        manager = NotificationManager(sample_notification_config)

        assert len(manager.channels) == 4

    def test_get_enabled_channels(self, sample_notification_config):
        """Test getting enabled channels"""
        from src.notifications.manager import NotificationManager

        manager = NotificationManager(sample_notification_config)
        enabled = manager.get_enabled_channels()

        # Desktop and Sound should be enabled by default
        assert 'DesktopNotifier' in enabled
        assert 'SoundNotifier' in enabled
