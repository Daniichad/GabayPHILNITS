-- ==============================================================================
-- GABAY PHILNITS: ADD IMAGE & MOCK-EXAM COLUMNS TO DIAGNOSTIC TABLES
-- ==============================================================================
-- This script adds the image columns (`image_url`, `image_description`, `reference_image_url`)
-- and mock-exam compatibility columns across all diagnostic tables:
--
-- 1. `diagnostic_questions` (Legacy / Existing table from diagnostic_questions_rows.csv)
-- 2. `Philnits_IP_diagnostic_exam` (Dedicated PhilNITS IP Diagnostic Table)
-- 3. `Philnits_FE_diagnostic_exam` (Dedicated PhilNITS FE Diagnostic Table)
-- 4. `Philnits_diagnostic_exam` (Unified PhilNITS Diagnostic Table)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ALTER TABLE: diagnostic_questions (From diagnostic_questions_rows.csv)
-- ------------------------------------------------------------------------------
-- Ensures table exists:
CREATE TABLE IF NOT EXISTS public.diagnostic_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer TEXT NOT NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add Image & Mock Exam Schema Columns:
ALTER TABLE public.diagnostic_questions
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_description TEXT,
    ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
    ADD COLUMN IF NOT EXISTS question_number INT,
    ADD COLUMN IF NOT EXISTS question_text TEXT,
    ADD COLUMN IF NOT EXISTS option_a TEXT,
    ADD COLUMN IF NOT EXISTS option_b TEXT,
    ADD COLUMN IF NOT EXISTS option_c TEXT,
    ADD COLUMN IF NOT EXISTS option_d TEXT,
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS subtopic TEXT,
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium',
    ADD COLUMN IF NOT EXISTS exam_level TEXT DEFAULT 'ip';

-- If exam_type exists (from diagnostic_questions_rows.csv), ensure backward compatibility
ALTER TABLE public.diagnostic_questions
    ADD COLUMN IF NOT EXISTS exam_type TEXT DEFAULT 'both';

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_diag_questions_img 
    ON public.diagnostic_questions (category, is_active);

-- Enable RLS & Read Policy
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'diagnostic_questions' 
        AND policyname = 'Allow public read active diagnostic_questions'
    ) THEN
        CREATE POLICY "Allow public read active diagnostic_questions" 
            ON public.diagnostic_questions FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. ALTER TABLE: Philnits_IP_diagnostic_exam
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_IP_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public."Philnits_IP_diagnostic_exam"
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_description TEXT,
    ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS subtopic TEXT,
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_ip_diag_cat_img 
    ON public."Philnits_IP_diagnostic_exam" (category, is_active);

ALTER TABLE public."Philnits_IP_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_IP_diagnostic_exam' 
        AND policyname = 'Allow active IP diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active IP diagnostic questions read" 
            ON public."Philnits_IP_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. ALTER TABLE: Philnits_FE_diagnostic_exam
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_FE_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public."Philnits_FE_diagnostic_exam"
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_description TEXT,
    ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS subtopic TEXT,
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_fe_diag_cat_img 
    ON public."Philnits_FE_diagnostic_exam" (category, is_active);

ALTER TABLE public."Philnits_FE_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_FE_diagnostic_exam' 
        AND policyname = 'Allow active FE diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active FE diagnostic questions read" 
            ON public."Philnits_FE_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 4. ALTER TABLE: Philnits_diagnostic_exam (Unified table)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_level TEXT NOT NULL CHECK (exam_level IN ('ip', 'fe')),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public."Philnits_diagnostic_exam"
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS image_description TEXT,
    ADD COLUMN IF NOT EXISTS reference_image_url TEXT,
    ADD COLUMN IF NOT EXISTS topic TEXT,
    ADD COLUMN IF NOT EXISTS subtopic TEXT,
    ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'medium';

CREATE INDEX IF NOT EXISTS idx_unified_diag_lvl_cat_img 
    ON public."Philnits_diagnostic_exam" (exam_level, category, is_active);

ALTER TABLE public."Philnits_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_diagnostic_exam' 
        AND policyname = 'Allow active unified diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active unified diagnostic questions read" 
            ON public."Philnits_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;

