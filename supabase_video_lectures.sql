-- ==============================================================================
-- Migration: Setup `public.video_lectures` Filtered by Main Topics of IP & FE
-- ==============================================================================

DROP TABLE IF EXISTS public.video_lectures CASCADE;

CREATE TABLE public.video_lectures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subject TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 15,
    url TEXT NOT NULL,
    youtube_id TEXT NOT NULL,
    thumbnail_url TEXT,
    author TEXT NOT NULL,
    author_url TEXT,
    description TEXT,
    exam_level TEXT NOT NULL DEFAULT 'BOTH' CHECK (exam_level IN ('IP', 'FE', 'BOTH')),
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT true,
    admin_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique and Performance Indexes
CREATE UNIQUE INDEX idx_video_lectures_youtube_id ON public.video_lectures (youtube_id);
CREATE INDEX idx_video_lectures_admin_id ON public.video_lectures (admin_id);
CREATE INDEX idx_video_lectures_exam_level ON public.video_lectures (exam_level);
CREATE INDEX idx_video_lectures_subject ON public.video_lectures (subject);
CREATE INDEX idx_video_lectures_sort_order ON public.video_lectures (sort_order ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.video_lectures ENABLE ROW LEVEL SECURITY;

-- Policy 1: Public / Student Read Access
DROP POLICY IF EXISTS "Public can view published video lectures" ON public.video_lectures;
CREATE POLICY "Public can view published video lectures"
    ON public.video_lectures
    FOR SELECT
    USING (is_published = true);

-- Policy 2: Admin Full Management Access
DROP POLICY IF EXISTS "Admins can manage video lectures" ON public.video_lectures;
CREATE POLICY "Admins can manage video lectures"
    ON public.video_lectures
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE email = (auth.jwt() ->> 'email') AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE email = (auth.jwt() ->> 'email') AND role = 'admin'
        )
    );

-- ==============================================================================
-- Seed PhilNITS Video Lectures by Main Topics (IP & FE)
-- ==============================================================================

