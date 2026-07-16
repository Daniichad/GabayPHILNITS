-- 1. Create mock_exam_configs table
CREATE TABLE IF NOT EXISTS public.mock_exam_configs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level_key text NOT NULL CHECK (level_key IN ('professional', 'sub_professional')),
  title text NOT NULL,
  subtitle text,
  time_limit_seconds integer NOT NULL DEFAULT 3600,
  total_questions integer NOT NULL DEFAULT 0,
  tag text,
  sections jsonb DEFAULT '[]'::jsonb,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create mock_exam_questions table (using jsonb for options to match database structure)
CREATE TABLE IF NOT EXISTS public.mock_exam_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id uuid REFERENCES public.mock_exam_configs(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create mock_exam_attempts table
CREATE TABLE IF NOT EXISTS public.mock_exam_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  config_id uuid REFERENCES public.mock_exam_configs(id) ON DELETE CASCADE,
  total_questions integer NOT NULL DEFAULT 0,
  time_limit_seconds integer NOT NULL DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  score integer DEFAULT 0,
  status text DEFAULT 'in_progress',
  duration_seconds integer,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create mock_exam_answer_logs table
CREATE TABLE IF NOT EXISTS public.mock_exam_answer_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id uuid REFERENCES public.mock_exam_attempts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.mock_exam_questions(id) ON DELETE CASCADE,
  selected_index integer,
  correct_index integer,
  is_correct boolean,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.mock_exam_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_exam_answer_logs ENABLE ROW LEVEL SECURITY;

-- 6. Setup RLS Policies
-- Configs policies
CREATE POLICY "Allow public read configs" ON public.mock_exam_configs
  FOR SELECT USING (is_published = true);

-- Questions policies
CREATE POLICY "Allow public read questions" ON public.mock_exam_questions
  FOR SELECT USING (is_published = true);

-- Attempts policies (users can manage their own attempts)
CREATE POLICY "Users can select own attempts" ON public.mock_exam_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON public.mock_exam_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts" ON public.mock_exam_attempts
  FOR UPDATE USING (auth.uid() = user_id);

-- Answer logs policies
CREATE POLICY "Users can select own answer logs" ON public.mock_exam_answer_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own answer logs" ON public.mock_exam_answer_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 7. Seed Mock Exam Configurations and Questions
-- Truncate existing configs and cascade delete dependencies
TRUNCATE TABLE public.mock_exam_configs CASCADE;

-- Insert Professional Mock Exam Config
WITH prof_config AS (
  INSERT INTO public.mock_exam_configs (level_key, title, subtitle, time_limit_seconds, total_questions, tag, sections)
  VALUES (
    'professional',
    'Professional Mock Exam Reviewer',
    'Comprehensive practice covering Vocabulary, Math, General Info, and Analogy.',
    7200, -- 2 hours
    5,
    'CSE-PROF',
    '[
      {"name": "Verbal Ability", "description": "Vocabulary, grammar, and paragraph organization."},
      {"name": "Analytical Ability", "description": "Analogy, logic, and reasoning."},
      {"name": "Numerical Ability", "description": "Basic arithmetic and word problems."},
      {"name": "General Information", "description": "Philippine Constitution and RA 6713."}
    ]'::jsonb
  )
  RETURNING id
)
-- Seed Questions for Professional Mock Exam (using jsonb format)
INSERT INTO public.mock_exam_questions (config_id, prompt, options, correct_index, sort_order)
SELECT id, 'Identify the word that is closest in meaning to "PRAGMATIC".', '["Idealistic", "Practical", "Unreasonable", "Theoretical"]'::jsonb, 1, 1 FROM prof_config
UNION ALL
SELECT id, 'Solve the word problem: A car travels 180 km in 3 hours. At this speed, how long will it take to travel 300 km?', '["4 hours", "4.5 hours", "5 hours", "6 hours"]'::jsonb, 2, 2 FROM prof_config
UNION ALL
SELECT id, 'Choose the logical conclusion: All dogs have fur. Spot is a dog. Therefore, ________.', '["Spot has fur", "All furry animals are dogs", "Spot does not have fur", "Fur belongs to dogs only"]'::jsonb, 0, 3 FROM prof_config
UNION ALL
SELECT id, 'Which government branch has the power to pass and enact laws in the Philippines?', '["Executive Branch", "Judicial Branch", "Legislative Branch", "Military Branch"]'::jsonb, 2, 4 FROM prof_config
UNION ALL
SELECT id, 'Who is responsible for executing public policy and enforcing laws?', '["The Chief Justice", "The President", "The Speaker of the House", "The Senate President"]'::jsonb, 1, 5 FROM prof_config;


-- Insert Sub-Professional Mock Exam Config
WITH subprof_config AS (
  INSERT INTO public.mock_exam_configs (level_key, title, subtitle, time_limit_seconds, total_questions, tag, sections)
  VALUES (
    'sub_professional',
    'Sub-Professional Mock Exam Reviewer',
    'Practice exam focused on Clerical Operations, Math, Vocabulary, and General Info.',
    5400, -- 1.5 hours
    5,
    'CSE-SUBPROF',
    '[
      {"name": "Clerical Operations", "description": "Alphabetizing, filing, and spelling checks."},
      {"name": "Numerical Ability", "description": "Basic arithmetic calculations."},
      {"name": "Verbal Ability", "description": "Grammar, spelling, and spelling patterns."},
      {"name": "General Information", "description": "Philippine Constitution and RA 6713."}
    ]'::jsonb
  )
  RETURNING id
)
-- Seed Questions for Sub-Professional Mock Exam (using jsonb format)
INSERT INTO public.mock_exam_questions (config_id, prompt, options, correct_index, sort_order)
SELECT id, 'Arrange the names in alphabetical order: 1) Cruz, Ana; 2) Cruz, Alberto; 3) Cruz, Alicia', '["2, 3, 1", "1, 2, 3", "3, 2, 1", "2, 1, 3"]'::jsonb, 0, 1 FROM subprof_config
UNION ALL
SELECT id, 'What is the sum of 125, 230, and 45?', '["380", "390", "400", "410"]'::jsonb, 2, 2 FROM subprof_config
UNION ALL
SELECT id, 'Which of the following is the correct spelling?', '["Accomodate", "Accommodate", "Acommodate", "Accomoddate"]'::jsonb, 1, 3 FROM subprof_config
UNION ALL
SELECT id, 'What is the primary responsibility of a public official under RA 6713?', '["To accumulate wealth", "To serve the public with utmost responsibility and integrity", "To follow the orders of superiors blindly", "To avoid working overtime"]'::jsonb, 1, 4 FROM subprof_config
UNION ALL
SELECT id, 'Which of the following is NOT a core category in the CSE Sub-Professional Exam?', '["Clerical Operations", "Numerical Ability", "Analogy and Logic", "Verbal Ability"]'::jsonb, 2, 5 FROM subprof_config;
