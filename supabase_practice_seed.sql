-- =============================================================================
-- GabayPHILCSE - Practice Module SEED DATA (Civil Service Exam Philippines)
-- Run AFTER supabase_practice_schema.sql has been executed.
-- Requires at least one user with role = 'admin' in public.users.
-- =============================================================================

DO $$
DECLARE
    v_admin_id   BIGINT;
    cat_verbal   UUID; cat_analytic UUID; cat_numeric  UUID;
    cat_general  UUID; cat_clerical UUID;
    deck_verbal  UUID; deck_analytic UUID; deck_numeric UUID;
    deck_general UUID; deck_clerical UUID;
BEGIN
    -- Resolve admin
    SELECT id INTO v_admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
    IF v_admin_id IS NULL THEN
        RAISE NOTICE 'No admin found. Run: UPDATE public.users SET role = ''admin'' WHERE email = ''your@email.com'';';
        RETURN;
    END IF;

    -- 1. PRACTICE CATEGORIES
    INSERT INTO practice_categories (admin_id, name, slug, description, icon, color) VALUES
    (v_admin_id, 'Verbal Ability',     'verbal-ability',    'Vocabulary, grammar, reading comprehension.',     'book-alphabet',    '#3B82B8'),
    (v_admin_id, 'Analytical Ability', 'analytical-ability','Word analogy, logical reasoning, data interpretation.','brain',         '#8B5CF6'),
    (v_admin_id, 'Numerical Ability',  'numerical-ability', 'Basic arithmetic, fractions, percentages, algebra.','calculator',      '#EF4444'),
    (v_admin_id, 'General Information','general-information','Philippine Constitution, RA 6713, environment laws.','flag',           '#10B981'),
    (v_admin_id, 'Clerical Ability',   'clerical-ability',  'Filing, alphabetizing, coding (Sub-Professional).','folder',          '#F59E0B')
    ON CONFLICT (slug) DO NOTHING;

    SELECT id INTO cat_verbal   FROM practice_categories WHERE slug = 'verbal-ability';
    SELECT id INTO cat_analytic FROM practice_categories WHERE slug = 'analytical-ability';
    SELECT id INTO cat_numeric  FROM practice_categories WHERE slug = 'numerical-ability';
    SELECT id INTO cat_general  FROM practice_categories WHERE slug = 'general-information';
    SELECT id INTO cat_clerical FROM practice_categories WHERE slug = 'clerical-ability';

    -- 2. FLASHCARD DECKS
    INSERT INTO flashcard_decks (admin_id, category_id, title, description, total_cards, difficulty, is_published) VALUES
    (v_admin_id, cat_verbal,   'Verbal Ability - Key Vocabulary',        'Common CSE vocabulary: synonyms, antonyms, meanings.', 10, 'medium', TRUE),
    (v_admin_id, cat_analytic, 'Analytical Ability - Analogies & Logic', 'Word analogy patterns and logical reasoning terms.',    8,  'medium', TRUE),
    (v_admin_id, cat_numeric,  'Numerical Ability - Math Concepts',      'Key formulas and concepts for the CSE numerical section.',8,'medium', TRUE),
    (v_admin_id, cat_general,  'General Info - Laws & Constitution',     'Key provisions of the 1987 Constitution and RA 6713.',  10, 'hard',   TRUE),
    (v_admin_id, cat_clerical, 'Clerical Ability - Filing Rules',        'Rules for alphabetic and numeric filing.',               6, 'easy',   TRUE)
    ON CONFLICT DO NOTHING;

    SELECT id INTO deck_verbal   FROM flashcard_decks WHERE title = 'Verbal Ability - Key Vocabulary'        LIMIT 1;
    SELECT id INTO deck_analytic FROM flashcard_decks WHERE title = 'Analytical Ability - Analogies & Logic' LIMIT 1;
    SELECT id INTO deck_numeric  FROM flashcard_decks WHERE title = 'Numerical Ability - Math Concepts'      LIMIT 1;
    SELECT id INTO deck_general  FROM flashcard_decks WHERE title = 'General Info - Laws & Constitution'     LIMIT 1;
    SELECT id INTO deck_clerical FROM flashcard_decks WHERE title = 'Clerical Ability - Filing Rules'        LIMIT 1;

    -- 3a. FLASHCARDS - Verbal Ability
    INSERT INTO flashcards (deck_id, admin_id, term, definition, sort_order) VALUES
    (deck_verbal, v_admin_id, 'Benevolent',  'Kind and generous; showing goodwill toward others.',              1),
    (deck_verbal, v_admin_id, 'Ephemeral',   'Lasting for a very short time; transitory.',                      2),
    (deck_verbal, v_admin_id, 'Verbose',     'Using more words than necessary; wordy.',                          3),
    (deck_verbal, v_admin_id, 'Lucid',       'Expressed clearly; easy to understand.',                           4),
    (deck_verbal, v_admin_id, 'Pragmatic',   'Dealing with things practically rather than theoretically.',       5),
    (deck_verbal, v_admin_id, 'Ambiguous',   'Open to more than one interpretation; unclear.',                   6),
    (deck_verbal, v_admin_id, 'Diligent',    'Having or showing care and conscientiousness in work.',            7),
    (deck_verbal, v_admin_id, 'Frugal',      'Sparing or economical with money or food; thrifty.',               8),
    (deck_verbal, v_admin_id, 'Loquacious',  'Tending to talk a great deal; talkative.',                         9),
    (deck_verbal, v_admin_id, 'Meticulous',  'Showing great attention to detail; very careful and precise.',    10);

    -- 3b. FLASHCARDS - Analytical Ability
    INSERT INTO flashcards (deck_id, admin_id, term, definition, sort_order) VALUES
    (deck_analytic, v_admin_id, 'Analogy',           'Comparison between two things to explain a relationship.', 1),
    (deck_analytic, v_admin_id, 'Deductive Reasoning','General principle leads to specific conclusion.',          2),
    (deck_analytic, v_admin_id, 'Inductive Reasoning','Specific observations lead to a general conclusion.',      3),
    (deck_analytic, v_admin_id, 'Syllogism',          'Major premise + Minor premise = Conclusion.',              4),
    (deck_analytic, v_admin_id, 'Pattern Recognition','Identifying regularities in a sequence.',                  5),
    (deck_analytic, v_admin_id, 'Data Interpretation','Reading information from graphs, tables, or charts.',      6),
    (deck_analytic, v_admin_id, 'Premise',            'A statement assumed true that forms the basis of an argument.', 7),
    (deck_analytic, v_admin_id, 'Inference',          'A conclusion reached by reasoning from available evidence.',8);

    -- 3c. FLASHCARDS - Numerical Ability
    INSERT INTO flashcards (deck_id, admin_id, term, definition, sort_order) VALUES
    (deck_numeric, v_admin_id, 'Percentage',       'Part / Whole x 100. Example: 30/200 x 100 = 15%.',          1),
    (deck_numeric, v_admin_id, 'Simple Interest',  'I = P x R x T  (Principal x Rate x Time).',                 2),
    (deck_numeric, v_admin_id, 'Average (Mean)',   'Sum of all values divided by the number of values.',         3),
    (deck_numeric, v_admin_id, 'Ratio',            'Comparison of two quantities by division. E.g., 3:4.',       4),
    (deck_numeric, v_admin_id, 'Proportion',       'An equation stating two ratios are equal. E.g., 3/4 = 6/8.',5),
    (deck_numeric, v_admin_id, 'Prime Number',     'A number greater than 1 divisible only by 1 and itself.',   6),
    (deck_numeric, v_admin_id, 'LCM',              'Least Common Multiple - smallest shared multiple of numbers.',7),
    (deck_numeric, v_admin_id, 'Speed Formula',    'Speed = Distance / Time.',                                   8);

    -- 3d. FLASHCARDS - General Information
    INSERT INTO flashcards (deck_id, admin_id, term, definition, sort_order) VALUES
    (deck_general, v_admin_id, 'Article II Sec 1',
     'The Philippines is a democratic and republican State. Sovereignty resides in the people.',              1),
    (deck_general, v_admin_id, 'RA 6713',
     'Code of Conduct and Ethical Standards for Public Officials and Employees (1989).',                      2),
    (deck_general, v_admin_id, 'SALN',
     'Statement of Assets, Liabilities, and Net Worth. Filed annually by all gov employees under RA 6713.',  3),
    (deck_general, v_admin_id, 'Civil Service Commission',
     'Central personnel agency of the Philippine government. Administers the CSE.',                          4),
    (deck_general, v_admin_id, 'Bill of Rights',
     'Article III of the 1987 Constitution. Enumerates fundamental rights of Filipino citizens.',            5),
    (deck_general, v_admin_id, 'RA 9003',
     'Ecological Solid Waste Management Act (2000). Mandates waste segregation at source.',                  6),
    (deck_general, v_admin_id, 'UDHR',
     'Universal Declaration of Human Rights. Adopted by the UN General Assembly on Dec 10, 1948.',          7),
    (deck_general, v_admin_id, 'RA 6713 Norms of Conduct',
     'Commitment to public interest, Professionalism, Justness, Political neutrality, Responsiveness.',     8),
    (deck_general, v_admin_id, 'Article II Sec 27',
     'The State shall maintain honesty and integrity in the public service against graft and corruption.',   9),
    (deck_general, v_admin_id, 'Bayanihan',
     'Filipino cultural value of communal spirit and unity for the common good.',                           10);

    -- 3e. FLASHCARDS - Clerical Ability
    INSERT INTO flashcards (deck_id, admin_id, term, definition, sort_order) VALUES
    (deck_clerical, v_admin_id, 'Alphabetic Filing',
     'Arranging records by name in A-to-Z order. File by surname first, then given name.',                    1),
    (deck_clerical, v_admin_id, 'Nothing Before Something',
     'A shorter name comes before a longer name with the same opening letters. "De" before "Del".',          2),
    (deck_clerical, v_admin_id, 'Numeric Filing',
     'Records assigned numbers and arranged in numeric order. Best for high-volume records.',                3),
    (deck_clerical, v_admin_id, 'Geographic Filing',
     'Records organized by location: country, region, province, municipality.',                              4),
    (deck_clerical, v_admin_id, 'Subject Filing',
     'Records grouped by topic or subject, arranged alphabetically within each group.',                      5),
    (deck_clerical, v_admin_id, 'Coding (Filing)',
     'Marking the filing caption on a document. First step in the filing process.',                          6);

    RAISE NOTICE 'Part 1 complete: categories, decks, flashcards inserted.';

    -- 4. MULTIPLE CHOICE QUESTIONS
    -- NOTE: correct_index is 0-based (0=A, 1=B, 2=C, 3=D)

    -- ---- VERBAL ABILITY (10 questions) ----
    INSERT INTO multiple_choice_questions
        (admin_id, category_id, prompt, options, correct_index, explanation, difficulty, sort_order, is_published)
    VALUES
    (v_admin_id, cat_verbal,
     'Choose the word most similar in meaning to "BENEVOLENT".',
     '["Hostile","Generous","Strict","Indifferent"]'::JSONB, 1,
     '"Benevolent" means kind and generous. "Generous" is the correct synonym.',
     'easy', 1, TRUE),

    (v_admin_id, cat_verbal,
     'Choose the word most OPPOSITE in meaning to "VERBOSE".',
     '["Talkative","Wordy","Concise","Elaborate"]'::JSONB, 2,
     '"Verbose" means wordy. Its antonym is "Concise" - brief and to the point.',
     'easy', 2, TRUE),

    (v_admin_id, cat_verbal,
     'Which sentence is grammatically correct?',
     '["She don''t like her job.","She doesn''t likes her job.","She doesn''t like her job.","She don''t likes her job."]'::JSONB, 2,
     'With "She" (third-person singular), the correct form is "doesn''t like" - base verb with proper auxiliary.',
     'easy', 3, TRUE),

    (v_admin_id, cat_verbal,
     'Which of the following is an example of an IDIOM?',
     '["The sun rises in the east.","She bit the bullet and accepted the challenge.","Water boils at 100 degrees.","Manila is the capital of the Philippines."]'::JSONB, 1,
     '"Bite the bullet" is an idiom meaning to endure a painful situation with courage.',
     'medium', 4, TRUE),

    (v_admin_id, cat_verbal,
     'The word "EPHEMERAL" most nearly means:',
     '["Permanent","Short-lived","Substantial","Reliable"]'::JSONB, 1,
     '"Ephemeral" means lasting for a very short time - the opposite of permanent.',
     'medium', 5, TRUE),

    (v_admin_id, cat_verbal,
     'Identify the correctly punctuated sentence.',
     '["Its a beautiful morning.","It''s a beautiful morning.","Its'' a beautiful morning.","Its a, beautiful morning."]'::JSONB, 1,
     '"It''s" is the contraction of "it is." The apostrophe replaces the letter "i."',
     'easy', 6, TRUE),

    (v_admin_id, cat_verbal,
     'Which sentence uses the PASSIVE VOICE?',
     '["The teacher corrected the exam.","The exam was corrected by the teacher.","The teacher is correcting the exam.","The teacher will correct the exam."]'::JSONB, 1,
     'Passive voice: subject receives the action. "The exam was corrected by the teacher."',
     'medium', 7, TRUE),

    (v_admin_id, cat_verbal,
     'Which word does NOT belong: Diligent, Industrious, Lethargic, Hardworking.',
     '["Diligent","Industrious","Lethargic","Hardworking"]'::JSONB, 2,
     '"Lethargic" means sluggish - the opposite of the other three words which all mean hardworking.',
     'easy', 8, TRUE),

    (v_admin_id, cat_verbal,
     'Which word correctly completes: "The senator''s speech was so ______ that the audience fell asleep."',
     '["Riveting","Inspiring","Monotonous","Engaging"]'::JSONB, 2,
     '"Monotonous" means dull and tedious, explaining why the audience fell asleep.',
     'medium', 9, TRUE),

    (v_admin_id, cat_verbal,
     'What is the meaning of the idiom "Hit the nail on the head"?',
     '["To do carpentry work","To be exactly right about something","To hurt oneself","To be very angry"]'::JSONB, 1,
     '"Hit the nail on the head" means to be exactly correct about something.',
     'medium', 10, TRUE),

    -- ---- ANALYTICAL ABILITY (10 questions) ----
    (v_admin_id, cat_analytic,
     'DOCTOR : HOSPITAL :: TEACHER : ___',
     '["Book","School","Student","Classroom"]'::JSONB, 1,
     'A doctor works in a hospital; a teacher works in a school. Profession to workplace relationship.',
     'easy', 1, TRUE),

    (v_admin_id, cat_analytic,
     'BIRD : FLOCK :: FISH : ___',
     '["Aquarium","School","Pond","Net"]'::JSONB, 1,
     'A group of birds is called a flock; a group of fish is called a school.',
     'easy', 2, TRUE),

    (v_admin_id, cat_analytic,
     'What number comes next in the series: 2, 4, 8, 16, ___?',
     '["24","30","32","36"]'::JSONB, 2,
     'Each number is multiplied by 2: 16 x 2 = 32.',
     'easy', 3, TRUE),

    (v_admin_id, cat_analytic,
     'All public servants must be honest. Juan is a public servant. Therefore:',
     '["Juan may or may not be honest.","Juan is honest.","Juan is dishonest.","Juan is not a public servant."]'::JSONB, 1,
     'Valid deductive syllogism: all public servants are honest + Juan is a public servant = Juan is honest.',
     'medium', 4, TRUE),

    (v_admin_id, cat_analytic,
     'What letter comes next in the series: A, C, E, G, ___?',
     '["H","I","J","K"]'::JSONB, 1,
     'The series skips every other letter: A, C, E, G, I.',
     'easy', 5, TRUE),

    (v_admin_id, cat_analytic,
     'GLOVE : HAND :: HELMET : ___',
     '["Neck","Arm","Head","Chest"]'::JSONB, 2,
     'A glove protects the hand; a helmet protects the head.',
     'easy', 6, TRUE),

    (v_admin_id, cat_analytic,
     'What number comes next: 1, 4, 9, 16, 25, ___?',
     '["30","35","36","49"]'::JSONB, 2,
     'These are perfect squares: 1,4,9,16,25,36 (6 squared).',
     'medium', 7, TRUE),

    (v_admin_id, cat_analytic,
     'A survey shows 60% passed Math and 70% passed English. At least what % passed BOTH?',
     '["10%","20%","30%","65%"]'::JSONB, 2,
     'By inclusion-exclusion: at least 60+70-100 = 30% passed both.',
     'hard', 8, TRUE),

    (v_admin_id, cat_analytic,
     'PEN : WRITER :: BRUSH : ___',
     '["Canvas","Painter","Paint","Gallery"]'::JSONB, 1,
     'A pen is the tool of a writer; a brush is the tool of a painter.',
     'easy', 9, TRUE),

    (v_admin_id, cat_analytic,
     'What comes next in the series: Z, X, V, T, ___?',
     '["S","R","Q","P"]'::JSONB, 1,
     'The series skips every other letter going backwards: Z, X, V, T, R.',
     'medium', 10, TRUE),

    -- ---- NUMERICAL ABILITY (10 questions) ----
    (v_admin_id, cat_numeric,
     'What is 15% of 240?',
     '["30","36","40","45"]'::JSONB, 1,
     '15% of 240 = 0.15 x 240 = 36.',
     'easy', 1, TRUE),

    (v_admin_id, cat_numeric,
     'A jacket costs P800 after a 20% discount. What is the original price?',
     '["P960","P1,000","P880","P1,200"]'::JSONB, 1,
     'P800 = 80% of original. Original = 800 / 0.80 = P1,000.',
     'medium', 2, TRUE),

    (v_admin_id, cat_numeric,
     '3 workers finish a job in 12 days. How many days for 6 workers to finish the same job?',
     '["4","6","8","24"]'::JSONB, 1,
     'Inverse proportion: 3 x 12 = 6 x d. So d = 36/6 = 6 days.',
     'medium', 3, TRUE),

    (v_admin_id, cat_numeric,
     'What is the LCM of 4 and 6?',
     '["8","10","12","24"]'::JSONB, 2,
     'Multiples of 4: 4,8,12. Multiples of 6: 6,12. LCM = 12.',
     'easy', 4, TRUE),

    (v_admin_id, cat_numeric,
     'Maria''s average in 4 tests is 82. What score does she need on the 5th test to average 85?',
     '["93","95","97","90"]'::JSONB, 2,
     'Current total = 4x82=328. Target = 5x85=425. Needed = 425-328 = 97.',
     'medium', 5, TRUE),

    (v_admin_id, cat_numeric,
     'Simplify: 3/4 + 1/6',
     '["4/10","11/12","5/6","7/12"]'::JSONB, 1,
     'LCD of 4 and 6 is 12. 3/4=9/12; 1/6=2/12. Sum = 11/12.',
     'easy', 6, TRUE),

    (v_admin_id, cat_numeric,
     'A train travels 360 km in 4 hours. What is its speed?',
     '["80 km/h","90 km/h","100 km/h","72 km/h"]'::JSONB, 1,
     'Speed = Distance / Time = 360 / 4 = 90 km/h.',
     'easy', 7, TRUE),

    (v_admin_id, cat_numeric,
     'If x + 7 = 15, what is 3x?',
     '["21","24","8","45"]'::JSONB, 1,
     'x = 15-7 = 8. So 3x = 3 x 8 = 24.',
     'easy', 8, TRUE),

    (v_admin_id, cat_numeric,
     'A salesman earns 5% commission. He sold P120,000 worth of goods. How much did he earn?',
     '["P5,000","P6,000","P7,000","P12,000"]'::JSONB, 1,
     '5% of P120,000 = 0.05 x 120,000 = P6,000.',
     'easy', 9, TRUE),

    (v_admin_id, cat_numeric,
     'The ratio of boys to girls in a class is 3:5. If there are 40 students, how many are girls?',
     '["15","20","25","30"]'::JSONB, 2,
     'Total parts = 3+5=8. Girls = (5/8) x 40 = 25.',
     'medium', 10, TRUE);

    RAISE NOTICE 'Part 2 complete: MCQ inserted.';

    -- ---- GENERAL INFORMATION (10 questions) ----
    INSERT INTO multiple_choice_questions
        (admin_id, category_id, prompt, options, correct_index, explanation, difficulty, sort_order, is_published)
    VALUES
    (v_admin_id, cat_general,
     'Which article of the 1987 Constitution declares the Philippines a "democratic and republican State"?',
     '["Article I","Article II","Article III","Article VI"]'::JSONB, 1,
     'Article II, Section 1 declares the Philippines is a democratic and republican State.',
     'medium', 1, TRUE),

    (v_admin_id, cat_general,
     'What does RA 6713 stand for?',
     '["Civil Service Law","Code of Conduct and Ethical Standards for Public Officials","Anti-Graft Act","Government Service Insurance Act"]'::JSONB, 1,
     'RA 6713 is the Code of Conduct and Ethical Standards for Public Officials and Employees (1989).',
     'easy', 2, TRUE),

    (v_admin_id, cat_general,
     'Under RA 6713, how often must government employees file their SALN?',
     '["Monthly","Quarterly","Annually","Every 3 years"]'::JSONB, 2,
     'Government employees must file their SALN (Statement of Assets, Liabilities, and Net Worth) annually.',
     'easy', 3, TRUE),

    (v_admin_id, cat_general,
     'What government body administers the Civil Service Examination?',
     '["COMELEC","Civil Service Commission","Department of Education","PRC"]'::JSONB, 1,
     'The Civil Service Commission (CSC) is the central personnel agency that administers the CSE.',
     'easy', 4, TRUE),

    (v_admin_id, cat_general,
     'The Bill of Rights is found in which article of the 1987 Philippine Constitution?',
     '["Article I","Article II","Article III","Article IV"]'::JSONB, 2,
     'The Bill of Rights is in Article III.',
     'medium', 5, TRUE),

    (v_admin_id, cat_general,
     'Which law mandates proper segregation of solid waste in the Philippines?',
     '["RA 8749","RA 9003","RA 7160","RA 6969"]'::JSONB, 1,
     'RA 9003 (Ecological Solid Waste Management Act of 2000) mandates waste segregation at source.',
     'medium', 6, TRUE),

    (v_admin_id, cat_general,
     'RA 6713 requires government employees to avoid conflicts of interest. This means:',
     '["They must not hold any private job.","They must not use public office to benefit personal financial interests.","They must live near their workplace.","They must report every day without fail."]'::JSONB, 1,
     'Conflict of interest occurs when a public official uses their position for personal financial advantage.',
     'medium', 7, TRUE),

    (v_admin_id, cat_general,
     'The Universal Declaration of Human Rights was adopted by the UN in which year?',
     '["1945","1948","1950","1955"]'::JSONB, 1,
     'The UDHR was adopted by the UN General Assembly on December 10, 1948.',
     'easy', 8, TRUE),

    (v_admin_id, cat_general,
     'Which provision prohibits political dynasties in the Philippines?',
     '["Article II, Section 26","Article VI, Section 5","Article III, Section 1","Article XI, Section 1"]'::JSONB, 0,
     'Article II, Section 26: The State shall guarantee equal access to public service and prohibit political dynasties.',
     'hard', 9, TRUE),

    (v_admin_id, cat_general,
     'Which article of the 1987 Constitution covers the Legislative Department?',
     '["Article IV","Article V","Article VI","Article VII"]'::JSONB, 2,
     'Article VI covers the Legislative Department (Congress: Senate and House of Representatives).',
     'medium', 10, TRUE),

    -- ---- CLERICAL ABILITY (10 questions) ----
    (v_admin_id, cat_clerical,
     'How should "De La Cruz, Maria Santos" be filed alphabetically?',
     '["Under D (De La Cruz)","Under M (Maria)","Under C (Cruz)","Under S (Santos)"]'::JSONB, 0,
     '"De La Cruz" is treated as one surname unit and filed under D.',
     'easy', 1, TRUE),

    (v_admin_id, cat_clerical,
     'Which name comes FIRST when filing alphabetically?',
     '["Santos, Pedro","Santos, Pablo","Santos, Patricia","Santos, Paul"]'::JSONB, 1,
     'When surnames are the same, sort by first name: Pablo, Patricia, Paul, Pedro. Pablo comes first.',
     'easy', 2, TRUE),

    (v_admin_id, cat_clerical,
     'In the "nothing before something" rule, which comes first?',
     '["MacDonald","Mac Donald","McDonalds","Macdonald"]'::JSONB, 1,
     '"Mac Donald" (with a space) comes before "MacDonald" (no space). Nothing (space) before something.',
     'medium', 3, TRUE),

    (v_admin_id, cat_clerical,
     'What is the FIRST step in the filing process?',
     '["Storing the document","Inspecting the document for release","Coding the document","Cross-referencing"]'::JSONB, 1,
     'The first step is inspecting the document to ensure it has been released for filing.',
     'medium', 4, TRUE),

    (v_admin_id, cat_clerical,
     'Numbers in alphabetic filing are treated as:',
     '["Ignored","Filed after Z","Spelled out and filed accordingly","Filed before A"]'::JSONB, 2,
     'Numbers are spelled out. "7-Eleven" is filed as "Seven Eleven" under S.',
     'medium', 5, TRUE),

    (v_admin_id, cat_clerical,
     'Which filing system is best for a large office using account numbers?',
     '["Alphabetic","Geographic","Subject","Numeric"]'::JSONB, 3,
     'Numeric filing is ideal for large volumes of records already identified by numbers.',
     'medium', 6, TRUE),

    (v_admin_id, cat_clerical,
     'Which surname is filed LAST among: Reyes, Ramos, Rivera, Rizal?',
     '["Reyes","Ramos","Rivera","Rizal"]'::JSONB, 3,
     'Alphabetical order: Ramos, Reyes, Rivera, Rizal. "Rizal" comes last.',
     'easy', 7, TRUE),

    (v_admin_id, cat_clerical,
     'Cross-referencing in filing means:',
     '["Destroying duplicates","Creating a secondary reference for alternate names or subjects","Filing numerically","Alphabetizing within a folder"]'::JSONB, 1,
     'A cross-reference guide points to where the original record is filed under an alternate name or subject.',
     'hard', 8, TRUE),

    (v_admin_id, cat_clerical,
     'How would "St. Clair, James" be filed alphabetically?',
     '["Under S as Saint Clair","Under C (Clair)","Under J (James)","Under T (the word after St.)"]'::JSONB, 0,
     '"St." is spelled as "Saint." Filed as "Saint Clair" under S.',
     'hard', 9, TRUE),

    (v_admin_id, cat_clerical,
     'When a company name starts with "The," how is it filed?',
     '["Filed under T","Ignore The and file under the next significant word","Filed under the owner''s name","Filed last"]'::JSONB, 1,
     '"The" at the start of a company name is disregarded. "The Manila Hotel" is filed under M.',
     'medium', 10, TRUE);

    RAISE NOTICE 'Part 3 complete: General Info and Clerical MCQ inserted.';

    -- 5. TRUE / FALSE QUESTIONS
    INSERT INTO true_false_questions
        (admin_id, category_id, statement, answer, explanation, difficulty, sort_order, is_published)
    VALUES
    -- Verbal Ability
    (v_admin_id, cat_verbal,
     'The word "LUCID" means difficult to understand.',
     FALSE,
     '"Lucid" means clear and easy to understand. Its opposite would be "obscure" or "ambiguous."',
     'easy', 1, TRUE),

    (v_admin_id, cat_verbal,
     'An antonym is a word that has the same meaning as another word.',
     FALSE,
     'An ANTONYM has the OPPOSITE meaning. A SYNONYM has the same meaning.',
     'easy', 2, TRUE),

    (v_admin_id, cat_verbal,
     'The sentence "He and I went to the market" is grammatically correct.',
     TRUE,
     '"He and I" are correct subject pronouns. Object pronouns "him and me" would be wrong here.',
     'easy', 3, TRUE),

    (v_admin_id, cat_verbal,
     'Idioms should always be interpreted based on the literal meaning of their words.',
     FALSE,
     'Idioms have figurative meanings. "Break a leg" does not mean to injure yourself - it means "good luck."',
     'easy', 4, TRUE),

    -- Analytical Ability
    (v_admin_id, cat_analytic,
     'In the number series 3, 6, 9, 12, the next number is 15.',
     TRUE,
     'Each number increases by 3 (common difference). 12 + 3 = 15.',
     'easy', 5, TRUE),

    (v_admin_id, cat_analytic,
     'Inductive reasoning draws a specific conclusion from a general principle.',
     FALSE,
     'That is DEDUCTIVE reasoning. INDUCTIVE reasoning moves from specific observations to a general conclusion.',
     'medium', 6, TRUE),

    (v_admin_id, cat_analytic,
     'The analogy "Eye : See :: Ear : Hear" is a function/purpose relationship.',
     TRUE,
     'Eyes are used to see; ears are used to hear. This is a part-to-function analogy.',
     'medium', 7, TRUE),

    -- Numerical Ability
    (v_admin_id, cat_numeric,
     '20% of 500 is equal to 100.',
     TRUE,
     '20% of 500 = 0.20 x 500 = 100. Correct.',
     'easy', 8, TRUE),

    (v_admin_id, cat_numeric,
     'The LCM of 3 and 7 is 14.',
     FALSE,
     'LCM of 3 and 7 is 21. They share no common factors other than 1, so LCM = 3 x 7 = 21.',
     'easy', 9, TRUE),

    (v_admin_id, cat_numeric,
     'If a train travels 90 km/h for 2 hours, it covers a distance of 180 km.',
     TRUE,
     'Distance = Speed x Time = 90 x 2 = 180 km.',
     'easy', 10, TRUE),

    -- General Information
    (v_admin_id, cat_general,
     'RA 6713 requires all government employees to file a SALN every year.',
     TRUE,
     'Under RA 6713, all public officials and employees must submit their SALN annually.',
     'easy', 11, TRUE),

    (v_admin_id, cat_general,
     'The Bill of Rights in the 1987 Constitution is found in Article II.',
     FALSE,
     'The Bill of Rights is in Article III. Article II contains the Declaration of Principles and State Policies.',
     'medium', 12, TRUE),

    (v_admin_id, cat_general,
     'The Universal Declaration of Human Rights was adopted in 1948.',
     TRUE,
     'The UDHR was adopted by the UN General Assembly on December 10, 1948.',
     'easy', 13, TRUE),

    (v_admin_id, cat_general,
     'The Civil Service Commission is under the direct control of the Office of the President.',
     FALSE,
     'The CSC is an independent constitutional commission, not under the Executive Branch.',
     'hard', 14, TRUE),

    (v_admin_id, cat_general,
     'RA 9003 mandates the segregation of solid waste at the source.',
     TRUE,
     'RA 9003 (Ecological Solid Waste Management Act) requires waste segregation at the household and community level.',
     'easy', 15, TRUE),

    -- Clerical Ability
    (v_admin_id, cat_clerical,
     'In alphabetic filing, "The" at the beginning of a company name is considered in determining filing order.',
     FALSE,
     '"The" is disregarded. "The Manila Times" is filed under M (Manila), not T.',
     'medium', 16, TRUE),

    (v_admin_id, cat_clerical,
     'Numbers in a filing system are spelled out and filed alphabetically.',
     TRUE,
     'Numbers are treated as if spelled out. "4 Seasons Hotel" is filed as "Four Seasons Hotel" under F.',
     'medium', 17, TRUE),

    (v_admin_id, cat_clerical,
     'In alphabetic filing, "Dela Cruz" and "De la Cruz" are filed differently.',
     FALSE,
     'Regardless of how the prefix is written, "Dela Cruz" and "De la Cruz" are considered the same and filed under D.',
     'hard', 18, TRUE);


    -- 6. MATCHING PAIRS
    INSERT INTO matching_pairs (admin_id, category_id, set_title, term, definition, sort_order, is_published)
    VALUES
    -- Set 1: Verbal - Synonyms
    (v_admin_id, cat_verbal, 'Synonyms', 'Benevolent',  'Kind and generous',             1, TRUE),
    (v_admin_id, cat_verbal, 'Synonyms', 'Ephemeral',   'Short-lived or transitory',      2, TRUE),
    (v_admin_id, cat_verbal, 'Synonyms', 'Verbose',     'Using too many words; wordy',    3, TRUE),
    (v_admin_id, cat_verbal, 'Synonyms', 'Lucid',       'Clear and easy to understand',   4, TRUE),

    -- Set 2: Analytical - Reasoning Types
    (v_admin_id, cat_analytic, 'Types of Reasoning', 'Deductive',  'General principle to specific conclusion', 1, TRUE),
    (v_admin_id, cat_analytic, 'Types of Reasoning', 'Inductive',  'Specific observations to general conclusion', 2, TRUE),
    (v_admin_id, cat_analytic, 'Types of Reasoning', 'Analogy',    'Comparison showing a relationship',        3, TRUE),
    (v_admin_id, cat_analytic, 'Types of Reasoning', 'Syllogism',  'Premise + Premise = Conclusion',           4, TRUE),

    -- Set 3: Numerical - Math Terms
    (v_admin_id, cat_numeric, 'Math Concepts', 'Percentage',     'Part / Whole x 100',            1, TRUE),
    (v_admin_id, cat_numeric, 'Math Concepts', 'Simple Interest','I = P x R x T',                 2, TRUE),
    (v_admin_id, cat_numeric, 'Math Concepts', 'Mean (Average)', 'Sum of values / Count',          3, TRUE),
    (v_admin_id, cat_numeric, 'Math Concepts', 'Ratio',          'Comparison of two quantities by division', 4, TRUE),

    -- Set 4: General Info - Philippine Laws
    (v_admin_id, cat_general, 'Philippine Laws', 'RA 6713', 'Code of Conduct and Ethical Standards',           1, TRUE),
    (v_admin_id, cat_general, 'Philippine Laws', 'RA 9003', 'Ecological Solid Waste Management Act',           2, TRUE),
    (v_admin_id, cat_general, 'Philippine Laws', 'RA 8749', 'Philippine Clean Air Act',                        3, TRUE),
    (v_admin_id, cat_general, 'Philippine Laws', 'SALN',    'Statement of Assets, Liabilities, and Net Worth', 4, TRUE),

    -- Set 5: Clerical - Filing Methods
    (v_admin_id, cat_clerical, 'Filing Methods', 'Alphabetic Filing', 'Arranged by name from A to Z',          1, TRUE),
    (v_admin_id, cat_clerical, 'Filing Methods', 'Numeric Filing',    'Records arranged by assigned number',    2, TRUE),
    (v_admin_id, cat_clerical, 'Filing Methods', 'Geographic Filing', 'Organized by location or region',       3, TRUE),
    (v_admin_id, cat_clerical, 'Filing Methods', 'Subject Filing',    'Grouped by topic or subject matter',    4, TRUE);

    RAISE NOTICE '=== All seed data inserted successfully! ===';
    RAISE NOTICE 'Inserted: 5 categories, 5 decks, 42 flashcards, 50 MCQ, 18 T/F, 20 matching pairs.';
END $$;
-- =============================================================================
-- END OF SEED SCRIPT
-- =============================================================================