INSERT INTO public.video_lectures (
    title,
    subject,
    duration_minutes,
    url,
    youtube_id,
    thumbnail_url,
    author,
    author_url,
    description,
    exam_level,
    sort_order,
    is_published
)
VALUES
    -- =========================================================================
    -- IP TRACK: TECHNOLOGY (5 Videos)
    -- =========================================================================
    (
        'IT Fundamentals: Hardware, Binary & Digital Logic',
        'Technology',
        10,
        'https://www.youtube.com/watch?v=gI-qXk7XojA',
        'gI-qXk7XojA',
        'https://i.ytimg.com/vi/gI-qXk7XojA/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Foundational technology review for PhilNITS IT Passport: Boolean algebra, logic gates (AND, OR, NOT, XOR), truth tables, and binary arithmetic.',
        'IP',
        1,
        true
    ),
    (
        'Operating Systems & Computer Resource Management',
        'Technology',
        13,
        'https://www.youtube.com/watch?v=26QPDBe-NB8',
        '26QPDBe-NB8',
        'https://i.ytimg.com/vi/26QPDBe-NB8/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Operating system fundamentals for IP: process scheduling, virtual memory paging, file systems, device drivers, and kernel architectures.',
        'IP',
        2,
        true
    ),
    (
        'Relational Databases & SQL Query Fundamentals',
        'Technology',
        20,
        'https://www.youtube.com/watch?v=HXV3zeRR3h4',
        'HXV3zeRR3h4',
        'https://i.ytimg.com/vi/HXV3zeRR3h4/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'Relational database concepts: tables, primary/foreign keys, normalization (1NF, 2NF, 3NF), and core SQL queries (SELECT, JOIN, GROUP BY).',
        'IP',
        3,
        true
    ),
    (
        'Cybersecurity, Malware & Defense Mechanisms',
        'Technology',
        13,
        'https://www.youtube.com/watch?v=bPVaOlJ6ln0',
        'bPVaOlJ6ln0',
        'https://i.ytimg.com/vi/bPVaOlJ6ln0/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Core cybersecurity principles: CIA triad (Confidentiality, Integrity, Availability), authentication methods, firewalls, trojans, phishing, and security management.',
        'IP',
        4,
        true
    ),
    (
        'Telecommunications, Internet & Cloud Infrastructure',
        'Technology',
        12,
        'https://www.youtube.com/watch?v=AEaKrq3SpW8',
        'AEaKrq3SpW8',
        'https://i.ytimg.com/vi/AEaKrq3SpW8/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Internet routing, DNS domain resolution, HTTP/HTTPS web protocols, and cloud computing models (IaaS, PaaS, SaaS) for PhilNITS IP.',
        'IP',
        5,
        true
    ),

    -- =========================================================================
    -- IP TRACK: MANAGEMENT (3 Videos)
    -- =========================================================================
    (
        'Project Management Fundamentals & PMBOK Principles',
        'Management',
        15,
        'https://www.youtube.com/watch?v=f0kUfDLXqPE',
        'f0kUfDLXqPE',
        'https://i.ytimg.com/vi/f0kUfDLXqPE/hqdefault.jpg',
        'Simplilearn',
        'https://www.youtube.com/@SimplilearnOfficial',
        'Key project management concepts for PhilNITS IP: Triple Constraint (Scope, Time, Cost), Work Breakdown Structure (WBS), Gantt charts, risk matrices, and change management.',
        'IP',
        6,
        true
    ),
    (
        'ITIL 4 Service Management Lifecycle & SLAs',
        'Management',
        18,
        'https://www.youtube.com/watch?v=1L2WwG9UjX4',
        '1L2WwG9UjX4',
        'https://i.ytimg.com/vi/1L2WwG9UjX4/hqdefault.jpg',
        'Simplilearn',
        'https://www.youtube.com/@SimplilearnOfficial',
        'ITIL framework essentials: Service Level Agreements (SLA), incident lifecycle, problem resolution, release deployment, and IT service desk management.',
        'IP',
        7,
        true
    ),
    (
        'Risk Management, Contingency Planning & System Audits',
        'Management',
        14,
        'https://www.youtube.com/watch?v=t4y3z5E_Qz8',
        't4y3z5E_Qz8',
        'https://i.ytimg.com/vi/t4y3z5E_Qz8/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'System audit procedures, internal controls, risk assessment matrices, Business Continuity Plans (BCP), and Disaster Recovery Plans (DRP).',
        'IP',
        8,
        true
    ),

    -- =========================================================================
    -- IP TRACK: STRATEGY (3 Videos)
    -- =========================================================================
    (
        'Business Strategy & Competitive Advantage',
        'Strategy',
        10,
        'https://www.youtube.com/watch?v=o7Ik1OB4TaE',
        'o7Ik1OB4TaE',
        'https://i.ytimg.com/vi/o7Ik1OB4TaE/hqdefault.jpg',
        'Harvard Business Review',
        'https://www.youtube.com/@harvardbusinessreview',
        'Core business strategy for PhilNITS IP: differentiation, cost leadership, value chains, enterprise resource planning (ERP), and aligning IT strategy with corporate goals.',
        'IP',
        9,
        true
    ),
    (
        'Michael Porter''s Five Competitive Forces Analysis',
        'Strategy',
        13,
        'https://www.youtube.com/watch?v=mYF2_FBCvXw',
        'mYF2_FBCvXw',
        'https://i.ytimg.com/vi/mYF2_FBCvXw/hqdefault.jpg',
        'Harvard Business Review',
        'https://www.youtube.com/@harvardbusinessreview',
        'Industry analysis framework: threat of new entrants, bargaining power of suppliers and buyers, threat of substitutes, and competitive rivalry for IT strategy.',
        'IP',
        10,
        true
    ),
    (
        'Intellectual Property, Copyright & Digital Compliance',
        'Strategy',
        11,
        'https://www.youtube.com/watch?v=mKvZ9Q3b-Q8',
        'mKvZ9Q3b-Q8',
        'https://i.ytimg.com/vi/mKvZ9Q3b-Q8/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Legal compliance in IT: patents, software copyrights, trademarks, open-source licensing (GPL, MIT), and data privacy laws (RA 10173 & GDPR).',
        'IP',
        11,
        true
    ),

    -- =========================================================================
    -- FE TRACK: COMPUTER SYSTEMS & ARCHITECTURE (4 Videos)
    -- =========================================================================
    (
        'The Central Processing Unit (CPU) Architecture',
        'Computer Systems & Architecture',
        12,
        'https://www.youtube.com/watch?v=FZGugFqdr60',
        'FZGugFqdr60',
        'https://i.ytimg.com/vi/FZGugFqdr60/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Comprehensive breakdown of the CPU, Arithmetic Logic Unit (ALU), internal registers, memory address bus, and the Fetch-Decode-Execute instruction cycle for PhilNITS FE.',
        'FE',
        12,
        true
    ),
    (
        'Advanced CPU Designs, Pipelining & Cache Memory',
        'Computer Systems & Architecture',
        13,
        'https://www.youtube.com/watch?v=rtAlC5J1U40',
        'rtAlC5J1U40',
        'https://i.ytimg.com/vi/rtAlC5J1U40/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Detailed review of instruction pipelining, pipeline hazards, cache hierarchy (L1/L2/L3), superscalar execution, and multi-core architectures for PhilNITS FE.',
        'FE',
        13,
        true
    ),
    (
        'Memory Hierarchies, RAM, Virtual Memory & Paging',
        'Computer Systems & Architecture',
        12,
        'https://www.youtube.com/watch?v=fpnE6UAfbtU',
        'fpnE6UAfbtU',
        'https://i.ytimg.com/vi/fpnE6UAfbtU/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Detailed exploration of physical memory, SRAM vs DRAM, virtual memory address translation, page replacement algorithms (FIFO, LRU), and thrashing.',
        'FE',
        14,
        true
    ),
    (
        'High-Speed Bus Architectures, Interrupts & DMA',
        'Computer Systems & Architecture',
        22,
        'https://www.youtube.com/watch?v=GjNp0bBrjmU',
        'GjNp0bBrjmU',
        'https://i.ytimg.com/vi/GjNp0bBrjmU/hqdefault.jpg',
        'MIT OpenCourseWare',
        'https://www.youtube.com/@mitocw',
        'Direct Memory Access (DMA) controllers, bus arbitration, programmed I/O, interrupt service routines (ISR), and peripheral interface standards.',
        'FE',
        15,
        true
    ),

    -- =========================================================================
    -- FE TRACK: ALGORITHMS & PROGRAMMING (4 Videos)
    -- =========================================================================
    (
        'Data Structures: Arrays, Linked Lists, Stacks & Queues',
        'Algorithms & Programming',
        11,
        'https://www.youtube.com/watch?v=DuDz6B4cqVc',
        'DuDz6B4cqVc',
        'https://i.ytimg.com/vi/DuDz6B4cqVc/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Essential fundamental data structures: contiguous array representations, node pointers, linked list traversal, LIFO stack operations, and FIFO queue mechanisms.',
        'FE',
        16,
        true
    ),
    (
        'Data Structures & Algorithms - Tracing & Complexity',
        'Algorithms & Programming',
        25,
        'https://www.youtube.com/watch?v=RBSGKlAvoiM',
        'RBSGKlAvoiM',
        'https://i.ytimg.com/vi/RBSGKlAvoiM/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'In-depth tutorial on Big-O asymptotic notation, recursion trees, binary search, and sorting algorithms essential for PhilNITS FE Subject A and Subject B.',
        'FE',
        17,
        true
    ),
    (
        'Binary Search Trees, Heaps & Graph Traversal',
        'Algorithms & Programming',
        22,
        'https://www.youtube.com/watch?v=oSWTXtMglKE',
        'oSWTXtMglKE',
        'https://i.ytimg.com/vi/oSWTXtMglKE/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'Non-linear data structures: Binary Search Tree (BST) operations, min/max heaps, breadth-first search (BFS), and depth-first search (DFS) pseudo-code tracing.',
        'FE',
        18,
        true
    ),
    (
        'Dynamic Programming & Recursion Tracing',
        'Algorithms & Programming',
        30,
        'https://www.youtube.com/watch?v=oBt53YbR9Kk',
        'oBt53YbR9Kk',
        'https://i.ytimg.com/vi/oBt53YbR9Kk/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'Advanced problem-solving for PhilNITS FE Subject B: optimal substructure, overlapping subproblems, memoization, and bottom-up tabulation.',
        'FE',
        19,
        true
    ),

    -- =========================================================================
    -- FE TRACK: NETWORKS & SECURITY (4 Videos)
    -- =========================================================================
    (
        'Computer Networks, LAN, WAN & Packet Switching',
        'Networks & Security',
        12,
        'https://www.youtube.com/watch?v=3QhU9jd03a0',
        '3QhU9jd03a0',
        'https://i.ytimg.com/vi/3QhU9jd03a0/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Understanding the OSI 7-layer model, TCP/IP protocol suite, packet switching, MAC addresses, IP routing, and subnetting for PhilNITS FE.',
        'FE',
        20,
        true
    ),
    (
        'Network Security, Cryptography & Encryption Protocols',
        'Networks & Security',
        13,
        'https://www.youtube.com/watch?v=jhXCTbFnK8o',
        'jhXCTbFnK8o',
        'https://i.ytimg.com/vi/jhXCTbFnK8o/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Master symmetric ciphers (AES/DES), asymmetric public-key cryptography (RSA), Diffie-Hellman key exchange, digital signatures, and SSL/TLS certificates.',
        'FE',
        21,
        true
    ),
    (
        'Transport Layer: TCP 3-Way Handshake, UDP & Sockets',
        'Networks & Security',
        12,
        'https://www.youtube.com/watch?v=Vdc8TCESIg8',
        'Vdc8TCESIg8',
        'https://i.ytimg.com/vi/Vdc8TCESIg8/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Connection-oriented TCP vs connectionless UDP, sequence numbers, sliding window flow control, port numbers, and socket communication for PhilNITS FE.',
        'FE',
        22,
        true
    ),
    (
        'Public Key Infrastructure (PKI) & TLS/SSL Handshake',
        'Networks & Security',
        18,
        'https://www.youtube.com/watch?v=T4Df5_cojAs',
        'T4Df5_cojAs',
        'https://i.ytimg.com/vi/T4Df5_cojAs/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'Deep dive into Certificate Authorities (CA), X.509 digital certificates, certificate revocation lists (CRL), and the cryptographic TLS handshake.',
        'FE',
        23,
        true
    ),

    -- =========================================================================
    -- FE TRACK: IT MANAGEMENT & STRATEGY (3 Videos)
    -- =========================================================================
    (
        'Software Engineering Lifecycles & Methodologies',
        'IT Management & Strategy',
        11,
        'https://www.youtube.com/watch?v=O753uuutqH8',
        'O753uuutqH8',
        'https://i.ytimg.com/vi/O753uuutqH8/hqdefault.jpg',
        'CrashCourse',
        'https://www.youtube.com/@crashcourse',
        'Software Development Life Cycle (SDLC), Waterfall model, Agile & Scrum principles, testing levels (unit, integration, system), and project deliverables.',
        'FE',
        24,
        true
    ),
    (
        'Enterprise Architecture, Microservices & System Design',
        'IT Management & Strategy',
        25,
        'https://www.youtube.com/watch?v=SqcXvc3Zm8U',
        'SqcXvc3Zm8U',
        'https://i.ytimg.com/vi/SqcXvc3Zm8U/hqdefault.jpg',
        'freeCodeCamp.org',
        'https://www.youtube.com/@freecodecamp',
        'High-level software design principles: monolithic vs microservices, loose coupling, high cohesion, design patterns, and scalability planning.',
        'FE',
        25,
        true
    ),
    (
        'IT Service Operations & SLA Incident Governance',
        'IT Management & Strategy',
        16,
        'https://www.youtube.com/watch?v=bYhN8_b1pLs',
        'bYhN8_b1pLs',
        'https://i.ytimg.com/vi/bYhN8_b1pLs/hqdefault.jpg',
        'Simplilearn',
        'https://www.youtube.com/@SimplilearnOfficial',
        'Incident prioritization, root cause analysis, Change Advisory Board (CAB) reviews, configuration management databases (CMDB), and SLA compliance.',
        'FE',
        26,
        true
    );
