#!/usr/bin/env python3
"""
Convert state names to abbreviations (siglas) in the database
"""
import os
import requests

SUPABASE_URL = "https://sisymqzxvuktdcbsbpbp.supabase.co"
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

# Mapping from full state names to abbreviations
STATE_MAPPING = {
    # Existing (names)
    'Acre': 'AC',
    'Alagoas': 'AL',
    'Amapá': 'AP',
    'Amazonas': 'AM',
    'Bahia': 'BA',
    # New ones (if they exist with full names)
    'Ceará': 'CE',
    'Distrito Federal': 'DF',
    'Espírito Santo': 'ES',
    'Goiás': 'GO',
    'Maranhão': 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    'Pará': 'PA',
    'Paraíba': 'PB',
    'Paraná': 'PR',
    'Pernambuco': 'PE',
    'Piauí': 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    'Rondônia': 'RO',
    'Roraima': 'RR',
    'Santa Catarina': 'SC',
    'São Paulo': 'SP',
    'Sergipe': 'SE',
    'Tocantins': 'TO',
}

def convert_states():
    """Convert all state names to abbreviations"""
    print("=" * 70)
    print("Converting State Names to Abbreviations")
    print("=" * 70)
    
    total_updated = 0
    
    for full_name, abbr in STATE_MAPPING.items():
        print(f"\n🔄 Converting '{full_name}' → '{abbr}'...")
        
        # Get courses with this state name
        resp = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=id,code,name&state=eq.{full_name}&limit=1000",
            headers=HEADERS
        )
        
        if resp.status_code != 200:
            print(f"   ❌ Error fetching: {resp.status_code}")
            continue
        
        courses = resp.json()
        
        if not courses:
            print(f"   ↪️  No courses found")
            continue
        
        print(f"   Found {len(courses)} courses")
        
        # Update all courses with this state
        update_payload = {"state": abbr}
        
        resp = requests.patch(
            f"{SUPABASE_URL}/rest/v1/courses?state=eq.{full_name}",
            headers=HEADERS,
            json=update_payload
        )
        
        if resp.status_code in [200, 204]:
            print(f"   ✅ Updated {len(courses)} courses")
            total_updated += len(courses)
        else:
            print(f"   ❌ Update failed: {resp.status_code} - {resp.text}")
    
    print(f"\n{'='*70}")
    print(f"✅ Total courses updated: {total_updated}")
    print(f"{'='*70}")
    
    # Verify final state
    resp = requests.get(
        f"{SUPABASE_URL}/rest/v1/courses?select=state&state=not.is.null",
        headers=HEADERS
    )
    states = sorted(set(c['state'] for c in resp.json() if c.get('state')))
    print(f"\n📊 Estados únicos no banco agora: {len(states)}")
    for state in states:
        # Count courses per state
        resp_count = requests.get(
            f"{SUPABASE_URL}/rest/v1/courses?select=id&state=eq.{state}&limit=1",
            headers={**HEADERS, "Prefer": "count=exact"}
        )
        count = resp_count.headers.get('content-range', '0-0/0').split('/')[1]
        print(f"   {state}: {count} cursos")

if __name__ == "__main__":
    convert_states()
