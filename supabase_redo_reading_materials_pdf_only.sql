-- ==============================================================================
-- REDO READING MATERIALS SCHEMA (PDF-ONLY / NO CHAPTERS & NO SUBTOPICS)
-- ==============================================================================
-- This script removes the obsolete chapter and subtopic hierarchy tables,
-- recreates a streamlined, single-table `reading_materials` schema centered
-- around full PDF documents, and sets up `user_reading_progress` with RLS.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. DROP OBSOLETE HIERARCHY TABLES & VIEWS
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.reading_material_chapters CASCADE;
DROP TABLE IF EXISTS public.reading_material_subtopics CASCADE;

-- ------------------------------------------------------------------------------
-- 2. RECREATE OR RESTRUCTURE `reading_materials` TABLE
-- ------------------------------------------------------------------------------
-- Drop old foreign key constraints or columns if the table already exists,
-- or drop and recreate cleanly. To preserve existing custom rows if desired,
-- we recreate cleanly with all PDF-first fields.
DROP TABLE IF EXISTS public.reading_materials CASCADE;

CREATE TABLE public.reading_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  subject VARCHAR(100) NOT NULL, -- e.g. 'Technology', 'Management', 'Strategy'
  exam_level VARCHAR(50) NOT NULL DEFAULT 'IP', -- 'IP', 'FE', or 'BOTH'
  pdf_url TEXT, -- Direct link to the hosted PDF (Supabase Storage or external)
  cover_image_url TEXT, -- Book cover image URL
  thumbnail_url TEXT, -- Fallback thumbnail URL
  author VARCHAR(255) DEFAULT 'PhilNITS / IPA Japan',
  review_speed VARCHAR(50) NOT NULL DEFAULT 'Standard', -- 'Quick', 'Standard', 'Detailed'
  total_pages INTEGER NOT NULL DEFAULT 1,
  learning_objective TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reading_materials_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX idx_reading_materials_subject ON public.reading_materials(subject);
CREATE INDEX idx_reading_materials_exam_level ON public.reading_materials(exam_level);
CREATE INDEX idx_reading_materials_review_speed ON public.reading_materials(review_speed);
CREATE INDEX idx_reading_materials_sort_order ON public.reading_materials(sort_order ASC);
CREATE INDEX idx_reading_materials_published ON public.reading_materials(is_published);

-- ------------------------------------------------------------------------------
-- 3. RECREATE `user_reading_progress` TABLE
-- ------------------------------------------------------------------------------
-- Cleanly links a user to a reading material with page-level & completion progress.
CREATE TABLE IF NOT EXISTS public.user_reading_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_material_id UUID NOT NULL REFERENCES public.reading_materials(id) ON DELETE CASCADE,
  current_page INTEGER NOT NULL DEFAULT 1,
  current_chapter_number INTEGER NOT NULL DEFAULT 1, -- preserved for backward compatibility
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT user_reading_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_reading_progress_user_material_unique UNIQUE (user_id, reading_material_id)
);

