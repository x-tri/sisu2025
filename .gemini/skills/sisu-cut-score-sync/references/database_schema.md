# Supabase Database Schema

## Table: cut_scores

Primary table for storing cut score data.

```sql
CREATE TABLE cut_scores (
  id SERIAL PRIMARY KEY,
  course_id INTEGER REFERENCES courses(id),
  year INTEGER NOT NULL,
  modality_code INTEGER,
  modality_name TEXT,
  cut_score NUMERIC,
  applicants INTEGER,
  vacancies INTEGER,
  partial_scores JSONB DEFAULT '[]',
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(course_id, year, modality_code)
);
```

## Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `course_id` | INTEGER | FK to courses table |
| `year` | INTEGER | SISU year (2024, 2025, 2026) |
| `modality_code` | INTEGER | Quota code (41=Ampla, etc.) |
| `modality_name` | TEXT | Full modality name |
| `cut_score` | NUMERIC | Final cut score (null if not released) |
| `partial_scores` | JSONB | Array of daily scores |

## partial_scores Format

```json
[
  {"day": "1", "score": 745.23},
  {"day": "2", "score": 748.50},
  {"day": "3", "score": 750.10}
]
```

## Upsert Strategy

Uses `Prefer: resolution=merge-duplicates` header to upsert on unique constraint (course_id, year, modality_code).

## Queries

### Count records by year
```sql
SELECT year, COUNT(*) FROM cut_scores GROUP BY year ORDER BY year;
```

### Check for real data
```sql
SELECT COUNT(*) FROM cut_scores 
WHERE year = 2026 AND cut_score IS NOT NULL;
```

### Check partial scores
```sql
SELECT COUNT(*) FROM cut_scores 
WHERE year = 2026 AND jsonb_array_length(partial_scores) > 0;
```
