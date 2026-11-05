/**
 * generate_philnits_practice_sql.js
 * Generates PhilNITS practice content across 3 review speeds (Quick, Standard, Detailed)
 * Integrates into the 5 practice SQL files in c:\Users\Daniel\Downloads\ and produces
 * a unified supabase_philnits_practice_seed.sql migration script.
 */

const fs = require('fs');
const path = require('path');

const DOWNLOADS_DIR = 'c:/Users/Daniel/Downloads';

// ------------------------------------------------------------------------------
// 1. PhilNITS Categories
// ------------------------------------------------------------------------------
const PHILNITS_CATEGORIES = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    admin_id: 6,
    name: 'Technology',
    slug: 'technology',
    description: 'Hardware, computer architecture, networking, software design, and cybersecurity.',
    icon: 'cpu',
    color: '#2563EB',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    admin_id: 6,
    name: 'Management',
    slug: 'management',
    description: 'Project management, IT service management (ITIL), facility ops, and system audits.',
    icon: 'briefcase',
    color: '#10B981',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    admin_id: 6,
    name: 'Strategy',
    slug: 'strategy',
    description: 'Corporate governance, IT legal affairs, business strategy, and enterprise models.',
    icon: 'trending-up',
    color: '#F59E0B',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    admin_id: 6,
    name: 'Computer Systems & Architecture',
    slug: 'computer-systems-architecture',
    description: 'CPU execution cycles, instruction pipelining, caching hierarchy, memory, and buses.',
    icon: 'hard-drive',
    color: '#6366F1',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    admin_id: 6,
    name: 'Algorithms & Programming',
    slug: 'algorithms-programming',
    description: 'Data structures, sorting/searching algorithms, recursion, and Big-O computational complexity.',
    icon: 'code',
    color: '#EC4899',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    admin_id: 6,
    name: 'Networks & Security',
    slug: 'networks-security',
    description: 'OSI and TCP/IP protocol suites, IP routing, cryptography, digital certs, and cyber defense.',
    icon: 'shield',
    color: '#EF4444',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    admin_id: 6,
    name: 'IT Management & Strategy',
    slug: 'it-management-strategy',
    description: 'Software lifecycles, Agile/Scrum, PMBOK, ITIL, COSO, and IT compliance.',
    icon: 'layers',
    color: '#8B5CF6',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    admin_id: 6,
    name: 'Databases & SQL',
    slug: 'databases-sql',
    description: 'Relational schemas, normalization (1NF-3NF), ACID transactions, ER diagrams, and SQL queries.',
    icon: 'database',
    color: '#06B6D4',
    created_at: '2026-10-31 12:00:00+00',
    updated_at: '2026-10-31 12:00:00+00'
  }
];

// ------------------------------------------------------------------------------
// 2. PhilNITS Flashcard Decks
// ------------------------------------------------------------------------------
const PHILNITS_DECKS = [
  {
    id: 'd1000000-0000-0000-0000-000000000001',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000001',
    title: 'Technology - Fundamental Concepts',
    description: 'Essential hardware, computing architecture, and IT concepts for PhilNITS IP & FE.',
    total_cards: 12,
    difficulty: 'medium',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000002',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000002',
    title: 'Management - PMBOK & ITIL Services',
    description: 'Project lifecycle, WBS, EVM, risk planning, SLA, and ITSM frameworks.',
    total_cards: 12,
    difficulty: 'medium',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000003',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000003',
    title: 'Strategy - Governance, Laws & Enterprise',
    description: 'COSO internal controls, CSR, software copyrights, patents, and business strategy models.',
    total_cards: 12,
    difficulty: 'hard',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000004',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000004',
    title: 'Computer Systems & Architecture Review',
    description: 'Instruction cycles, caching hierarchies, CPU pipelining hazards, and buses.',
    total_cards: 12,
    difficulty: 'hard',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000005',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000005',
    title: 'Algorithms, Data Structures & Big-O',
    description: 'Stacks, queues, binary trees, sorting algorithms, and complexity analysis.',
    total_cards: 12,
    difficulty: 'hard',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000006',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000006',
    title: 'Networks & Cybersecurity Fundamentals',
    description: 'OSI 7 layers, TCP/IP, subnetting, symmetric/asymmetric encryption, and defenses.',
    total_cards: 12,
    difficulty: 'medium',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000007',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000007',
    title: 'IT Management & Strategy In-Depth',
    description: 'Advanced governance, SDLC methodologies, change control, and IT auditing.',
    total_cards: 12,
    difficulty: 'hard',
    is_published: true
  },
  {
    id: 'd1000000-0000-0000-0000-000000000008',
    admin_id: 6,
    category_id: 'c1000000-0000-0000-0000-000000000008',
    title: 'Databases, Normalization & SQL Queries',
    description: 'Relational design, 1NF to 3NF, ACID transaction guarantees, and SQL statements.',
    total_cards: 12,
    difficulty: 'medium',
    is_published: true
  }
];

