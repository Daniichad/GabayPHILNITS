-- ==============================================================================
-- Reading Materials Hierarchy & Sub-topics Migration
--
-- Hierarchy:
--   1. Domain (subject: Strategy, Management, Technology)
--   2. Heading / Sub-Topic (reading_material_subtopics table & sub_topic column)
--   3. Book / Reading Material (reading_materials table)
--   4. Chapter (reading_material_chapters table)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create Sub-topics / Headings Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_material_subtopics (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subject VARCHAR(100) NOT NULL, -- e.g. 'Strategy', 'Management', 'Technology'
  title VARCHAR(255) NOT NULL,   -- e.g. 'Corporate and Legal Affairs', 'Project Management'
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reading_material_subtopics_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_reading_material_subtopics_subject ON public.reading_material_subtopics(subject);
CREATE INDEX IF NOT EXISTS idx_reading_material_subtopics_sort ON public.reading_material_subtopics(sort_order ASC);

-- ------------------------------------------------------------------------------
-- 2. Ensure `reading_materials` has subtopic_id & sub_topic columns
-- ------------------------------------------------------------------------------
ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS subtopic_id UUID REFERENCES public.reading_material_subtopics(id) ON DELETE SET NULL;

ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS sub_topic VARCHAR(255);

ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS heading VARCHAR(255);

ALTER TABLE public.reading_materials 
ADD COLUMN IF NOT EXISTS exam_level VARCHAR(50) DEFAULT 'IP';

CREATE INDEX IF NOT EXISTS idx_reading_materials_subtopic_id ON public.reading_materials(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_reading_materials_subject ON public.reading_materials(subject);
CREATE INDEX IF NOT EXISTS idx_reading_materials_sub_topic ON public.reading_materials(sub_topic);
CREATE INDEX IF NOT EXISTS idx_reading_materials_exam_level ON public.reading_materials(exam_level);
CREATE INDEX IF NOT EXISTS idx_reading_materials_sort_order ON public.reading_materials(sort_order ASC);

-- ------------------------------------------------------------------------------
-- 3. Ensure `reading_material_chapters` exists with foreign key cascade
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reading_material_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reading_material_id UUID NOT NULL,
  chapter_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT reading_material_chapters_pkey PRIMARY KEY (id),
  CONSTRAINT reading_material_chapters_reading_material_id_fkey FOREIGN KEY (reading_material_id) REFERENCES public.reading_materials (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reading_material_chapters_material_id ON public.reading_material_chapters(reading_material_id);
CREATE INDEX IF NOT EXISTS idx_reading_material_chapters_order ON public.reading_material_chapters(chapter_number ASC);

-- ------------------------------------------------------------------------------
-- 4. Enable Row Level Security (RLS) & Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.reading_material_subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_material_chapters ENABLE ROW LEVEL SECURITY;

-- Sub-topics read policy
DROP POLICY IF EXISTS "Public can view reading material subtopics" ON public.reading_material_subtopics;
CREATE POLICY "Public can view reading material subtopics"
  ON public.reading_material_subtopics
  FOR SELECT
  USING (true);

-- Reading materials read policy
DROP POLICY IF EXISTS "Public can view published reading materials" ON public.reading_materials;
CREATE POLICY "Public can view published reading materials"
  ON public.reading_materials
  FOR SELECT
  USING (is_published = true);

-- Chapters read policy
DROP POLICY IF EXISTS "Public can view reading material chapters" ON public.reading_material_chapters;
CREATE POLICY "Public can view reading material chapters"
  ON public.reading_material_chapters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reading_materials rm
      WHERE rm.id = reading_material_chapters.reading_material_id
      AND rm.is_published = true
    )
  );

-- ------------------------------------------------------------------------------
-- 5. Seed Sub-topics / Headings
-- ------------------------------------------------------------------------------
INSERT INTO public.reading_material_subtopics (id, subject, title, description, sort_order)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Strategy', 'Corporate and Legal Affairs', 'Corporate governance, compliance, CSR, and legal frameworks in IT', 1),
  ('b1000000-0000-0000-0000-000000000002', 'Strategy', 'Business Strategy & Analysis', 'Competitive strategy, marketing mix, business modeling and financial metrics', 2),
  ('b1000000-0000-0000-0000-000000000003', 'Management', 'Project Management', 'Project planning, PMBOK, WBS, EVM, risk management, and scheduling', 1),
  ('b1000000-0000-0000-0000-000000000004', 'Management', 'Service Management & Operations', 'ITIL service lifecycles, SLA management, and IT facility operations', 2),
  ('b1000000-0000-0000-0000-000000000005', 'Technology', 'Computer Systems & Architecture', 'Hardware design, processors, memory hierarchy, and I/O bus interfaces', 1),
  ('b1000000-0000-0000-0000-000000000006', 'Technology', 'Networks & Information Security', 'OSI model, TCP/IP, cryptography, network vulnerabilities, and defense', 2)
ON CONFLICT (id) DO UPDATE SET
  subject = EXCLUDED.subject,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- ------------------------------------------------------------------------------
-- 6. Seed Books / Reading Materials (Linked to Sub-topics)
-- ------------------------------------------------------------------------------
INSERT INTO public.reading_materials (
  id,
  subtopic_id,
  subject,
  sub_topic,
  heading,
  title,
  subtitle,
  content,
  total_pages,
  sort_order,
  is_published,
  review_speed,
  exam_level,
  learning_objective
)
VALUES
  -- -------------------------------------------------------------------------
  -- STRATEGY -> Corporate and Legal Affairs
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000001',
    'b1000000-0000-0000-0000-000000000001',
    'Strategy',
    'Corporate and Legal Affairs',
    'Corporate and Legal Affairs',
    'Corporate Strategy & Governance',
    'Enterprise management, compliance, CSR & business ethics',
    '# Corporate Strategy & Governance

Corporate governance involves a set of relationships between a company’s management, its board, its shareholders and other stakeholders.

## Core Pillars
1. **Corporate Social Responsibility (CSR)**: Beyond profit maximization, firms must act responsibly toward society and the environment.
2. **Business Ethics**: Code of conduct, whistleblower policies, and anti-corruption measures.
3. **Internal Control**: COSO framework ensuring reliable financial reporting and compliance with laws.',
    4,
    1,
    true,
    'Standard',
    'IP',
    '• Explain the primary principles of corporate governance and CSR
• Understand internal controls and compliance procedures
• Identify ethical decision-making practices in IT businesses'
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000001',
    'Strategy',
    'Corporate and Legal Affairs',
    'Corporate and Legal Affairs',
    'IT Legal Affairs & Compliance',
    'Intellectual property, copyright, patent laws, and data privacy',
    '# IT Legal Affairs & Compliance

IT professionals must understand the regulatory and legal aspects governing digital assets and intellectual property.

## Key Legal Frameworks
1. **Copyright**: Protects source code, documentation, and user interfaces from unauthorized duplication.
2. **Patents**: Protects novel, non-obvious technical inventions and business methods.
3. **Data Privacy**: Compliance with privacy regulations such as the Philippine Data Privacy Act of 2012 (RA 10173).',
    4,
    2,
    true,
    'Quick',
    'IP',
    '• Distinguish between patents, copyrights, trademarks, and trade secrets
• Comply with data privacy regulations and security disclosure rules
• Understand software licensing terms (GPL, MIT, Apache, Proprietary)'
  ),

  -- -------------------------------------------------------------------------
  -- STRATEGY -> Business Strategy & Analysis
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000002',
    'Strategy',
    'Business Strategy & Analysis',
    'Business Strategy & Analysis',
    'Business Strategy & Competitive Analysis',
    'Porter Five Forces, SWOT, PPM, and corporate positioning',
    '# Business Strategy & Competitive Analysis