CREATE INDEX IF NOT EXISTS idx_user_reading_progress_user ON public.user_reading_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_material ON public.user_reading_progress(reading_material_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_progress_updated ON public.user_reading_progress(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.reading_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reading_progress ENABLE ROW LEVEL SECURITY;

-- Reading materials policies: anyone can read published books
DROP POLICY IF EXISTS "Public can view published reading materials" ON public.reading_materials;
CREATE POLICY "Public can view published reading materials"
  ON public.reading_materials
  FOR SELECT
  USING (is_published = true);

-- Authenticated admins/users can insert/update if needed
DROP POLICY IF EXISTS "Authenticated users can read all published materials" ON public.reading_materials;
CREATE POLICY "Authenticated users can read all published materials"
  ON public.reading_materials
  FOR SELECT
  TO authenticated
  USING (is_published = true);

-- User reading progress policies
DROP POLICY IF EXISTS "Users can view own reading progress" ON public.user_reading_progress;
CREATE POLICY "Users can view own reading progress"
  ON public.user_reading_progress
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own reading progress" ON public.user_reading_progress;
CREATE POLICY "Users can insert own reading progress"
  ON public.user_reading_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reading progress" ON public.user_reading_progress;
CREATE POLICY "Users can update own reading progress"
  ON public.user_reading_progress
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 5. SEED INITIAL READING MATERIALS (PHILNITS IT PASSPORT & FE TRACKS)
-- ------------------------------------------------------------------------------
INSERT INTO public.reading_materials (
  title, subtitle, subject, exam_level, review_speed, total_pages,
  author, learning_objective, description, sort_order, is_published,
  pdf_url, cover_image_url
) VALUES
-- ============================
-- IP Track: Technology
-- ============================
(
  'Basic Information Theory and Computer Systems',
  'Data Representation, CPU Architecture, and Hardware Fundamentals',
  'Technology',
  'IP',
  'Standard',
  24,
  'PhilNITS / IPA Japan',
  'Master radix conversion, two''s complement, logic gates, and CPU pipelining fundamentals.',
  'Comprehensive foundation module covering discrete mathematics, bitwise logic, and computer organization required for the IT Passport Examination.',
  1,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80'
),
(
  'Operating Systems & System Software',
  'Memory Management, Task Scheduling, and File Systems',
  'Technology',
  'IP',
  'Quick',
  16,
  'PhilNITS / IPA Japan',
  'Understand multi-programming, virtual memory paging, process states, and spooling.',
  'Concise quick-review booklet explaining operating system primitives, deadlock conditions, and storage hierarchies.',
  2,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80'
),
(
  'Networks, Security & Database Systems',
  'OSI Model, Relational Schema Normalization, and Threat Mitigation',
  'Technology',
  'IP',
  'Detailed',
  36,
  'PhilNITS / IPA Japan',
  'Design relational schemas (1NF to 3NF), compute subnet masks, and analyze public-key cryptography.',
  'Deep-dive textbook into OSI layers, TCP/IP, SQL queries, encryption methods, and common cyber threats like phishing and DDoS.',
  3,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80'
),

-- ============================
-- IP Track: Management
-- ============================
(
  'Software Engineering & Project Management',
  'Development Methodologies (Agile, Waterfall) and PMBOK Framework',
  'Management',
  'IP',
  'Standard',
  20,
  'PhilNITS / IPA Japan',
  'Analyze critical path methods (CPM), Gantt charts, and quality control (WBS, Pareto analysis).',
  'Standard syllabus coverage of the software development lifecycle (SDLC), scope management, EVM (Earned Value Management), and risk registers.',
  4,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80'
),
(
  'IT Service Management & Auditing',
  'ITIL Core Concepts, SLA, BCP, and System Audits',
  'Management',
  'IP',
  'Quick',
  14,
  'PhilNITS / IPA Japan',
  'Identify Incident vs Problem Management, Service Level Agreements (SLA), and audit evidence.',
  'Summary review of ITIL best practices, business continuity planning (BCP), and system auditing standards.',
  5,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80'
),

-- ============================
-- IP Track: Strategy
-- ============================
(
  'Corporate Business Strategy & Legal Affairs',
  'SWOT, Porter''s Five Forces, Intellectual Property, and Labor Laws',
  'Strategy',
  'IP',
  'Standard',
  22,
  'PhilNITS / IPA Japan',
  'Evaluate business model frameworks, copyright/patent regulations, and compliance.',
  'Core strategic analysis methodologies including BCG Matrix, Balance Sheet/Income Statement interpretation, and legal compliance.',
  6,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'
),
(
  'Information Systems Strategy & e-Business',
  'ERP, SCM, CRM, and Emerging Technologies in Digital Transformation',
  'Strategy',
  'IP',
  'Quick',
  12,
  'PhilNITS / IPA Japan',
  'Differentiate ERP vs CRM vs SCM, and understand SaaS/PaaS/IaaS cloud deployment.',
  'Quick guide to digital business strategies, enterprise architectures, and technology roadmap development.',
  7,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80'
),

-- ============================
-- FE Track: Fundamental Topics
-- ============================
(
  'Computer Systems & Architecture (FE Level)',
  'Processor Execution Cycles, Cache Coherence, and I/O Bus Architectures',
  'Computer Systems & Architecture',
  'FE',
  'Detailed',
  38,
  'PhilNITS / IPA Japan',
  'Examine Harvard vs von Neumann architectures, memory interleaving, and RAID configurations.',
  'Advanced engineering concepts for the Fundamental IT Engineer examination.',
  8,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=600&q=80'
),
(
  'Data Structures & Algorithms Implementation',
  'Big-O Complexity, Trees, Graphs, Sorting, and Search Algorithms',
  'Algorithms & Programming',
  'FE',
  'Detailed',
  42,
  'PhilNITS / IPA Japan',
  'Implement and trace binary search trees, Dijkstra''s algorithm, and dynamic programming.',
  'Thorough algorithmic breakdown with pseudo-code analysis designed for the FE Afternoon Exam.',
  9,
  true,
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://images.unsplash.com/photo-1516116211227-bbc13c73335c?auto=format&fit=crop&w=600&q=80'
);

-- ------------------------------------------------------------------------------
-- 6. OPTIONAL STORAGE BUCKET CREATION (FOR PDF & COVER UPLOADS)
-- ------------------------------------------------------------------------------
-- If using Supabase Storage, run these to enable a public bucket for PDFs:
INSERT INTO storage.buckets (id, name, public)
VALUES ('reading-materials', 'reading-materials', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public reads from reading-materials bucket
DROP POLICY IF EXISTS "Public can view reading material files" ON storage.objects;
CREATE POLICY "Public can view reading material files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'reading-materials');

-- Policy to allow authenticated uploads to reading-materials bucket
DROP POLICY IF EXISTS "Authenticated users can upload reading material files" ON storage.objects;
CREATE POLICY "Authenticated users can upload reading material files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'reading-materials');

