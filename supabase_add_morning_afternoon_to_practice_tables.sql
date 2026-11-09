-- ==============================================================================
-- Migration: Add `exam_level` ('IP', 'FE') and `fe_section` ('Subject A', 'Subject B', NULL)
-- Rules:
-- 1. Rows with exam_level = 'IP' have fe_section = NULL.
-- 2. Rows with exam_level = 'FE' have fe_section = 'Subject A' or 'Subject B'.
-- Tables:
--   1. public.practice_categories
--   2. public.multiple_choice_questions
--   3. public.true_false_questions
--   4. public.flashcard_decks
--   5. public.flashcards
--   6. public.matching_pairs
-- ==============================================================================

-- 1. Add `exam_level` and `fe_section` columns to all practice tables (single statements)
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

-- 2. Create indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_practice_categories_exam_level ON public.practice_categories (exam_level);
CREATE INDEX IF NOT EXISTS idx_practice_categories_fe_section ON public.practice_categories (fe_section);

CREATE INDEX IF NOT EXISTS idx_multiple_choice_exam_level ON public.multiple_choice_questions (exam_level);
CREATE INDEX IF NOT EXISTS idx_multiple_choice_fe_section ON public.multiple_choice_questions (fe_section);

CREATE INDEX IF NOT EXISTS idx_true_false_exam_level ON public.true_false_questions (exam_level);
CREATE INDEX IF NOT EXISTS idx_true_false_fe_section ON public.true_false_questions (fe_section);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_exam_level ON public.flashcard_decks (exam_level);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_fe_section ON public.flashcard_decks (fe_section);

CREATE INDEX IF NOT EXISTS idx_flashcards_exam_level ON public.flashcards (exam_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_fe_section ON public.flashcards (fe_section);

CREATE INDEX IF NOT EXISTS idx_matching_pairs_exam_level ON public.matching_pairs (exam_level);
CREATE INDEX IF NOT EXISTS idx_matching_pairs_fe_section ON public.matching_pairs (fe_section);

-- ------------------------------------------------------------------------------
-- 3. Tag Practice Categories by PhilNITS Syllabus
-- ------------------------------------------------------------------------------

-- IP Categories (fe_section strictly NULL)
UPDATE public.practice_categories
SET exam_level = 'IP',
    fe_section = NULL
WHERE name IN ('Technology', 'Management', 'Strategy');

-- FE Subject A (Morning): Systems & Arch, Networks & Security, Management & Strategy, Databases
UPDATE public.practice_categories
SET exam_level = 'FE',
    fe_section = 'Subject A'
WHERE name IN (
  'Computer Systems & Architecture',
  'Networks & Security',
  'IT Management & Strategy',
  'Databases & SQL'
);

-- FE Subject B (Afternoon): Algorithms & Programming, Data Structures, Security Design
UPDATE public.practice_categories
SET exam_level = 'FE',
    fe_section = 'Subject B'
WHERE name IN (
  'Algorithms & Programming',
  'Algorithms & Data Structures',
  'Security & System Design'
);

-- ------------------------------------------------------------------------------
-- 4. Propagate exam_level and fe_section to all questions, decks, cards, and pairs
-- ------------------------------------------------------------------------------

-- Multiple Choice Questions
UPDATE public.multiple_choice_questions q
SET exam_level = c.exam_level,
    fe_section = CASE WHEN c.exam_level = 'IP' THEN NULL ELSE c.fe_section END
FROM public.practice_categories c
WHERE q.category_id = c.id;

-- True / False Questions
UPDATE public.true_false_questions q
SET exam_level = c.exam_level,
    fe_section = CASE WHEN c.exam_level = 'IP' THEN NULL ELSE c.fe_section END
FROM public.practice_categories c
WHERE q.category_id = c.id;

-- Flashcard Decks
UPDATE public.flashcard_decks d
SET exam_level = c.exam_level,
    fe_section = CASE WHEN c.exam_level = 'IP' THEN NULL ELSE c.fe_section END
FROM public.practice_categories c
WHERE d.category_id = c.id;

-- Flashcards (from parent deck)
UPDATE public.flashcards f
SET exam_level = d.exam_level,
    fe_section = CASE WHEN d.exam_level = 'IP' THEN NULL ELSE d.fe_section END
FROM public.flashcard_decks d
WHERE f.deck_id = d.id;

-- Matching Pairs
UPDATE public.matching_pairs m
SET exam_level = c.exam_level,
    fe_section = CASE WHEN c.exam_level = 'IP' THEN NULL ELSE c.fe_section END
FROM public.practice_categories c
WHERE m.category_id = c.id;

-- ------------------------------------------------------------------------------
-- 5. Guarantee that ALL IP rows strictly have fe_section = NULL
-- ------------------------------------------------------------------------------
UPDATE public.practice_categories SET fe_section = NULL WHERE exam_level = 'IP';
UPDATE public.multiple_choice_questions SET fe_section = NULL WHERE exam_level = 'IP';
UPDATE public.true_false_questions SET fe_section = NULL WHERE exam_level = 'IP';
UPDATE public.flashcard_decks SET fe_section = NULL WHERE exam_level = 'IP';
UPDATE public.flashcards SET fe_section = NULL WHERE exam_level = 'IP';
UPDATE public.matching_pairs SET fe_section = NULL WHERE exam_level = 'IP';
