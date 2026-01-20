
import sys
import os
import requests
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from src.decoder import decode_course
from src.decoder.course import _extract_modality # helpers
# Need parse_message
from src.decoder.protobuf import parse_message

def get_state_from_page(index):
    url = f"https://meusisu.com/api/searchMainPage?estado={index}&pag=0"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code != 200 or not resp.content:
            return None
        
        # Extract first course ID
        msg = parse_message(resp.content)
        # Search for course code in structure... logic from extract_course_codes
        code = None
        if 2 in msg:
             for item_type, item_value in msg[2]:
                if item_type == 'message' and isinstance(item_value, dict):
                    if 8 in item_value:
                        for vtype, vval in item_value[8]:
                            if vtype == 'varint':
                                code = vval
                                break
                    if code: break
        
        if not code: return "Empty"

        # Now fetch course data to see state
        c_url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
        c_resp = requests.get(c_url, timeout=5)
        if c_resp.status_code == 200:
            course = decode_course(c_resp.content)
            return course.state
        return "ErrorFetch"
    except Exception as e:
        return f"Error: {e}"

def main():
    print("Mapping State Indices (Extended)...")
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(get_state_from_page, i): i for i in range(1, 60)}
        for f in futures:
            idx = futures[f]
            res = f.result()
            print(f"Index {idx}: {res}")

if __name__ == "__main__":
    main()
