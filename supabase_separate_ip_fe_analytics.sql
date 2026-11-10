-- ==============================================================================
-- Migration: Strict Separation of PhilNITS IP and FE Practice & Analytics Data
-- ==============================================================================
-- Purpose:
-- 1. Ensure `exam_level` ('IP', 'FE') and `fe_section` ('Subject A', 'Subject B', NULL)
--    exist on all question, category, deck, and result tables.
-- 2. Backfill existing practice and result records to their correct target exam.
-- 3. Prevent any IP practice or mock attempts from affecting FE analytics, and vice-versa,
--    even when subject or domain names are identical (e.g. Technology, Management, Strategy).
-- ==============================================================================

-- 1. Add exam_level and fe_section to master content tables if not already present
ALTER TABLE public.practice_categories ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.practice_categories ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.multiple_choice_questions ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.multiple_choice_questions ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.true_false_questions ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.true_false_questions ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.flashcard_decks ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.flashcard_decks ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.matching_pairs ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.matching_pairs ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50) DEFAULT NULL;

-- 2. Add exam_level to student result and session tables for direct filtering
ALTER TABLE public.multiple_choice_results ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.true_false_results ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.matching_results ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.flashcard_sessions ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';
ALTER TABLE public.flashcard_sessions ADD COLUMN IF NOT EXISTS deck_id UUID DEFAULT NULL;

-- 3. Tag Practice Categories strictly by syllabus
-- IP Categories:
UPDATE public.practice_categories
SET exam_level = 'IP',
    fe_section = NULL
WHERE name IN ('Technology', 'Management', 'Strategy');

-- FE Subject A Categories:
UPDATE public.practice_categories
SET exam_level = 'FE',
    fe_section = 'Subject A'
WHERE name IN (
  'Computer Systems & Architecture',
  'Networks & Security',
  'IT Management & Strategy',
  'Databases & SQL'
);

-- FE Subject B Categories:
UPDATE public.practice_categories
SET exam_level = 'FE',
    fe_section = 'Subject B'
WHERE name IN (
  'Algorithms & Programming',
  'Algorithms & Data Structures',
  'Security & System Design'
);

-- 4. Propagate exam_level and fe_section to questions, decks, cards, and pairs
UPDATE public.multiple_choice_questions q
SET exam_level = c.exam_level,
    fe_section = c.fe_section
FROM public.practice_categories c
WHERE q.category_id = c.id;

UPDATE public.true_false_questions q
SET exam_level = c.exam_level,
    fe_section = c.fe_section
FROM public.practice_categories c
WHERE q.category_id = c.id;

UPDATE public.flashcard_decks d
SET exam_level = c.exam_level,
    fe_section = c.fe_section
FROM public.practice_categories c
WHERE d.category_id = c.id;

UPDATE public.flashcards f
SET exam_level = d.exam_level,
    fe_section = d.fe_section
FROM public.flashcard_decks d
WHERE f.deck_id = d.id;

UPDATE public.matching_pairs m
SET exam_level = c.exam_level,
    fe_section = c.fe_section
FROM public.practice_categories c
WHERE m.category_id = c.id;

-- 5. Backfill student result logs with their question's exam_level
UPDATE public.multiple_choice_results r
SET exam_level = q.exam_level
FROM public.multiple_choice_questions q
WHERE r.question_id = q.id;

UPDATE public.true_false_results r
SET exam_level = q.exam_level
FROM public.true_false_questions q
WHERE r.question_id = q.id;

UPDATE public.flashcard_sessions s
SET exam_level = d.exam_level
FROM public.flashcard_decks d
WHERE s.deck_id = d.id;

UPDATE public.matching_results
SET exam_level = 'FE'
WHERE set_title ILIKE '%[FE]%'
   OR set_title ILIKE '%Computer Systems%'
   OR set_title ILIKE '%Architecture%'
   OR set_title ILIKE '%Algorithm%'
   OR set_title ILIKE '%Network%'
   OR set_title ILIKE '%Database%';

UPDATE public.matching_results
SET exam_level = 'IP'
WHERE exam_level IS NULL OR exam_level = '';

-- 6. Performance indexes for separated analytics queries
CREATE INDEX IF NOT EXISTS idx_mcq_results_exam_level ON public.multiple_choice_results (user_id, exam_level);
CREATE INDEX IF NOT EXISTS idx_tf_results_exam_level ON public.true_false_results (user_id, exam_level);
CREATE INDEX IF NOT EXISTS idx_matching_results_exam_level ON public.matching_results (user_id, exam_level);
CREATE INDEX IF NOT EXISTS idx_flashcard_sessions_exam_level ON public.flashcard_sessions (user_id, exam_level);

