#!/usr/bin/env python3
"""
Database Setup Script
Creates SISU tables in PostgreSQL/Supabase

Usage:
    python scripts/setup_database.py
    DATABASE_URL=postgresql://... python scripts/setup_database.py
"""
import os
import sys
from pathlib import Path

try:
    import psycopg2
except ImportError:
    print("Installing psycopg2-binary...")
    os.system(f"{sys.executable} -m pip install psycopg2-binary")
    import psycopg2

# Default to local Supabase
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
)


def get_migration_sql() -> str:
    """Load SQL from migration file or use embedded SQL"""
    migration_path = Path(__file__).parent.parent / "supabase/migrations/20250116000000_create_sisu_tables.sql"

    if migration_path.exists():
        return migration_path.read_text()

    # Fallback embedded SQL
    return """
    CREATE TABLE IF NOT EXISTS courses (
        id SERIAL PRIMARY KEY,
        code INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        university TEXT,
        campus TEXT,
        city TEXT,
        state VARCHAR(2),
        degree TEXT,
        schedule TEXT,
        latitude TEXT,
        longitude TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS course_weights (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        peso_red NUMERIC(4,2),
        peso_ling NUMERIC(4,2),
        peso_mat NUMERIC(4,2),
        peso_ch NUMERIC(4,2),
        peso_cn NUMERIC(4,2),
        min_red NUMERIC(6,2),
        min_ling NUMERIC(6,2),
        min_mat NUMERIC(6,2),
        min_ch NUMERIC(6,2),
        min_cn NUMERIC(6,2),
        min_enem NUMERIC(6,2),
        UNIQUE(course_id, year)
    );

    CREATE TABLE IF NOT EXISTS cut_scores (
        id SERIAL PRIMARY KEY,
        course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        modality_code INTEGER,
        modality_name TEXT NOT NULL,
        cut_score NUMERIC(8,2),
        applicants INTEGER,
        vacancies INTEGER,
        captured_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
    CREATE INDEX IF NOT EXISTS idx_courses_university ON courses(university);
    CREATE INDEX IF NOT EXISTS idx_courses_state ON courses(state);
    CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
    CREATE INDEX IF NOT EXISTS idx_cut_scores_course_year ON cut_scores(course_id, year);
    CREATE INDEX IF NOT EXISTS idx_cut_scores_modality ON cut_scores(modality_code);
    CREATE INDEX IF NOT EXISTS idx_course_weights_course_year ON course_weights(course_id, year);

    ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE course_weights ENABLE ROW LEVEL SECURITY;
    ALTER TABLE cut_scores ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Public read courses" ON courses;
    CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read course_weights" ON course_weights;
    CREATE POLICY "Public read course_weights" ON course_weights FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read cut_scores" ON cut_scores;
    CREATE POLICY "Public read cut_scores" ON cut_scores FOR SELECT USING (true);
    """


def main():
    print(f"Connecting to: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cur = conn.cursor()

        print("Running migration...")
        sql = get_migration_sql()
        cur.execute(sql)

        # Verify tables
        cur.execute("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('courses', 'course_weights', 'cut_scores')
            ORDER BY table_name;
        """)
        tables = [t[0] for t in cur.fetchall()]
        print(f"\nTables created: {tables}")

        # Count indexes
        cur.execute("""
            SELECT COUNT(*) FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN ('courses', 'course_weights', 'cut_scores');
        """)
        idx_count = cur.fetchone()[0]
        print(f"Indexes created: {idx_count}")

        # Count policies
        cur.execute("""
            SELECT COUNT(*) FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename IN ('courses', 'course_weights', 'cut_scores');
        """)
        policy_count = cur.fetchone()[0]
        print(f"RLS policies created: {policy_count}")

        cur.close()
        conn.close()

        print("\n✅ Database setup complete!")
        return 0

    except psycopg2.OperationalError as e:
        print(f"\n❌ Connection failed: {e}")
        print("\nMake sure:")
        print("  1. Docker is running")
        print("  2. Supabase is started: supabase start")
        print("  3. Or set DATABASE_URL to a valid PostgreSQL connection")
        return 1


if __name__ == "__main__":
    sys.exit(main())
