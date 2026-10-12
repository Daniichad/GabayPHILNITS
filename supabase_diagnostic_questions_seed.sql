-- ==============================================================================
-- GABAY PHILCSE: DIAGNOSTIC QUESTIONS SCHEMA ALIGNMENT & 200-QUESTION SEED SCRIPT
-- ==============================================================================
-- Table: diagnostic_questions
-- Covers 5 Exam Categories (40 Questions Each = 200 Total Questions):
--   1. General Information (40 questions - Both Pro & Sub-Pro)
--   2. Verbal Ability      (40 questions - Both Pro & Sub-Pro)
--   3. Numerical Ability   (40 questions - Both Pro & Sub-Pro)
--   4. Analytical Ability  (40 questions - Professional level)
--   5. Clerical Operations (40 questions - Sub-Professional level)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: Table Schema (No explanation, No sort_order)
-- ------------------------------------------------------------------------------
-- Base table:
CREATE TABLE IF NOT EXISTS public.diagnostic_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    question TEXT NOT NULL,
    options TEXT[] NOT NULL,
    correct_answer TEXT NOT NULL,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Drop columns explanation and sort_order if they previously existed:
ALTER TABLE public.diagnostic_questions 
    DROP COLUMN IF EXISTS explanation;

ALTER TABLE public.diagnostic_questions 
    DROP COLUMN IF EXISTS sort_order;

-- Clean up sort_order index if existing:
DROP INDEX IF EXISTS idx_diag_questions_sort;

-- Index for fast category lookups in the mobile app:
CREATE INDEX IF NOT EXISTS idx_diag_questions_cat_active 
    ON public.diagnostic_questions (category, is_active);

-- Enable Row Level Security (RLS) & Allow public read access for active diagnostic questions:
ALTER TABLE public.diagnostic_questions ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'diagnostic_questions' 
        AND policyname = 'Allow active diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active diagnostic questions read" 
            ON public.diagnostic_questions FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- STEP 2: Clear Existing Questions (Optional / Safe Re-seed)
-- ------------------------------------------------------------------------------
-- TRUNCATE TABLE public.diagnostic_questions;

