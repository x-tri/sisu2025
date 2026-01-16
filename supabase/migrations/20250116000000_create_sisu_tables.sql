-- SISU 2025 Database Schema
-- Run this migration to create the necessary tables for SISU monitoring

-- 1. Tabela courses - informações básicas dos cursos
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

COMMENT ON TABLE courses IS 'Cursos disponíveis no SISU';
COMMENT ON COLUMN courses.code IS 'Código único do curso no SISU (usado na URL meusisu.com/curso/{code})';

-- 2. Tabela course_weights - pesos e notas mínimas por ano
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

COMMENT ON TABLE course_weights IS 'Pesos e notas mínimas de cada componente do ENEM por curso/ano';

-- 3. Tabela cut_scores - notas de corte capturadas
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

COMMENT ON TABLE cut_scores IS 'Histórico de notas de corte por modalidade';

-- 4. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_courses_university ON courses(university);
CREATE INDEX IF NOT EXISTS idx_courses_state ON courses(state);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_cut_scores_course_year ON cut_scores(course_id, year);
CREATE INDEX IF NOT EXISTS idx_cut_scores_modality ON cut_scores(modality_code);
CREATE INDEX IF NOT EXISTS idx_cut_scores_captured ON cut_scores(captured_at);
CREATE INDEX IF NOT EXISTS idx_course_weights_course_year ON course_weights(course_id, year);

-- 5. Habilitar RLS (Row Level Security)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE cut_scores ENABLE ROW LEVEL SECURITY;

-- 6. Criar policies de leitura pública
DROP POLICY IF EXISTS "Public read courses" ON courses;
CREATE POLICY "Public read courses" ON courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read course_weights" ON course_weights;
CREATE POLICY "Public read course_weights" ON course_weights FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read cut_scores" ON cut_scores;
CREATE POLICY "Public read cut_scores" ON cut_scores FOR SELECT USING (true);

-- 7. Policies de escrita apenas para service_role
DROP POLICY IF EXISTS "Service write courses" ON courses;
CREATE POLICY "Service write courses" ON courses
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write course_weights" ON course_weights;
CREATE POLICY "Service write course_weights" ON course_weights
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service write cut_scores" ON cut_scores;
CREATE POLICY "Service write cut_scores" ON cut_scores
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
