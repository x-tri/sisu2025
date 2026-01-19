
import requests
import json

MEUSISU_API = "https://meusisu.com/api"

def check_rn_universities():
    print("Fetching courses for RN (Rio Grande do Norte)...")
    try:
        # Get courses by state RN
        resp = requests.get(f"{MEUSISU_API}/getCoursesByState?state=RN", timeout=30)
        if resp.status_code == 200:
            courses = resp.json()
            print(f"Found {len(courses)} courses in RN.")
            
            # Extract unique university names
            universities = set()
            for c in courses:
                universities.add(c.get('university'))
            
            print("\nUniversities found in RN:")
            for u in sorted(universities):
                print(f" - {u}")
                
            # Check for UERN and UFERSA specifically
            uern = [u for u in universities if 'UERN' in u.upper() or 'ESTADUAL DO RIO GRANDE DO NORTE' in u.upper()]
            ufersa = [u for u in universities if 'UFERSA' in u.upper() or 'RURAL DO SEMI' in u.upper()]
            
            print("\nPotential UERN matches:", uern)
            print("Potential UFERSA matches:", ufersa)
            
        else:
            print(f"Error fetching RN courses: {resp.status_code}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    check_rn_universities()
