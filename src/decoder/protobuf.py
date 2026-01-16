"""
Generic Protobuf Parser
Parses protobuf binary data without requiring .proto schema definition
"""
import struct
from typing import Any, Optional


def read_varint(data: bytes, pos: int) -> tuple[int, int]:
    """Read a varint from data at position pos.

    Returns:
        tuple: (value, new_position)
    """
    result = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        result |= (b & 0x7F) << shift
        pos += 1
        if not (b & 0x80):
            break
        shift += 7
    return result, pos


def read_bytes(data: bytes, pos: int) -> tuple[Optional[bytes], int]:
    """Read length-delimited bytes from data.

    Returns:
        tuple: (bytes_value or None, new_position)
    """
    length, pos = read_varint(data, pos)
    if pos + length > len(data):
        return None, pos
    return data[pos:pos+length], pos + length


def try_decode_string(data: bytes) -> Optional[str]:
    """Try to decode bytes as UTF-8 string.

    Returns:
        str or None if decoding fails
    """
    try:
        text = data.decode('utf-8')
        if text.isprintable() or '\n' not in text:
            return text
    except (UnicodeDecodeError, AttributeError):
        pass
    return None


def parse_message(data: bytes, depth: int = 0, max_depth: int = 6) -> dict[int, list]:
    """Parse protobuf message into a dictionary.

    Args:
        data: Binary protobuf data
        depth: Current recursion depth
        max_depth: Maximum recursion depth for nested messages

    Returns:
        dict mapping field numbers to lists of (type, value) tuples
    """
    pos = 0
    fields: dict[int, list] = {}

    while pos < len(data):
        try:
            tag, pos = read_varint(data, pos)
            if tag == 0:
                break

            field_num = tag >> 3
            wire_type = tag & 0x07

            if wire_type == 0:  # Varint
                value, pos = read_varint(data, pos)
                if field_num not in fields:
                    fields[field_num] = []
                fields[field_num].append(('varint', value))

            elif wire_type == 2:  # Length-delimited (string, bytes, or nested message)
                value, pos = read_bytes(data, pos)
                if value is None:
                    break

                text = try_decode_string(value)
                if text is not None:
                    if field_num not in fields:
                        fields[field_num] = []
                    fields[field_num].append(('string', text))
                else:
                    # Try to parse as nested message
                    nested = None
                    if depth < max_depth:
                        nested = parse_message(value, depth + 1, max_depth)
                    if field_num not in fields:
                        fields[field_num] = []
                    fields[field_num].append(('message', nested or value))

            elif wire_type == 5:  # 32-bit (float)
                if pos + 4 > len(data):
                    break
                value = struct.unpack('<f', data[pos:pos+4])[0]
                pos += 4
                if field_num not in fields:
                    fields[field_num] = []
                fields[field_num].append(('float', round(value, 2)))

            elif wire_type == 1:  # 64-bit (double, fixed64)
                if pos + 8 > len(data):
                    break
                value = struct.unpack('<d', data[pos:pos+8])[0]
                pos += 8
                if field_num not in fields:
                    fields[field_num] = []
                fields[field_num].append(('double', value))

            else:
                # Unknown wire type, stop parsing
                break

        except Exception:
            break

    return fields
