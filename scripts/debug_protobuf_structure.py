import requests
import sys
import os
import json
from pprint import pprint

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.decoder.protobuf import parse_message

def print_structure(msg, indent=0):
    """Recursively print structure of parsed protobuf message"""
    prefix = "  " * indent
    if isinstance(msg, dict):
        for field_num, values in msg.items():
            print(f"{prefix}Field {field_num}:")
            for type_name, value in values:
                if type_name == 'message':
                    print(f"{prefix}  Type: message")
                    print_structure(value, indent + 2)
                elif type_name == 'string':
                     # Truncate long strings but show enough to identify
                    s_val = str(value)
                    if len(s_val) > 100: s_val = s_val[:100] + "..."
                    print(f"{prefix}  Type: string = {s_val}")
                else:
                    print(f"{prefix}  Type: {type_name} = {value}")
    else:
        print(f"{prefix}{msg}")

def main():
    # UFRN Medicina - a popular course likely to have data
    code = 685 
    url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
    print(f"Fetching {url}...")
    
    resp = requests.get(url)
    if resp.status_code != 200:
        print(f"Error {resp.status_code}")
        return

    data = resp.content
    parsed = parse_message(data)
    
    # We suspect YearData is field 10
    if 10 in parsed:
        print("Found Year Data (Field 10)")
        for t, v in parsed[10]:
            if t == 'message':
                print("\\n--- INSIDE YEAR DATA ---")
                # Print ALL fields in YearData
                print_structure(v, 2)
    else:
        print("No Year Data found?")
        
    # Check for text present in raw bytes
    if b'Silva' in data or b'OLIVEIRA' in data or b'SANTOS' in data:
         print("\\n[!] Found common names in raw bytes! Data IS in this response.")
    else:
         print("\\n[?] No common names found in raw bytes. Data likely in another endpoint.")


if __name__ == "__main__":
    main()
