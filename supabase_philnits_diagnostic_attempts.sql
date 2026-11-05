-- ==============================================================================
-- Migration: PhilNITS Diagnostic Assessment Attempts Table
-- Description: Stores diagnostic assessment attempts segregated by PhilNITS track
--              (IP: IT Passport, FE: Fundamental IT Engineer).
-- ==============================================================================

-- 1. Create the dedicated PhilNITS diagnostic attempts table
CREATE TABLE IF NOT EXISTS public.philnits_diagnostic_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_level TEXT NOT NULL CHECK (exam_level IN ('IP', 'FE')),
    total_questions INTEGER NOT NULL DEFAULT 0,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
    proficiency_level TEXT DEFAULT 'Needs Practice',
    category_scores JSONB DEFAULT '{}'::jsonb,
    answers JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.philnits_diagnostic_attempts ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for authenticated users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'philnits_diagnostic_attempts' 
        AND policyname = 'Users can view their own PhilNITS diagnostic attempts'
    ) THEN
        CREATE POLICY "Users can view their own PhilNITS diagnostic attempts"
            ON public.philnits_diagnostic_attempts
            FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'philnits_diagnostic_attempts' 
        AND policyname = 'Users can insert their own PhilNITS diagnostic attempts'
    ) THEN
        CREATE POLICY "Users can insert their own PhilNITS diagnostic attempts"
            ON public.philnits_diagnostic_attempts
            FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'philnits_diagnostic_attempts' 
        AND policyname = 'Users can update their own PhilNITS diagnostic attempts'
    ) THEN
        CREATE POLICY "Users can update their own PhilNITS diagnostic attempts"
            ON public.philnits_diagnostic_attempts
            FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Clean up any existing duplicate attempts (keeps the newest attempt per user and track)
DELETE FROM public.philnits_diagnostic_attempts
WHERE id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY user_id, exam_level 
                   ORDER BY completed_at DESC, created_at DESC, id
               ) as rnum
        FROM public.philnits_diagnostic_attempts
    ) t
    WHERE t.rnum > 1
);

-- 5. Create unique constraint & performance indexes (strictly 1 attempt per track)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_track_diagnostic
    ON public.philnits_diagnostic_attempts (user_id, exam_level);

CREATE INDEX IF NOT EXISTS idx_philnits_diag_user_exam 
    ON public.philnits_diagnostic_attempts (user_id, exam_level);

CREATE INDEX IF NOT EXISTS idx_philnits_diag_completed_at 
    ON public.philnits_diagnostic_attempts (completed_at DESC);

-- 6. Backwards-compatibility for existing diagnostic_assessment_attempts table
ALTER TABLE IF EXISTS public.diagnostic_assessment_attempts
    ADD COLUMN IF NOT EXISTS exam_level TEXT;

COMMENT ON TABLE public.philnits_diagnostic_attempts IS 'Stores PhilNITS IP and FE diagnostic assessment scores and category performance.';

