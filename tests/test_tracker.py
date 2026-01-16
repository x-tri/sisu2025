"""Tests for score tracking"""
import pytest


class TestScoreTracker:
    """Tests for score change tracking"""

    def test_compute_hash(self):
        """Test hash computation"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        hash1 = tracker.compute_hash(b'test data')
        hash2 = tracker.compute_hash(b'test data')
        hash3 = tracker.compute_hash(b'different data')

        assert hash1 == hash2
        assert hash1 != hash3

    def test_is_new_course(self):
        """Test new course detection"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        assert tracker.is_new_course(123) is True

        tracker._scores[123] = {}
        assert tracker.is_new_course(123) is False

    def test_has_data_changed_new(self):
        """Test change detection for new course"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        result = tracker.has_data_changed(123, b'test data')
        assert result is True

    def test_has_data_changed_same(self):
        """Test change detection for unchanged data"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        tracker.has_data_changed(123, b'test data')
        result = tracker.has_data_changed(123, b'test data')
        assert result is False

    def test_has_data_changed_different(self):
        """Test change detection for changed data"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        tracker.has_data_changed(123, b'test data')
        result = tracker.has_data_changed(123, b'new data')
        assert result is True

    def test_compare_scores_no_changes(self, sample_scores):
        """Test comparison with no changes"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        tracker._scores[123] = sample_scores

        changes = tracker.compare_scores(123, sample_scores)
        assert len(changes) == 0

    def test_compare_scores_increase(self, sample_scores):
        """Test detection of score increase"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        tracker._scores[123] = sample_scores

        new_scores = sample_scores.copy()
        new_scores['AMPLA'] = {'cut_score': 790.0, 'applicants': 5100, 'vacancies': 40}

        changes = tracker.compare_scores(123, new_scores)
        assert len(changes) == 1
        assert changes[0].modality == 'AMPLA'
        assert changes[0].new_score == 790.0

    def test_compare_scores_new_modality(self, sample_scores):
        """Test detection of new modality"""
        from src.monitor.tracker import ScoreTracker

        tracker = ScoreTracker()
        tracker._scores[123] = sample_scores

        new_scores = sample_scores.copy()
        new_scores['PCD'] = {'cut_score': 650.0, 'applicants': 100, 'vacancies': 5}

        changes = tracker.compare_scores(123, new_scores)
        assert len(changes) == 1
        assert changes[0].modality == 'PCD'


class TestScoreChange:
    """Tests for ScoreChange model"""

    def test_score_change_format_increase(self):
        """Test formatting score increase"""
        from src.monitor.tracker import ScoreChange, ChangeType

        change = ScoreChange(
            modality='AMPLA',
            old_score=750.0,
            new_score=760.0,
            change_type=ChangeType.INCREASE
        )

        formatted = change.format()
        assert '750.00' in formatted
        assert '760.00' in formatted
        assert '+10.00' in formatted

    def test_score_change_format_new(self):
        """Test formatting new score"""
        from src.monitor.tracker import ScoreChange, ChangeType

        change = ScoreChange(
            modality='PCD',
            old_score=None,
            new_score=650.0,
            change_type=ChangeType.NEW
        )

        formatted = change.format()
        assert 'NOVO' in formatted
        assert '650.0' in formatted
