"""Decoder module - Protobuf parsing for MeuSISU API"""
from .protobuf import parse_message, read_varint, read_bytes
from .course import decode_course, Course, Modality, YearData

__all__ = [
    'parse_message', 'read_varint', 'read_bytes',
    'decode_course', 'Course', 'Modality', 'YearData'
]
