
import requests
import json
from urllib.parse import quote

def search(query):
    url = f"https://meusisu.com/api/search?q={quote(query)}"
    try:
        print(f"Searching for: {query}")
        resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
        print(f"Status: {resp.status_code}")
        print(f"Content: {resp.text[:500]}")
    except Exception as e:
        print(e)

if __name__ == "__main__":
    search("UNIR")
    search("Rondônia")
