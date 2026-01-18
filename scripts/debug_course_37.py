
import sys
import requests
from src.decoder import decode_course

def debug_course(code):
    print(f"Fetching data for course {code}...")
    url = f"https://meusisu.com/api/getCourseData?courseCode={code}"
    response = requests.get(url)
    
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        return

    print(f"Data size: {len(response.content)} bytes")
    
    try:
        course = decode_course(response.content)
        print(f"\nCourse: {course.course_name} - {course.university}")
        
        latest_year = course.get_latest_year()
        if latest_year:
            print(f"Latest Year: {latest_year.year}")
            print("Weights found:", latest_year.weights)
            print("Modalities found:", len(latest_year.modalities))
            
            # Print raw inspection if empty
            if not latest_year.weights:
                print("\n[DEBUG] Weights dict is empty. Was there any weight-like data in protobuf?")
        else:
            print("No year data found.")
            
    except Exception as e:
        print(f"Error decoding: {e}")

if __name__ == "__main__":
    sys.path.insert(0, ".") # Ensure src is in path
    debug_course(37)
