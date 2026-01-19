
import requests

MEUSISU_API = "https://meusisu.com/api"

def debug_api():
    print("Fetching courses for RN (Rio Grande do Norte)...")
    try:
        resp = requests.get(f"{MEUSISU_API}/getCoursesByState?state=RN", timeout=30)
        print(f"Status: {resp.status_code}")
        print(f"Headers: {resp.headers}")
        print(f"Content (first 500 chars): {resp.text[:500]}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    debug_api()