Strategic planning provides the roadmap for organizational competitive advantage and long-term viability.

## Strategic Frameworks
- **SWOT Analysis**: Strengths, Weaknesses, Opportunities, and Threats assessment.
- **Porter’s 5 Forces**: Threat of new entrants, buyer power, supplier power, threat of substitutes, and rivalry.
- **PPM Matrix**: Boston Consulting Group (BCG) Growth-Share Matrix (Stars, Cash Cows, Question Marks, Dogs).',
    4,
    3,
    true,
    'Detailed',
    'IP',
    '• Apply SWOT and 3C analysis to real-world corporate situations
• Evaluate industry competitiveness using Porter’s 5 Forces model
• Allocate organizational resources using BCG product portfolio matrix'
  ),

  -- -------------------------------------------------------------------------
  -- MANAGEMENT -> Project Management
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000003',
    'Management',
    'Project Management',
    'Project Management',
    'Project Management Fundamentals',
    'Triple constraint, WBS, critical path method (CPM), and risk tracking',
    '# Project Management Fundamentals

A project is a temporary endeavor undertaken to create a unique product, service, or result.

## The Triple Constraint
- **Scope**: The specific deliverables and tasks required.
- **Time**: The overall project timeline and milestone deadlines.
- **Cost**: The budget allocated for personnel, materials, and infrastructure.',
    4,
    1,
    true,
    'Detailed',
    'IP',
    '• Construct and decompose a Work Breakdown Structure (WBS)
