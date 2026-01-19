
import requests
import json

MEUSISU_API = "https://meusisu.com/api"

def search_universities():
    print("Fetching ALL courses from MeuSISU...")
    try:
        resp = requests.get(f"{MEUSISU_API}/getAllCourses", timeout=60)
        if resp.status_code == 200:
            all_courses = resp.json()
            print(f"Total courses found: {len(all_courses)}")
            
            print("\n--- Searching for UERN ---")
            uern = [c for c in all_courses if 'UERN' in c.get('university', '').upper() or 'RIO GRANDE DO NORTE' in c.get('university', '').upper()]
            print(f"Matches found: {len(uern)}")
            for c in uern[:5]:
                print(f"ID: {c['id']} | {c['university']} | {c['name']} | {c['campus']}")

            print("\n--- Searching for UFERSA ---")
            ufersa = [c for c in all_courses if 'UFERSA' in c.get('university', '').upper() or 'RURAL DO SEMI' in c.get('university', '').upper()]
            print(f"Matches found: {len(ufersa)}")
            for c in ufersa[:5]:
                print(f"ID: {c['id']} | {c['university']} | {c['name']} | {c['campus']}")
                
            print("\n--- Searching for UFRN Caicó ---")
            ufrn_caico = [c for c in all_courses if ('UFRN' in c.get('university', '').upper() or 'DO RIO GRANDE DO NORTE' in c.get('university', '').upper()) and 'CAIC' in c.get('campus', '').upper()]
            print(f"Matches found: {len(ufrn_caico)}")
            for c in ufrn_caico[:5]:
                print(f"ID: {c['id']} | {c['university']} | {c['name']} | {c['campus']}")
                
        else:
            print(f"Error fetching all courses: {resp.status_code}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    search_universities()