// Helper to escape single quotes in SQL strings
function esc(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

// ------------------------------------------------------------------------------
// 3. PhilNITS Practice Topics Definition (Each has Quick, Standard, Detailed)
// ------------------------------------------------------------------------------
const TOPICS = [
  // ============================================================================
  // Topic 1: CPU Architecture & Instruction Cycles (Technology / Systems)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000001',
    deckId: 'd1000000-0000-0000-0000-000000000001',
    setTitle: 'Computer Architecture',
    quick: {
      mcq: {
        prompt: 'Which internal CPU register holds the memory address of the next instruction to be fetched and executed?',
        options: ['Program Counter (PC)', 'Instruction Register (IR)', 'Memory Buffer Register (MBR)', 'Accumulator (ACC)'],
        correct_index: 0,
        explanation: 'The Program Counter (PC) stores the address of the next instruction in memory.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'The Program Counter (PC) stores the memory address of the next instruction to execute.',
        answer: true,
        explanation: 'True. The Program Counter increments after each instruction fetch to point to the next instruction.'
      },
      flashcard: {
        term: 'Program Counter (PC)',
        definition: 'CPU register that holds the memory address of the next instruction to be fetched.',
        hint: 'Directs the CPU to the next execution step.'
      },
      matching: {
        term: 'Program Counter',
        definition: 'Register holding address of next instruction',
        exp_fast: 'Tracks next instruction address in RAM.',
        exp_slow: 'Program Counter (PC) automatically increments during fetch stage to sequence instruction execution.'
      }
    },
    standard: {
      mcq: {
        prompt: 'In the Von Neumann computer architecture, which sequence accurately depicts the standard instruction execution cycle?',
        options: [
          'Fetch -> Decode -> Execute -> Writeback',
          'Decode -> Fetch -> Execute -> Interrupt',
          'Execute -> Fetch -> Decode -> Store',
          'Fetch -> Execute -> Decode -> Writeback'
        ],
        correct_index: 0,
        explanation: 'The CPU first fetches instruction from memory, decodes opcodes, executes operations, and writes results back.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'The Memory Address Register (MAR) holds the actual instruction opcodes currently being decoded by the Control Unit.',
        answer: false,
        explanation: 'False. The Instruction Register (IR) holds the opcode being decoded; the MAR holds the address in memory.'
      },
      flashcard: {
        term: 'Instruction Execution Cycle',
        definition: 'Continuous process comprising Fetch, Decode, Execute, and Writeback stages performed by the CPU.',
        hint: 'The foundational cycle of all Von Neumann processors.'
      },
      matching: {
        term: 'Instruction Register (IR)',
        definition: 'Holds the instruction currently being decoded',
        exp_fast: 'Stores active opcode for CU decoding.',
        exp_slow: 'Instruction Register (IR) receives fetched instructions from memory data bus for decoding by the Control Unit.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'During an interrupt-driven I/O operation in a processor, what action does the CPU perform immediately after acknowledging the interrupt request (INTR)?',
        options: [
          'Saves the current Program Counter and processor state (PSW) onto the stack and jumps to the Interrupt Service Routine (ISR)',
          'Immediately resets the entire memory address bus and clears all general registers',
          'Halts all peripheral clock signals until the user presses an input button',
          'Flushes all RAM data to persistent disk storage'
        ],
        correct_index: 0,
        explanation: 'The CPU pushes the return address (PC) and processor status word (PSW) onto the stack before loading the ISR vector address.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'Direct Memory Access (DMA) completely eliminates the CPU from ever configuring or initiating block data transfers.',
        answer: false,
        explanation: 'False. The CPU must initially configure the DMA controller with source/destination addresses and byte count.'
      },
      flashcard: {
        term: 'Direct Memory Access (DMA)',
        definition: 'Specialized hardware mechanism allowing high-speed I/O devices to transfer data directly to/from RAM without continuous CPU intervention.',
        hint: 'Frees CPU cycles during large bulk data transfers.'
      },
      matching: {
        term: 'DMA Controller',
        definition: 'Transfers bulk data directly between I/O and RAM',
        exp_fast: 'Bypasses CPU for high-speed I/O transfers.',
        exp_slow: 'DMA controller manages memory bus directly, transferring large data blocks and interrupting CPU only upon completion.'
      }
    }
  },

  // ============================================================================
  // Topic 2: Cache Memory & Locality (Technology / Computer Systems)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000004',
    deckId: 'd1000000-0000-0000-0000-000000000004',
    setTitle: 'Memory Hierarchy',
    quick: {
      mcq: {
        prompt: 'Which type of memory is the fastest and positioned directly on or closest to the CPU core?',
        options: ['L1 Cache', 'DRAM Main Memory', 'NVMe SSD', 'Virtual Memory Swap'],
        correct_index: 0,
        explanation: 'L1 Cache is built directly into CPU execution cores and provides sub-nanosecond access speeds.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'SRAM is widely used for main system RAM because it is cheaper and denser than DRAM.',
        answer: false,
        explanation: 'False. DRAM is cheaper and denser (used for main RAM); SRAM is faster and more expensive (used for CPU cache).'
      },
      flashcard: {
        term: 'Cache Memory',
        definition: 'High-speed SRAM located close to or on the CPU die to bridge the processor-memory speed bottleneck.',
        hint: 'Extremely fast memory holding frequently accessed data.'
      },
      matching: {
        term: 'L1 Cache',
        definition: 'Fastest on-chip cache built directly into CPU core',
        exp_fast: 'Fastest level of cache on the CPU die.',
        exp_slow: 'Level 1 cache is dedicated to individual CPU cores with single-cycle access latency for instructions and data.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Which cache write policy updates both the cache line and the underlying main memory simultaneously on every write operation?',
        options: ['Write-Through', 'Write-Back', 'Write-Allocate', 'Lazy Write'],
        correct_index: 0,
        explanation: 'Write-Through updates both cache and main RAM simultaneously, ensuring consistent memory at the cost of bus bandwidth.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'In a Write-Back cache policy, main memory is updated only when the modified (dirty) cache line is evicted.',
        answer: true,
        explanation: 'True. Write-back reduces memory bus writes by marking modified cache lines as dirty until eviction.'
      },
      flashcard: {
        term: 'Write-Back Policy',
        definition: 'Cache policy where updates are written only to cache and marked dirty; main memory is updated only when the line is replaced.',
        hint: 'Saves memory bus write bandwidth.'
      },
      matching: {
        term: 'Write-Through',
        definition: 'Writes simultaneously to cache and main memory',
        exp_fast: 'Immediate dual write to cache and RAM.',
        exp_slow: 'Write-through guarantees data consistency across main memory and cache at the cost of higher bus write traffic.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'In computer architecture, what principle explains why loops and contiguous array traversals achieve very high cache hit ratios?',
        options: [
          'Temporal and Spatial Locality of Reference',
          'Random Address Interleaving',
          'Von Neumann Bottleneck Amplification',
          'Instruction Pipelining Inversion'
        ],
        correct_index: 0,
        explanation: 'Temporal locality (reusing recent data) and spatial locality (accessing adjacent memory addresses) maximize cache hits.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'Spatial locality states that items with memory addresses near recently referenced items are likely to be accessed soon.',
        answer: true,
        explanation: 'True. Array indexing and sequential code execution exhibit strong spatial locality.'
      },
      flashcard: {
        term: 'Locality of Reference',
        definition: 'Phenomenon where programs access a relatively small portion of address space at any given time (Temporal and Spatial).',
        hint: 'The foundational principle that makes cache memory effective.'
      },
      matching: {
        term: 'Spatial Locality',
        definition: 'Likelihood of accessing nearby contiguous addresses',
        exp_fast: 'Tendency to read adjacent data blocks.',
        exp_slow: 'Spatial locality ensures pre-fetching contiguous memory blocks into cache lines significantly reduces cache miss penalties.'
      }
    }
  },

  // ============================================================================
  // Topic 3: CPU Pipelining & Hazards (Technology / Computer Systems)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000004',
    deckId: 'd1000000-0000-0000-0000-000000000004',
    setTitle: 'Pipelining & Hazards',
    quick: {
      mcq: {
        prompt: 'What is the primary performance benefit of instruction pipelining in a modern CPU?',
        options: [
          'Increases instruction execution throughput by overlapping stages',
          'Reduces the execution latency of an individual instruction',
          'Eliminates the need for RAM and secondary storage',
          'Enables the CPU to run without an internal clock signal'
        ],
        correct_index: 0,
        explanation: 'Pipelining allows multiple instructions to be processed in parallel across stages, increasing overall throughput.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'Instruction pipelining decreases the execution latency of an individual instruction.',
        answer: false,
        explanation: 'False. Pipelining increases instruction throughput, but individual instruction latency may slightly increase due to pipeline registers.'
      },
      flashcard: {
        term: 'Instruction Pipelining',
        definition: 'Technique where execution of multiple instructions is overlapped across sequential hardware stages.',
        hint: 'Analogous to an industrial assembly line.'
      },
      matching: {
        term: 'Instruction Throughput',
        definition: 'Number of instructions completed per unit of time',
        exp_fast: 'Rate of instructions finished by the CPU.',
        exp_slow: 'Pipelining maximizes instruction throughput towards an ideal IPC (instructions per cycle) of 1.0.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Which type of pipeline hazard occurs when two instructions require access to the exact same hardware resource simultaneously?',
        options: ['Structural Hazard', 'Data Hazard', 'Control Hazard', 'Branch Hazard'],
        correct_index: 0,
        explanation: 'A structural hazard occurs when hardware cannot support all possible combinations of instructions in the same clock cycle.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'Data hazards occur when an instruction depends on the result of a previous instruction that has not yet completed execution.',
        answer: true,
        explanation: 'True. Read-After-Write (RAW) data dependencies cause pipeline stalls unless bypassed or forwarded.'
      },
      flashcard: {
        term: 'Data Hazard',
        definition: 'Condition where pipeline instructions cannot execute because required operands have not yet been produced by earlier instructions.',
        hint: 'Solved by forwarding or inserting pipeline stalls (bubbles).'
      },
      matching: {
        term: 'Structural Hazard',
        definition: 'Conflict arising when instructions compete for hardware',
        exp_fast: 'Hardware resource bottleneck in pipeline.',
        exp_slow: 'Structural hazards occur when memory or functional units are simultaneously requested by multiple pipeline stages.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'What hardware optimization allows an ALU execution result to be passed directly to a dependent instruction without waiting for writeback to the register file?',
        options: ['Operand Forwarding (Bypassing)', 'Branch Prediction', 'Cache Flushing', 'Direct Memory Addressing'],
        correct_index: 0,
        explanation: 'Operand Forwarding routes output buffers of execution units directly to input muxes of subsequent pipeline stages.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'A branch penalty in a pipelined CPU occurs because instructions fetched after a branch must be flushed if the branch is taken.',
        answer: true,
        explanation: 'True. Mispredicted branch instructions must be flushed from pipeline stages, causing branch penalty cycles.'
      },
      flashcard: {
        term: 'Operand Forwarding',
        definition: 'Hardware data path routing computed results directly from ALU/MEM stages to waiting instructions, eliminating pipeline stalls.',
        hint: 'Bypasses writing back to the register file first.'
      },
      matching: {
        term: 'Operand Forwarding',
        definition: 'Feeds ALU outputs directly to dependent pipeline stages',
        exp_fast: 'Bypasses register writeback to eliminate stalls.',
        exp_slow: 'Operand forwarding routes intermediate pipeline register outputs to ALU inputs to resolve RAW data hazards.'
      }
    }
  },

  // ============================================================================
  // Topic 4: Project Management & WBS (Management / PM)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000002',
    deckId: 'd1000000-0000-0000-0000-000000000002',
    setTitle: 'Project Management',
    quick: {
      mcq: {
        prompt: 'In project management, what three interrelated variables constitute the traditional "Triple Constraint"?',
        options: [
          'Scope, Time, and Cost',
          'Speed, Quality, and Marketing',
          'Personnel, Hardware, and Software',
          'Revenue, Profit, and Taxes'
        ],
        correct_index: 0,
        explanation: 'The Triple Constraint (Iron Triangle) states that project success depends on balancing Scope, Time, and Cost.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'A project is defined as an ongoing, continuous operational process within an enterprise.',
        answer: false,
        explanation: 'False. A project is a temporary endeavor undertaken to create a unique product, service, or result.'
      },
      flashcard: {
        term: 'Triple Constraint',
        definition: 'Core project management model balancing Scope, Time, and Cost constraints against Quality.',
        hint: 'Altering one constraint directly impacts the others.'
      },
      matching: {
        term: 'Triple Constraint',
        definition: 'Interrelated balance of Scope, Time, and Cost',
        exp_fast: 'Core project constraints triangle.',
        exp_slow: 'The Triple Constraint demonstrates that changing scope inevitably alters either schedule time or project budget.'
      }
    },
    standard: {
      mcq: {
        prompt: 'What is the lowest deliverable level of decomposition in a Work Breakdown Structure (WBS) called?',
        options: ['Work Package', 'Milestone Task', 'Summary Phase', 'Control Account'],
        correct_index: 0,
        explanation: 'A Work Package is the lowest level in a WBS, small enough to be reliably estimated for cost and duration.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'The Critical Path in a project network diagram represents the sequence of dependent tasks that has zero total float.',
        answer: true,
        explanation: 'True. The Critical Path determines the shortest possible project completion time; any delay delays the entire project.'
      },
      flashcard: {
        term: 'Work Breakdown Structure (WBS)',
        definition: 'Hierarchical decomposition of total project scope into manageable, deliverable-oriented work packages.',
        hint: 'Visual breakdown organizing project team deliverables.'
      },
      matching: {
        term: 'Work Package',
        definition: 'Lowest level deliverable in a WBS structure',
        exp_fast: 'Manageable unit of work in WBS.',
        exp_slow: 'Work packages can be assigned to single owners with discrete schedule duration and budget allocation.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'In Earned Value Management (EVM), if Planned Value (PV) = $100,000, Earned Value (EV) = $85,000, and Actual Cost (AC) = $95,000, what are the project status indicators?',
        options: [
          'Behind schedule (SPI = 0.85) and over budget (CV = -$10,000)',
          'Ahead of schedule (SPI = 1.15) and under budget (CV = +$10,000)',
          'On schedule (SPI = 1.0) and on budget (CV = $0)',
          'Behind schedule (SPI = 0.90) and under budget (CV = +$5,000)'
        ],
        correct_index: 0,
        explanation: 'SPI = EV / PV = 85k / 100k = 0.85 (<1 is behind schedule). CV = EV - AC = 85k - 95k = -$10k (negative is over budget).',
        difficulty: 'hard'
      },
      tf: {
        statement: 'In Earned Value Management, a Cost Performance Index (CPI) greater than 1.0 indicates that the project is running over budget.',
        answer: false,
        explanation: 'False. CPI = EV / AC. A CPI > 1.0 means you are getting more than $1 of value per dollar spent (under budget).'
      },
      flashcard: {
        term: 'Earned Value Management (EVM)',
        definition: 'Objective project performance measurement technique comparing Planned Value (PV), Earned Value (EV), and Actual Cost (AC).',
        hint: 'Calculates Cost and Schedule variances and indices.'
      },
      matching: {
        term: 'Cost Variance (CV)',
        definition: 'EV minus AC; measures cost performance against budget',
        exp_fast: 'Earned Value minus Actual Cost.',
        exp_slow: 'A negative Cost Variance indicates cost overrun; positive indicates expenditures are below baseline budget.'
      }
    }
  },

  // ============================================================================
  // Topic 5: ITIL Service Management & SLA (Management / Services)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000002',
    deckId: 'd1000000-0000-0000-0000-000000000002',
    setTitle: 'IT Service Management',
    quick: {
      mcq: {
        prompt: 'What is a documented agreement between an IT service provider and its customers that defines required service levels and response times?',
        options: [
          'Service Level Agreement (SLA)',
          'Non-Disclosure Agreement (NDA)',
          'Master Services Agreement (MSA)',
          'Memorandum of Understanding (MOU)'
        ],
        correct_index: 0,
        explanation: 'An SLA specifies measurable performance metrics (uptime, response time, resolution limits) between provider and client.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'Incident Management aims to analyze and permanently eliminate the root cause of IT disruptions.',
        answer: false,
        explanation: 'False. Incident Management focuses on rapid service restoration. Problem Management analyzes and eliminates root causes.'
      },
      flashcard: {
        term: 'Service Level Agreement (SLA)',
        definition: 'Contractual commitment defining target service levels, availability percentages, and escalation response times for IT services.',
        hint: 'Sets clear customer expectations for service quality.'
      },
      matching: {
        term: 'SLA',
        definition: 'Service provider agreement defining target service levels',
        exp_fast: 'Contractual uptime and response commitment.',
        exp_slow: 'Service Level Agreements define quantifiable KPIs (e.g., 99.9% uptime, 15-minute response time) between provider and client.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Which ITIL process evaluates, approves, and schedules modifications to IT services or infrastructure to minimize business disruption?',
        options: ['Change Management', 'Release Management', 'Service Catalog Management', 'Availability Management'],
        correct_index: 0,
        explanation: 'Change Management ensures standardized methods and procedures are used for efficient handling of all changes.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'A Workaround is a temporary method to resolve an incident when a permanent root-cause fix is not yet available.',
        answer: true,
        explanation: 'True. Workarounds restore normal service while Problem Management continues root-cause investigation.'
      },
      flashcard: {
        term: 'Problem Management',
        definition: 'ITIL process dedicated to identifying root causes of incidents and providing permanent error resolutions to prevent recurrence.',
        hint: 'Focuses on prevention rather than immediate restore.'
      },
      matching: {
        term: 'Change Advisory Board (CAB)',
        definition: 'Committee evaluating risks and authorizing major IT changes',
        exp_fast: 'Reviews and approves infrastructure changes.',
        exp_slow: 'The CAB assesses proposed changes for operational risks, scheduling conflicts, and business impact before release.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'In ITIL configuration management, what centralized database stores records of all hardware, software, and networking assets along with their interdependencies?',
        options: [
          'Configuration Management Database (CMDB)',
          'Universal Asset Repository (UAR)',
          'Enterprise Resource Schema (ERS)',
          'Centralized Inventory Ledger (CIL)'
        ],
        correct_index: 0,
        explanation: 'The CMDB tracks Configuration Items (CIs) and their upstream/downstream relationships to support impact analysis.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'An Operational Level Agreement (OLA) is an agreement made between an IT service provider and external paying commercial clients.',
        answer: false,
        explanation: 'False. An OLA is an internal agreement between different internal departments of the same organization; SLAs face external customers.'
      },
      flashcard: {
        term: 'CMDB',
        definition: 'Central repository storing information about Configuration Items (CIs) and their relational dependencies across the IT estate.',
        hint: 'Crucial for impact analysis during change management.'
      },
      matching: {
        term: 'Configuration Item (CI)',
        definition: 'Any component or IT asset that needs to be managed in CMDB',
        exp_fast: 'Individual tracked asset in ITIL.',
        exp_slow: 'Configuration Items include hardware, servers, software licenses, documentation, and SLA contracts tracked within CMDB.'
      }
    }
  },

  // ============================================================================
  // Topic 6: Corporate Governance & Business Ethics (Strategy)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000003',
    deckId: 'd1000000-0000-0000-0000-000000000003',
    setTitle: 'Governance & Ethics',
    quick: {
      mcq: {
        prompt: 'What does the acronym CSR stand for in enterprise management and business ethics?',
        options: [
          'Corporate Social Responsibility',
          'Customer Service Relations',
          'Company Strategy Realization',
          'Centralized System Requirements'
        ],
        correct_index: 0,
        explanation: 'Corporate Social Responsibility (CSR) is a self-regulating business model helping firms be socially accountable.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'Corporate governance is solely concerned with maximizing executive bonuses and financial profits.',
        answer: false,
        explanation: 'False. Corporate governance establishes accountability, fairness, and transparency for shareholders and stakeholders.'
      },
      flashcard: {
        term: 'Corporate Social Responsibility (CSR)',
        definition: 'Business approach where organizations contribute positively to societal, economic, and environmental well-being.',
        hint: 'Balancing profit with ethics and community impact.'
      },
      matching: {
        term: 'CSR',
        definition: 'Corporate commitment to ethical, social, and environmental goals',
        exp_fast: 'Corporate Social Responsibility framework.',
        exp_slow: 'CSR encourages organizations to operate in ways that enhance society and the environment rather than degrade them.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Under the COSO Internal Control Integrated Framework, which component establishes the organizational "tone at the top" regarding ethical standards?',
        options: ['Control Environment', 'Risk Assessment', 'Control Activities', 'Monitoring Activities'],
        correct_index: 0,
        explanation: 'The Control Environment sets the tone of an organization, influencing the control consciousness of its people.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'Whistleblower protection policies protect employees from retaliation when reporting internal corporate fraud or illegal conduct.',
        answer: true,
        explanation: 'True. Whistleblower mechanisms are essential internal control practices mandated by corporate governance codes.'
      },
      flashcard: {
        term: 'COSO Framework',
        definition: 'Internal control framework comprising Control Environment, Risk Assessment, Control Activities, Information & Communication, and Monitoring.',
        hint: 'Standard benchmark for corporate internal controls.'
      },
      matching: {
        term: 'Control Environment',
        definition: 'Tone at the top setting ethical values and discipline in COSO',
        exp_fast: 'Foundation of organizational internal controls.',
        exp_slow: 'Control Environment establishes standards of conduct, organizational structure, and assignment of authority.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'Which internal control principle dictates that no single employee should have complete end-to-end control over authorizing, executing, and reconciling a critical transaction?',
        options: [
          'Segregation of Duties (SoD)',
          'Least Privilege Principle',
          'Need-to-Know Policy',
          'Defense-in-Depth'
        ],
        correct_index: 0,
        explanation: 'Segregation of Duties prevents errors and fraud by dividing key tasks among multiple individuals.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'Under segregation of duties, the system administrator who develops application code should also have unrestricted permissions to deploy code directly to production.',
        answer: false,
        explanation: 'False. Separating development and production deployment permissions is a core audit and security control.'
      },
      flashcard: {
        term: 'Segregation of Duties (SoD)',
        definition: 'Internal control policy requiring key tasks to be divided among different employees to reduce fraud risk and human error.',
        hint: 'Prevents single-person fraud or unverified modifications.'
      },
      matching: {
        term: 'Segregation of Duties',
        definition: 'Dividing critical steps across different staff to prevent fraud',
        exp_fast: 'Splitting operational duties across staff.',
        exp_slow: 'SoD ensures one individual cannot initiate, approve, and execute high-value transactions without independent verification.'
      }
    }
  },

  // ============================================================================
  // Topic 7: IT Legal Affairs & Data Privacy (Strategy)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000003',
    deckId: 'd1000000-0000-0000-0000-000000000003',
    setTitle: 'IT Legal Affairs',
    quick: {
      mcq: {
        prompt: 'Which form of intellectual property automatically protects computer program source code and documentation upon creation?',
        options: ['Copyright', 'Patent', 'Trademark', 'Industrial Design'],
        correct_index: 0,
        explanation: 'Software code is protected as a literary work under copyright law immediately upon expression in fixed tangible form.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'A software patent protects the underlying mathematical algorithm in the abstract without any technical apparatus implementation.',
        answer: false,
        explanation: 'False. Pure abstract mathematical algorithms are not patentable; patents require novel, industrial technical applications.'
      },
      flashcard: {
        term: 'Copyright in Software',
        definition: 'Exclusive legal right granted to software authors protecting original code, syntax, and documentation from unauthorized copying.',
        hint: 'Protects the expression of ideas, not the idea itself.'
      },
      matching: {
        term: 'Copyright',
        definition: 'Protects original source code and creative expression',
        exp_fast: 'Automatic legal protection for written code.',
        exp_slow: 'Copyright protects software source code, bytecode, and documentation against illegal duplication and unlicensed distribution.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Under Republic Act 10173 (Philippine Data Privacy Act of 2012), within what timeframe must a personal data breach involving sensitive personal info be reported to the National Privacy Commission (NPC)?',
        options: ['Within 72 hours of knowledge', 'Within 24 hours of knowledge', 'Within 7 business days', 'Within 30 calendar days'],
        correct_index: 0,
        explanation: 'RA 10173 mandates notification to the NPC and affected data subjects within 72 hours upon knowledge of a qualifying breach.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'Under RA 10173, consent of the data subject must be clear, evidenced by written, electronic, or recorded means, and cannot be implied by silence.',
        answer: true,
        explanation: 'True. Valid consent requires explicit, informed, and documented agreement from the data subject.'
      },
      flashcard: {
        term: 'RA 10173 (Data Privacy Act)',
        definition: 'Philippine national legislation protecting personal information privacy in government and private sector communications.',
        hint: 'Mandates Data Protection Officers and 72-hour breach reporting.'
      },
      matching: {
        term: 'RA 10173',
        definition: 'Philippine Data Privacy Act regulating personal data',
        exp_fast: 'Philippine data protection law.',
        exp_slow: 'RA 10173 regulates processing of personal information, establishing data subject rights, DPO requirements, and strict penalties.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'Which open-source software license is categorized as "strong copyleft", requiring any derivative work incorporating its code to be distributed under the same license terms?',
        options: [
          'GNU General Public License (GPL)',
          'MIT License',
          'Apache License 2.0',
          'BSD 3-Clause License'
        ],
        correct_index: 0,
        explanation: 'The GNU GPL is a strong copyleft license requiring modified or derived works to remain open source under the GPL.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'Permissive licenses such as MIT or BSD require developers to disclose the source code of all proprietary software that links to them.',
        answer: false,
        explanation: 'False. Permissive licenses allow code to be used in proprietary commercial applications without source code disclosure.'
      },
      flashcard: {
        term: 'Copyleft Licensing (GPL)',
        definition: 'Licensing mechanism requiring derivative works of software to be released under the exact same open-source terms.',
        hint: 'Contrasted with permissive licenses like MIT and Apache.'
      },
      matching: {
        term: 'GNU GPL',
        definition: 'Strong copyleft license requiring derivatives to be open source',
        exp_fast: 'Reciprocal open-source license.',
        exp_slow: 'GNU GPL prevents proprietary closed-source redistribution of modified code by requiring derivative works to inherit the GPL.'
      }
    }
  },

  // ============================================================================
  // Topic 8: Business Strategy & Competitive Analysis (Strategy)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000003',
    deckId: 'd1000000-0000-0000-0000-000000000003',
    setTitle: 'Business Strategy',
    quick: {
      mcq: {
        prompt: 'In a SWOT analysis, which two quadrants evaluate internal organizational capabilities?',
        options: [
          'Strengths and Weaknesses',
          'Opportunities and Threats',
          'Strengths and Opportunities',
          'Weaknesses and Threats'
        ],
        correct_index: 0,
        explanation: 'Strengths and Weaknesses are internal factors within company control; Opportunities and Threats are external market factors.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'In SWOT analysis, external competitor pricing and regulatory changes are classified as Opportunities or Threats.',
        answer: true,
        explanation: 'True. Competitor behavior and regulations exist in the external environment outside direct organizational control.'
      },
      flashcard: {
        term: 'SWOT Analysis',
        definition: 'Strategic tool analyzing internal Strengths/Weaknesses and external Opportunities/Threats.',
        hint: 'Foundational 2x2 strategic planning matrix.'
      },
      matching: {
        term: 'SWOT Analysis',
        definition: 'Matrix evaluating Strengths, Weaknesses, Opportunities, Threats',
        exp_fast: 'Internal vs external strategic analysis.',
        exp_slow: 'SWOT matches internal corporate competencies (Strengths/Weaknesses) with external market conditions (Opportunities/Threats).'
      }
    },
    standard: {
      mcq: {
        prompt: 'According to Michael Porter, which generic competitive strategy aims to achieve the lowest production and operating costs in an industry?',
        options: ['Cost Leadership', 'Differentiation', 'Focus Differentiation', 'Blue Ocean Strategy'],
        correct_index: 0,
        explanation: 'Cost Leadership focuses on efficiency, scale economies, and aggressive cost reduction to underprice competitors.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'In Porter\'s Five Forces model, high switching costs for customers increase the bargaining power of buyers.',
        answer: false,
        explanation: 'False. High switching costs make it difficult for buyers to leave, which decreases the bargaining power of buyers.'
      },
      flashcard: {
        term: 'Porter\'s Five Forces',
        definition: 'Framework analyzing industry profitability: Rivalry, Threat of Entrants, Buyer Power, Supplier Power, and Threat of Substitutes.',
        hint: 'Evaluates competitive intensity of a market.'
      },
      matching: {
        term: 'Cost Leadership',
        definition: 'Competitive strategy targeting lowest operational costs',
        exp_fast: 'Achieving industry lowest cost structure.',
        exp_slow: 'Cost leadership enables organizations to earn above-average returns even amidst intense price competition.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'In the BCG Growth-Share Matrix, a business unit with high market share in a mature, low-growth industry is classified as a:',
        options: ['Cash Cow', 'Star', 'Question Mark', 'Dog'],
        correct_index: 0,
        explanation: 'Cash Cows generate substantial cash surplus with minimal capital reinvestment needed due to low market growth.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'In the BCG Matrix, cash generated by "Cash Cows" should typically be reinvested to turn "Dogs" into market leaders.',
        answer: false,
        explanation: 'False. Cash Cow profits are reinvested into Question Marks and Stars; Dogs are usually divested or liquidated.'
      },
      flashcard: {
        term: 'BCG Growth-Share Matrix',
        definition: 'Portfolio tool categorizing business units into Stars, Cash Cows, Question Marks, and Dogs based on market growth and market share.',
        hint: 'Guides capital allocation across business units.'
      },
      matching: {
        term: 'Cash Cow',
        definition: 'High market share in low growth market generating surplus cash',
        exp_fast: 'Generates reliable corporate cash flow.',
        exp_slow: 'Cash Cows require little investment to maintain market share and fund corporate R&D and high-growth Stars.'
      }
    }
  },

  // ============================================================================
  // Topic 9: Computer Networks & OSI Model (Networks & Security)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000006',
    deckId: 'd1000000-0000-0000-0000-000000000006',
    setTitle: 'Networking & Protocols',
    quick: {
      mcq: {
        prompt: 'At which layer of the OSI 7-layer reference model do IP routing and packet forwarding take place?',
        options: [
          'Layer 3 (Network Layer)',
          'Layer 2 (Data Link Layer)',
          'Layer 4 (Transport Layer)',
          'Layer 7 (Application Layer)'
        ],
        correct_index: 0,
        explanation: 'The Network Layer (Layer 3) handles logical IP addressing, routing protocols, and packet path determination.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'TCP is an unreliable, connectionless transport protocol that does not guarantee packet delivery order.',
        answer: false,
        explanation: 'False. TCP provides reliable, connection-oriented, ordered byte streams. UDP is the connectionless, unreliable protocol.'
      },
      flashcard: {
        term: 'Network Layer (Layer 3)',
        definition: 'OSI layer responsible for logical addressing (IPv4/IPv6), packet routing, and forwarding across networks.',
        hint: 'Where routers and IP addresses operate.'
      },
      matching: {
        term: 'Network Layer (Layer 3)',
        definition: 'Handles logical addressing and IP packet routing',
        exp_fast: 'Layer 3 manages IP routing.',
        exp_slow: 'The Network layer encapsulates transport segments into packets and routes them across internetworks via IP addressing.'
      }
    },
    standard: {
      mcq: {
        prompt: 'What three-step packet exchange sequence does TCP utilize to establish a reliable connection between a client and server?',
        options: ['SYN -> SYN-ACK -> ACK', 'ACK -> SYN -> SYN-ACK', 'PING -> PONG -> ACK', 'HELLO -> READY -> CONNECT'],
        correct_index: 0,
        explanation: 'The TCP Three-Way Handshake starts with client SYN, server replies with SYN-ACK, and client completes with ACK.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'An IPv4 address consists of 32 bits divided into four 8-bit octets.',
        answer: true,
        explanation: 'True. IPv4 addresses are 32 bits (e.g. 192.168.1.1), while IPv6 addresses are 128 bits.'
      },
      flashcard: {
        term: 'Three-Way Handshake',
        definition: 'Process used by TCP to establish a connection using synchronize (SYN) and acknowledge (ACK) packets.',
        hint: 'SYN, SYN-ACK, ACK handshake sequence.'
      },
      matching: {
        term: 'Three-Way Handshake',
        definition: 'SYN, SYN-ACK, ACK sequence establishing TCP connection',
        exp_fast: 'TCP connection establishment protocol.',
        exp_slow: 'The three-way handshake synchronizes sequence numbers between host and client to establish a reliable virtual circuit.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'Given the IPv4 network 192.168.1.0/27, what is the subnet mask and how many usable host IP addresses are available in this subnet?',
        options: [
          'Subnet mask 255.255.255.224 with 30 usable hosts',
          'Subnet mask 255.255.255.192 with 62 usable hosts',
          'Subnet mask 255.255.255.240 with 14 usable hosts',
          'Subnet mask 255.255.255.128 with 126 usable hosts'
        ],
        correct_index: 0,
        explanation: '/27 leaves 5 host bits: 2^5 = 32 total addresses minus 2 (network & broadcast) = 30 usable hosts. 256 - 32 = 224.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'Address Resolution Protocol (ARP) translates known IP addresses into local physical MAC addresses on a local subnet.',
        answer: true,
        explanation: 'True. ARP broadcasts request frames to map a known Layer 3 IP address to a Layer 2 hardware MAC address.'
      },
      flashcard: {
        term: 'Address Resolution Protocol (ARP)',
        definition: 'Network protocol used to map an Internet Protocol (IP) address to a physical Media Access Control (MAC) address.',
        hint: 'Bridges Layer 3 logical IP and Layer 2 hardware MAC.'
      },
      matching: {
        term: 'ARP',
        definition: 'Resolves logical IP address to physical MAC address',
        exp_fast: 'Maps IP address to MAC address.',
        exp_slow: 'ARP queries the local broadcast domain to determine the hardware address required for frame transmission.'
      }
    }
  },

  // ============================================================================
  // Topic 10: Cryptography & Security (Networks & Security)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000006',
    deckId: 'd1000000-0000-0000-0000-000000000006',
    setTitle: 'Cybersecurity & Cryptography',
    quick: {
      mcq: {
        prompt: 'In information security, what three core pillars constitute the "CIA Triad"?',
        options: [
          'Confidentiality, Integrity, and Availability',
          'Control, Inspection, and Authorization',
          'Cryptography, Identity, and Authentication',
          'Certificates, IPsec, and Antivirus'
        ],
        correct_index: 0,
        explanation: 'The CIA Triad is the foundational security benchmark: Confidentiality, Integrity, and Availability.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'Symmetric key cryptography uses two mathematically paired keys: a public key for encryption and a private key for decryption.',
        answer: false,
        explanation: 'False. Symmetric cryptography uses the exact same shared secret key for encryption and decryption. Asymmetric uses paired keys.'
      },
      flashcard: {
        term: 'CIA Triad',
        definition: 'Three primary security principles: Confidentiality (privacy), Integrity (accuracy), and Availability (accessibility).',
        hint: 'Foundational framework of information security.'
      },
      matching: {
        term: 'CIA Triad',
        definition: 'Confidentiality, Integrity, and Availability model',
        exp_fast: 'Cornerstone principles of information security.',
        exp_slow: 'The CIA Triad guides organizational security policies to ensure data privacy, prevent tampering, and guarantee uptime.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Which symmetric encryption standard uses a block size of 128 bits and key sizes of 128, 192, or 256 bits?',
        options: [
          'Advanced Encryption Standard (AES)',
          'Data Encryption Standard (DES)',
          'RSA Public Key Cipher',
          'MD5 Message Digest'
        ],
        correct_index: 0,
        explanation: 'AES is the global symmetric block cipher standard established by NIST to replace DES and 3DES.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'A digital signature provides non-repudiation because it is generated using the sender\'s private key.',
        answer: true,
        explanation: 'True. Only the private key holder could have generated the signature, preventing the sender from denying transmission.'
      },
      flashcard: {
        term: 'Asymmetric Cryptography',
        definition: 'Cryptographic system using public and private key pairs for encryption and digital signatures (e.g. RSA, ECC).',
        hint: 'Public key encrypts; private key decrypts.'
      },
      matching: {
        term: 'AES',
        definition: 'Symmetric block cipher standard using 128/192/256-bit keys',
        exp_fast: 'Gold standard symmetric encryption cipher.',
        exp_slow: 'Advanced Encryption Standard (AES) provides robust confidentiality across government and commercial communications.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'When Alice sends a digitally signed, confidential email to Bob using Public Key Infrastructure (PKI), which keys are used for signing and encryption?',
        options: [
          'Alice signs with Alice\'s private key; Alice encrypts with Bob\'s public key',
          'Alice signs with Bob\'s public key; Alice encrypts with Alice\'s private key',
          'Alice signs with Alice\'s public key; Alice encrypts with Bob\'s private key',
          'Alice signs and encrypts using Bob\'s shared symmetric key only'
        ],
        correct_index: 0,
        explanation: 'Signing uses the sender\'s private key (proving authenticity); encryption uses the recipient\'s public key (ensuring only Bob can read it).',
        difficulty: 'hard'
      },
      tf: {
        statement: 'A Certificate Authority (CA) signs digital certificates using its own private key to bind an applicant\'s identity to their public key.',
        answer: true,
        explanation: 'True. Browsers verify digital certificates using the trusted CA\'s pre-installed public root certificate.'
      },
      flashcard: {
        term: 'Digital Signature',
        definition: 'Mathematical technique validating authenticity and integrity of a message; created with sender\'s private key and verified with public key.',
        hint: 'Provides authentication, integrity, and non-repudiation.'
      },
      matching: {
        term: 'Digital Certificate',
        definition: 'Electronic document binding a public key to an entity identity',
        exp_fast: 'Identity proof signed by a Certificate Authority.',
        exp_slow: 'Digital certificates issued under X.509 standards allow secure SSL/TLS communication and identity validation across the web.'
      }
    }
  },

  // ============================================================================
  // Topic 11: Data Structures & Algorithms (Algorithms & Programming)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000005',
    deckId: 'd1000000-0000-0000-0000-000000000005',
    setTitle: 'Data Structures & Algorithms',
    quick: {
      mcq: {
        prompt: 'Which data structure operates strictly on the Last-In, First-Out (LIFO) access principle?',
        options: ['Stack', 'Queue', 'Array', 'Linked List'],
        correct_index: 0,
        explanation: 'A Stack is a LIFO data structure where elements are pushed and popped from the same end (top).',
        difficulty: 'easy'
      },
      tf: {
        statement: 'Binary search can be performed directly on an unsorted array with O(log n) time complexity.',
        answer: false,
        explanation: 'False. Binary search strictly requires the array to be sorted first. On unsorted arrays, linear search is O(n).'
      },
      flashcard: {
        term: 'Stack (LIFO)',
        definition: 'Abstract linear data structure operating on Last-In, First-Out where push and pop occur at the top.',
        hint: 'Like a stack of dinner plates.'
      },
      matching: {
        term: 'Stack (LIFO)',
        definition: 'Data structure where last inserted element is removed first',
        exp_fast: 'Last-in, first-out memory structure.',
        exp_slow: 'Stacks are utilized for function call frames, recursion, undo operations, and expression syntax parsing.'
      }
    },
    standard: {
      mcq: {
        prompt: 'What is the average time complexity of searching for an item in a balanced Binary Search Tree (BST) containing N nodes?',
        options: ['O(log N)', 'O(N)', 'O(1)', 'O(N^2)'],
        correct_index: 0,
        explanation: 'A balanced BST cuts the remaining search space in half with every node comparison, taking O(log N) time on average.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'A Queue data structure operates on a First-In, First-Out (FIFO) principle, enqueuing at the rear and dequeuing from the front.',
        answer: true,
        explanation: 'True. Queues preserve arrival order, making them ideal for printer spooling and CPU process scheduling.'
      },
      flashcard: {
        term: 'Binary Search Algorithm',
        definition: 'Efficient search algorithm for sorted lists that repeatedly divides search interval in half with O(log n) performance.',
        hint: 'Requires sorted input array.'
      },
      matching: {
        term: 'Queue (FIFO)',
        definition: 'Data structure where first inserted element is removed first',
        exp_fast: 'First-in, first-out waiting line.',
        exp_slow: 'Queues maintain FIFO ordering used extensively in operating system buffering, thread scheduling, and network queues.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'What is the worst-case time complexity of the Quicksort algorithm, and when does it typically occur?',
        options: [
          'O(N^2), occurring when the chosen pivot is consistently the smallest or largest element on an already sorted array',
          'O(N log N), occurring on randomly shuffled arrays',
          'O(log N), occurring when using median-of-three pivot selection',
          'O(N^3), occurring when duplicate elements are present'
        ],
        correct_index: 0,
        explanation: 'Quicksort degrades to O(N^2) if the pivot creates unbalanced partitions of size 0 and N-1 repeatedly.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'An in-order tree traversal of a Binary Search Tree (Left, Root, Right) outputs the node values in non-decreasing sorted order.',
        answer: true,
        explanation: 'True. In-order traversal visits left subtree (smaller), current node, and right subtree (larger), producing sorted keys.'
      },
      flashcard: {
        term: 'Quicksort Algorithm',
        definition: 'Divide-and-conquer sorting algorithm partitioning an array around a pivot; O(n log n) average, O(n^2) worst case.',
        hint: 'In-place sorting using recursive partition.'
      },
      matching: {
        term: 'In-Order Traversal',
        definition: 'Left-Root-Right traversal visiting BST nodes in sorted order',
        exp_fast: 'Traverses BST keys in ascending order.',
        exp_slow: 'In-order traversal recursively visits the left child, processes the current node, then visits the right child.'
      }
    }
  },

  // ============================================================================
  // Topic 12: Databases & SQL Normalization (Databases & SQL)
  // ============================================================================
  {
    catId: 'c1000000-0000-0000-0000-000000000008',
    deckId: 'd1000000-0000-0000-0000-000000000008',
    setTitle: 'Databases & Normalization',
    quick: {
      mcq: {
        prompt: 'In a relational database, what constraint uniquely identifies each record in a table and prevents duplicate or NULL values?',
        options: ['Primary Key', 'Foreign Key', 'Index Key', 'Check Constraint'],
        correct_index: 0,
        explanation: 'A Primary Key enforces entity integrity by ensuring every record has a unique, non-null identifier.',
        difficulty: 'easy'
      },
      tf: {
        statement: 'A Primary Key column in a relational database table is permitted to store NULL values.',
        answer: false,
        explanation: 'False. Primary keys must be unique and NOT NULL to ensure entity integrity.'
      },
      flashcard: {
        term: 'Primary Key',
        definition: 'Column or set of columns uniquely identifying each row in a relational database table; cannot be null.',
        hint: 'Guarantees entity integrity in a table.'
      },
      matching: {
        term: 'Primary Key',
        definition: 'Unique non-null identifier for every row in a table',
        exp_fast: 'Unique row identifier in relational database.',
        exp_slow: 'Primary keys uniquely index table rows and serve as target references for foreign key relationships.'
      }
    },
    standard: {
      mcq: {
        prompt: 'Which relational database normal form requires eliminating partial functional dependencies so that all non-key attributes depend on the entire primary key?',
        options: ['Second Normal Form (2NF)', 'First Normal Form (1NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
        correct_index: 0,
        explanation: '2NF requires 1NF compliance and that non-prime attributes are fully functionally dependent on the entire composite key.',
        difficulty: 'medium'
      },
      tf: {
        statement: 'Third Normal Form (3NF) requires a relation to be in 2NF and have no transitive functional dependencies between non-key attributes.',
        answer: true,
        explanation: 'True. 3NF removes transitive dependencies (e.g. non-key column A determining non-key column B).'
      },
      flashcard: {
        term: 'Database Normalization',
        definition: 'Process of structuring relational database tables to reduce data redundancy and eliminate update/delete anomalies.',
        hint: '1NF (atomic), 2NF (no partial), 3NF (no transitive).'
      },
      matching: {
        term: '2NF (Second Normal Form)',
        definition: 'Eliminates partial dependencies on composite primary keys',
        exp_fast: 'Requires full functional dependency on primary key.',
        exp_slow: '2NF prevents non-prime attributes from depending on only a subset of a composite primary key.'
      }
    },
    detailed: {
      mcq: {
        prompt: 'In database transaction management, what property ensures that all operations in a transaction either complete entirely or are completely rolled back upon failure?',
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correct_index: 0,
        explanation: 'Atomicity (the A in ACID) guarantees the "all-or-nothing" execution of database transactions.',
        difficulty: 'hard'
      },
      tf: {
        statement: 'A LEFT OUTER JOIN in SQL returns only the rows where there is a matching record in both the left and right tables.',
        answer: false,
        explanation: 'False. That describes an INNER JOIN. A LEFT JOIN returns all rows from the left table and matched rows from the right table (NULL if no match).'
      },
      flashcard: {
        term: 'ACID Properties',
        definition: 'Four core transaction guarantees: Atomicity (all-or-nothing), Consistency (rules kept), Isolation (concurrency), Durability (persisted).',
        hint: 'Foundational transaction reliability guarantees.'
      },
      matching: {
        term: 'Atomicity',
        definition: 'All-or-nothing transaction execution guarantee',
        exp_fast: 'Ensures transactions succeed or roll back fully.',
        exp_slow: 'Atomicity prevents partial writes by rolling back the entire transaction if any single statement fails.'
      }
    }
  }
];

