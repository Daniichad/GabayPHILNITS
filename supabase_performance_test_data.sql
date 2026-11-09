-- ==============================================================================
-- QUERY 1: INSERT / FEED TEST DATA FOR PERFORMANCE TAB (catenadaniel9@gmail.com)
-- Instructions: Run this in Supabase SQL Editor.
-- ==============================================================================

-- 1. Configure personal_info for catenadaniel9@gmail.com (sets FE exam target)
INSERT INTO public.personal_info (
  user_id, 
  birthdate, 
  contact_number, 
  gender, 
  target_exam_level, 
  highest_educational_attainment, 
  updated_at
)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1),
  '2000-01-01',
  '09123456789',
  'Prefer not to say',
  'Fundamental IT Engineer (FE)',
  'Bachelor''s Degree',
  now()
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  target_exam_level = 'Fundamental IT Engineer (FE)', 
  updated_at = now();

-- 2. Mock Exam Configurations (PhilNITS FE Subject A, Subject B, and IP)
INSERT INTO public.mock_exam_configs (id, admin_id, level_key, title, subtitle, tag, total_questions, time_limit_seconds, is_published)
VALUES 
  ('7bdd87ad-6eec-46dc-be5e-e0a3a88a11e1'::uuid, (SELECT id FROM public.users LIMIT 1), 'ip', 'Information Technology Passport (IP) Mock Exam', 'PhilNITS Level 1 Examination', 'PHILNITS-IP', 100, 7200, true),
  ('c182958b-2ee1-4bf5-b3c4-b97a6d01e112'::uuid, (SELECT id FROM public.users LIMIT 1), 'fe_a', 'Fundamental IT Engineer (FE) Subject A Mock Exam', 'PhilNITS Level 2 Morning Exam', 'PHILNITS-FE-A', 60, 5400, true),
  ('37407a4c-1229-46c5-95cc-b3feb889dbdc'::uuid, (SELECT id FROM public.users LIMIT 1), 'fe_b', 'Fundamental IT Engineer (FE) Subject B Mock Exam', 'PhilNITS Level 2 Afternoon Exam', 'PHILNITS-FE-B', 20, 6000, true)
ON CONFLICT (id) DO UPDATE SET is_published = true;

-- 3. Practice Categories
INSERT INTO public.practice_categories (id, admin_id, name, slug, description, color)
VALUES
  ('c1000000-0000-0000-0000-000000000010'::uuid, (SELECT id FROM public.users LIMIT 1), 'Computer Systems & Architecture', 'comp-arch', 'Hardware and architecture', '#2563EB'),
  ('c1000000-0000-0000-0000-000000000011'::uuid, (SELECT id FROM public.users LIMIT 1), 'Algorithms & Programming', 'algo-prog', 'Algorithms and Big-O', '#059669'),
  ('c1000000-0000-0000-0000-000000000012'::uuid, (SELECT id FROM public.users LIMIT 1), 'Networks & Security', 'networks-sec', 'TCP/IP and Security', '#DC2626'),
  ('c1000000-0000-0000-0000-000000000013'::uuid, (SELECT id FROM public.users LIMIT 1), 'IT Management & Strategy', 'mgmt-strategy', 'Management and Strategy', '#9333EA')
ON CONFLICT (id) DO NOTHING;

-- 4. Test Flashcard Deck (for deck_id foreign key)
INSERT INTO public.flashcard_decks (id, admin_id, category_id, title, description, total_cards, difficulty, is_published)
VALUES (
  'd1000000-0000-0000-0000-000000000010'::uuid,
  (SELECT id FROM public.users LIMIT 1),
  'c1000000-0000-0000-0000-000000000010'::uuid,
  'PhilNITS Review Deck',
  'Practice flashcards for exam review',
  40,
  'medium',
  true
)
ON CONFLICT (id) DO NOTHING;

