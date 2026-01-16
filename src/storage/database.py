"""
Database Storage
PostgreSQL/Supabase database operations for SISU data
"""
import os
import logging
from typing import Optional
from contextlib import contextmanager
from dataclasses import dataclass

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False

logger = logging.getLogger(__name__)

# Default connection string (local Supabase)
DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


@dataclass
class CourseRecord:
    """Database course record"""
    id: int
    code: int
    name: str
    university: Optional[str] = None
    campus: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    degree: Optional[str] = None
    schedule: Optional[str] = None


class DatabaseStorage:
    """PostgreSQL database storage for SISU data"""

    def __init__(self, database_url: Optional[str] = None):
        if not HAS_PSYCOPG2:
            raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")

        self.database_url = database_url or os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)
        self._conn = None

    @contextmanager
    def connection(self):
        """Context manager for database connection"""
        conn = psycopg2.connect(self.database_url)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @contextmanager
    def cursor(self, dict_cursor: bool = True):
        """Context manager for database cursor"""
        with self.connection() as conn:
            cursor_factory = RealDictCursor if dict_cursor else None
            cur = conn.cursor(cursor_factory=cursor_factory)
            try:
                yield cur
            finally:
                cur.close()

    def upsert_course(self, course_data: dict) -> int:
        """Insert or update a course, return course id"""
        with self.cursor() as cur:
            cur.execute("""
                INSERT INTO courses (code, name, university, campus, city, state, degree, schedule, latitude, longitude)
                VALUES (%(code)s, %(name)s, %(university)s, %(campus)s, %(city)s, %(state)s, %(degree)s, %(schedule)s, %(latitude)s, %(longitude)s)
                ON CONFLICT (code) DO UPDATE SET
                    name = EXCLUDED.name,
                    university = EXCLUDED.university,
                    campus = EXCLUDED.campus,
                    city = EXCLUDED.city,
                    state = EXCLUDED.state,
                    degree = EXCLUDED.degree,
                    schedule = EXCLUDED.schedule,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude
                RETURNING id
            """, course_data)
            return cur.fetchone()['id']

    def upsert_weights(self, course_id: int, year: int, weights: dict, minimums: dict) -> int:
        """Insert or update course weights for a year"""
        data = {
            'course_id': course_id,
            'year': year,
            'peso_red': weights.get('pesoRed'),
            'peso_ling': weights.get('pesoLing'),
            'peso_mat': weights.get('pesoMat'),
            'peso_ch': weights.get('pesoCh'),
            'peso_cn': weights.get('pesoCn'),
            'min_red': minimums.get('minRed'),
            'min_ling': minimums.get('minLing'),
            'min_mat': minimums.get('minMat'),
            'min_ch': minimums.get('minCh'),
            'min_cn': minimums.get('minCn'),
            'min_enem': minimums.get('minEnem'),
        }

        with self.cursor() as cur:
            cur.execute("""
                INSERT INTO course_weights (course_id, year, peso_red, peso_ling, peso_mat, peso_ch, peso_cn,
                                           min_red, min_ling, min_mat, min_ch, min_cn, min_enem)
                VALUES (%(course_id)s, %(year)s, %(peso_red)s, %(peso_ling)s, %(peso_mat)s, %(peso_ch)s, %(peso_cn)s,
                        %(min_red)s, %(min_ling)s, %(min_mat)s, %(min_ch)s, %(min_cn)s, %(min_enem)s)
                ON CONFLICT (course_id, year) DO UPDATE SET
                    peso_red = EXCLUDED.peso_red,
                    peso_ling = EXCLUDED.peso_ling,
                    peso_mat = EXCLUDED.peso_mat,
                    peso_ch = EXCLUDED.peso_ch,
                    peso_cn = EXCLUDED.peso_cn,
                    min_red = EXCLUDED.min_red,
                    min_ling = EXCLUDED.min_ling,
                    min_mat = EXCLUDED.min_mat,
                    min_ch = EXCLUDED.min_ch,
                    min_cn = EXCLUDED.min_cn,
                    min_enem = EXCLUDED.min_enem
                RETURNING id
            """, data)
            return cur.fetchone()['id']

    def insert_cut_score(self, course_id: int, year: int, modality: dict) -> int:
        """Insert a cut score record"""
        data = {
            'course_id': course_id,
            'year': year,
            'modality_code': modality.get('code'),
            'modality_name': modality.get('name'),
            'cut_score': modality.get('cut_score'),
            'applicants': modality.get('applicants'),
            'vacancies': modality.get('vacancies'),
        }

        with self.cursor() as cur:
            cur.execute("""
                INSERT INTO cut_scores (course_id, year, modality_code, modality_name, cut_score, applicants, vacancies)
                VALUES (%(course_id)s, %(year)s, %(modality_code)s, %(modality_name)s, %(cut_score)s, %(applicants)s, %(vacancies)s)
                RETURNING id
            """, data)
            return cur.fetchone()['id']

    def save_course_data(self, course_code: int, data: dict) -> int:
        """Save complete course data from JSON to database"""
        # Prepare course record
        course_data = {
            'code': course_code,
            'name': data.get('course_name', ''),
            'university': data.get('university'),
            'campus': data.get('campus'),
            'city': data.get('city'),
            'state': data.get('state'),
            'degree': data.get('degree'),
            'schedule': data.get('schedule'),
            'latitude': data.get('latitude'),
            'longitude': data.get('longitude'),
        }

        course_id = self.upsert_course(course_data)
        logger.info(f"Saved course {course_code} -> id {course_id}")

        # Save weights and cut scores for each year
        for year_data in data.get('years', []):
            year = year_data.get('year')
            if not year:
                continue

            # Save weights
            weights = year_data.get('weights', {})
            minimums = year_data.get('minimums', {})
            if weights or minimums:
                self.upsert_weights(course_id, year, weights, minimums)

            # Save cut scores
            for modality in year_data.get('modalities', []):
                self.insert_cut_score(course_id, year, modality)

        return course_id

    def get_course_by_code(self, code: int) -> Optional[dict]:
        """Get course by SISU code"""
        with self.cursor() as cur:
            cur.execute("SELECT * FROM courses WHERE code = %s", (code,))
            return cur.fetchone()

    def get_latest_cut_scores(self, course_id: int, year: int) -> list[dict]:
        """Get latest cut scores for a course/year"""
        with self.cursor() as cur:
            cur.execute("""
                SELECT DISTINCT ON (modality_code)
                    modality_code, modality_name, cut_score, applicants, vacancies, captured_at
                FROM cut_scores
                WHERE course_id = %s AND year = %s
                ORDER BY modality_code, captured_at DESC
            """, (course_id, year))
            return cur.fetchall()

    def search_courses(self, query: str, limit: int = 20) -> list[dict]:
        """Search courses by name, university, or city"""
        with self.cursor() as cur:
            cur.execute("""
                SELECT * FROM courses
                WHERE name ILIKE %s
                   OR university ILIKE %s
                   OR city ILIKE %s
                ORDER BY name
                LIMIT %s
            """, (f"%{query}%", f"%{query}%", f"%{query}%", limit))
            return cur.fetchall()

    def get_courses_by_state(self, state: str) -> list[dict]:
        """Get all courses in a state"""
        with self.cursor() as cur:
            cur.execute("""
                SELECT * FROM courses
                WHERE state = %s
                ORDER BY university, name
            """, (state.upper(),))
            return cur.fetchall()

    def test_connection(self) -> bool:
        """Test database connection"""
        try:
            with self.cursor() as cur:
                cur.execute("SELECT 1")
                return True
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return False