• Calculate project critical path and float using PERT/CPM diagrams
• Monitor project performance with Earned Value Management (EVM)'
  ),

  -- -------------------------------------------------------------------------
  -- MANAGEMENT -> Service Management & Operations
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000004',
    'Management',
    'Service Management & Operations',
    'Service Management & Operations',
    'IT Service Management & Operations',
    'ITIL lifecycle, SLA, incident response, and facility maintenance',
    '# IT Service Management & Operations

IT Service Management (ITSM) focuses on aligning IT services with customer and business needs.

## ITIL Core Processes
1. **Service Level Agreement (SLA)**: Documented commitment between a service provider and client.
2. **Incident Management**: Restoring normal service operation as quickly as possible.
3. **Problem Management**: Finding root causes to prevent recurring incidents.',
    4,
    2,
    true,
    'Standard',
    'IP',
    '• Understand ITIL service lifecycle stages and ITSM standards
• Define clear SLA and KPI metrics for IT operations
• Manage incidents, changes, and configuration items effectively'
  ),

  -- -------------------------------------------------------------------------
  -- TECHNOLOGY -> Computer Systems & Architecture
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000006',
    'b1000000-0000-0000-0000-000000000005',
    'Technology',
    'Computer Systems & Architecture',
    'Computer Systems & Architecture',
    'Computer Systems & Architecture',
    'CPU instruction cycles, caching hierarchy, pipelining, and memory',
    '# Computer Systems & Architecture

Understanding the fundamental physical components and operation of computer systems.

## The Von Neumann Architecture
- **Control Unit (CU)**: Decodes instructions and manages execution flow.
- **Arithmetic Logic Unit (ALU)**: Performs mathematical calculations and logical evaluations.
- **Memory**: Stores data and instructions currently in use.',
    4,
    1,
    true,
    'Detailed',
    'IP',
    '• Master the Fetch-Decode-Execute instruction cycle
