-- ==============================================================================
-- GABAY PHILNITS: DEDICATED DIAGNOSTIC ASSESSMENT TABLES (SUPABASE SQL)
-- ==============================================================================
-- Matches the exact column naming schema used by the Mock Exam tables:
-- (id, question_number, question_text, option_a, option_b, option_c, option_d,
--  correct_answer, explanation, category, topic, difficulty, is_active)
--
-- Supported Structures:
-- 1. Philnits_IP_diagnostic_exam (Categories: Technology, Management, Strategy)
-- 2. Philnits_FE_diagnostic_exam (Categories: Subject A, Subject B)
-- 3. Philnits_diagnostic_exam (Unified table with exam_level: 'ip' or 'fe')
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Philnits_IP_diagnostic_exam
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_IP_mock_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    topic TEXT,
    subtopic TEXT,
    difficulty TEXT DEFAULT 'medium',
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."Philnits_IP_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL, -- 'Technology', 'Management', 'Strategy'
    topic TEXT,
    subtopic TEXT,
    difficulty TEXT DEFAULT 'medium',
    image_url TEXT,
    image_description TEXT,
    reference_image_url TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ip_diag_cat_active 
    ON public."Philnits_IP_diagnostic_exam" (category, is_active);

ALTER TABLE public."Philnits_IP_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_IP_diagnostic_exam' 
        AND policyname = 'Allow active IP diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active IP diagnostic questions read" 
            ON public."Philnits_IP_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. Philnits_FE_diagnostic_exam
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_FE_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL, -- 'Subject A' or 'Subject B'
    topic TEXT,
    subtopic TEXT,
    difficulty TEXT DEFAULT 'medium',
    image_url TEXT,
    image_description TEXT,
    reference_image_url TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fe_diag_cat_active 
    ON public."Philnits_FE_diagnostic_exam" (category, is_active);

ALTER TABLE public."Philnits_FE_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_FE_diagnostic_exam' 
        AND policyname = 'Allow active FE diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active FE diagnostic questions read" 
            ON public."Philnits_FE_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Philnits_diagnostic_exam (Unified table optional support)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."Philnits_diagnostic_exam" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_level TEXT NOT NULL CHECK (exam_level IN ('ip', 'fe')),
    question_number INT,
    question_text TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    category TEXT NOT NULL,
    topic TEXT,
    subtopic TEXT,
    difficulty TEXT DEFAULT 'medium',
    image_url TEXT,
    image_description TEXT,
    reference_image_url TEXT,
    is_active BOOL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unified_diag_lvl_cat 
    ON public."Philnits_diagnostic_exam" (exam_level, category, is_active);

