-- 1. Create the diagnostic_questions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.diagnostic_questions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_answer text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;

-- 3. Create a policy allowing anyone to read questions (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'diagnostic_questions' AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" ON public.diagnostic_questions
          FOR SELECT USING (true);
    END IF;
END
$$;

-- 4. Delete existing questions to avoid duplication if re-run
TRUNCATE TABLE public.diagnostic_questions;

-- 5. Insert high-quality Civil Service Exam style diagnostic questions
INSERT INTO public.diagnostic_questions (category, question, options, correct_answer, sort_order) VALUES
-- Verbal Ability
(
  'Verbal Ability', 
  'Choose the word that is most opposite in meaning to "CANDID".', 
  ARRAY['Frank', 'Deceitful', 'Sincere', 'Unbiased'], 
  'Deceitful', 
  1
),
(
  'Verbal Ability', 
  'Identify the misspelled word in the options below.', 
  ARRAY['Commitment', 'Liaison', 'Occurred', 'Receiveable'], 
  'Receiveable', 
  2
),

-- Numerical Ability
(
  'Numerical Ability', 
  'If 4 workers can complete a job in 6 days, how many days will it take 8 workers to complete the same job at the same rate?', 
  ARRAY['2 days', '3 days', '4 days', '12 days'], 
  '3 days', 
  3
),
(
  'Numerical Ability', 
  'What is 15% of 240?', 
  ARRAY['30', '34', '36', '40'], 
  '36', 
  4
),

-- Analytical Ability
(
  'Analytical Ability', 
  'Identify the relationship: "Tree is to Forest" as "Star" is to __________.', 
  ARRAY['Sky', 'Constellation', 'Planet', 'Galaxy'], 
  'Constellation', 
  5
),
(
  'Analytical Ability', 
  'Choose the figure that does not belong in the group: Circle, Square, Sphere, Triangle.', 
  ARRAY['Circle', 'Square', 'Sphere', 'Triangle'], 
  'Sphere', 
  6
),

-- Logical Reasoning
(
  'Logical Reasoning', 
  'If all mammals are warm-blooded and all whales are mammals, which of the following is logically true?', 
  ARRAY['All warm-blooded animals are whales', 'Whales are warm-blooded', 'Some mammals are not whales', 'None of the above'], 
  'Whales are warm-blooded', 
  7
),
(
  'Logical Reasoning', 
  'Find the next number in the sequence: 3, 6, 12, 24, 48, ?', 
  ARRAY['60', '72', '96', '120'], 
  '96', 
  8
),

-- General Information
(
  'General Information', 
  'Under the Philippine Constitution, who has the power to declare the existence of a state of war?', 
  ARRAY['The President', 'The Supreme Court', 'Congress', 'The Armed Forces Chief of Staff'], 
  'Congress', 
  9
),
(
  'General Information', 
  'What is the maximum amount of gift or token that a public official may receive without violating RA 6713 (Code of Conduct)?', 
  ARRAY['Nominal or insignificant value', 'Up to PHP 5,000', 'Up to PHP 10,000', 'No gifts are allowed under any circumstances'], 
  'Nominal or insignificant value', 
  10
),

-- Clerical Operations
(
  'Clerical Operations', 
  'Which of the following shows the correct alphabetical filing order for these names?', 
  ARRAY['De Castro, Maria; De La Cruz, Ana; Del Rosario, Jose', 'De La Cruz, Ana; De Castro, Maria; Del Rosario, Jose', 'Del Rosario, Jose; De Castro, Maria; De La Cruz, Ana', 'De Castro, Maria; Del Rosario, Jose; De La Cruz, Ana'], 
  'De Castro, Maria; De La Cruz, Ana; Del Rosario, Jose', 
  11
),
(
  'Clerical Operations', 
  'Which file management method organizes documents by subject matter first, then by date?', 
  ARRAY['Chronological Filing', 'Subject Filing', 'Geographical Filing', 'Numerical Filing'], 
  'Subject Filing', 
  12
);
