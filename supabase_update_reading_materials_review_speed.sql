-- ==============================================================================
-- Migration: Update Reading Materials Review Speed
-- ==============================================================================
-- This script replaces 'Standard' in public.reading_materials with the 
-- user's actual review speed ('Detailed') or curriculum review speeds.
-- ==============================================================================

-- Option 1: Update all 'Standard' reading materials to match your user review speed ('Detailed')
UPDATE public.reading_materials
SET review_speed = (
    SELECT COALESCE(u.review_speed, 'Detailed') 
    FROM public.users u 
    WHERE u.email = 'catenadaniel9@gmail.com' 
    LIMIT 1
)
WHERE review_speed = 'Standard' OR review_speed IS NULL;

-- Verification check:
SELECT id, title, subject, exam_level, review_speed
FROM public.reading_materials
ORDER BY sort_order ASC;
