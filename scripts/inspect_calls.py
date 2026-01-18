import requests
from pprint import pprint
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Attempt to import protobuf decoder in case it's binary
from src.decoder.protobuf import parse_message

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        # Default to a known course
        code = 685
        # url = f"https://meusisu.com/api/getCalls?courseCode={code}"
        url = f"https://meusisu.com/api/getCourseData?courseCode={code}"

    print(f"Fetching {url}...")
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    resp = requests.get(url, headers=headers)
    print(f"Status: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('Content-Type')}")
    
    try:
        # Try JSON first
        data = resp.json()
        print("--- JSON DATA ---")
        # limit output
        pprint(str(data)[:500] + "...")
    except:
        print("Not JSON, trying Protobuf...")
        try:
             parsed = parse_message(resp.content)
             print("--- PROTOBUF DATA ---")
             pprint(parsed)
             
             # Check for Names or common strings
             content_str = str(resp.content)
             if 'Andre' in content_str or 'SILVA' in content_str or 'OLIVEIRA' in content_str:
                 print("\n[!] Found potential names in binary!")
                 
             # Save to file for further inspection if needed
             with open("inspect_output.bin", "wb") as f:
                 f.write(resp.content)
                 print("Saved raw output to inspect_output.bin")

        except Exception as e:
            print(f"Failed to parse: {e}")
            print(f"Raw bytes snippet: {resp.content[:100]}")

if __name__ == "__main__":
    main()
