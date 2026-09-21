-- Aligns the versioned schema with what production already has.
-- Both statements are no-ops on the live database; they exist so a database
-- rebuilt from migrations works with the sync scripts and the frontend.

-- Daily partial cut-offs published during the SISU enrolment window
ALTER TABLE cut_scores ADD COLUMN IF NOT EXISTS partial_scores JSONB DEFAULT '[]'::jsonb;

-- One row per (course, year, modality). The sync scripts upsert against this
-- key via `?on_conflict=course_id,year,modality_code`.
CREATE UNIQUE INDEX IF NOT EXISTS cut_scores_course_year_modality_idx
    ON cut_scores (course_id, year, modality_code);
