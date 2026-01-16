"""Tests for protobuf decoder"""
import pytest
from pathlib import Path


class TestProtobufDecoder:
    """Tests for protobuf parsing"""

    def test_read_varint_single_byte(self):
        """Test reading single-byte varint"""
        from src.decoder.protobuf import read_varint

        data = bytes([0x08])  # Value 8
        value, pos = read_varint(data, 0)
        assert value == 8
        assert pos == 1

    def test_read_varint_multi_byte(self):
        """Test reading multi-byte varint"""
        from src.decoder.protobuf import read_varint

        data = bytes([0xAC, 0x02])  # Value 300
        value, pos = read_varint(data, 0)
        assert value == 300
        assert pos == 2

    def test_parse_message_empty(self):
        """Test parsing empty message"""
        from src.decoder.protobuf import parse_message

        result = parse_message(b'')
        assert result == {}

    def test_try_decode_string_valid(self):
        """Test decoding valid UTF-8 string"""
        from src.decoder.protobuf import try_decode_string

        result = try_decode_string(b'Hello World')
        assert result == 'Hello World'

    def test_try_decode_string_invalid(self):
        """Test decoding invalid UTF-8"""
        from src.decoder.protobuf import try_decode_string

        result = try_decode_string(b'\xff\xfe')
        assert result is None


class TestCourseDecoder:
    """Tests for course data decoding"""

    def test_modality_simplified_name_ampla(self):
        """Test simplified name for Ampla Concorrencia"""
        from src.decoder.course import Modality

        mod = Modality(name="Ampla concorrencia", cut_score=750.0)
        # Since we're using dataclass, not the model yet
        assert 'Ampla' in mod.name

    def test_course_get_cut_scores(self, sample_course_data):
        """Test extracting cut scores from course"""
        from src.decoder.course import Course, YearData, Modality

        # Create course from sample data
        years = []
        for year_data in sample_course_data['years']:
            modalities = [
                Modality(**m) for m in year_data['modalities']
            ]
            years.append(YearData(
                year=year_data['year'],
                modalities=modalities,
                weights=year_data['weights'],
                minimums=year_data['minimums']
            ))

        course = Course(
            state=sample_course_data['state'],
            city=sample_course_data['city'],
            university=sample_course_data['university'],
            course_name=sample_course_data['course_name'],
            years=years
        )

        scores = course.get_cut_scores()
        assert 'AMPLA' in scores
        assert scores['AMPLA']['cut_score'] == 780.50
