-- ==============================================================================
-- QUERY 2: UNDO / DELETE TEST DATA FOR PERFORMANCE TAB (catenadaniel9@gmail.com)
-- Instructions: Run this in Supabase SQL Editor whenever you want to reset
-- or remove the performance test data.
-- ==============================================================================

-- 1. Delete MCQ test results for catenadaniel9@gmail.com
DELETE FROM public.multiple_choice_results 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1)
  AND question_id IN (
    'e1000000-0000-0000-0000-000000000010'::uuid,
    'e1000000-0000-0000-0000-000000000011'::uuid,
    'e1000000-0000-0000-0000-000000000012'::uuid,
    'e1000000-0000-0000-0000-000000000013'::uuid
  );

-- 2. Delete True/False test results for catenadaniel9@gmail.com
DELETE FROM public.true_false_results
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1)
  AND question_id IN (
    'e2000000-0000-0000-0000-000000000010'::uuid,
    'e2000000-0000-0000-0000-000000000011'::uuid,
    'e2000000-0000-0000-0000-000000000012'::uuid
  );

-- 3. Delete Mock Exam Attempts for catenadaniel9@gmail.com
DELETE FROM public.mock_exam_attempts
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1)
  AND config_id IN (
    'c182958b-2ee1-4bf5-b3c4-b97a6d01e112'::uuid,
    '37407a4c-1229-46c5-95cc-b3feb889dbdc'::uuid
  );

-- 4. Delete test Matching Results for catenadaniel9@gmail.com
DELETE FROM public.matching_results
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1)
  AND set_title IN (
    'Computer Systems & Architecture',
    'Algorithms & Programming',
    'Networks & Security'
  );

-- 5. Delete test Flashcard Sessions for catenadaniel9@gmail.com
DELETE FROM public.flashcard_sessions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1)
  AND cards_total IN (30, 40);

-- 6. Clean up test questions and test flashcard deck
DELETE FROM public.multiple_choice_questions 
WHERE id IN (
  'e1000000-0000-0000-0000-000000000010'::uuid,
  'e1000000-0000-0000-0000-000000000011'::uuid,
  'e1000000-0000-0000-0000-000000000012'::uuid,
  'e1000000-0000-0000-0000-000000000013'::uuid
);

DELETE FROM public.true_false_questions
WHERE id IN (
  'e2000000-0000-0000-0000-000000000010'::uuid,
  'e2000000-0000-0000-0000-000000000011'::uuid,
  'e2000000-0000-0000-0000-000000000012'::uuid
);

DELETE FROM public.flashcard_decks
WHERE id = 'd1000000-0000-0000-0000-000000000010'::uuid;