-- 5. Test Questions
INSERT INTO public.multiple_choice_questions (id, admin_id, category_id, prompt, options, correct_index, is_published)
VALUES
  ('e1000000-0000-0000-0000-000000000010'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000010'::uuid, 'CPU Execution Cycle Test', '["Fetch","Decode","Execute","Store"]', 0, true),
  ('e1000000-0000-0000-0000-000000000011'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000011'::uuid, 'Time Complexity Test', '["O(1)","O(n)","O(n log n)","O(n^2)"]', 2, true),
  ('e1000000-0000-0000-0000-000000000012'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000012'::uuid, 'Transport Layer Protocol Test', '["TCP","IP","Ethernet","HTTP"]', 0, true),
  ('e1000000-0000-0000-0000-000000000013'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000013'::uuid, 'Critical Path Method Test', '["WBS","CPM","EVM","SLA"]', 1, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.true_false_questions (id, admin_id, category_id, statement, answer, is_published)
VALUES
  ('e2000000-0000-0000-0000-000000000010'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000010'::uuid, 'Cache memory is faster than RAM.', true, true),
  ('e2000000-0000-0000-0000-000000000011'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000011'::uuid, 'Binary search is O(log n).', true, true),
  ('e2000000-0000-0000-0000-000000000012'::uuid, (SELECT id FROM public.users LIMIT 1), 'c1000000-0000-0000-0000-000000000012'::uuid, 'UDP guarantees sequential packet delivery.', false, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Mock Exam Attempts for catenadaniel9@gmail.com
INSERT INTO public.mock_exam_attempts (user_id, config_id, score, total_questions, correct_count, incorrect_count, duration_seconds, status, completed_at)
VALUES
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'c182958b-2ee1-4bf5-b3c4-b97a6d01e112'::uuid, 65, 60, 39, 21, 4800, 'completed', now() - INTERVAL '14 days'),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'c182958b-2ee1-4bf5-b3c4-b97a6d01e112'::uuid, 75, 60, 45, 15, 4600, 'completed', now() - INTERVAL '7 days'),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'c182958b-2ee1-4bf5-b3c4-b97a6d01e112'::uuid, 85, 60, 51, 9,  4200, 'completed', now() - INTERVAL '1 day'),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), '37407a4c-1229-46c5-95cc-b3feb889dbdc'::uuid, 60, 20, 12, 8,  5400, 'completed', now() - INTERVAL '10 days'),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), '37407a4c-1229-46c5-95cc-b3feb889dbdc'::uuid, 75, 20, 15, 5,  5100, 'completed', now() - INTERVAL '4 days'),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), '37407a4c-1229-46c5-95cc-b3feb889dbdc'::uuid, 85, 20, 17, 3,  4800, 'completed', now() - INTERVAL '6 hours');

-- 7. Practice Results for catenadaniel9@gmail.com
INSERT INTO public.multiple_choice_results (user_id, question_id, selected_index, is_correct, answered_at)
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e1000000-0000-0000-0000-000000000010'::uuid, 0, (s <= 18), now() - ((20 - s) * INTERVAL '3 hours') FROM generate_series(1, 20) s
UNION ALL
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e1000000-0000-0000-0000-000000000011'::uuid, 2, (s <= 16), now() - ((20 - s) * INTERVAL '4 hours') FROM generate_series(1, 20) s
UNION ALL
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e1000000-0000-0000-0000-000000000012'::uuid, 0, (s <= 14), now() - ((18 - s) * INTERVAL '5 hours') FROM generate_series(1, 18) s
UNION ALL
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e1000000-0000-0000-0000-000000000013'::uuid, 1, (s <= 12), now() - ((15 - s) * INTERVAL '6 hours') FROM generate_series(1, 15) s;

INSERT INTO public.true_false_results (user_id, question_id, selected_answer, is_correct, answered_at)
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e2000000-0000-0000-0000-000000000010'::uuid, true, true, now() - (s * INTERVAL '1 day') FROM generate_series(1, 8) s
UNION ALL
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e2000000-0000-0000-0000-000000000011'::uuid, true, (s <= 7), now() - (s * INTERVAL '1 day') FROM generate_series(1, 8) s
UNION ALL
SELECT (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'e2000000-0000-0000-0000-000000000012'::uuid, false, true, now() - (s * INTERVAL '1 day') FROM generate_series(1, 8) s;

-- 8. Flashcard Sessions & Matching Results for catenadaniel9@gmail.com
INSERT INTO public.flashcard_sessions (user_id, deck_id, cards_total, cards_seen, duration_seconds, started_at, completed_at, completed)
VALUES
  (
    (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 
    COALESCE((SELECT id FROM public.flashcard_decks LIMIT 1), 'd1000000-0000-0000-0000-000000000010'::uuid),
    30, 30, 480, now() - INTERVAL '2 days', now() - INTERVAL '2 days' + INTERVAL '8 minutes', true
  ),
  (
    (SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 
    COALESCE((SELECT id FROM public.flashcard_decks LIMIT 1), 'd1000000-0000-0000-0000-000000000010'::uuid),
    40, 40, 600, now() - INTERVAL '8 hours', now() - INTERVAL '8 hours' + INTERVAL '10 minutes', true
  );

INSERT INTO public.matching_results (user_id, set_title, pairs_total, pairs_matched, mistakes, completed, duration_seconds)
VALUES
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'Computer Systems & Architecture', 8, 8, 1, true, 110),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'Algorithms & Programming', 8, 8, 2, true, 140),
  ((SELECT id FROM auth.users WHERE email = 'catenadaniel9@gmail.com' LIMIT 1), 'Networks & Security', 8, 8, 0, true, 95);
