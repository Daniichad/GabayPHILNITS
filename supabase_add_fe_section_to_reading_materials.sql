-- ==============================================================================
-- Migration: Add `fe_section` Column to `public.reading_materials` & `public.video_lectures`
-- Description: Supports PhilNITS FE Subject A (Morning) and Subject B (Afternoon)
-- ==============================================================================

-- 1. Add `fe_section` column to `reading_materials`
ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50);

-- 2. Add `fe_section` column to `video_lectures`
ALTER TABLE public.video_lectures 
ADD COLUMN IF NOT EXISTS fe_section VARCHAR(50);

-- 3. Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_reading_materials_fe_section 
ON public.reading_materials(fe_section);

CREATE INDEX IF NOT EXISTS idx_video_lectures_fe_section 
ON public.video_lectures(fe_section);

-- ------------------------------------------------------------------------------
-- 4. Tag existing reading materials based on PhilNITS FE Syllabus
-- ------------------------------------------------------------------------------

-- Tag Subject A: IT Fundamentals, Computer Systems, Networks, Security & Strategy
UPDATE public.reading_materials
SET fe_section = 'Subject A'
WHERE exam_level = 'FE'
  AND (
    subject IN (
      'Computer Systems & Architecture',
      'Networks & Security',
      'IT Management & Strategy',
      'Technology',
      'Management',
      'Strategy',
      'Databases & SQL'
    )
    OR title ILIKE '%Subject A%'
    OR title ILIKE '%Architecture%'
    OR title ILIKE '%Hardware%'
    OR title ILIKE '%Processor%'
  );

-- Tag Subject B: Algorithms, Data Structures, Pseudocode & Security Scenarios
UPDATE public.reading_materials
SET fe_section = 'Subject B'
WHERE exam_level = 'FE'
  AND (
    subject IN (
      'Algorithms & Programming',
      'Algorithms & Data Structures',
      'Security & System Design'
    )
    OR title ILIKE '%Subject B%'
    OR title ILIKE '%Data Structure%'
    OR title ILIKE '%Algorithm%'
    OR title ILIKE '%Pseudo%'
    OR description ILIKE '%Afternoon%'
    OR description ILIKE '%Subject B%'
  );

-- Default any untagged FE reading materials to Subject A
UPDATE public.reading_materials
SET fe_section = 'Subject A'
WHERE exam_level = 'FE' AND fe_section IS NULL;

-- ------------------------------------------------------------------------------
-- 5. Tag existing video lectures based on PhilNITS FE Syllabus
-- ------------------------------------------------------------------------------

UPDATE public.video_lectures
SET fe_section = 'Subject A'
WHERE exam_level IN ('FE', 'BOTH')
  AND (
    subject IN ('Computer Systems & Architecture', 'Networks & Security', 'IT Management & Strategy', 'Technology', 'Management', 'Strategy')
    OR title ILIKE '%Architecture%'
    OR title ILIKE '%Hardware%'
    OR title ILIKE '%OSI%'
  );

UPDATE public.video_lectures
SET fe_section = 'Subject B'
WHERE exam_level IN ('FE', 'BOTH')
  AND (
    subject IN ('Algorithms & Programming', 'Algorithms & Data Structures', 'Security & System Design')
    OR title ILIKE '%Big-O%'
    OR title ILIKE '%Dynamic Programming%'
    OR title ILIKE '%Data Structure%'
    OR title ILIKE '%Recursion%'
    OR title ILIKE '%Sorting%'
  );

UPDATE public.video_lectures
SET fe_section = 'Subject A'
WHERE exam_level = 'FE' AND fe_section IS NULL;

-- ------------------------------------------------------------------------------
-- 6. Optional: Insert Seed Books for FE Subject A and Subject B
-- ------------------------------------------------------------------------------

INSERT INTO public.reading_materials (
  title,
  subtitle,
  subject,
  exam_level,
  fe_section,
  review_speed,
  total_pages,
  author,
  learning_objective,
  description,
  sort_order,
  is_published,
  pdf_url,
  cover_image_url
) VALUES
-- FE Subject A: Computer Systems & Architecture
(
  'PhilNITS FE: Computer Systems & Architecture',
  'Processor Execution, Memory Hierarchy, Cache Coherence, and I/O Buses',
  'Computer Systems & Architecture',
  'FE',
  'Subject A',
  'Standard',
  40,
  'PhilNITS / IPA Japan',
  'Master instruction pipelining, cache memory hit rates, RAID levels, and interrupts.',
  'Comprehensive textbook for the FE Morning Exam (Subject A) focusing on CPU internals, digital logic, and operating system kernels.',
  10,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80'
),
-- FE Subject A: Networks & Security
(
  'PhilNITS FE: Networks & Information Security',
  'TCP/IP Suite, Routing Algorithms, Cryptography, and Threat Mitigation',
  'Networks & Security',
  'FE',
  'Subject A',
  'Standard',
  35,
  'PhilNITS / IPA Japan',
  'Calculate subnet masks, configure CIDR notation, and analyze public key cryptosystems (RSA, AES, ECC).',
  'Core syllabus material for PhilNITS FE Subject A covering network architecture, OSI 7-layer protocols, and network defence.',
  11,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'
),
-- FE Subject B: Algorithms & Data Structures
(
  'PhilNITS FE: Algorithms & Data Structures',
  'Algorithm Design, Pseudocode Tracing, Trees, Graphs & Dynamic Programming',
  'Algorithms & Data Structures',
  'FE',
  'Subject B',
  'Detailed',
  48,
  'PhilNITS / IPA Japan',
  'Implement binary search trees, graph traversals (BFS/DFS), Dijkstra shortest path, and dynamic programming.',
  'Targeted preparation for PhilNITS FE Afternoon Exam (Subject B). Master pseudocode problem-solving, time complexities, and recursion.',
  12,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1516116211227-bbc13c73335c?auto=format&fit=crop&w=600&q=80'
),
-- FE Subject B: Security & System Design
(
  'PhilNITS FE: Practical Information Security & System Design',
  'Authentication Protocols, Zero-Day Exploits, Vulnerability Analysis & Secure Coding',
  'Security & System Design',
  'FE',
  'Subject B',
  'Detailed',
  45,
  'PhilNITS / IPA Japan',
  'Analyze real-world security scenarios, input validation, SQL injection, XSS defense, and secure system architecture.',
  'Dedicated study guide for the PhilNITS FE Afternoon Exam (Subject B) security questions with step-by-step case studies.',
  13,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'
)
ON CONFLICT DO NOTHING;