ALTER TABLE public."Philnits_diagnostic_exam" ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'Philnits_diagnostic_exam' 
        AND policyname = 'Allow active unified diagnostic questions read'
    ) THEN
        CREATE POLICY "Allow active unified diagnostic questions read" 
            ON public."Philnits_diagnostic_exam" FOR SELECT 
            USING (is_active = true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. Sample Seed Data: Philnits_IP_diagnostic_exam (Technology, Management, Strategy)
-- ------------------------------------------------------------------------------
INSERT INTO public."Philnits_IP_diagnostic_exam" 
(question_number, category, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
-- Technology (10)
(1, 'Technology', 'Which of the following describes volatile memory?', 'Retains data when power is off', 'Loses contents when powered off', 'Read-only storage', 'Magnetic tape storage', 'B', 'Volatile memory like RAM loses its stored electrical state when powered off.'),
(2, 'Technology', 'In an operating system, what is the role of virtual memory?', 'Speeds up CPU clock cycle', 'Uses disk space as extension of RAM', 'Stores BIOS permanently', 'Provides physical GPU memory', 'B', 'Virtual memory maps pages from secondary storage (HDD/SSD) to simulate additional RAM.'),
(3, 'Technology', 'Which protocol resolves an IP address to a physical MAC address?', 'DNS', 'DHCP', 'ARP', 'ICMP', 'C', 'ARP (Address Resolution Protocol) maps an IPv4 address to a local physical layer (MAC) address.'),
(4, 'Technology', 'In relational databases, which normal form eliminates transitive dependency?', '1NF', '2NF', '3NF', 'BCNF', 'C', 'Third Normal Form (3NF) requires 2NF and that no non-prime attribute is transitively dependent on the primary key.'),
(5, 'Technology', 'Which OSI layer handles end-to-end communication and port numbers?', 'Network', 'Transport', 'Data Link', 'Session', 'B', 'Transport layer (Layer 4) handles flow control, segmentation, and port addressing (TCP/UDP).'),
(6, 'Technology', 'What is the primary function of an interrupt handler?', 'Halts computer permanently', 'Executes code to service hardware/software signal', 'Clears RAM buffers', 'Encrypts storage', 'B', 'An interrupt service routine (ISR) pauses the CPU thread to handle asynchronous hardware/software events.'),
(7, 'Technology', 'Which encryption algorithm uses public and private key pairs?', 'AES', 'DES', 'RSA', 'Blowfish', 'C', 'RSA is asymmetric cryptography requiring a mathematically linked public-private key pair.'),
(8, 'Technology', 'What does RAID 1 provide?', 'Striping without parity', 'Disk mirroring', 'Block-level striping with parity', 'Dual distributed parity', 'B', 'RAID 1 mirrors data across two or more identical drives for fault tolerance.'),
(9, 'Technology', 'In SQL, which clause filters aggregated group results?', 'WHERE', 'HAVING', 'GROUP BY', 'ORDER BY', 'B', 'HAVING filters results after aggregation by GROUP BY.'),
(10, 'Technology', 'Which digital logic gate outputs TRUE only when inputs differ?', 'AND', 'OR', 'XOR', 'NAND', 'C', 'XOR (exclusive OR) outputs TRUE (1) only when the two inputs are distinct.'),

-- Management (10)
(11, 'Management', 'In project management, what defines the Critical Path?', 'Sequence of activities with maximum slack', 'Longest path of dependent activities determining project duration', 'Cheapest path of tasks', 'Fastest path with unlimited resources', 'B', 'The critical path is the longest path through the network diagram with zero total float.'),
(12, 'Management', 'Which ITIL process is responsible for restoring normal service operation as quickly as possible?', 'Problem Management', 'Incident Management', 'Change Management', 'Release Management', 'B', 'Incident Management focuses on rapid service restoration.'),
(13, 'Management', 'What is a WBS (Work Breakdown Structure)?', 'Organizational chart', 'Hierarchical decomposition of project scope', 'Financial audit ledger', 'Employee review form', 'B', 'WBS decomposes total project scope into deliverable-oriented work packages.'),
(14, 'Management', 'In Agile Scrum, who is responsible for maximizing product value and managing the backlog?', 'Scrum Master', 'Product Owner', 'Development Team', 'Project Sponsor', 'B', 'The Product Owner manages the backlog items and business priorities.'),
(15, 'Management', 'What is the purpose of Earned Value Management (EVM)?', 'Employee salary calculation', 'Measuring project performance and progress objectively', 'Vendor contract validation', 'Database query optimization', 'B', 'EVM integrates scope, schedule, and cost metrics (PV, EV, AC).'),
(16, 'Management', 'Which risk response strategy involves purchasing insurance or outsourcing?', 'Avoidance', 'Mitigation', 'Transference', 'Acceptance', 'C', 'Risk transference shifts financial impact to a third party.'),
(17, 'Management', 'In Quality Management, what does PDCA stand for?', 'Plan-Do-Check-Act', 'Program-Develop-Code-Audit', 'Process-Define-Control-Analyze', 'Project-Design-Create-Assess', 'A', 'Deming circle stands for Plan-Do-Check-Act.'),
(18, 'Management', 'What is the primary objective of Change Management?', 'Block all change requests', 'Standardize methods to minimize disruption from changes', 'Authorize unlimited budget', 'Replace legacy staff', 'B', 'Change management controls risk and minimizes impact on IT services.'),
(19, 'Management', 'Which chart visually represents task schedules with horizontal duration bars?', 'Pareto chart', 'Gantt chart', 'Ishikawa diagram', 'Scatter plot', 'B', 'Gantt charts illustrate schedule timelines against calendar dates.'),
(20, 'Management', 'What is the goal of Problem Management in ITIL?', 'Quick temporary workarounds', 'Identify and eliminate root causes of recurring incidents', 'Approve system deployments', 'Handle user passwords', 'B', 'Problem Management finds and rectifies root causes.'),

-- Strategy (10)
(21, 'Strategy', 'Which analysis framework examines Strengths, Weaknesses, Opportunities, and Threats?', 'PESTEL', 'SWOT', 'Five Forces', 'BCG Matrix', 'B', 'SWOT evaluates internal and external business factors.'),
(22, 'Strategy', 'In Porters Five Forces model, which force assesses how easily customers can switch to rivals?', 'Threat of New Entrants', 'Bargaining Power of Buyers', 'Threat of Substitutes', 'Supplier Power', 'B', 'Buyer power determines pricing sensitivity and switching costs.'),
(23, 'Strategy', 'What does BCP stand for in enterprise risk management?', 'Business Control Protocol', 'Business Continuity Plan', 'Basic Communication Platform', 'Budget Compliance Process', 'B', 'BCP defines procedures to sustain critical operations during disruptions.'),
(24, 'Strategy', 'Which intellectual property right protects software source code automatically upon creation?', 'Patent', 'Copyright', 'Trademark', 'Trade secret', 'B', 'Copyright automatically protects creative literary and programmatic works upon fixation.'),
(25, 'Strategy', 'What is an SLA (Service Level Agreement)?', 'Hardware procurement bill', 'Contract defining agreed performance and uptime between provider and client', 'Employee non-disclosure agreement', 'Database schema specification', 'B', 'An SLA documents guaranteed service commitments such as 99.9% uptime.'),
(26, 'Strategy', 'In the BCG Growth-Share Matrix, what represents high market growth with low market share?', 'Cash Cows', 'Stars', 'Question Marks', 'Dogs', 'C', 'Question Marks have high potential in growing markets but low current share.'),
(27, 'Strategy', 'What does ERP stand for in enterprise software systems?', 'Enterprise Resource Planning', 'Electronic Record Protocol', 'External Reporting Portal', 'Emergency Recovery Platform', 'A', 'ERP integrates core corporate business functions like supply chain, HR, and finance.'),
(28, 'Strategy', 'Under IT governance, what is the role of COBIT?', 'Programming language standard', 'Framework for IT management and enterprise governance', 'Network cabling guideline', 'Graphics rendering toolkit', 'B', 'COBIT provides controls and metrics for enterprise IT governance.'),
(29, 'Strategy', 'Which marketing metric measures total profit anticipated from an entire customer relationship?', 'ROI', 'CLV (Customer Lifetime Value)', 'CAC', 'EBITDA', 'B', 'Customer Lifetime Value estimates aggregate net margin generated per client.'),
(30, 'Strategy', 'What legal agreement forbids contractors from disclosing proprietary business information?', 'SLA', 'NDA (Non-Disclosure Agreement)', 'MOU', 'RFP', 'B', 'An NDA legally protects confidential intellectual property.');

-- ------------------------------------------------------------------------------
-- 5. Sample Seed Data: Philnits_FE_diagnostic_exam (Subject A: 22, Subject B: 8)
-- ------------------------------------------------------------------------------
INSERT INTO public."Philnits_FE_diagnostic_exam"
(question_number, category, question_text, option_a, option_b, option_c, option_d, correct_answer, explanation)
VALUES
-- Subject A (22 Items)
(1, 'Subject A', 'In 2s complement binary representation, what is the 8-bit representation of -5?', '11111011', '10000101', '11111010', '00000101', 'A', '5 is 00000101. Invert bits (11111010) + 1 = 11111011.'),
(2, 'Subject A', 'Which CPU pipeline hazard occurs when instructions depend on the result of a preceding uncompleted instruction?', 'Structural hazard', 'Data hazard', 'Control hazard', 'Branch hazard', 'B', 'Data hazard (Read-After-Write) occurs when operand data is not yet computed or forwarded.'),
(3, 'Subject A', 'What cache write policy updates both the cache and main memory simultaneously on every write?', 'Write-back', 'Write-through', 'Write-allocate', 'No-write-allocate', 'B', 'Write-through guarantees memory consistency by updating RAM and cache concurrently.'),
(4, 'Subject A', 'Which network topology features a single central hub or switch connecting all nodes?', 'Ring', 'Bus', 'Star', 'Mesh', 'C', 'Star topology connects all end stations directly to a central multiport switch.'),
(5, 'Subject A', 'What is the CIDR subnet mask for /26?', '255.255.255.0', '255.255.255.128', '255.255.255.192', '255.255.255.224', 'C', '/26 has 2 bits borrowed in the 4th octet: 128 + 64 = 192.'),
(6, 'Subject A', 'In TCP, how many segments are exchanged to establish a connection?', '2', '3', '4', '5', 'B', 'The TCP 3-way handshake uses SYN, SYN-ACK, and ACK.'),
(7, 'Subject A', 'Which cryptographic primitive produces a fixed-size digest from arbitrary-length input and is irreversible?', 'Symmetric cipher', 'Cryptographic hash function', 'Asymmetric key', 'Stream cipher', 'B', 'Hash functions (like SHA-256) generate irreversible one-way message digests.'),
(8, 'Subject A', 'Which security attack exhausts server resources by flooding it with uncompleted TCP handshakes?', 'SQL Injection', 'SYN Flood', 'Cross-Site Scripting', 'ARP Poisoning', 'B', 'SYN flood leaves half-open TCP connections until the backlog queue is full.'),
(9, 'Subject A', 'In relational databases, what property ensures all parts of a transaction succeed or all roll back?', 'Atomicity', 'Consistency', 'Isolation', 'Durability', 'A', 'Atomicity (the A in ACID) guarantees all-or-nothing execution.'),
(10, 'Subject A', 'Which SQL index structure is most widely used for range queries and ordered searches?', 'Hash index', 'B-Tree index', 'Bitmap index', 'Spatial index', 'B', 'B-Tree / B+Tree maintains sorted key sequences ideal for range lookups.'),
(11, 'Subject A', 'What does DNS stand for and what is its primary function?', 'Data Network System; encrypts traffic', 'Domain Name System; resolves hostnames to IP addresses', 'Dynamic Node Service; assigns MACs', 'Digital Naming Standard; formats URLs', 'B', 'DNS translates human-readable hostnames into network IP addresses.'),
(12, 'Subject A', 'Which CPU register stores the address of the next instruction to fetch?', 'Instruction Register', 'Program Counter', 'Accumulator', 'Stack Pointer', 'B', 'The Program Counter (PC) increments to hold the pointer to the next instruction.'),
(13, 'Subject A', 'What type of malware disguises itself as legitimate software?', 'Worm', 'Trojan Horse', 'Spyware', 'Rootkit', 'B', 'A Trojan horse tricks users into executing malicious payload by masquerading as useful software.'),
(14, 'Subject A', 'Which access control model restricts access based on clearance levels and data classifications?', 'DAC', 'MAC (Mandatory Access Control)', 'RBAC', 'ABAC', 'B', 'Mandatory Access Control enforces security labels and clearances managed by system policy.'),
(15, 'Subject A', 'What is the maximum theoretical throughput of standard Gigabit Ethernet?', '100 Mbps', '1000 Mbps', '10 Gbps', '100 Gbps', 'B', 'Gigabit Ethernet operates at 1000 Mbps (1 Gbps).'),
(16, 'Subject A', 'In digital logic, De Morgans Law states that NOT (A AND B) equals:', '(NOT A) AND (NOT B)', '(NOT A) OR (NOT B)', 'A OR B', 'NOT (A OR B)', 'B', 'De Morgans law: ~(A & B) = ~A | ~B.'),
(17, 'Subject A', 'Which process scheduling algorithm assigns a fixed time quantum to each ready process in cyclic order?', 'SJF', 'Round Robin', 'Priority Scheduling', 'FCFS', 'B', 'Round Robin allocates a preemptive time slice cyclically.'),
(18, 'Subject A', 'What is the role of a firewall at the network perimeter?', 'Increase broadband bandwidth', 'Filter incoming and outgoing packets based on security rules', 'Host web servers', 'Assign DHCP leases', 'B', 'Firewalls inspect packet headers and states to enforce traffic policies.'),
(19, 'Subject A', 'Which HTTP response status code signifies resource not found?', '200', '301', '404', '500', 'C', 'HTTP 404 indicates the requested URI path was not found on the origin server.'),
(20, 'Subject A', 'In software testing, what is black-box testing?', 'Testing internal code structures', 'Testing functionality without knowing internal implementation', 'Compiler syntax checking', 'Hardware stress testing', 'B', 'Black-box testing verifies functional behavior from inputs and expected outputs.'),
(21, 'Subject A', 'What does MTBF stand for in system reliability engineering?', 'Mean Time Between Failures', 'Maximum Time Before Formatting', 'Memory Transfer Bus Frequency', 'Minimum Time Between Frames', 'A', 'MTBF measures the predicted elapsed operating time between inherent system failures.'),
(22, 'Subject A', 'In database concurrency control, what phenomenon occurs when two transactions wait indefinitely for locks held by each other?', 'Starvation', 'Deadlock', 'Dirty read', 'Phantom read', 'B', 'Deadlock occurs when mutual circular waiting exists between resource locks.'),

-- Subject B (8 Items: Algorithms, Programming, and Applied Logic)
(23, 'Subject B', 'What is the average time complexity of searching an element in a balanced Binary Search Tree with N nodes?', 'O(1)', 'O(log N)', 'O(N)', 'O(N^2)', 'B', 'Balanced BSTs halve the search space at each branch, yielding O(log N) depth.'),
(24, 'Subject B', 'Which data structure operates on a Last-In, First-Out (LIFO) principle?', 'Queue', 'Stack', 'Linked List', 'Hash Table', 'B', 'Stacks add and remove elements strictly from the top (LIFO).'),
(25, 'Subject B', 'In recursive algorithm analysis, what is the worst-case time complexity of standard QuickSort with poor pivot selection?', 'O(N log N)', 'O(N^2)', 'O(2^N)', 'O(log N)', 'B', 'When the pivot is consistently the maximum or minimum, QuickSort degenerates to O(N^2).'),
(26, 'Subject B', 'Consider the loop: for (i = 0; i < N; i++) for (j = 0; j < i; j++) counter++; How many times does counter increment?', 'N', 'N(N - 1) / 2', 'N^2', 'N / 2', 'B', 'Sum of j from 0 to N-1 is 0 + 1 + ... + (N-1) = N(N - 1) / 2.'),
(27, 'Subject B', 'Which sorting algorithm repeatedly picks the smallest remaining element and swaps it into its correct position?', 'Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort', 'B', 'Selection sort scans the unsorted partition for the minimum and places it at the front.'),
(28, 'Subject B', 'In Breadth-First Search (BFS) graph traversal, which data structure is used to keep track of discovered vertices?', 'Stack', 'Queue', 'Priority Queue', 'Array List', 'B', 'BFS explores neighboring nodes level by level using a FIFO Queue.'),
(29, 'Subject B', 'What output is produced by binary bitwise operation (12 AND 10)?', '8', '14', '6', '12', 'A', '12 is 1100 in binary; 10 is 1010 in binary. 1100 & 1010 = 1000 in binary = 8 in decimal.'),
(30, 'Subject B', 'In an array of size N, what is the best algorithm to find if an item exists when the array is already sorted?', 'Linear Search', 'Binary Search', 'Hashing', 'Depth-First Search', 'B', 'Binary search divides the sorted range in half at each step in O(log N) time.');