• Understand cache memory mapping and virtual memory paging
• Analyze CPU instruction pipelining and bus architectures'
  ),

  -- -------------------------------------------------------------------------
  -- TECHNOLOGY -> Networks & Information Security
  -- -------------------------------------------------------------------------
  (
    'a1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000006',
    'Technology',
    'Networks & Information Security',
    'Networks & Information Security',
    'Networks & Information Security',
    'OSI 7 layers, TCP/IP, public key cryptography, and firewalls',
    '# Networks & Information Security

Networking and security provide the infrastructure and trust necessary for modern distributed computing.

## The OSI 7-Layer Reference Model
1. Physical -> 2. Data Link -> 3. Network -> 4. Transport -> 5. Session -> 6. Presentation -> 7. Application.

## CIA Triad
- **Confidentiality**: Keeping data secret from unauthorized parties.
- **Integrity**: Guaranteeing data is not altered in transit.
- **Availability**: Ensuring systems and resources are accessible when needed.',
    4,
    2,
    true,
    'Quick',
    'IP',
    '• Trace packet delivery across OSI and TCP/IP protocol layers
• Differentiate symmetric (AES) vs asymmetric (RSA) cryptography
• Implement defensive controls against malware, phishing, and DDoS attacks'
  )
ON CONFLICT (id) DO UPDATE SET
  subtopic_id = EXCLUDED.subtopic_id,
  subject = EXCLUDED.subject,
  sub_topic = EXCLUDED.sub_topic,
  heading = EXCLUDED.heading,
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  content = EXCLUDED.content,
  total_pages = EXCLUDED.total_pages,
  sort_order = EXCLUDED.sort_order,
  review_speed = EXCLUDED.review_speed,
  is_published = EXCLUDED.is_published,
  exam_level = EXCLUDED.exam_level,
  learning_objective = EXCLUDED.learning_objective,
  updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 7. Insert Chapters for Seed Books