// ------------------------------------------------------------------------------
// 4. Execution & File Generation
// ------------------------------------------------------------------------------
function run() {
  console.log('Generating PhilNITS practice sets with 3 review speed tiers...');

  // A. Build Categories SQL
  const catRows = PHILNITS_CATEGORIES.map(c => {
    return `('${c.id}', ${c.admin_id}, ${esc(c.name)}, ${esc(c.slug)}, ${esc(c.description)}, ${esc(c.icon)}, ${esc(c.color)}, '${c.created_at}', '${c.updated_at}')`;
  });

  // Read existing categories file if present
  const catFilePath = path.join(DOWNLOADS_DIR, 'practice_categories_rows.sql');
  let existingCatSql = fs.readFileSync(catFilePath, 'utf8').trim();
  // Remove trailing semicolon if any
  if (existingCatSql.endsWith(';')) existingCatSql = existingCatSql.slice(0, -1);
  const updatedCatSql = `${existingCatSql},\n${catRows.join(',\n')};\n`;
  fs.writeFileSync(catFilePath, updatedCatSql, 'utf8');
  console.log(`Updated: ${catFilePath}`);

  // B. Build Decks SQL (for inclusion in unified seed)
  const deckRows = PHILNITS_DECKS.map(d => {
    return `('${d.id}', ${d.admin_id}, '${d.category_id}', ${esc(d.title)}, ${esc(d.description)}, NULL, ${d.total_cards}, ${esc(d.difficulty)}, ${d.is_published}, timezone('utc'::text, now()), timezone('utc'::text, now()))`;
  });

  // C. Build MCQ SQL
  let mcqRows = [];
  let tfRows = [];
  let flashRows = [];
  let matchRows = [];

  let mcqIdx = 100;
  let tfIdx = 100;
  let flashIdx = 100;
  let matchIdx = 100;

  TOPICS.forEach((t, topicNum) => {
    ['quick', 'standard', 'detailed'].forEach((speedKey) => {
      const speedCapitalized = speedKey === 'quick' ? 'Quick' : speedKey === 'standard' ? 'Standard' : 'Detailed';
      const speedCode = speedKey === 'quick' ? '1' : speedKey === 'standard' ? '2' : '3';
      const topicCode = String(topicNum + 1).padStart(2, '0');

      const data = t[speedKey];

      // 1. MCQ
      const mcqId = `e1000000-${topicCode}00-0000-0000-00000000000${speedCode}`;
      const mcqOptionsJson = JSON.stringify(data.mcq.options);
      mcqRows.push(
        `('${mcqId}', 6, '${t.catId}', ${esc(data.mcq.prompt)}, ${esc(mcqOptionsJson)}, ${data.mcq.correct_index}, ${esc(data.mcq.explanation)}, ${esc(data.mcq.difficulty)}, ${mcqIdx++}, true, timezone('utc'::text, now()), timezone('utc'::text, now()), ${esc(speedCapitalized)})`
      );

      // 2. True / False
      const tfId = `e2000000-${topicCode}00-0000-0000-00000000000${speedCode}`;
      tfRows.push(
        `('${tfId}', 6, '${t.catId}', ${esc(data.tf.statement)}, ${data.tf.answer}, ${esc(data.tf.explanation)}, ${esc(data.mcq.difficulty)}, ${tfIdx++}, true, timezone('utc'::text, now()), timezone('utc'::text, now()), ${esc(speedCapitalized)})`
      );

      // 3. Flashcards
      const flashId = `e3000000-${topicCode}00-0000-0000-00000000000${speedCode}`;
      flashRows.push(
        `('${flashId}', '${t.deckId}', 6, ${esc(data.flashcard.term)}, ${esc(data.flashcard.definition)}, ${esc(data.flashcard.hint)}, ${flashIdx++}, timezone('utc'::text, now()), timezone('utc'::text, now()), ${esc(speedCapitalized)})`
      );

      // 4. Matching Pairs
      const matchId = `e4000000-${topicCode}00-0000-0000-00000000000${speedCode}`;
      matchRows.push(
        `('${matchId}', 6, '${t.catId}', ${esc(t.setTitle)}, ${esc(data.matching.term)}, ${esc(data.matching.definition)}, ${matchIdx++}, true, timezone('utc'::text, now()), timezone('utc'::text, now()), ${esc(data.matching.exp_slow)}, ${esc(data.matching.exp_fast)}, ${esc(speedCapitalized)})`
      );
    });
  });

  // Write MCQs
  const mcqFilePath = path.join(DOWNLOADS_DIR, 'multiple_choice_questions_rows.sql');
  let existingMcqSql = fs.readFileSync(mcqFilePath, 'utf8').trim();
  if (existingMcqSql.endsWith(';')) existingMcqSql = existingMcqSql.slice(0, -1);
  fs.writeFileSync(mcqFilePath, `${existingMcqSql},\n${mcqRows.join(',\n')};\n`, 'utf8');
  console.log(`Updated: ${mcqFilePath} (+${mcqRows.length} PhilNITS questions)`);

  // Write True/False
  const tfFilePath = path.join(DOWNLOADS_DIR, 'true_false_questions_rows.sql');
  let existingTfSql = fs.readFileSync(tfFilePath, 'utf8').trim();
  if (existingTfSql.endsWith(';')) existingTfSql = existingTfSql.slice(0, -1);
  fs.writeFileSync(tfFilePath, `${existingTfSql},\n${tfRows.join(',\n')};\n`, 'utf8');
  console.log(`Updated: ${tfFilePath} (+${tfRows.length} PhilNITS questions)`);

  // Write Flashcards
  const flashFilePath = path.join(DOWNLOADS_DIR, 'flashcards_rows.sql');
  let existingFlashSql = fs.readFileSync(flashFilePath, 'utf8').trim();
  if (existingFlashSql.endsWith(';')) existingFlashSql = existingFlashSql.slice(0, -1);
  fs.writeFileSync(flashFilePath, `${existingFlashSql},\n${flashRows.join(',\n')};\n`, 'utf8');
  console.log(`Updated: ${flashFilePath} (+${flashRows.length} PhilNITS flashcards)`);

  // Write Matching Pairs
  const matchFilePath = path.join(DOWNLOADS_DIR, 'matching_pairs_rows.sql');
  let existingMatchSql = fs.readFileSync(matchFilePath, 'utf8').trim();
  if (existingMatchSql.endsWith(';')) existingMatchSql = existingMatchSql.slice(0, -1);
  fs.writeFileSync(matchFilePath, `${existingMatchSql},\n${matchRows.join(',\n')};\n`, 'utf8');
  console.log(`Updated: ${matchFilePath} (+${matchRows.length} PhilNITS pairs)`);

  // ----------------------------------------------------------------------------
  // D. Create unified supabase_philnits_practice_seed.sql in root directory
  // ----------------------------------------------------------------------------
  const unifiedSql = `-- ==============================================================================
-- Migration: PhilNITS Practice Content Integration (with 3 Review Speed Tiers)
--
-- Covers:
-- 1. practice_categories (Technology, Management, Strategy, FE Subjects)
-- 2. flashcard_decks (Linked to PhilNITS categories)
-- 3. multiple_choice_questions (3 tiers per concept: Quick, Standard, Detailed)
-- 4. true_false_questions (3 tiers per concept: Quick, Standard, Detailed)
-- 5. flashcards (3 tiers per concept: Quick, Standard, Detailed)
-- 6. matching_pairs (with fast and slow explanations)
-- ==============================================================================

-- 1. Insert PhilNITS Categories
INSERT INTO public.practice_categories (id, admin_id, name, slug, description, icon, color, created_at, updated_at)
VALUES
${catRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = timezone('utc'::text, now());

-- 2. Insert PhilNITS Flashcard Decks
INSERT INTO public.flashcard_decks (id, admin_id, category_id, title, description, icon, total_cards, difficulty, is_published, created_at, updated_at)
VALUES
${deckRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  total_cards = EXCLUDED.total_cards,
  difficulty = EXCLUDED.difficulty,
  is_published = EXCLUDED.is_published,
  updated_at = timezone('utc'::text, now());

-- 3. Insert Multiple Choice Questions (Quick, Standard, Detailed)
INSERT INTO public.multiple_choice_questions (id, admin_id, category_id, prompt, options, correct_index, explanation, difficulty, sort_order, is_published, created_at, updated_at, review_speed)
VALUES
${mcqRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  prompt = EXCLUDED.prompt,
  options = EXCLUDED.options,
  correct_index = EXCLUDED.correct_index,
  explanation = EXCLUDED.explanation,
  difficulty = EXCLUDED.difficulty,
  review_speed = EXCLUDED.review_speed,
  updated_at = timezone('utc'::text, now());

-- 4. Insert True/False Questions (Quick, Standard, Detailed)
INSERT INTO public.true_false_questions (id, admin_id, category_id, statement, answer, explanation, difficulty, sort_order, is_published, created_at, updated_at, review_speed)
VALUES
${tfRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  statement = EXCLUDED.statement,
  answer = EXCLUDED.answer,
  explanation = EXCLUDED.explanation,
  difficulty = EXCLUDED.difficulty,
  review_speed = EXCLUDED.review_speed,
  updated_at = timezone('utc'::text, now());

-- 5. Insert Flashcards (Quick, Standard, Detailed)
INSERT INTO public.flashcards (id, deck_id, admin_id, term, definition, hint, sort_order, created_at, updated_at, review_speed)
VALUES
${flashRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  term = EXCLUDED.term,
  definition = EXCLUDED.definition,
  hint = EXCLUDED.hint,
  review_speed = EXCLUDED.review_speed,
  updated_at = timezone('utc'::text, now());

-- 6. Insert Matching Pairs (Quick, Standard, Detailed with explanation_slow & explanation_fast)
INSERT INTO public.matching_pairs (id, admin_id, category_id, set_title, term, definition, sort_order, is_published, created_at, updated_at, explanation_slow, explanation_fast, review_speed)
VALUES
${matchRows.join(',\n')}
ON CONFLICT (id) DO UPDATE SET
  set_title = EXCLUDED.set_title,
  term = EXCLUDED.term,
  definition = EXCLUDED.definition,
  explanation_slow = EXCLUDED.explanation_slow,
  explanation_fast = EXCLUDED.explanation_fast,
  review_speed = EXCLUDED.review_speed,
  updated_at = timezone('utc'::text, now());
`;

  const unifiedPath = path.join(process.cwd(), 'supabase_philnits_practice_seed.sql');
  fs.writeFileSync(unifiedPath, unifiedSql, 'utf8');
  console.log(`Generated unified migration: ${unifiedPath}`);
}

run();

