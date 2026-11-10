-- ==============================================================================
-- Fix user_reading_progress NOT NULL constraint & set safe column defaults
-- ==============================================================================

-- 1. Ensure existing rows have valid numbers instead of nulls
UPDATE public.user_reading_progress
SET current_chapter_number = 1
WHERE current_chapter_number IS NULL;

-- 2. Add safe default values to user_reading_progress columns
ALTER TABLE public.user_reading_progress 
  ALTER COLUMN current_chapter_number SET DEFAULT 1;

DO $$
BEGIN
  -- If current_page column exists, ensure default 1
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_reading_progress' 
      AND column_name = 'current_page'
  ) THEN
    UPDATE public.user_reading_progress SET current_page = 1 WHERE current_page IS NULL;
    ALTER TABLE public.user_reading_progress ALTER COLUMN current_page SET DEFAULT 1;
  END IF;

  -- Ensure is_completed default false
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_reading_progress' 
      AND column_name = 'is_completed'
  ) THEN
    ALTER TABLE public.user_reading_progress ALTER COLUMN is_completed SET DEFAULT false;
  END IF;
END $$;