-- ------------------------------------------------------------------------------
INSERT INTO public.reading_material_chapters (
  reading_material_id,
  chapter_number,
  title,
  content,
  sort_order
)
VALUES
  -- Chapters for Corporate Strategy & Governance
  (
    'a1000000-0000-0000-0000-000000000001',
    1,
    'Principles of Corporate Governance',
    'Corporate governance establishes structures to oversee managerial conduct, safeguard shareholder rights, and ensure transparent disclosures.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000001',
    2,
    'Corporate Social Responsibility (CSR)',
    'CSR requires organizations to consider their impact on employees, community, environmental sustainability, and ethical trade operations.',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000001',
    3,
    'Business Ethics and Whistleblowing',
    'Clear ethical guidelines prevent conflicts of interest and protect corporate whistleblowers reporting regulatory non-compliance.',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000001',
    4,
    'Internal Control Framework (COSO)',
    'The COSO framework defines five components: Control Environment, Risk Assessment, Control Activities, Information & Communication, and Monitoring.',
    4
  ),

  -- Chapters for IT Legal Affairs & Compliance
  (
    'a1000000-0000-0000-0000-000000000002',
    1,
    'Copyright Laws in Software Development',
    'Copyright protects code expressions, source files, and user interface graphical layouts against unauthorized duplication or unlicensed distribution.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    2,
    'Patents, Trademarks & Trade Secrets',
    'Patents protect functional software inventions with technical merits; trade secrets safeguard proprietary algorithms and confidential business logic.',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    3,
    'Philippine Data Privacy Act of 2012 (RA 10173)',
    'Mandates data protection officers, lawful basis for processing, data subject rights (access, correct, block), and mandatory breach notification within 72 hours.',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    4,
    'Software Licensing and Open Source Compliance',
    'Distinguishes permissive open-source licenses (MIT, Apache) from reciprocal copyleft licenses (GPL), and explains SaaS subscription terms.',
    4
  ),

  -- Chapters for Business Strategy & Competitive Analysis
  (
    'a1000000-0000-0000-0000-000000000003',
    1,
    'Strategic Environmental Analysis (SWOT & 3C)',
    'Frameworks for analyzing Customer, Competitor, and Company alongside internal strengths/weaknesses and external opportunities/threats.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    2,
    'Competitive Strategies (Cost Leadership & Differentiation)',
    'Michael Porter generic strategies: establishing low-cost operations or distinct premium differentiation.',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    3,
    'Product Portfolio Management (BCG Matrix)',
    'Categorizing business product lines into Stars, Cash Cows, Question Marks, and Dogs based on market share and market growth rates.',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    4,
    'Value Chain Analysis and Business Models',
    'Mapping primary and support activities to uncover cost efficiencies and competitive differentiators.',
    4
  ),

  -- Chapters for Project Management Fundamentals
  (
    'a1000000-0000-0000-0000-000000000004',
    1,
    'Project Charter & Work Breakdown Structure (WBS)',
    'Decomposing deliverables into manageable work packages, establishing work hierarchy, and defining project boundaries.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    2,
    'Schedule Management: PERT and Critical Path Method (CPM)',
    'Calculating earliest and latest start/finish dates, identifying zero-float critical paths, and project crashing methods.',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    3,
    'Cost & Performance: Earned Value Management (EVM)',
    'Measuring project health using Planned Value (PV), Earned Value (EV), Actual Cost (AC), Cost Variance (CV), and Schedule Performance Index (SPI).',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    4,
    'Project Risk Management & Contingency Planning',
    'Qualitative and quantitative risk matrices, mitigation strategies (Avoid, Transfer, Mitigate, Accept), and fallback reserves.',
    4
  ),

  -- Chapters for IT Service Management & Operations
  (
    'a1000000-0000-0000-0000-000000000005',
    1,
    'ITIL Framework Overview & Service Lifecycle',
    'Introduction to ITIL concepts: Service Strategy, Service Design, Service Transition, Service Operation, and Continual Service Improvement.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    2,
    'Service Level Management (SLA, OLA, UC)',
    'Formulating measurable Service Level Agreements (SLAs), Operational Level Agreements (OLAs), and Underpinning Contracts (UCs).',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    3,
    'Incident, Problem & Change Management',
    'Managing service disruptions, root cause investigations, change approval boards (CAB), and rollback plans.',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    4,
    'Facility Management & Disaster Recovery (DRP)',
    'Uninterruptible Power Supplies (UPS), server cooling, physical access security, and hot/warm/cold backup site operations.',
    4
  ),

  -- Chapters for Computer Systems & Architecture
  (
    'a1000000-0000-0000-0000-000000000006',
    1,
    'Processor Architecture & Instruction Execution Cycle',
    'Fetch, Decode, Execute, and Writeback stages; registers (PC, IR, MAR, MBR); and interrupt handling mechanisms.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    2,
    'Memory Hierarchy & Caching Systems',
    'Register, L1/L2/L3 cache, main memory (DRAM), secondary storage; cache hit/miss rates, and cache write policies.',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    3,
    'Bus Architecture & Input/Output Systems',
    'System buses, address/data/control buses, DMA (Direct Memory Access), and interrupt-driven I/O processing.',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    4,
    'High-Performance Architectures & Pipelining',
    'Instruction pipelining hazards (structural, data, control), superscalar execution, and multi-core processing.',
    4
  ),

  -- Chapters for Networks & Information Security
  (
    'a1000000-0000-0000-0000-000000000007',
    1,
    'Network Topologies & OSI vs TCP/IP Models',
    'Star, mesh, bus topologies, and the 7-layer OSI model contrasted with the 4-layer TCP/IP protocol suite.',
    1
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    2,
    'IP Addressing, Routing & Subnetting',
    'IPv4 vs IPv6, CIDR notation, subnet masks, default gateways, and common routing protocols (OSPF, BGP).',
    2
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    3,
    'Cryptography & Digital Signatures',
    'Symmetric ciphers (AES), asymmetric key pairs (RSA), SHA-256 hashing, and digital certificates (PKI / X.509).',
    3
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    4,
    'Cyber Threats, Firewalls & Security Controls',
    'Common threats (Phishing, Ransomware, Man-in-the-Middle, SQL injection), packet-filtering firewalls, and IDS/IPS.',
    4
  )
ON CONFLICT DO NOTHING;
