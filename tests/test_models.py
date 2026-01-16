"""Tests for Pydantic models"""
import pytest
from pydantic import ValidationError


class TestCourseModels:
    """Tests for course-related models"""

    def test_modality_creation(self):
        """Test creating a Modality"""
        from src.models.course import Modality

        mod = Modality(
            name="Ampla concorrência",
            code=41,
            cut_score=702.63,
            applicants=75,
            vacancies=40
        )

        assert mod.name == "Ampla concorrência"
        assert mod.cut_score == 702.63
        assert mod.simplified_name == "AMPLA"

    def test_modality_simplified_names(self):
        """Test simplified name generation for different modalities"""
        from src.models.course import Modality

        cases = [
            ("Ampla concorrência", "AMPLA"),
            ("Candidatos pretos, pardos ou indígenas", "PPI"),
            ("Candidatos pretos, pardos com renda", "PPI_RENDA"),
            ("Candidatos com deficiência", "PCD"),
            ("Candidatos com renda familiar", "RENDA"),
        ]

        for full_name, expected in cases:
            mod = Modality(name=full_name)
            assert mod.simplified_name == expected, f"Failed for {full_name}"

    def test_year_data_creation(self):
        """Test creating YearData"""
        from src.models.course import YearData, Modality

        year = YearData(
            year=2024,
            modalities=[
                Modality(name="Ampla concorrência", cut_score=750.0)
            ],
            weights={"pesoMat": 3.0, "pesoCn": 3.0},
            minimums={"minMat": 400.0}
        )

        assert year.year == 2024
        assert len(year.modalities) == 1
        assert year.weights["pesoMat"] == 3.0

    def test_course_creation(self):
        """Test creating a Course"""
        from src.models.course import Course, YearData, Modality

        course = Course(
            state="Distrito Federal",
            city="Brasília",
            university="UnB",
            course_name="Medicina",
            years=[
                YearData(
                    year=2024,
                    modalities=[
                        Modality(name="Ampla concorrência", cut_score=780.0, applicants=5000)
                    ]
                )
            ]
        )

        assert course.university == "UnB"
        assert course.location == "Brasília, Distrito Federal"
        assert course.latest_year.year == 2024

    def test_course_get_cut_scores(self):
        """Test extracting cut scores from course"""
        from src.models.course import Course, YearData, Modality

        course = Course(
            years=[
                YearData(
                    year=2024,
                    modalities=[
                        Modality(name="Ampla concorrência", cut_score=780.0, applicants=5000, vacancies=40),
                        Modality(name="Candidatos pretos, pardos", cut_score=720.0, applicants=1500, vacancies=20)
                    ]
                )
            ]
        )

        scores = course.get_cut_scores()
        assert "AMPLA" in scores
        assert scores["AMPLA"]["cut_score"] == 780.0
        assert "PPI" in scores


class TestCutScoreModels:
    """Tests for cut score tracking models"""

    def test_change_type_enum(self):
        """Test ChangeType enum values"""
        from src.models.cut_score import ChangeType

        assert ChangeType.INCREASE.value == "increase"
        assert ChangeType.DECREASE.value == "decrease"
        assert ChangeType.NEW.value == "new"

    def test_cut_score_creation(self):
        """Test creating CutScore"""
        from src.models.cut_score import CutScore

        score = CutScore(
            modality="AMPLA",
            score=750.0,
            applicants=5000,
            vacancies=40
        )

        assert score.modality == "AMPLA"
        assert score.competition_ratio == 125.0

    def test_cut_score_no_vacancies(self):
        """Test competition ratio with no vacancies"""
        from src.models.cut_score import CutScore

        score = CutScore(modality="AMPLA", score=750.0)
        assert score.competition_ratio is None

    def test_score_change_creation(self):
        """Test creating ScoreChange"""
        from src.models.cut_score import ScoreChange, ChangeType

        change = ScoreChange(
            modality="AMPLA",
            old_score=750.0,
            new_score=760.0,
            change_type=ChangeType.INCREASE
        )

        assert change.difference == 10.0
        assert change.arrow == "↑"

    def test_score_change_new(self):
        """Test ScoreChange for new score"""
        from src.models.cut_score import ScoreChange, ChangeType

        change = ScoreChange(
            modality="PCD",
            old_score=None,
            new_score=650.0,
            change_type=ChangeType.NEW
        )

        assert change.difference is None
        assert change.arrow == "🆕"


class TestConfigModels:
    """Tests for configuration models"""

    def test_course_config_with_code(self):
        """Test CourseConfig with code field"""
        from src.models.config import CourseConfig

        config = CourseConfig(
            code=37,
            name="Medicina - UnB",
            modality="ampla",
            priority="high",
            alert_threshold=750.0
        )

        assert config.id == 37
        assert config.name == "Medicina - UnB"
        assert config.alert_threshold == 750.0

    def test_course_config_invalid_priority(self):
        """Test CourseConfig rejects invalid priority"""
        from src.models.config import CourseConfig

        with pytest.raises(ValidationError):
            CourseConfig(
                code=37,
                name="Test",
                priority="invalid"
            )

    def test_notification_config_defaults(self):
        """Test NotificationConfig default values"""
        from src.models.config import NotificationConfig

        config = NotificationConfig()

        assert config.desktop.enabled is True
        assert config.sound.enabled is True
        assert config.webhook.enabled is False
        assert config.telegram.enabled is False

    def test_telegram_config_is_configured(self):
        """Test TelegramNotificationConfig.is_configured"""
        from src.models.config import TelegramNotificationConfig

        # Not configured
        config1 = TelegramNotificationConfig()
        assert config1.is_configured is False

        # Configured
        config2 = TelegramNotificationConfig(
            enabled=True,
            bot_token="test_token",
            chat_id="123456"
        )
        assert config2.is_configured is True

    def test_settings_defaults(self):
        """Test Settings default values"""
        from src.models.config import Settings

        settings = Settings()

        assert settings.poll_interval_seconds == 300
        assert settings.critical_hours.enabled is True
        assert settings.critical_hours.start == 0
        assert settings.critical_hours.end == 8

    def test_settings_invalid_log_level(self):
        """Test Settings rejects invalid log level"""
        from src.models.config import Settings

        with pytest.raises(ValidationError):
            Settings(log_level="INVALID")


class TestNotificationModels:
    """Tests for notification models"""

    def test_notification_payload(self):
        """Test NotificationPayload creation"""
        from src.models.notification import NotificationPayload

        payload = NotificationPayload(
            title="SISU: Medicina",
            message="Nota de corte alterada!",
            data="AMPLA: 780.0"
        )

        assert payload.title == "SISU: Medicina"
        assert payload.priority == "normal"

    def test_notification_result(self):
        """Test NotificationResult creation"""
        from src.models.notification import NotificationResult

        result = NotificationResult(
            channel="DesktopNotifier",
            success=True
        )

        assert result.channel == "DesktopNotifier"
        assert result.success is True
        assert result.error is None

    def test_notification_batch(self):
        """Test NotificationBatch aggregation"""
        from src.models.notification import NotificationPayload, NotificationResult, NotificationBatch

        payload = NotificationPayload(title="Test", message="Test message")
        batch = NotificationBatch(
            payload=payload,
            results=[
                NotificationResult(channel="Desktop", success=True),
                NotificationResult(channel="Telegram", success=False, error="Timeout")
            ]
        )

        assert batch.all_successful is False
        assert batch.successful_channels == ["Desktop"]
        assert batch.failed_channels == ["Telegram"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
