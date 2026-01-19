
import requests

MEUSISU_API = "https://meusisu.com/api"

def probe_endpoints():
    endpoints = [
        "/getStates",
        "/getAllCourses",
        "/getUniversities",
        "/getCourses",
        "/search"
    ]
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    for ep in endpoints:
        print(f"--- Probing {ep} ---")
        try:
            resp = requests.get(f"{MEUSISU_API}{ep}", headers=headers, timeout=10)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                try:
                    data = resp.json()
                    print(f"Type: {type(data)}")
                    if isinstance(data, list):
                        print(f"Length: {len(data)}")
                        if len(data) > 0:
                            print(f"Sample: {data[0]}")
                    elif isinstance(data, dict):
                         print(f"Keys: {data.keys()}")
                except:
                    print(f"Content (not JSON): {resp.text[:100]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    probe_endpoints()