-- ------------------------------------------------------------------------------
-- STEP 3: Insert 200 CSE Sample Questions (40 per subject)
-- ------------------------------------------------------------------------------
INSERT INTO public.diagnostic_questions (
    category, 
    question, 
    options, 
    correct_answer, 
    is_active
) VALUES
    ('General Information', 'Republic Act No. 6713 is officially known as:', ARRAY['Anti-Graft and Corrupt Practices Act', 'Code of Conduct and Ethical Standards for Public Officials and Employees', 'Civil Service Reform Act', 'Government Procurement Reform Act']::text[], 'Code of Conduct and Ethical Standards for Public Officials and Employees', true),
    ('General Information', 'According to Article II, Section 1 of the 1987 Philippine Constitution, sovereignty resides in the:', ARRAY['President', 'Congress', 'People', 'Supreme Court']::text[], 'People', true),
    ('General Information', 'Under the 1987 Constitution, executive power is vested in the:', ARRAY['Prime Minister', 'President of the Philippines', 'Cabinet', 'Congress']::text[], 'President of the Philippines', true),
    ('General Information', 'Which chamber of Congress has the sole power to try and decide all cases of impeachment?', ARRAY['House of Representatives', 'Senate', 'Supreme Court', 'Sandiganbayan']::text[], 'Senate', true),
    ('General Information', 'Under RA 6713, public officials must submit their Statement of Assets, Liabilities, and Net Worth (SALN) within how many days after assumption of office?', ARRAY['15 days', '30 days', '60 days', '90 days']::text[], '30 days', true),
    ('General Information', 'Which independent constitutional body is tasked as the ''protector of the people'' against bureaucratic abuse?', ARRAY['Civil Service Commission', 'Commission on Audit', 'Office of the Ombudsman', 'Commission on Human Rights']::text[], 'Office of the Ombudsman', true),
    ('General Information', 'According to Article XIV, Section 6 of the 1987 Constitution, the national language of the Philippines is:', ARRAY['Tagalog', 'Filipino', 'English', 'Filipino and English']::text[], 'Filipino', true),
    ('General Information', 'Which constitutional commission has jurisdiction over the recruitment and career service of civil servants?', ARRAY['Commission on Elections', 'Commission on Audit', 'Civil Service Commission', 'Commission on Appointments']::text[], 'Civil Service Commission', true),
    ('General Information', 'The Bill of Rights is enshrined in which Article of the 1987 Constitution?', ARRAY['Article II', 'Article III', 'Article IV', 'Article VI']::text[], 'Article III', true),
    ('General Information', 'What is the statutory deadline for public officials to respond to letters and requests from the public under RA 6713?', ARRAY['5 working days', '10 working days', '15 working days', '30 working days']::text[], '15 working days', true),
    ('General Information', 'Who has the sole power to declare the existence of a state of war in the Philippines?', ARRAY['The President', 'The Supreme Court', 'The National Security Council', 'Congress by two-thirds vote of both Houses in joint session']::text[], 'Congress by two-thirds vote of both Houses in joint session', true),
    ('General Information', 'Under the 1987 Constitution, how many years is the term of office of the President of the Philippines?', ARRAY['4 years with reelection', '5 years without reelection', '6 years without reelection', '6 years with one reelection']::text[], '6 years without reelection', true),
    ('General Information', 'What is the minimum age required by the Constitution to be appointed as a member of the Supreme Court?', ARRAY['35 years old', '40 years old', '45 years old', '50 years old']::text[], '40 years old', true),
    ('General Information', 'Which principle affirms that public office is a public trust and public officers must remain accountable to the people?', ARRAY['Principle of Checks and Balances', 'Accountability of Public Officers', 'Doctrine of Parens Patriae', 'Principle of Judicial Review']::text[], 'Accountability of Public Officers', true),
    ('General Information', 'Republic Act No. 9003 is also known as the:', ARRAY['Clean Air Act of 1999', 'Ecological Solid Waste Management Act of 2000', 'Clean Water Act of 2004', 'Climate Change Act of 2009']::text[], 'Ecological Solid Waste Management Act of 2000', true),
    ('General Information', 'Republic Act No. 8749 is known as the Philippine:', ARRAY['Clean Water Act', 'Clean Air Act of 1999', 'Toxic Substances Act', 'Environmental Policy Act']::text[], 'Clean Air Act of 1999', true),
    ('General Information', 'Which international treaty protects human rights globally and was adopted by the United Nations in 1948?', ARRAY['Geneva Convention', 'Universal Declaration of Human Rights', 'Kyoto Protocol', 'Paris Agreement']::text[], 'Universal Declaration of Human Rights', true),
    ('General Information', 'What is the maximum period for which the President can suspend the privilege of the writ of habeas corpus without congressional extension?', ARRAY['30 days', '60 days', '90 days', '120 days']::text[], '60 days', true),
    ('General Information', 'The rule stating that evidence obtained in violation of the right against unreasonable searches and seizures is inadmissible is known as:', ARRAY['Miranda Doctrine', 'Exclusionary Rule', 'Fruit of the Poisonous Tree', 'Hearsay Rule']::text[], 'Exclusionary Rule', true),
    ('General Information', 'Under RA 6713, public officials are prohibited from having financial and material interest in any transaction requiring the approval of their office. This is known as:', ARRAY['Divestment', 'Conflict of Interest', 'Graft', 'Nepotism']::text[], 'Conflict of Interest', true),
    ('General Information', 'Which constitutional commission is responsible for examining and auditing all government revenues and expenditures?', ARRAY['Civil Service Commission', 'Commission on Audit', 'Bureau of Internal Revenue', 'Department of Budget and Management']::text[], 'Commission on Audit', true),
    ('General Information', 'The Philippine Clean Water Act is governed by which Republic Act?', ARRAY['RA 9275', 'RA 8749', 'RA 9003', 'RA 9729']::text[], 'RA 9275', true),
    ('General Information', 'Under the 1987 Constitution, how many Senators compose the Philippine Senate?', ARRAY['12', '24', '250', '300']::text[], '24', true),
    ('General Information', 'Which right guarantees that no person shall be deprived of life, liberty, or property without:', ARRAY['Probable Cause', 'Due Process of Law', 'Equal Protection', 'Search Warrant']::text[], 'Due Process of Law', true),
    ('General Information', 'Which constitutional body recommends appointees to the Judiciary to the President?', ARRAY['Commission on Appointments', 'Judicial and Bar Council', 'Integrated Bar of the Philippines', 'Supreme Court En Banc']::text[], 'Judicial and Bar Council', true),
    ('General Information', 'Under RA 6713, what must a newly assumed public official do if a conflict of interest exists regarding private business ownership?', ARRAY['Resign immediately', 'Divest shareholdings or resign from private position within 30 days', 'Transfer ownership to spouse', 'Declare it without changes']::text[], 'Divest shareholdings or resign from private position within 30 days', true),
    ('General Information', 'The state policy promoting a balanced and healthful ecology is found in which section of the Constitution?', ARRAY['Article II, Section 16', 'Article III, Section 1', 'Article XII, Section 2', 'Article XIV, Section 10']::text[], 'Article II, Section 16', true),
    ('General Information', 'What is the retirement age for Justices of the Supreme Court and judges of lower courts in the Philippines?', ARRAY['60 years old', '65 years old', '70 years old', '75 years old']::text[], '70 years old', true),
    ('General Information', 'Republic Act No. 9729 is known as the:', ARRAY['Disaster Risk Reduction Act', 'Climate Change Act of 2009', 'Clean Energy Act', 'Renewable Energy Act']::text[], 'Climate Change Act of 2009', true),
    ('General Information', 'The landmark Philippine environmental doctrine establishing intergenerational responsibility for natural resources is:', ARRAY['Oposa v. Factoran', 'Chavez v. PEA', 'La Bugal v. Ramos', 'MMDA v. Concerned Residents of Manila Bay']::text[], 'Oposa v. Factoran', true),
    ('General Information', 'The power of the Supreme Court to declare a law or executive action unconstitutional is called:', ARRAY['Judicial Legislation', 'Judicial Review', 'Executive Clemenecy', 'Police Power']::text[], 'Judicial Review', true),
    ('General Information', 'Who serves as the Commander-in-Chief of all armed forces of the Philippines?', ARRAY['Secretary of National Defense', 'Chief of Staff of the AFP', 'President of the Philippines', 'Senate President']::text[], 'President of the Philippines', true),
    ('General Information', 'Which article of the 1987 Constitution deals with the Civil Service Commission, COMELEC, and COA?', ARRAY['Article VIII', 'Article IX', 'Article X', 'Article XI']::text[], 'Article IX', true),
    ('General Information', 'Under RA 6713, public officials are forbidden from accepting gifts, favors, or loans in connection with official duties. This is the norm of:', ARRAY['Commitment to public interest', 'Professionalism', 'Justness and sincerity', 'Simple living']::text[], 'Commitment to public interest', true),
    ('General Information', 'The right of peaceable assembly and petition the government for redress of grievances is protected under:', ARRAY['Article III, Section 4', 'Article III, Section 1', 'Article III, Section 8', 'Article III, Section 15']::text[], 'Article III, Section 4', true),
    ('General Information', 'The Commission on Human Rights (CHR) is an independent office created under which Article of the 1987 Constitution?', ARRAY['Article II', 'Article III', 'Article XIII', 'Article XVI']::text[], 'Article XIII', true),
    ('General Information', 'What is the inherent power of the State to take private property for public use upon payment of just compensation?', ARRAY['Police Power', 'Power of Taxation', 'Power of Eminent Domain', 'Power of Escheat']::text[], 'Power of Eminent Domain', true),
    ('General Information', 'Under RA 6713, how long does the post-employment prohibition last regarding practicing before the office previously headed?', ARRAY['6 months', '1 year', '2 years', '3 years']::text[], '1 year', true),
    ('General Information', 'Which international agreement aims to limit global temperature increase to well below 2 degrees Celsius?', ARRAY['Montreal Protocol', 'Paris Agreement', 'Ramsar Convention', 'Stockholm Convention']::text[], 'Paris Agreement', true),
    ('General Information', 'The norm under RA 6713 that mandates public servants to lead modest lives appropriate to their positions is:', ARRAY['Simple living', 'Professionalism', 'Responsiveness to the public', 'Nationalism and patriotism']::text[], 'Simple living', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''BENEVOLENT'':', ARRAY['Charitable', 'Malevolent', 'Generous', 'Sympathetic']::text[], 'Malevolent', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''METICULOUS'':', ARRAY['Careless', 'Thorough', 'Hasty', 'Humble']::text[], 'Thorough', true),
    ('Verbal Ability', 'Identify the correctly spelled word:', ARRAY['Acommodate', 'Accommodate', 'Acomodate', 'Accomodate']::text[], 'Accommodate', true),
    ('Verbal Ability', 'Complete the sentence: ''Neither of the candidates _____ prepared for the interview.''', ARRAY['was', 'were', 'are', 'have been']::text[], 'was', true),
    ('Verbal Ability', 'Identify the error in: ''She don''''t know the correct procedure for submission.''', ARRAY['She', 'don''t', 'the correct', 'for submission']::text[], 'don''t', true),
    ('Verbal Ability', 'Choose the word that completes the analogy: LIGHT : DARK :: KNOWLEDGE : _____', ARRAY['Ignorance', 'Wisdom', 'Book', 'Intelligence']::text[], 'Ignorance', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''OBSTINATE'':', ARRAY['Stubborn', 'Flexible', 'Rigid', 'Firm']::text[], 'Flexible', true),
    ('Verbal Ability', 'Complete the sentence: ''The committee _____ submitted its final report.''', ARRAY['has', 'have', 'are', 'were']::text[], 'has', true),
    ('Verbal Ability', 'Select the sentence with correct grammar and subject-verb agreement:', ARRAY['Each of the participants have received an award.', 'Each of the participants has received an award.', 'Each of the participant have received an award.', 'Each of the participants were receiving an award.']::text[], 'Each of the participants has received an award.', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''CANDID'':', ARRAY['Deceptive', 'Frank', 'Secretive', 'Cautious']::text[], 'Frank', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''AMBIGUOUS'':', ARRAY['Unclear', 'Definite', 'Lucid', 'Transparent']::text[], 'Unclear', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''EPHEMERAL'':', ARRAY['Transient', 'Fleeting', 'Permanent', 'Momentary']::text[], 'Permanent', true),
    ('Verbal Ability', 'Complete the sentence: ''The director, along with his assistants, _____ attending the seminar.''', ARRAY['is', 'are', 'were', 'have been']::text[], 'is', true),
    ('Verbal Ability', 'Identify the correctly spelled word:', ARRAY['Occurence', 'Occurrence', 'Occurrance', 'Ocurrence']::text[], 'Occurrence', true),
    ('Verbal Ability', 'Choose the analogy: ARCHITECT : BUILDING :: COMPOSER : _____', ARRAY['Symphony', 'Instrument', 'Orchestra', 'Singer']::text[], 'Symphony', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''LACONIC'':', ARRAY['Verbose', 'Brief', 'Talkative', 'Elaborate']::text[], 'Brief', true),
    ('Verbal Ability', 'Identify the error in: ''Between you and I, the decision was unfair.''', ARRAY['Between', 'you and I', 'the decision', 'was unfair']::text[], 'you and I', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''AFFLUENT'':', ARRAY['Wealthy', 'Impoverished', 'Prosperous', 'Abundant']::text[], 'Impoverished', true),
    ('Verbal Ability', 'Complete the sentence: ''A number of applicants _____ already submitted their credentials.''', ARRAY['has', 'have', 'is', 'was']::text[], 'have', true),
    ('Verbal Ability', 'Select the sentence with correct punctuation:', ARRAY['Its a good thing the dog found it''s bone.', 'It''s a good thing the dog found its bone.', 'It''s a good thing the dog found it''s bone.', 'Its a good thing the dog found its bone.']::text[], 'It''s a good thing the dog found its bone.', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''PRUDENT'':', ARRAY['Reckless', 'Wise', 'Foolish', 'Hasty']::text[], 'Wise', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''TRANQUIL'':', ARRAY['Serene', 'Peaceful', 'Agitated', 'Calm']::text[], 'Agitated', true),
    ('Verbal Ability', 'Choose the analogy: THERMOMETER : TEMPERATURE :: BAROMETER : _____', ARRAY['Humidity', 'Pressure', 'Wind', 'Rainfall']::text[], 'Pressure', true),
    ('Verbal Ability', 'Complete the sentence: ''One of the computers in the lab _____ not working.''', ARRAY['is', 'are', 'were', 'have been']::text[], 'is', true),
    ('Verbal Ability', 'Identify the correctly spelled word:', ARRAY['Priviledge', 'Privilege', 'Privelege', 'Privelidge']::text[], 'Privilege', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''UBIQUITOUS'':', ARRAY['Omnipresent', 'Rare', 'Scarce', 'Unique']::text[], 'Omnipresent', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''COMPLACENT'':', ARRAY['Smug', 'Content', 'Concerned', 'Satisfied']::text[], 'Concerned', true),
    ('Verbal Ability', 'Complete the sentence: ''If he _____ studied harder, he would have passed the examination.''', ARRAY['had', 'have', 'would have', 'has']::text[], 'had', true),
    ('Verbal Ability', 'Identify the error in: ''The data shows that customer satisfaction has improved.''', ARRAY['The', 'data shows', 'that customer', 'has improved']::text[], 'data shows', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''DILIGENT'':', ARRAY['Hardworking', 'Lazy', 'Negligent', 'Careless']::text[], 'Hardworking', true),
    ('Verbal Ability', 'Choose the analogy: BIRD : FLOCK :: FISH : _____', ARRAY['Pack', 'School', 'Herd', 'Swarm']::text[], 'School', true),
    ('Verbal Ability', 'Complete the sentence: ''Ten kilometers _____ a long distance to walk.''', ARRAY['is', 'are', 'were', 'have been']::text[], 'is', true),
    ('Verbal Ability', 'Identify the correctly spelled word:', ARRAY['Maintenance', 'Maintainance', 'Maintanance', 'Maintenence']::text[], 'Maintenance', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''GREGARIOUS'':', ARRAY['Sociable', 'Outgoing', 'Solitary', 'Companionable']::text[], 'Solitary', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''TENACIOUS'':', ARRAY['Persistent', 'Weak', 'Hesitant', 'Yielding']::text[], 'Persistent', true),
    ('Verbal Ability', 'Complete the sentence: ''Either the supervisor or the employees _____ responsible for the oversight.''', ARRAY['is', 'are', 'was', 'has been']::text[], 'are', true),
    ('Verbal Ability', 'Identify the meaning of the idiom ''to burn the midnight oil'':', ARRAY['To waste electricity', 'To work late into the night', 'To start a fire', 'To wake up early']::text[], 'To work late into the night', true),
    ('Verbal Ability', 'Choose the word that is most OPPOSITE in meaning to ''METICULOUS'':', ARRAY['Careful', 'Scrupulous', 'Sloppy', 'Precise']::text[], 'Sloppy', true),
    ('Verbal Ability', 'Select the sentence with correct modifier placement:', ARRAY['Walking down the street, the trees were beautiful.', 'Walking down the street, Maria noticed the beautiful trees.', 'The trees were noticed by Maria walking down the street beautiful.', 'Walking down the street, beautiful were the trees.']::text[], 'Walking down the street, Maria noticed the beautiful trees.', true),
    ('Verbal Ability', 'Choose the word that is most SIMILAR in meaning to ''RESILIENT'':', ARRAY['Fragile', 'Elastic', 'Vulnerable', 'Rigid']::text[], 'Elastic', true),
    ('Numerical Ability', 'Solve for x: 4x + 12 = 36.', ARRAY['5', '6', '7', '8']::text[], '6', true),
    ('Numerical Ability', 'What is 15% of 400?', ARRAY['50', '60', '70', '80']::text[], '60', true),
    ('Numerical Ability', 'Find the next number in the sequence: 3, 7, 15, 31, _____', ARRAY['45', '58', '63', '65']::text[], '63', true),
    ('Numerical Ability', 'If a car travels at a constant speed of 60 km/h, how far does it travel in 2 hours and 30 minutes?', ARRAY['120 km', '135 km', '150 km', '160 km']::text[], '150 km', true),
    ('Numerical Ability', 'Evaluate the expression: (12 ÷ 3) + (5 × 4) - 6.', ARRAY['16', '18', '20', '22']::text[], '18', true),
    ('Numerical Ability', 'Find the average score of a student who scored 85, 90, 78, and 87.', ARRAY['84', '85', '86', '87']::text[], '85', true),
    ('Numerical Ability', 'An item originally priced at ₱1,000 is given a 20% discount. What is the final price?', ARRAY['₱750', '₱800', '₱850', '₱900']::text[], '₱800', true),
    ('Numerical Ability', 'What is the sum of 2/5 and 1/3?', ARRAY['3/8', '7/15', '11/15', '13/15']::text[], '11/15', true),
    ('Numerical Ability', 'Find the next number in the sequence: 100, 90, 81, 73, _____', ARRAY['64', '65', '66', '67']::text[], '66', true),
    ('Numerical Ability', 'If 5 workers can complete a job in 6 days, how many days will 10 workers take working at the same rate?', ARRAY['2 days', '3 days', '4 days', '5 days']::text[], '3 days', true),
    ('Numerical Ability', 'What is 35% written as a fraction in simplest form?', ARRAY['7/20', '7/25', '3/10', '35/100']::text[], '7/20', true),
    ('Numerical Ability', 'If a shirt costs ₱450 and value-added tax (VAT) of 12% is added, what is the total amount to pay?', ARRAY['₱498', '₱504', '₱510', '₱520']::text[], '₱504', true),
    ('Numerical Ability', 'Solve for y: 3(y - 4) = 21.', ARRAY['9', '10', '11', '12']::text[], '11', true),
    ('Numerical Ability', 'What is the greatest common factor (GCF) of 24 and 36?', ARRAY['6', '8', '12', '18']::text[], '12', true),
    ('Numerical Ability', 'What is the least common multiple (LCM) of 6, 8, and 12?', ARRAY['24', '36', '48', '72']::text[], '24', true),
    ('Numerical Ability', 'If the ratio of boys to girls in a class is 3:5 and there are 15 boys, how many girls are there?', ARRAY['20', '25', '30', '35']::text[], '25', true),
    ('Numerical Ability', 'A recipe requires 3/4 cup of sugar. How many cups of sugar are needed for 4 batches?', ARRAY['2 cups', '2.5 cups', '3 cups', '3.5 cups']::text[], '3 cups', true),
    ('Numerical Ability', 'A train leaves at 8:15 AM and arrives at 11:45 AM. How long did the trip take?', ARRAY['3 hours', '3 hours 15 minutes', '3 hours 30 minutes', '3 hours 45 minutes']::text[], '3 hours 30 minutes', true),
    ('Numerical Ability', 'If 12 pens cost ₱180, what is the cost of 7 pens?', ARRAY['₱95', '₱105', '₱110', '₱115']::text[], '₱105', true),
    ('Numerical Ability', 'Convert 0.375 into a fraction in lowest terms:', ARRAY['3/8', '5/12', '7/16', '3/5']::text[], '3/8', true),
    ('Numerical Ability', 'What is the perimeter of a rectangle with length 14 cm and width 9 cm?', ARRAY['42 cm', '46 cm', '50 cm', '126 cm']::text[], '46 cm', true),
    ('Numerical Ability', 'What is the area of a triangle with a base of 10 cm and a height of 8 cm?', ARRAY['36 sq cm', '40 sq cm', '80 sq cm', '90 sq cm']::text[], '40 sq cm', true),
    ('Numerical Ability', 'Find the missing number in the series: 2, 6, 18, 54, _____', ARRAY['108', '144', '162', '180']::text[], '162', true),
    ('Numerical Ability', 'A tank is 3/5 full. After adding 20 liters of water, it becomes 4/5 full. What is the total capacity of the tank?', ARRAY['80 liters', '100 liters', '120 liters', '150 liters']::text[], '100 liters', true),
    ('Numerical Ability', 'The sum of two consecutive integers is 47. What is the smaller integer?', ARRAY['22', '23', '24', '25']::text[], '23', true),
    ('Numerical Ability', 'If 15% of a number is 45, what is the number?', ARRAY['250', '300', '350', '400']::text[], '300', true),
    ('Numerical Ability', 'A man is 3 times as old as his son. If the sum of their ages is 48, how old is the son?', ARRAY['10 years old', '12 years old', '14 years old', '16 years old']::text[], '12 years old', true),
    ('Numerical Ability', 'Find the value of 5! (5 factorial):', ARRAY['60', '100', '120', '150']::text[], '120', true),
    ('Numerical Ability', 'If an item is sold for ₱960 with a 20% markup on cost, what was the original cost?', ARRAY['₱750', '₱800', '₱820', '₱840']::text[], '₱800', true),
    ('Numerical Ability', 'What is 25% of 80 plus 50% of 40?', ARRAY['30', '35', '40', '45']::text[], '40', true),
    ('Numerical Ability', 'If 8 men can paint a wall in 6 hours, how long will it take 4 men to paint the same wall?', ARRAY['10 hours', '12 hours', '14 hours', '16 hours']::text[], '12 hours', true),
    ('Numerical Ability', 'Find the next number in the sequence: 1, 4, 9, 16, 25, _____', ARRAY['30', '32', '36', '49']::text[], '36', true),
    ('Numerical Ability', 'A discount of 15% on a ₱2,000 purchase saves you how much?', ARRAY['₱200', '₱250', '₱300', '₱350']::text[], '₱300', true),
    ('Numerical Ability', 'If x/3 = 12, what is the value of 2x - 10?', ARRAY['62', '68', '72', '76']::text[], '62', true),
    ('Numerical Ability', 'What is the median of the following set of numbers: 5, 8, 12, 14, 18, 22, 25?', ARRAY['12', '13', '14', '15']::text[], '14', true),
    ('Numerical Ability', 'Convert 7/8 into a decimal:', ARRAY['0.825', '0.850', '0.875', '0.895']::text[], '0.875', true),
    ('Numerical Ability', 'If a printer prints 40 pages per minute, how many pages will it print in 15 minutes?', ARRAY['450', '500', '600', '750']::text[], '600', true),
    ('Numerical Ability', 'What is the value of 2^5?', ARRAY['16', '24', '32', '64']::text[], '32', true),
    ('Numerical Ability', 'An employee earns ₱600 per day. If they work 22 days in a month, how much is their monthly pay?', ARRAY['₱12,000', '₱13,200', '₱13,600', '₱14,400']::text[], '₱13,200', true),
    ('Numerical Ability', 'Simplify: (3/4) ÷ (1/2)', ARRAY['3/8', '1 1/4', '1 1/2', '2']::text[], '1 1/2', true),
    ('Analytical Ability', 'If all mammals are warm-blooded, and all dogs are mammals, which statement MUST be true?', ARRAY['All warm-blooded animals are dogs.', 'All dogs are warm-blooded.', 'Some dogs are not mammals.', 'None of the above.']::text[], 'All dogs are warm-blooded.', true),
    ('Analytical Ability', 'If today is Wednesday, what day of the week will it be in 100 days?', ARRAY['Thursday', 'Friday', 'Saturday', 'Sunday']::text[], 'Friday', true),
    ('Analytical Ability', 'If ''RED'' is coded as 18-5-4, how is ''BLUE'' coded?', ARRAY['2-12-21-5', '2-11-20-5', '3-12-21-6', '2-13-22-5']::text[], '2-12-21-5', true),
    ('Analytical Ability', 'Identify the underlying assumption: ''Sales will increase this quarter because we hired additional agents.''', ARRAY['Additional agents cost less to employ.', 'Hiring additional agents directly contributes to higher sales volume.', 'No other company is hiring sales agents.', 'Current sales agents are unproductive.']::text[], 'Hiring additional agents directly contributes to higher sales volume.', true),
    ('Analytical Ability', 'Complete the letter pattern: A, C, E, G, _____', ARRAY['H', 'I', 'J', 'K']::text[], 'I', true),
    ('Analytical Ability', 'Statement: All high achievers study consistently. Mark passed the exam. Conclusion:', ARRAY['Mark is a high achiever.', 'Mark studied consistently.', 'Mark may or may not be a high achiever who studied consistently.', 'Mark did not study.']::text[], 'Mark may or may not be a high achiever who studied consistently.', true),
    ('Analytical Ability', 'A company recorded sales of 120 units in Q1, 150 units in Q2, and 180 units in Q3. What is the quarterly trend?', ARRAY['Increasing by 30 units per quarter', 'Decreasing by 10%', 'Constant sales rate', 'Doubling each quarter']::text[], 'Increasing by 30 units per quarter', true),
    ('Analytical Ability', 'If Statement P implies Statement Q, and Statement Q is FALSE, what can be concluded about Statement P?', ARRAY['P is TRUE', 'P is FALSE', 'P is UNCERTAIN', 'Q must be TRUE']::text[], 'P is FALSE', true),
    ('Analytical Ability', 'If CIRCLE is written as ELCRIC, how is SQUARE written?', ARRAY['ERAUQS', 'ERAUSQ', 'QSERAU', 'SQUARE']::text[], 'ERAUQS', true),
    ('Analytical Ability', 'Mark is taller than John. John is taller than Paul. Who is the shortest among the three?', ARRAY['Mark', 'John', 'Paul', 'Cannot be determined']::text[], 'Paul', true),
    ('Analytical Ability', 'Which word does NOT belong to the group?', ARRAY['Guitar', 'Violin', 'Flute', 'Cello']::text[], 'Flute', true),
    ('Analytical Ability', 'Statements: All roses are flowers. Some flowers fade quickly. Conclusions:', ARRAY['All roses fade quickly.', 'Some roses fade quickly.', 'Some flowers that fade quickly may be roses.', 'No roses fade quickly.']::text[], 'Some flowers that fade quickly may be roses.', true),
    ('Analytical Ability', 'Complete the series: Z26, X24, V22, T20, _____', ARRAY['R18', 'S19', 'Q17', 'P16']::text[], 'R18', true),
    ('Analytical Ability', 'If NORTH becomes SOUTH, and EAST becomes WEST, what does NORTHEAST become?', ARRAY['NORTHWEST', 'SOUTHWEST', 'SOUTHEAST', 'EAST']::text[], 'SOUTHWEST', true),
    ('Analytical Ability', 'In a family, A is the father of B, but B is not the son of A. Who is B?', ARRAY['Daughter', 'Nephew', 'Uncle', 'Brother']::text[], 'Daughter', true),
    ('Analytical Ability', 'Find the odd one out:', ARRAY['Square', 'Triangle', 'Cube', 'Circle']::text[], 'Cube', true),
    ('Analytical Ability', 'Statement: No politicians are corrupt. (Hypothetical). Mr. Cruz is a politician. Conclusion:', ARRAY['Mr. Cruz is corrupt.', 'Mr. Cruz is not corrupt.', 'Mr. Cruz may be corrupt.', 'None of the above.']::text[], 'Mr. Cruz is not corrupt.', true),
    ('Analytical Ability', 'Look at the pattern: 2, 3, 5, 8, 12, 17, _____', ARRAY['21', '22', '23', '24']::text[], '23', true),
    ('Analytical Ability', 'Which conclusion follows logically: ''All managers have college degrees. Eric has a college degree.''', ARRAY['Eric is a manager.', 'Eric is not a manager.', 'Eric may be a manager.', 'All college graduates are managers.']::text[], 'Eric may be a manager.', true),
    ('Analytical Ability', 'If 1st is Monday and a month has 31 days, how many Mondays are in that month?', ARRAY['4', '5', '6', '3']::text[], '5', true),
    ('Analytical Ability', 'Find the odd word out:', ARRAY['Manila', 'Bangkok', 'Tokyo', 'Sydney']::text[], 'Sydney', true),
    ('Analytical Ability', 'Complete the sequence: AZ, BY, CX, DW, _____', ARRAY['EV', 'EU', 'FU', 'FV']::text[], 'EV', true),
    ('Analytical Ability', 'If all pens are writing tools, and some writing tools use ink, which must follow?', ARRAY['All pens use ink.', 'Some pens use ink.', 'Some pens might not use ink.', 'No pens use ink.']::text[], 'Some pens might not use ink.', true),
    ('Analytical Ability', 'Point A is North of Point B. Point C is East of Point B. Where is Point A with respect to Point C?', ARRAY['Northwest', 'Northeast', 'Southwest', 'Southeast']::text[], 'Northwest', true),
    ('Analytical Ability', 'If 5 cats catch 5 mice in 5 minutes, how many cats are needed to catch 100 mice in 100 minutes?', ARRAY['5', '20', '50', '100']::text[], '5', true),
    ('Analytical Ability', 'Choose the odd one out:', ARRAY['Mercury', 'Venus', 'Mars', 'Moon']::text[], 'Moon', true),
    ('Analytical Ability', 'Identify the conclusion: ''Since the road is wet whenever it rains, and it just rained heavily...''', ARRAY['The road will dry immediately.', 'The road is wet.', 'The rain was unexpected.', 'Cars will drive slower.']::text[], 'The road is wet.', true),
    ('Analytical Ability', 'Complete the letter series: B, D, G, K, P, _____', ARRAY['T', 'U', 'V', 'W']::text[], 'V', true),
    ('Analytical Ability', 'Five people sit in a row. A is next to B but not next to C. If C is next to D, who is at the center?', ARRAY['A', 'B', 'C', 'D']::text[], 'B', true),
    ('Analytical Ability', 'Which word does not belong with the others?', ARRAY['Leopard', 'Cheetah', 'Tiger', 'Wolf']::text[], 'Wolf', true),
    ('Analytical Ability', 'Statement: No reptiles have fur. A snake is a reptile. Conclusion:', ARRAY['A snake has scales.', 'A snake does not have fur.', 'A snake is cold-blooded.', 'Some snakes have fur.']::text[], 'A snake does not have fur.', true),
    ('Analytical Ability', 'What comes next in the pattern: 1, 1, 2, 3, 5, 8, 13, _____', ARRAY['18', '21', '24', '26']::text[], '21', true),
    ('Analytical Ability', 'If APPLE = 50, and MANGO = 50, which rule is applied?', ARRAY['Number of letters multiplied by 10', 'Sum of vowels', 'Reverse count', 'Random coding']::text[], 'Number of letters multiplied by 10', true),
    ('Analytical Ability', 'Which statement expresses a FACT rather than an opinion?', ARRAY['The Philippines has the best beaches in the world.', 'The 1987 Philippine Constitution was ratified on February 2, 1987.', 'Civil service exams are too difficult.', 'Public servants are the most honorable workers.']::text[], 'The 1987 Philippine Constitution was ratified on February 2, 1987.', true),
    ('Analytical Ability', 'If all architects are creative and no creative people are lazy, what can be deduced?', ARRAY['No architects are lazy.', 'Some architects are lazy.', 'All lazy people are architects.', 'Creativity is rare.']::text[], 'No architects are lazy.', true),
    ('Analytical Ability', 'Find the missing number in the matrix: [2, 4, 8], [3, 9, 27], [4, 16, ?]', ARRAY['32', '48', '64', '72']::text[], '64', true),
    ('Analytical Ability', 'If an argument''s premises are all true and its logical structure is valid, the argument is:', ARRAY['Sound', 'Unsound', 'Inductive', 'Fallacious']::text[], 'Sound', true),
    ('Analytical Ability', 'Which shape logically completes a grid with increasing sides: Triangle (3), Square (4), Pentagon (5)?', ARRAY['Octagon', 'Hexagon', 'Heptagon', 'Circle']::text[], 'Hexagon', true),
    ('Analytical Ability', 'Statement: Either the key is in the drawer or on the table. The key is not on the table. Conclusion:', ARRAY['The key is lost.', 'The key is in the drawer.', 'The key is in a bag.', 'Cannot be determined.']::text[], 'The key is in the drawer.', true),
    ('Analytical Ability', 'What is the next term: 3A, 6C, 12E, 24G, _____', ARRAY['48H', '48I', '36I', '48J']::text[], '48I', true),
    ('Clerical Operations', 'Which of the following names should be filed FIRST alphabetically?', ARRAY['Alvarado, Carlos', 'Alvarez, Antonio', 'Alvarez, Bernardo', 'Alvarez, Aaron']::text[], 'Alvarado, Carlos', true),
    ('Clerical Operations', 'According to standard rules of indexing, how should the name ''Dr. Maria Santos-Cruz'' be indexed?', ARRAY['Cruz, Maria Santos (Dr.)', 'Santos-Cruz, Maria (Dr.)', 'Santos, Maria Cruz Dr.', 'Dr. Maria Santos-Cruz']::text[], 'Santos-Cruz, Maria (Dr.)', true),
    ('Clerical Operations', 'Which filing system arranges records according to calendar dates (year, month, and day)?', ARRAY['Numeric Filing', 'Chronological Filing', 'Geographic Filing', 'Subject Filing']::text[], 'Chronological Filing', true),
    ('Clerical Operations', 'In alphabetic filing, how are abbreviations like ''St.'' (Saint) or ''Mt.'' (Mount) filed?', ARRAY['Filed as abbreviated', 'Filed as if spelled in full', 'Filed at the end of the letter', 'Ignored in filing']::text[], 'Filed as if spelled in full', true),
    ('Clerical Operations', 'What does the abbreviation ''cc'' at the bottom of a formal business letter stand for?', ARRAY['Carbon Copy', 'Central Committee', 'Certified Copy', 'Confidential Communication']::text[], 'Carbon Copy', true),
    ('Clerical Operations', 'Which record disposal method is required for confidential government documents containing personal data?', ARRAY['Recycling bin', 'Cross-cut shredding or burning', 'Standard trash disposal', 'Transfer to open storage']::text[], 'Cross-cut shredding or burning', true),
    ('Clerical Operations', 'What is a ''tickler file'' primarily used for in an office setting?', ARRAY['Long-term permanent storage', 'Reminder of pending matters organized by future dates', 'Employee attendance records', 'Confidential personnel files']::text[], 'Reminder of pending matters organized by future dates', true),
    ('Clerical Operations', 'Which of the following words is spelled INCORRECTLY?', ARRAY['Questionnaire', 'Liaison', 'Separate', 'Supercede']::text[], 'Supercede', true),
    ('Clerical Operations', 'In government correspondence, which part of the letter contains the sender''s address and date?', ARRAY['Letterhead / Heading', 'Inside Address', 'Salutation', 'Complimentary Close']::text[], 'Letterhead / Heading', true),
    ('Clerical Operations', 'When filing by geographic location, what is the usual primary filing unit?', ARRAY['City / Municipality', 'Country / Province / State', 'Street Name', 'Postal Zip Code']::text[], 'Country / Province / State', true),
    ('Clerical Operations', 'Which of the following business names should be filed FIRST alphabetically?', ARRAY['101 Convenience Store', 'First Metro Bank', 'Ace Hardware', 'BDO Unibank']::text[], '101 Convenience Store', true),
    ('Clerical Operations', 'What does the abbreviation ''encl.'' or ''enc.'' at the bottom of a business letter mean?', ARRAY['Enclosure', 'Endorsement', 'Encoded', 'Encrypted']::text[], 'Enclosure', true),
    ('Clerical Operations', 'Which of the following is an example of an open-shelf filing system?', ARRAY['Lateral file cabinets', 'Vertical drawer cabinets', 'Open shelf filing', 'Microfilm drawers']::text[], 'Open shelf filing', true),
    ('Clerical Operations', 'How should the surname prefix ''De la Cruz'' be indexed under standard rules?', ARRAY['Cruz, De la', 'De la Cruz', 'La Cruz, De', 'De, Cruz la']::text[], 'De la Cruz', true),
    ('Clerical Operations', 'What does the proofreading symbol ''stet'' signify?', ARRAY['Delete the text', 'Let it stand (ignore deletion mark)', 'Insert a space', 'Capitalize the letter']::text[], 'Let it stand (ignore deletion mark)', true),
    ('Clerical Operations', 'Which postal service guarantees tracked and expedited delivery for urgent legal documents?', ARRAY['Ordinary Mail', 'Registered Mail / Express Mail', 'Surface Mail', 'Book Post']::text[], 'Registered Mail / Express Mail', true),
    ('Clerical Operations', 'In proofreading, what does the symbol ''¶'' indicate?', ARRAY['New sentence', 'New paragraph', 'Delete space', 'Transpose letters']::text[], 'New paragraph', true),
    ('Clerical Operations', 'Which filing order is correct for the following names?
1. Macaraeg, Juan
2. Macariola, Pedro
3. Macabenta, Ana', ARRAY['3, 1, 2', '1, 2, 3', '3, 2, 1', '2, 1, 3']::text[], '3, 1, 2', true),
    ('Clerical Operations', 'What is an index card catalog primarily used for in records management?', ARRAY['Cross-referencing and locating records', 'Long-term document storage', 'Recording employee time', 'Storing mail stamps']::text[], 'Cross-referencing and locating records', true),
    ('Clerical Operations', 'What does ''bcc'' stand for in modern email and memorandum correspondence?', ARRAY['Blind Carbon Copy', 'Back Carbon Copy', 'Base Certified Copy', 'Batch Copy Communication']::text[], 'Blind Carbon Copy', true),
    ('Clerical Operations', 'Which of the following numbers should be filed FIRST in a terminal-digit filing system (read right to left: 12-34-56)?', ARRAY['01-20-45', '15-30-12', '99-99-05', '45-67-89']::text[], '99-99-05', true),
    ('Clerical Operations', 'In office ergonomics, where should a computer monitor be placed relative to eye level?', ARRAY['Top of screen at or slightly below eye level', 'Far above eye level', 'At lap level', 'Tilted 45 degrees sideways']::text[], 'Top of screen at or slightly below eye level', true),
    ('Clerical Operations', 'Which of the following files represents an inactive or archived record?', ARRAY['Current year financial ledger', 'Documents for pending audit', 'Records whose legal retention period has passed', 'Daily outgoing mail log']::text[], 'Records whose legal retention period has passed', true),
    ('Clerical Operations', 'How should government titles like ''Mayor'' or ''Senator'' be treated in indexing individuals'' names?', ARRAY['As the first indexing unit', 'As the last indexing unit in parentheses', 'Omitted completely', 'Combined with the surname']::text[], 'As the last indexing unit in parentheses', true),
    ('Clerical Operations', 'Which document authorizes an employee to travel on official government business?', ARRAY['Travel Order / Authority to Travel', 'Notice of Award', 'Purchase Request', 'Certificate of Employment']::text[], 'Travel Order / Authority to Travel', true),
    ('Clerical Operations', 'What is the standard size of Letter paper in the Philippines and US system?', ARRAY['8.5 x 11 inches', '8.5 x 13 inches', '8.27 x 11.69 inches (A4)', '8.5 x 14 inches (Legal)']::text[], '8.5 x 11 inches', true),
    ('Clerical Operations', 'What is the standard size of A4 paper widely used in international and government correspondence?', ARRAY['210 x 297 mm', '216 x 279 mm', '216 x 330 mm', '216 x 356 mm']::text[], '210 x 297 mm', true),
    ('Clerical Operations', 'Which office machine creates duplicated paper copies using electrostatic reproduction?', ARRAY['Photocopier (Xerox machine)', 'Dot matrix printer', 'Typewriter', 'Paper shredder']::text[], 'Photocopier (Xerox machine)', true),
    ('Clerical Operations', 'What is the primary purpose of a requisition slip in an office inventory system?', ARRAY['Request needed office supplies from stockroom', 'Record employee tardiness', 'Confirm vendor invoice', 'Register visitor entry']::text[], 'Request needed office supplies from stockroom', true),
    ('Clerical Operations', 'When receiving incoming mail, what is the first action a clerk should take upon opening non-confidential letters?', ARRAY['Date and time stamp the document', 'File it immediately', 'Reply to the sender', 'Dispose of the envelope']::text[], 'Date and time stamp the document', true),
    ('Clerical Operations', 'Which term refers to the systematic moving of inactive records from prime office space to an archive storage facility?', ARRAY['Records Retirement / Transfer', 'Records Destruction', 'Records Indexing', 'Records Auditing']::text[], 'Records Retirement / Transfer', true),
    ('Clerical Operations', 'Which of the following is the correct alphabetical sequence for these words?
1. Personnel
2. Personal
3. Percentage
4. Persistent', ARRAY['3, 2, 1, 4', '3, 1, 2, 4', '2, 1, 3, 4', '3, 2, 4, 1']::text[], '3, 2, 1, 4', true),
    ('Clerical Operations', 'In proofreading, what does the symbol ''^'' (caret) indicate?', ARRAY['Delete letter', 'Insert letter or word', 'Make capital', 'Close up space']::text[], 'Insert letter or word', true),
    ('Clerical Operations', 'What does the abbreviation ''ASAP'' stand for?', ARRAY['As Soon As Possible', 'Always Send All Papers', 'As Stated And Provided', 'After Standard Action Period']::text[], 'As Soon As Possible', true),
    ('Clerical Operations', 'What type of correspondence is used for internal communication within the same government bureau or department?', ARRAY['Memorandum (Memo)', 'Diplomatic Note', 'Press Release', 'Affidavit']::text[], 'Memorandum (Memo)', true),
    ('Clerical Operations', 'Which of the following names contains an indexing error under standard rules?', ARRAY['Reyes, Jose Jr.', 'Del Rosario, Maria', 'De Castro, Juan', 'Santos, Dr. Pedro (Title not in parentheses)']::text[], 'Santos, Dr. Pedro (Title not in parentheses)', true),
    ('Clerical Operations', 'What is an ''Out Card'' (or Out Guide) used for in filing cabinets?', ARRAY['Temporarily replace a folder removed from the file drawer', 'Indicate cabinet full', 'Mark permanent disposal', 'Hold extra folders']::text[], 'Temporarily replace a folder removed from the file drawer', true),
    ('Clerical Operations', 'In numeric filing, what auxiliary file is required to find an individual''s assigned number?', ARRAY['Alphabetic Index / Card Catalog', 'Tickler File', 'Subject Guide', 'Cross-Reference Sheet']::text[], 'Alphabetic Index / Card Catalog', true),
    ('Clerical Operations', 'What is the primary function of a petty cash voucher in office administration?', ARRAY['Document minor cash expenditures and reimbursements', 'Apply for bank loan', 'Issue employee salary', 'Order major IT equipment']::text[], 'Document minor cash expenditures and reimbursements', true),
    ('Clerical Operations', 'Which of the following words is spelled CORRECTLY?', ARRAY['Bureaucracy', 'Beurocracy', 'Burocracy', 'Bureaucrasy']::text[], 'Bureaucracy', true);

-- ==============================================================================
-- END OF DIAGNOSTIC QUESTIONS SEED SCRIPT (200 ITEMS)
-- ==============================================================================
