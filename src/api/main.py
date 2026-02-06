"""
XTRI SISU 2026 - FastAPI Backend
API para servir dados do SISU
"""
import math
import numpy as np
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.storage.supabase_client import SupabaseClient


# Custom JSON Response to handle NaN values
class SafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        cleaned_content = clean_nan_values(content)
        return super().render(cleaned_content)


def clean_nan_values(obj):
    """Recursively clean NaN and Infinity values"""
    if isinstance(obj, dict):
        return {k: clean_nan_values(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nan_values(item) for item in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.floating):
        if np.isnan(obj) or np.isinf(obj):
            return None
        return float(obj)
    return obj


# Create FastAPI app
app = FastAPI(
    title="XTRI SISU 2026 API",
    description="API para consulta de dados do SISU 2026",
    version="1.0.0",
    default_response_class=SafeJSONResponse
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
try:
    supabase = SupabaseClient()
except ValueError as e:
    print(f"Warning: {e}")
    supabase = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    if supabase and supabase.test_connection():
        return {"status": "healthy", "database": "connected"}
    return {"status": "healthy", "database": "not configured"}


@app.get("/api/courses")
async def get_courses(
    q: Optional[str] = Query(None, description="Search query (name, university, city)"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    id: Optional[int] = Query(None, description="Get course by ID"),
    code: Optional[int] = Query(None, description="Get course by SISU code")
):
    """Get courses list or search by query"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        if id:
            # Get full course details by ID
            course = supabase._get("courses", params={"id": f"eq.{id}"})
            if not course:
                raise HTTPException(status_code=404, detail="Course not found")
            
            course_id = course[0]["id"]
            
            # Get weights and cut scores
            weights = supabase._get("course_weights", params={"course_id": f"eq.{course_id}"})
            cut_scores = supabase._get(
                "cut_scores", 
                params={"course_id": f"eq.{course_id}", "order": "captured_at.desc"}
            )
            
            # Get latest cut scores per modality
            latest_scores = {}
            for score in cut_scores:
                key = f"{score.get('year')}-{score.get('modality_code')}"
                if key not in latest_scores:
                    latest_scores[key] = score
            
            return {
                **course[0],
                "weights": weights,
                "cut_scores": list(latest_scores.values())
            }
        
        if code:
            # Get full course details by code
            course = supabase.get_course_by_code(code)
            if not course:
                raise HTTPException(status_code=404, detail="Course not found")
            
            course_id = course["id"]
            
            # Get weights and cut scores
            weights = supabase._get("course_weights", params={"course_id": f"eq.{course_id}"})
            cut_scores = supabase._get(
                "cut_scores", 
                params={"course_id": f"eq.{course_id}", "order": "captured_at.desc"}
            )
            
            # Get latest cut scores per modality
            latest_scores = {}
            for score in cut_scores:
                key = f"{score.get('year')}-{score.get('modality_code')}"
                if key not in latest_scores:
                    latest_scores[key] = score
            
            return {
                **course,
                "weights": weights,
                "cut_scores": list(latest_scores.values())
            }
        
        if q and len(q) >= 2:
            # Search mode
            results = supabase.search_courses(q, limit)
            return {
                "courses": results,
                "query": q,
                "count": len(results)
            }
        else:
            # List mode - get courses with pagination
            results = supabase._get(
                "courses",
                params={
                    "order": "name",
                    "limit": limit,
                    "offset": offset
                }
            )
            return {
                "courses": results,
                "count": len(results),
                "limit": limit,
                "offset": offset
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/courses/{code}")
async def get_course_by_code(code: int):
    """Get course by SISU code with cut scores"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        course = supabase.get_course_by_code(code)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        # Get cut scores and weights for this course
        course_id = course.get("id")
        cut_scores = []
        weights = None
        
        if course_id:
            # Get cut scores for years 2024, 2025, 2026
            for year in [2024, 2025, 2026]:
                year_scores = supabase.get_latest_cut_scores(course_id, year)
                if year_scores:
                    cut_scores.append({
                        "year": year,
                        "modalities": year_scores
                    })
            
            # Get weights for 2026 (or latest available)
            for year in [2026, 2025, 2024]:
                weights_data = supabase.get_weights(course_id, year)
                if weights_data:
                    # Transform to frontend expected format
                    weights = {
                        "pesos": {
                            "redacao": weights_data.get("peso_red", 1),
                            "linguagens": weights_data.get("peso_ling", 1),
                            "matematica": weights_data.get("peso_mat", 1),
                            "humanas": weights_data.get("peso_ch", 1),
                            "natureza": weights_data.get("peso_cn", 1)
                        },
                        "notas_minimas": {
                            "redacao": weights_data.get("min_red", 0),
                            "linguagens": weights_data.get("min_ling", 0),
                            "matematica": weights_data.get("min_mat", 0),
                            "humanas": weights_data.get("min_ch", 0),
                            "natureza": weights_data.get("min_cn", 0)
                        },
                        "year": year
                    }
                    break
        
        return {
            "course": course,
            "cut_scores": cut_scores,
            "weights": weights
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/courses/{code}/students")
async def get_course_students(
    code: int,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    year: Optional[int] = None
):
    """Get approved students for a course"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Get course first
        course = supabase.get_course_by_code(code)
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
        
        course_id = course["id"]
        offset = (page - 1) * limit
        
        # If no year specified, find the latest year with data
        if not year:
            latest_year_result = supabase._get(
                "approved_students",
                params={
                    "course_id": f"eq.{course_id}",
                    "select": "year",
                    "order": "year.desc",
                    "limit": 1
                }
            )
            if latest_year_result:
                year = latest_year_result[0].get("year")
        
        params = {
            "course_id": f"eq.{course_id}",
            "order": "rank.asc",
            "limit": limit,
            "offset": offset
        }
        
        if year:
            params["year"] = f"eq.{year}"
        
        students = supabase._get("approved_students", params=params)
        
        return {
            "students": students,
            "course": course,
            "year": year,
            "page": page,
            "limit": limit,
            "count": len(students)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/filters")
async def get_filters(
    state: Optional[str] = Query(None, description="Filter cities by state"),
    city: Optional[str] = Query(None, description="Filter universities by city"),
    university: Optional[str] = Query(None, description="Filter courses by university")
):
    """Get available filter options"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Get all courses to extract unique values (with pagination, max 100 per request)
        all_courses = []
        offset = 0
        batch_size = 100
        max_courses = 20000  # Safety limit
        
        while len(all_courses) < max_courses:
            batch = supabase._get(
                "courses",
                params={
                    "select": "id,code,name,state,city,university,degree,schedule",
                    "limit": batch_size,
                    "offset": offset,
                    "order": "id"
                }
            )
            if not batch:
                break
            all_courses.extend(batch)
            if len(batch) < batch_size:
                break
            offset += batch_size
        
        # Extract unique states (always return all)
        unique_states = sorted(list(set([c.get("state") for c in all_courses if c.get("state")])))
        
        # If university is provided, return courses for that university
        if university and city and state:
            # Get courses for the selected university, city and state
            university_courses = [
                {
                    "id": c.get("id"),
                    "code": c.get("code"),
                    "name": c.get("name"),
                    "degree": c.get("degree"),
                    "schedule": c.get("schedule")
                }
                for c in all_courses 
                if c.get("university", "").upper() == university.upper() and c.get("city", "").upper() == city.upper() and c.get("state", "").upper() == state.upper()
            ]
            return {
                "states": unique_states,
                "cities": [city],
                "universities": [university],
                "courses": university_courses
            }
        
        # If city is provided, filter universities by state and city
        if city and state:
            # Get universities for the selected state and city
            city_universities = sorted(list(set([
                c.get("university") for c in all_courses 
                if c.get("university") and c.get("city", "").upper() == city.upper() and c.get("state", "").upper() == state.upper()
            ])))
            return {
                "states": unique_states,
                "cities": [city],
                "universities": city_universities,
                "courses": []
            }
        
        # If state is provided, filter cities by that state
        if state:
            # Get cities only for the selected state
            state_cities = sorted(list(set([
                c.get("city") for c in all_courses 
                if c.get("city") and c.get("state", "").upper() == state.upper()
            ])))
            return {
                "states": unique_states,
                "cities": state_cities,
                "universities": [],
                "courses": []
            }
        
        # Return all cities with state suffix for initial load
        unique_cities = sorted(list(set([
            f"{c.get('city')}-{c.get('state')}" for c in all_courses 
            if c.get("city") and c.get("state")
        ])))
        unique_universities = sorted(list(set([c.get("university") for c in all_courses if c.get("university")])))
        
        return {
            "states": unique_states,
            "cities": unique_cities,
            "universities": unique_universities,
            "courses": []
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/simulate")
async def simulate_score(data: Dict[str, Any]):
    """Simulate SISU score based on course weights"""
    # This is a placeholder - implement based on your simulation logic
    return {"message": "Simulation endpoint", "received": data}


@app.get("/api/simulate/radar")
async def get_simulation_radar(
    course_id: int,
    red: float = Query(..., ge=0, le=1000),
    ling: float = Query(..., ge=0, le=1000),
    mat: float = Query(..., ge=0, le=1000),
    ch: float = Query(..., ge=0, le=1000),
    cn: float = Query(..., ge=0, le=1000)
):
    """Get radar chart data for simulation"""
    if not supabase:
        raise HTTPException(status_code=503, detail="Database not configured")
    
    try:
        # Get course weights
        weights = supabase.get_weights(course_id, 2026) or {}
        
        # Calculate weighted scores
        scores = {
            "red": red * (weights.get("peso_red") or 1),
            "ling": ling * (weights.get("peso_ling") or 1),
            "mat": mat * (weights.get("peso_mat") or 1),
            "ch": ch * (weights.get("peso_ch") or 1),
            "cn": cn * (weights.get("peso_cn") or 1)
        }
        
        return {
            "scores": scores,
            "weights": weights,
            "raw_scores": {"red": red, "ling": ling, "mat": mat, "ch": ch, "cn": cn}
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
