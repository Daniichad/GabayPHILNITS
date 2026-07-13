-- ============================================================
--  GabayPHILCSE — Reading Materials Table
--  Run this in Supabase SQL Editor
-- ============================================================

-- 1. TABLE
CREATE TABLE IF NOT EXISTS public.reading_materials (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    subject       TEXT        NOT NULL,
    title         TEXT        NOT NULL,
    subtitle      TEXT        NOT NULL DEFAULT '',
    content       TEXT        NOT NULL DEFAULT '',
    total_pages   INTEGER     NOT NULL DEFAULT 1,
    sort_order    INTEGER     NOT NULL DEFAULT 0,
    is_published  BOOLEAN     NOT NULL DEFAULT TRUE,
    admin_id      BIGINT      REFERENCES public.users(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. USER PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.reading_progress (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    material_id    UUID        NOT NULL REFERENCES public.reading_materials(id) ON DELETE CASCADE,
    pages_read     INTEGER     NOT NULL DEFAULT 0,
    completed      BOOLEAN     NOT NULL DEFAULT FALSE,
    last_read_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, material_id)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_reading_materials_subject   ON public.reading_materials(subject);
CREATE INDEX IF NOT EXISTS idx_reading_materials_published ON public.reading_materials(is_published);
CREATE INDEX IF NOT EXISTS idx_reading_progress_user       ON public.reading_progress(user_id);

-- 4. RLS
ALTER TABLE public.reading_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published materials"
    ON public.reading_materials FOR SELECT
    USING (is_published = TRUE);

CREATE POLICY "User reads own progress"
    ON public.reading_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "User upserts own progress"
    ON public.reading_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User updates own progress"
    ON public.reading_progress FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. SEED DATA
INSERT INTO public.reading_materials (subject, title, subtitle, content, total_pages, sort_order) VALUES

-- Verbal Ability
('Verbal Ability', 'Vocabulary Fundamentals',
 'Common words, synonyms, and antonyms tested in CSE',
 '# Vocabulary Fundamentals\n\nThe Civil Service Exam tests your ability to understand and use words correctly.\n\n## Key Areas\n- Synonyms: words with similar meanings\n- Antonyms: words with opposite meanings\n- Context Clues: guessing meaning from surrounding text\n\n## Tips\n1. Read widely — newspapers, books, and articles.\n2. Use flashcards for unfamiliar words.\n3. Practice one new word per day.',
 5, 1),

('Verbal Ability', 'Grammar and Correct Usage',
 'Subject-verb agreement, verb tenses, and sentence structure',
 '# Grammar and Correct Usage\n\n## Subject-Verb Agreement\nThe verb must agree with the subject in number.\n\n## Common Errors\n- Misplaced modifiers\n- Dangling participles\n- Incorrect pronoun reference\n\n## Verb Tenses\nSimple Present, Simple Past, Future — use each correctly in context.',
 6, 2),

('Verbal Ability', 'Reading Comprehension',
 'Strategies for answering passage-based questions',
 '# Reading Comprehension\n\n## Strategy\n1. Skim the passage for the main idea.\n2. Read the questions before reading carefully.\n3. Locate key details in the passage.\n4. Eliminate wrong choices.\n\n## Question Types\n- Main idea / title\n- Specific detail\n- Inference\n- Vocabulary in context',
 4, 3),

('Verbal Ability', 'Paragraph Organization',
 'Understanding text structure and logical flow',
 '# Paragraph Organization\n\nA well-organized paragraph has a topic sentence, supporting sentences, and a concluding sentence.\n\n## Transition Words\n- Addition: furthermore, moreover\n- Contrast: however, nevertheless\n- Cause/Effect: therefore, consequently',
 3, 4),

-- Numerical Ability
('Numerical Ability', 'Basic Arithmetic',
 'Addition, subtraction, multiplication, division essentials',
 '# Basic Arithmetic\n\n## Operations Order (PEMDAS)\nParentheses, Exponents, Multiplication/Division, Addition/Subtraction\n\n## Tips\n- Practice mental math daily.\n- Memorize multiplication tables up to 12.\n- Estimate before computing to catch errors.',
 5, 1),

('Numerical Ability', 'Fractions and Decimals',
 'Operations with fractions, decimals, and percentages',
 '# Fractions and Decimals\n\n## Converting\n- Fraction to Decimal: divide numerator by denominator (3/4 = 0.75)\n- Decimal to Percent: multiply by 100 (0.75 = 75%)\n\n## Operations\n- Adding fractions: find common denominator\n- Multiplying fractions: multiply top x top, bottom x bottom\n- Dividing fractions: multiply by the reciprocal',
 5, 2),

('Numerical Ability', 'Ratio and Proportion',
 'Solving ratio, rate, and proportion problems',
 '# Ratio and Proportion\n\n## Proportion\nTwo ratios that are equal: a/b = c/d\nCross-multiply to solve: a x d = b x c\n\n## Example\nIf 3 pencils cost 15 pesos, how much do 7 pencils cost?\n3/15 = 7/x → 3x = 105 → x = 35 pesos',
 4, 3),

('Numerical Ability', 'Word Problems',
 'Translating word problems into equations',
 '# Word Problems\n\n## Steps\n1. Read the problem carefully.\n2. Identify what is asked.\n3. Assign variables.\n4. Write the equation.\n5. Solve and check.\n\n## Common Types\n- Age problems\n- Work problems (rates)\n- Mixture problems\n- Distance-Rate-Time (d = rt)',
 5, 4),

-- Analytical Ability
('Analytical Ability', 'Word Analogy',
 'Identifying relationships between pairs of words',
 '# Word Analogy\n\nFormat: A : B :: C : ?\n\n## Common Relationship Types\n- Part to Whole: Finger : Hand\n- Cause and Effect: Fire : Ash\n- Synonym: Happy : Joyful\n- Antonym: Hot : Cold\n- Function: Pen : Write\n\n## Strategy\n1. State the relationship between A and B.\n2. Apply the same relationship to C.',
 4, 1),

('Analytical Ability', 'Logical Reasoning',
 'Deductive and inductive reasoning patterns',
 '# Logical Reasoning\n\n## Deductive Reasoning\nDrawing specific conclusions from general principles.\n- All mammals are warm-blooded.\n- A dog is a mammal.\n- Therefore, a dog is warm-blooded.\n\n## Syllogism Tips\n- Identify the premises.\n- Check if the conclusion logically follows.\n- Watch for invalid assumptions.',
 4, 2),

('Analytical Ability', 'Data Interpretation',
 'Reading and analyzing tables, charts, and graphs',
 '# Data Interpretation\n\n## Types of Graphs\n- Bar graph: compares categories\n- Line graph: shows trends over time\n- Pie chart: shows proportions\n- Table: organizes data in rows and columns\n\n## Steps\n1. Read the title and labels.\n2. Note units of measurement.\n3. Identify trends, peaks, and anomalies.\n4. Calculate when needed (%, difference, ratio).',
 4, 3),

-- Logical Reasoning
('Logical Reasoning', 'Number Series',
 'Finding patterns in number sequences',
 '# Number Series\n\n## Common Patterns\n- Arithmetic: add/subtract a constant (2, 5, 8, 11, 14)\n- Geometric: multiply/divide by a constant (2, 6, 18, 54)\n- Alternating: two interleaved sequences\n- Fibonacci-type: each term = sum of previous two\n\n## Tip\nAlways check the difference between consecutive terms first.',
 3, 1),

('Logical Reasoning', 'Letter and Symbol Series',
 'Patterns using letters, symbols, and alphanumeric codes',
 '# Letter and Symbol Series\n\n## Approach\n1. Write the alphabet with position numbers (A=1, B=2, Z=26).\n2. Find the difference between letter positions.\n3. Apply the same pattern.\n\n## Example\nA, C, F, J, ? — differences: +2, +3, +4 — next is +5 — O',
 3, 2),

-- General Information
('General Information', 'Philippine Constitution',
 'Key provisions of the 1987 Philippine Constitution',
 '# Philippine Constitution (1987)\n\n## Article II — Declaration of Principles\n- Section 1: The Philippines is a democratic and republican state.\n\n## Bill of Rights (Article III)\n- Section 1: No person shall be deprived of life, liberty, or property without due process.\n- Section 2: Right against unreasonable searches and seizures.\n\n## Civil Service\n- Article IX-B governs the Civil Service Commission (CSC).',
 6, 1),

('General Information', 'Philippine History and Culture',
 'Key historical events and cultural heritage of the Philippines',
 '# Philippine History and Culture\n\n## Key Periods\n1. Pre-Colonial: barangay system, trade with Asia\n2. Spanish Colonial (1565-1898): 333 years of colonial rule\n3. American Period (1898-1946): public education, English\n4. Japanese Occupation (1941-1945)\n5. Independence: July 4, 1946\n\n## National Symbols\n- National hero: Jose Rizal\n- National flower: Sampaguita\n- National bird: Philippine Eagle',
 5, 2),

-- Clerical Operations
('Clerical Operations', 'Filing and Alphabetizing',
 'Rules for alphabetic, numeric, and chronological filing',
 '# Filing and Alphabetizing\n\n## Alphabetic Filing Rules\n1. File letter by letter.\n2. Nothing before something (Mac < MacAdam)\n3. Hyphenated names treated as one word.\n4. Abbreviations filed as if spelled out (Dr. = Doctor)\n\n## Numeric Filing\nArrange records by assigned numbers in ascending order.\n\n## Chronological Filing\nArrange records by date.',
 4, 1),

('Clerical Operations', 'Spelling and Proofreading',
 'Common spelling rules and proofreading techniques',
 '# Spelling and Proofreading\n\n## Common Spelling Rules\n- i before e except after c (believe, receive)\n- Drop the final e before a vowel suffix (love = loving)\n- Double the consonant before a vowel suffix if the word is one syllable (run = running)\n\n## Proofreading Tips\n1. Read slowly, word by word.\n2. Check for homophones (there/their/they are).\n3. Verify numbers and dates.\n4. Read aloud to catch awkward phrasing.',
 4, 2);

-- ============================================================
--  Verify:
--  SELECT subject, title, sort_order FROM public.reading_materials ORDER BY subject, sort_order;
-- ============================================================
