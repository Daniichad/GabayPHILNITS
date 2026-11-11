import React, { useState, useEffect } from 'react'
import {
  Image, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, TextInput, Platform, Linking, StatusBar, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { getCache, setCache, clearCache } from '../../../utils/cache'
import { withTimeout } from '../../../utils/queryHelper'
import { getScrollBottomPadding } from '../../../utils/responsiveLayout'
import { resolveUserTargetExam } from '../../../utils/targetExam'


const NAVY = '#13294b'

const IP_SUBJECTS = ['Technology', 'Management', 'Strategy']
const FE_A_SUBJECTS = [
  'Computer Systems & Architecture',
  'Algorithms & Programming',
  'Networks & Security',
  'IT Management & Strategy',
  'Databases & SQL',
]
const FE_B_SUBJECTS = [
  'Algorithms & Data Structures',
  'Security & System Design',
]
const FE_SUBJECTS = [...FE_A_SUBJECTS, ...FE_B_SUBJECTS]
const PHILNITS_SUBJECTS = [...IP_SUBJECTS, ...FE_SUBJECTS]
const CSE_SUBJECTS = PHILNITS_SUBJECTS

const VIDEO_LECTURES = [
  // =========================================================================
  // IP Track: Technology
  // =========================================================================
  {
    id: 'vid-ip-1',
    title: 'IT Fundamentals: Hardware, Binary & Digital Logic',
    subject: 'Technology',
    duration_minutes: 10,
    url: 'https://www.youtube.com/watch?v=gI-qXk7XojA',
    youtube_id: 'gI-qXk7XojA',
    thumbnail_url: 'https://i.ytimg.com/vi/gI-qXk7XojA/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Foundational technology review for PhilNITS IT Passport: Boolean algebra, logic gates (AND, OR, NOT, XOR), truth tables, and binary arithmetic.',
    exam_level: 'IP',
    sort_order: 1,
  },
  {
    id: 'vid-ip-2',
    title: 'Operating Systems & Computer Resource Management',
    subject: 'Technology',
    duration_minutes: 13,
    url: 'https://www.youtube.com/watch?v=26QPDBe-NB8',
    youtube_id: '26QPDBe-NB8',
    thumbnail_url: 'https://i.ytimg.com/vi/26QPDBe-NB8/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Operating system fundamentals for IP: process scheduling, virtual memory paging, file systems, device drivers, and kernel architectures.',
    exam_level: 'IP',
    sort_order: 2,
  },
  {
    id: 'vid-ip-3',
    title: 'Relational Databases & SQL Query Fundamentals',
    subject: 'Technology',
    duration_minutes: 20,
    url: 'https://www.youtube.com/watch?v=HXV3zeRR3h4',
    youtube_id: 'HXV3zeRR3h4',
    thumbnail_url: 'https://i.ytimg.com/vi/HXV3zeRR3h4/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'Relational database concepts: tables, primary/foreign keys, normalization (1NF, 2NF, 3NF), and core SQL queries (SELECT, JOIN, GROUP BY).',
    exam_level: 'IP',
    sort_order: 3,
  },
  {
    id: 'vid-ip-4',
    title: 'Cybersecurity, Malware & Defense Mechanisms',
    subject: 'Technology',
    duration_minutes: 13,
    url: 'https://www.youtube.com/watch?v=bPVaOlJ6ln0',
    youtube_id: 'bPVaOlJ6ln0',
    thumbnail_url: 'https://i.ytimg.com/vi/bPVaOlJ6ln0/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Core cybersecurity principles: CIA triad (Confidentiality, Integrity, Availability), authentication methods, firewalls, trojans, phishing, and security management.',
    exam_level: 'IP',
    sort_order: 4,
  },
  {
    id: 'vid-ip-5',
    title: 'Telecommunications, Internet & Cloud Infrastructure',
    subject: 'Technology',
    duration_minutes: 12,
    url: 'https://www.youtube.com/watch?v=AEaKrq3SpW8',
    youtube_id: 'AEaKrq3SpW8',
    thumbnail_url: 'https://i.ytimg.com/vi/AEaKrq3SpW8/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Internet routing, DNS domain resolution, HTTP/HTTPS web protocols, and cloud computing models (IaaS, PaaS, SaaS) for PhilNITS IP.',
    exam_level: 'IP',
    sort_order: 5,
  },

  // =========================================================================
  // IP Track: Management
  // =========================================================================
  {
    id: 'vid-ip-6',
    title: 'Project Management Fundamentals & PMBOK Principles',
    subject: 'Management',
    duration_minutes: 15,
    url: 'https://www.youtube.com/watch?v=f0kUfDLXqPE',
    youtube_id: 'f0kUfDLXqPE',
    thumbnail_url: 'https://i.ytimg.com/vi/f0kUfDLXqPE/hqdefault.jpg',
    author: 'Simplilearn',
    author_url: 'https://www.youtube.com/@SimplilearnOfficial',
    description: 'Key project management concepts for PhilNITS IP: Triple Constraint (Scope, Time, Cost), Work Breakdown Structure (WBS), Gantt charts, risk matrices, and change management.',
    exam_level: 'IP',
    sort_order: 6,
  },
  {
    id: 'vid-ip-7',
    title: 'ITIL 4 Service Management Lifecycle & SLAs',
    subject: 'Management',
    duration_minutes: 18,
    url: 'https://www.youtube.com/watch?v=1L2WwG9UjX4',
    youtube_id: '1L2WwG9UjX4',
    thumbnail_url: 'https://i.ytimg.com/vi/1L2WwG9UjX4/hqdefault.jpg',
    author: 'Simplilearn',
    author_url: 'https://www.youtube.com/@SimplilearnOfficial',
    description: 'ITIL framework essentials: Service Level Agreements (SLA), incident lifecycle, problem resolution, release deployment, and IT service desk management.',
    exam_level: 'IP',
    sort_order: 7,
  },
  {
    id: 'vid-ip-8',
    title: 'Risk Management, Contingency Planning & System Audits',
    subject: 'Management',
    duration_minutes: 14,
    url: 'https://www.youtube.com/watch?v=t4y3z5E_Qz8',
    youtube_id: 't4y3z5E_Qz8',
    thumbnail_url: 'https://i.ytimg.com/vi/t4y3z5E_Qz8/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'System audit procedures, internal controls, risk assessment matrices, Business Continuity Plans (BCP), and Disaster Recovery Plans (DRP).',
    exam_level: 'IP',
    sort_order: 8,
  },

  // =========================================================================
  // IP Track: Strategy
  // =========================================================================
  {
    id: 'vid-ip-9',
    title: 'Business Strategy & Competitive Advantage',
    subject: 'Strategy',
    duration_minutes: 10,
    url: 'https://www.youtube.com/watch?v=o7Ik1OB4TaE',
    youtube_id: 'o7Ik1OB4TaE',
    thumbnail_url: 'https://i.ytimg.com/vi/o7Ik1OB4TaE/hqdefault.jpg',
    author: 'Harvard Business Review',
    author_url: 'https://www.youtube.com/@harvardbusinessreview',
    description: 'Core business strategy for PhilNITS IP: differentiation, cost leadership, value chains, enterprise resource planning (ERP), and aligning IT strategy with corporate goals.',
    exam_level: 'IP',
    sort_order: 9,
  },
  {
    id: 'vid-ip-10',
    title: 'Michael Porter’s Five Competitive Forces Analysis',
    subject: 'Strategy',
    duration_minutes: 13,
    url: 'https://www.youtube.com/watch?v=mYF2_FBCvXw',
    youtube_id: 'mYF2_FBCvXw',
    thumbnail_url: 'https://i.ytimg.com/vi/mYF2_FBCvXw/hqdefault.jpg',
    author: 'Harvard Business Review',
    author_url: 'https://www.youtube.com/@harvardbusinessreview',
    description: 'Industry analysis framework: threat of new entrants, bargaining power of suppliers and buyers, threat of substitutes, and competitive rivalry for IT strategy.',
    exam_level: 'IP',
    sort_order: 10,
  },
  {
    id: 'vid-ip-11',
    title: 'Intellectual Property, Copyright & Digital Compliance',
    subject: 'Strategy',
    duration_minutes: 11,
    url: 'https://www.youtube.com/watch?v=mKvZ9Q3b-Q8',
    youtube_id: 'mKvZ9Q3b-Q8',
    thumbnail_url: 'https://i.ytimg.com/vi/mKvZ9Q3b-Q8/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Legal compliance in IT: patents, software copyrights, trademarks, open-source licensing (GPL, MIT), and data privacy laws (RA 10173 & GDPR).',
    exam_level: 'IP',
    sort_order: 11,
  },

  // =========================================================================
  // FE Track: Computer Systems & Architecture
  // =========================================================================
  {
    id: 'vid-fe-12',
    title: 'The Central Processing Unit (CPU) Architecture',
    subject: 'Computer Systems & Architecture',
    duration_minutes: 12,
    url: 'https://www.youtube.com/watch?v=FZGugFqdr60',
    youtube_id: 'FZGugFqdr60',
    thumbnail_url: 'https://i.ytimg.com/vi/FZGugFqdr60/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Comprehensive breakdown of the CPU, Arithmetic Logic Unit (ALU), internal registers, memory address bus, and the Fetch-Decode-Execute instruction cycle for PhilNITS FE.',
    exam_level: 'FE',
    sort_order: 12,
  },
  {
    id: 'vid-fe-13',
    title: 'Advanced CPU Designs, Pipelining & Cache Memory',
    subject: 'Computer Systems & Architecture',
    duration_minutes: 13,
    url: 'https://www.youtube.com/watch?v=rtAlC5J1U40',
    youtube_id: 'rtAlC5J1U40',
    thumbnail_url: 'https://i.ytimg.com/vi/rtAlC5J1U40/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Detailed review of instruction pipelining, pipeline hazards, cache hierarchy (L1/L2/L3), superscalar execution, and multi-core architectures for PhilNITS FE.',
    exam_level: 'FE',
    sort_order: 13,
  },
  {
    id: 'vid-fe-14',
    title: 'Memory Hierarchies, RAM, Virtual Memory & Paging',
    subject: 'Computer Systems & Architecture',
    duration_minutes: 12,
    url: 'https://www.youtube.com/watch?v=fpnE6UAfbtU',
    youtube_id: 'fpnE6UAfbtU',
    thumbnail_url: 'https://i.ytimg.com/vi/fpnE6UAfbtU/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Detailed exploration of physical memory, SRAM vs DRAM, virtual memory address translation, page replacement algorithms (FIFO, LRU), and thrashing.',
    exam_level: 'FE',
    sort_order: 14,
  },
  {
    id: 'vid-fe-15',
    title: 'High-Speed Bus Architectures, Interrupts & DMA',
    subject: 'Computer Systems & Architecture',
    duration_minutes: 22,
    url: 'https://www.youtube.com/watch?v=GjNp0bBrjmU',
    youtube_id: 'GjNp0bBrjmU',
    thumbnail_url: 'https://i.ytimg.com/vi/GjNp0bBrjmU/hqdefault.jpg',
    author: 'MIT OpenCourseWare',
    author_url: 'https://www.youtube.com/@mitocw',
    description: 'Direct Memory Access (DMA) controllers, bus arbitration, programmed I/O, interrupt service routines (ISR), and peripheral interface standards.',
    exam_level: 'FE',
    sort_order: 15,
  },

  // =========================================================================
  // FE Track: Algorithms & Programming
  // =========================================================================
  {
    id: 'vid-fe-16',
    title: 'Data Structures: Arrays, Linked Lists, Stacks & Queues',
    subject: 'Algorithms & Programming',
    duration_minutes: 11,
    url: 'https://www.youtube.com/watch?v=DuDz6B4cqVc',
    youtube_id: 'DuDz6B4cqVc',
    thumbnail_url: 'https://i.ytimg.com/vi/DuDz6B4cqVc/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Essential fundamental data structures: contiguous array representations, node pointers, linked list traversal, LIFO stack operations, and FIFO queue mechanisms.',
    exam_level: 'FE',
    sort_order: 16,
  },
  {
    id: 'vid-fe-17',
    title: 'Data Structures & Algorithms - Tracing & Complexity',
    subject: 'Algorithms & Programming',
    duration_minutes: 25,
    url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    youtube_id: 'RBSGKlAvoiM',
    thumbnail_url: 'https://i.ytimg.com/vi/RBSGKlAvoiM/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'In-depth tutorial on Big-O asymptotic notation, recursion trees, binary search, and sorting algorithms essential for PhilNITS FE Subject A and Subject B.',
    exam_level: 'FE',
    sort_order: 17,
  },
  {
    id: 'vid-fe-18',
    title: 'Binary Search Trees, Heaps & Graph Traversal',
    subject: 'Algorithms & Programming',
    duration_minutes: 22,
    url: 'https://www.youtube.com/watch?v=oSWTXtMglKE',
    youtube_id: 'oSWTXtMglKE',
    thumbnail_url: 'https://i.ytimg.com/vi/oSWTXtMglKE/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'Non-linear data structures: Binary Search Tree (BST) operations, min/max heaps, breadth-first search (BFS), and depth-first search (DFS) pseudo-code tracing.',
    exam_level: 'FE',
    sort_order: 18,
  },
  {
    id: 'vid-fe-19',
    title: 'Dynamic Programming & Recursion Tracing',
    subject: 'Algorithms & Programming',
    duration_minutes: 30,
    url: 'https://www.youtube.com/watch?v=oBt53YbR9Kk',
    youtube_id: 'oBt53YbR9Kk',
    thumbnail_url: 'https://i.ytimg.com/vi/oBt53YbR9Kk/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'Advanced problem-solving for PhilNITS FE Subject B: optimal substructure, overlapping subproblems, memoization, and bottom-up tabulation.',
    exam_level: 'FE',
    sort_order: 19,
  },

  // =========================================================================
  // FE Track: Networks & Security
  // =========================================================================
  {
    id: 'vid-fe-20',
    title: 'Computer Networks, LAN, WAN & Packet Switching',
    subject: 'Networks & Security',
    duration_minutes: 12,
    url: 'https://www.youtube.com/watch?v=3QhU9jd03a0',
    youtube_id: '3QhU9jd03a0',
    thumbnail_url: 'https://i.ytimg.com/vi/3QhU9jd03a0/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Understanding the OSI 7-layer model, TCP/IP protocol suite, packet switching, MAC addresses, IP routing, and subnetting for PhilNITS FE.',
    exam_level: 'FE',
    sort_order: 20,
  },
  {
    id: 'vid-fe-21',
    title: 'Network Security, Cryptography & Encryption Protocols',
    subject: 'Networks & Security',
    duration_minutes: 13,
    url: 'https://www.youtube.com/watch?v=jhXCTbFnK8o',
    youtube_id: 'jhXCTbFnK8o',
    thumbnail_url: 'https://i.ytimg.com/vi/jhXCTbFnK8o/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Master symmetric ciphers (AES/DES), asymmetric public-key cryptography (RSA), Diffie-Hellman key exchange, digital signatures, and SSL/TLS certificates.',
    exam_level: 'FE',
    sort_order: 21,
  },
  {
    id: 'vid-fe-22',
    title: 'Transport Layer: TCP 3-Way Handshake, UDP & Sockets',
    subject: 'Networks & Security',
    duration_minutes: 12,
    url: 'https://www.youtube.com/watch?v=Vdc8TCESIg8',
    youtube_id: 'Vdc8TCESIg8',
    thumbnail_url: 'https://i.ytimg.com/vi/Vdc8TCESIg8/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Connection-oriented TCP vs connectionless UDP, sequence numbers, sliding window flow control, port numbers, and socket communication for PhilNITS FE.',
    exam_level: 'FE',
    sort_order: 22,
  },
  {
    id: 'vid-fe-23',
    title: 'Public Key Infrastructure (PKI) & TLS/SSL Handshake',
    subject: 'Networks & Security',
    duration_minutes: 18,
    url: 'https://www.youtube.com/watch?v=T4Df5_cojAs',
    youtube_id: 'T4Df5_cojAs',
    thumbnail_url: 'https://i.ytimg.com/vi/T4Df5_cojAs/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'Deep dive into Certificate Authorities (CA), X.509 digital certificates, certificate revocation lists (CRL), and the cryptographic TLS handshake.',
    exam_level: 'FE',
    sort_order: 23,
  },

  // =========================================================================
  // FE Track: IT Management & Strategy
  // =========================================================================
  {
    id: 'vid-fe-24',
    title: 'Software Engineering Lifecycles & Methodologies',
    subject: 'IT Management & Strategy',
    duration_minutes: 11,
    url: 'https://www.youtube.com/watch?v=O753uuutqH8',
    youtube_id: 'O753uuutqH8',
    thumbnail_url: 'https://i.ytimg.com/vi/O753uuutqH8/hqdefault.jpg',
    author: 'CrashCourse',
    author_url: 'https://www.youtube.com/@crashcourse',
    description: 'Software Development Life Cycle (SDLC), Waterfall model, Agile & Scrum principles, testing levels (unit, integration, system), and project deliverables.',
    exam_level: 'FE',
    sort_order: 24,
  },
  {
    id: 'vid-fe-25',
    title: 'Enterprise Architecture, Microservices & System Design',
    subject: 'IT Management & Strategy',
    duration_minutes: 25,
    url: 'https://www.youtube.com/watch?v=SqcXvc3Zm8U',
    youtube_id: 'SqcXvc3Zm8U',
    thumbnail_url: 'https://i.ytimg.com/vi/SqcXvc3Zm8U/hqdefault.jpg',
    author: 'freeCodeCamp.org',
    author_url: 'https://www.youtube.com/@freecodecamp',
    description: 'High-level software design principles: monolithic vs microservices, loose coupling, high cohesion, design patterns, and scalability planning.',
    exam_level: 'FE',
    sort_order: 25,
  },
  {
    id: 'vid-fe-26',
    title: 'IT Service Operations & SLA Incident Governance',
    subject: 'IT Management & Strategy',
    duration_minutes: 16,
    url: 'https://www.youtube.com/watch?v=bYhN8_b1pLs',
    youtube_id: 'bYhN8_b1pLs',
    thumbnail_url: 'https://i.ytimg.com/vi/bYhN8_b1pLs/hqdefault.jpg',
    author: 'Simplilearn',
    author_url: 'https://www.youtube.com/@SimplilearnOfficial',
    description: 'Incident prioritization, root cause analysis, Change Advisory Board (CAB) reviews, configuration management databases (CMDB), and SLA compliance.',
    exam_level: 'FE',
    sort_order: 26,
  },
]


// =========================================================================
// Subject Themes & Card Filter Configurations
// =========================================================================
const SUBJECT_THEMES = {
  Technology: { bg: '#0b192c', accent: '#38bdf8', icon: 'cpu', border: '#1e3a8a' },
  Management: { bg: '#064e3b', accent: '#34d399', icon: 'briefcase', border: '#047857' },
  Strategy: { bg: '#451a03', accent: '#fbbf24', icon: 'target', border: '#78350f' },
  'Computer Systems & Architecture': { bg: '#1e1b4b', accent: '#a78bfa', icon: 'server', border: '#4338ca' },
  'Algorithms & Programming': { bg: '#022c22', accent: '#4ade80', icon: 'code', border: '#065f46' },
  'Algorithms & Data Structures': { bg: '#022c22', accent: '#4ade80', icon: 'code', border: '#065f46' },
  'Security & System Design': { bg: '#4c0519', accent: '#f87171', icon: 'shield', border: '#9f1239' },
  'Networks & Security': { bg: '#4c0519', accent: '#f87171', icon: 'shield', border: '#9f1239' },
  'IT Management & Strategy': { bg: '#172554', accent: '#60a5fa', icon: 'compass', border: '#1e40af' },
  'Databases & SQL': { bg: '#1e1b4b', accent: '#38bdf8', icon: 'database', border: '#4338ca' },
  'Verbal Ability': { bg: '#1e293b', accent: '#93c5fd', icon: 'book', border: '#334155' },
  'Numerical Ability': { bg: '#1c1917', accent: '#fde047', icon: 'hash', border: '#44403c' },
  'Analytical Ability': { bg: '#14273e', accent: '#67e8f9', icon: 'activity', border: '#1e3a5f' },
  'Logical Reasoning': { bg: '#2e1065', accent: '#c084fc', icon: 'cpu', border: '#4c1d95' },
  'General Information': { bg: '#14532d', accent: '#86efac', icon: 'globe', border: '#15803d' },
  'Clerical Operations': { bg: '#3b0764', accent: '#f472b6', icon: 'clipboard', border: '#6b21a8' },
}

const SUBJECT_FILTER_CONFIG = {
  All: {
    label: 'All Topics',
    shortLabel: 'All',
    icon: 'layers',
    color: '#13294b',
  },
  Technology: {
    label: 'Technology',
    shortLabel: 'Technology',
    icon: 'cpu',
    color: '#2563eb',
  },
  Management: {
    label: 'Management',
    shortLabel: 'Management',
    icon: 'briefcase',
    color: '#0d9488',
  },
  Strategy: {
    label: 'Strategy',
    shortLabel: 'Strategy',
    icon: 'target',
    color: '#d97706',
  },
  'Computer Systems & Architecture': {
    label: 'Computer Systems',
    shortLabel: 'Comp Systems',
    icon: 'server',
    color: '#7c3aed',
  },
  'Algorithms & Programming': {
    label: 'Algorithms & Code',
    shortLabel: 'Algorithms',
    icon: 'code',
    color: '#059669',
  },
  'Algorithms & Data Structures': {
    label: 'Algorithms & Data',
    shortLabel: 'Data Struct',
    icon: 'code',
    color: '#059669',
  },
  'Security & System Design': {
    label: 'Security & Design',
    shortLabel: 'Sec Design',
    icon: 'shield',
    color: '#dc2626',
  },
  'Networks & Security': {
    label: 'Networks & Security',
    shortLabel: 'Security',
    icon: 'shield',
    color: '#dc2626',
  },
  'IT Management & Strategy': {
    label: 'IT Strategy',
    shortLabel: 'IT Strategy',
    icon: 'compass',
    color: '#ea580c',
  },
  'Databases & SQL': {
    label: 'Databases & SQL',
    shortLabel: 'Databases',
    icon: 'database',
    color: '#0284c7',
  },
  'Verbal Ability': {
    label: 'Verbal Ability',
    shortLabel: 'Verbal',
    icon: 'book',
    color: '#3b82f6',
  },
  'Numerical Ability': {
    label: 'Numerical Ability',
    shortLabel: 'Numerical',
    icon: 'hash',
    color: '#ca8a04',
  },
  'Analytical Ability': {
    label: 'Analytical Ability',
    shortLabel: 'Analytical',
    icon: 'activity',
    color: '#0284c7',
  },
  'Logical Reasoning': {
    label: 'Logical Reasoning',
    shortLabel: 'Logic',
    icon: 'cpu',
    color: '#9333ea',
  },
  'General Information': {
    label: 'General Information',
    shortLabel: 'General Info',
    icon: 'globe',
    color: '#16a34a',
  },
  'Clerical Operations': {
    label: 'Clerical Operations',
    shortLabel: 'Clerical',
    icon: 'clipboard',
    color: '#c026d3',
  },
}

/**
 * Clean book cover used when an image URL is not uploaded yet.
 * Based strictly on reading_materials data from Supabase (title, subject).
 */
function DefaultBookCover({ item }) {
  const theme = SUBJECT_THEMES[item.subject] || { bg: '#0b192c', accent: '#38bdf8', icon: 'book', border: '#1e3a8a' }
  const displaySpeed = item.review_speed || 'Standard'

  return (
    <View style={[styles.defaultCoverRoot, { backgroundColor: theme.bg }]}>
      <View style={[styles.defaultCoverFrame, { borderColor: `${theme.accent}45` }]}>
        <View style={styles.defaultCoverHeaderRow}>
          <Text style={[styles.defaultCoverCrestText, { color: theme.accent }]}>{item.subject || 'READING'}</Text>
          <View style={[styles.defaultCoverCrestBadge, { backgroundColor: `${theme.accent}20` }]}>
            <Feather name={theme.icon} size={11} color={theme.accent} />
          </View>
        </View>

        <View style={styles.defaultCoverTitleBlock}>
          <Text style={styles.defaultCoverTitleText} numberOfLines={4}>
            {item.title}
          </Text>
        </View>

        <View style={styles.defaultCoverFooterRow}>
          {displaySpeed ? (
            <View style={[styles.defaultCoverEditionTag, { backgroundColor: `${theme.accent}22` }]}>
              <Text style={[styles.defaultCoverEditionText, { color: theme.accent }]}>
                {displaySpeed === 'Quick' ? '⚡ Quick' : displaySpeed === 'Detailed' ? '📖 Detailed' : '🎯 Standard'}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

// ─── Material Book Cover Card ────────────────────────────────
/**
 * Full image book cover component.
 * Adheres to user rule: "make the ui of reading materials be like book cover
 * dont use text because it is full image book cover".
 *
 * @param {{ item: any, onPress: any }} props
 */
function MaterialCard({ item, onPress }) {
  const coverUrl = item.cover_image_url || item.cover_url || item.thumbnail_url || item.image_url
  const progress = item.progress || 0
  const displaySpeed = item.review_speed || 'Standard'

  return (
    <TouchableOpacity
      style={styles.bookCard}
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View style={styles.bookWrapper}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={styles.bookImage}
            resizeMode="cover"
          />
        ) : (
          <DefaultBookCover item={item} />
        )}

        {/* Realistic Book Spine Shadow / Crease */}
        <View style={styles.bookSpineOverlay} />
        <View style={styles.bookSpineCrease} />

        {/* Page ridge effect on right outer edge */}
        <View style={styles.bookPageEdge} />

        {/* Floating speed badge on top corner */}
        {displaySpeed && coverUrl ? (
          <View style={[
            styles.bookSpeedBadge,
            String(displaySpeed).toLowerCase() === 'quick' ? styles.speedBadgeQuick :
            String(displaySpeed).toLowerCase() === 'detailed' ? styles.speedBadgeDetailed :
            styles.speedBadgeStandard
          ]}>
            <Text style={[
              styles.bookSpeedBadgeText,
              String(displaySpeed).toLowerCase() === 'quick' ? styles.speedBadgeTextQuick :
              String(displaySpeed).toLowerCase() === 'detailed' ? styles.speedBadgeTextDetailed :
              styles.speedBadgeTextStandard
            ]}>
              {displaySpeed === 'Quick' ? '⚡ Quick' : displaySpeed === 'Detailed' ? '📖 Detailed' : '🎯 Standard'}
            </Text>
          </View>
        ) : null}

        {/* Reading progress line at bottom of book */}
        {progress > 0 && (
          <View style={styles.bookProgressBar}>
            <View style={[styles.bookProgressFill, { width: `${progress}%` }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}

// ─── Skeleton Loading Component for Library ───────────────────
function LibrarySkeleton({ libraryMode, isFE }) {
  return (
    <View style={styles.skeletonContainer}>
      {/* 1. Search Bar Skeleton */}
      <SkeletonItem width="100%" height={46} borderRadius={24} style={{ marginBottom: 14 }} />

      {/* 2. FE Track Segment Skeleton (if FE) */}
      {isFE && (
        <SkeletonItem width="100%" height={38} borderRadius={10} style={{ marginBottom: 14 }} />
      )}

      {/* 3. Small Topic Cards Filter Skeleton Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.skeletonCardFilterScroll}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonFilterCard}>
            <SkeletonItem width={28} height={28} borderRadius={14} style={{ marginBottom: 8 }} />
            <SkeletonItem width={56} height={11} borderRadius={4} />
          </View>
        ))}
      </ScrollView>

      {/* ── Reading Materials Skeletons ── */}
      {libraryMode === 'READING' ? (
        <>
          {/* Section Header Row Skeleton */}
          <View style={styles.skeletonSectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonItem width={20} height={20} borderRadius={10} />
              <SkeletonItem width={140} height={18} borderRadius={4} />
              <SkeletonItem width={76} height={20} borderRadius={10} />
            </View>
            <SkeletonItem width={20} height={20} borderRadius={10} />
          </View>

          {/* Review Speed Pace Bar Skeleton */}
          <View style={styles.skeletonPaceContainer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <SkeletonItem width={130} height={14} borderRadius={4} />
              <SkeletonItem width={85} height={18} borderRadius={9} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[105, 80, 90, 85].map((w, idx) => (
                <SkeletonItem key={idx} width={w} height={30} borderRadius={15} />
              ))}
            </View>
          </View>

          {/* Book Shelves Skeletons */}
          {[1, 2].map((shelfIdx) => (
            <View key={shelfIdx} style={{ marginBottom: 22 }}>
              <View style={styles.skeletonShelfHeader}>
                <SkeletonItem width={120} height={17} borderRadius={4} />
                <SkeletonItem width={46} height={13} borderRadius={4} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 14, paddingBottom: 6 }}
              >
                {[1, 2, 3].map((bIdx) => (
                  <View key={bIdx} style={styles.skeletonBookCard}>
                    <SkeletonItem width={134} height={196} borderRadius={8} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </>
      ) : (
        <>
          {/* Section Header Row Skeleton */}
          <View style={styles.skeletonSectionHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <SkeletonItem width={20} height={20} borderRadius={10} />
              <SkeletonItem width={130} height={18} borderRadius={4} />
              <SkeletonItem width={70} height={20} borderRadius={10} />
            </View>
          </View>

          {/* Video Shelves Skeletons */}
          {[1, 2].map((shelfIdx) => (
            <View key={shelfIdx} style={{ marginBottom: 22 }}>
              <View style={styles.skeletonShelfHeader}>
                <SkeletonItem width={120} height={17} borderRadius={4} />
                <SkeletonItem width={56} height={13} borderRadius={4} />
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 6 }}
              >
                {[1, 2].map((vIdx) => (
                  <View key={vIdx} style={styles.skeletonVideoCard}>
                    <SkeletonItem
                      width={190}
                      height={104}
                      borderRadius={14}
                      style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                    />
                    <View style={{ padding: 10, gap: 6 }}>
                      <SkeletonItem width={60} height={10} borderRadius={3} />
                      <SkeletonItem width={150} height={13} borderRadius={4} />
                      <SkeletonItem width={100} height={11} borderRadius={4} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

// ─── Main component ──────────────────────────────────────────
/**
 * @param {{ navigation: any }} props
 */
export default function Library({ navigation }) {
  const insets = useSafeAreaInsets()
  const [materials, setMaterials]   = useState(/** @type {any[]} */ ([]))
  const [videos,    setVideos]      = useState(/** @type {any[]} */ ([]))
  const [loading,   setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error,     setError]       = useState(/** @type {string | null} */ (null))
  const [search,    setSearch]      = useState('')
  const [activeChip, setActiveChip] = useState(/** @type {string | null} */ (null))
  const [activeSpeed, setActiveSpeed] = useState('RECOMMENDED')
  const [videoTopicFilter, setVideoTopicFilter] = useState(/** @type {string | null} */ (null))
  const [libraryMode, setLibraryMode] = useState('READING') // 'READING' | 'VIDEOS'
  const [userReviewSpeed, setUserReviewSpeed] = useState('Standard')
  const [userTargetExam, setUserTargetExam] = useState('IP')
  const [feSection, setFeSection] = useState('FE Subject A')

  const isFE = (userTargetExam || '').toLowerCase().includes('fe')

  // Immediately resolve target exam from persistent cache / SQLite session on mount
  useEffect(() => {
    resolveUserTargetExam(null, userTargetExam).then((trk) => {
      if (trk && trk !== userTargetExam) setUserTargetExam(trk)
    })
  }, [])

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMaterials(true)
    })
    return unsubscribe
  }, [navigation])

  const onRefresh = async () => {
    setRefreshing(true)
    await clearCache('library_materials')
    await clearCache('library_videos')
    await clearCache('library_target_exam')
    await loadMaterials(true)
    setRefreshing(false)
  }

  const loadMaterials = async (forceRefresh = false) => {
    try {
      setError(null)

      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      const uemail = session?.user?.email

      // 1. Instant Cache Check for zero perceived latency
      if (!forceRefresh) {
        const cachedTrack = await getCache('library_target_exam') || await getCache('user_target_exam')
        const cachedMaterials = await getCache('library_materials')
        const cachedVideos = await getCache('library_videos')
        const cachedSpeed = await getCache('user_review_speed')
        if (cachedTrack) setUserTargetExam(cachedTrack)
        if (cachedSpeed) setUserReviewSpeed(cachedSpeed)
        if (Array.isArray(cachedMaterials) && cachedMaterials.length > 0 && Array.isArray(cachedVideos) && cachedVideos.length > 0) {
          setMaterials(cachedMaterials)
          setVideos(cachedVideos)
          setLoading(false)
          // Continue background refresh if needed without blocking
        } else {
          setLoading(true)
        }
      } else {
        setLoading(true)
      }

      // 2. Concurrently fetch all dependencies in parallel with 8s timeouts
      const [vRes, rRes, uRes, progRes, resolvedTrack] = await Promise.allSettled([
        withTimeout(supabase.from('video_lectures').select('*').eq('is_published', true).order('sort_order', { ascending: true }), 8000),
        withTimeout(supabase.from('reading_materials').select('id, title, subtitle, author, subject, exam_level, fe_section, cover_image_url, thumbnail_url, pdf_url, sort_order, total_pages, review_speed, learning_objective, description, is_published, created_at').eq('is_published', true).order('subject').order('sort_order'), 8000),
        uemail ? withTimeout(supabase.from('users').select('review_speed').ilike('email', uemail).maybeSingle(), 8000) : Promise.resolve({ data: null }),
        uid ? withTimeout(supabase.from('user_reading_progress').select('*').eq('user_id', uid), 8000) : Promise.resolve({ data: [] }),
        resolveUserTargetExam(uid, userTargetExam)
      ])

      // Determine track strictly using unified resolver
      const targetTrack = (resolvedTrack.status === 'fulfilled' && resolvedTrack.value)
        ? resolvedTrack.value
        : userTargetExam
      setUserTargetExam(targetTrack)

      // Videos
      let finalVideos = VIDEO_LECTURES
      if (vRes.status === 'fulfilled' && Array.isArray(vRes.value?.data) && vRes.value.data.length > 0) {
        finalVideos = vRes.value.data
      }
      setVideos(finalVideos)

      // Review speed
      let currentSpeed = 'Standard'
      if (uRes.status === 'fulfilled' && uRes.value?.data?.review_speed) {
        currentSpeed = String(uRes.value.data.review_speed).trim()
      }
      setUserReviewSpeed(currentSpeed)

      // Reading progress
      const progressList = (progRes.status === 'fulfilled' && Array.isArray(progRes.value?.data)) ? progRes.value.data : []
      const progressMap = {}
      progressList.forEach(p => {
        if (p?.reading_material_id) progressMap[p.reading_material_id] = p
      })

      // Reading materials without heavy content blob
      const rawMaterials = (rRes.status === 'fulfilled' && Array.isArray(rRes.value?.data)) ? rRes.value.data : []
      const materialsWithProgress = rawMaterials.map(item => {
        const prog = progressMap[item.id]
        if (prog) {
          if (prog.is_completed) {
            return { ...item, progress: 100 }
          }
          if (prog.current_chapter_number && item.total_pages > 0) {
            const computed = Math.round(((prog.current_chapter_number - 1) / item.total_pages) * 100)
            return { ...item, progress: Math.min(Math.max(computed, 0), 100) }
          }
        }
        return { ...item, progress: 0 }
      })

      if (materialsWithProgress.length > 0) {
        setMaterials(materialsWithProgress)
        setCache('library_target_exam', targetTrack).catch(() => {})
        setCache('library_materials', materialsWithProgress).catch(() => {})
        setCache('library_videos', finalVideos).catch(() => {})
        setCache('user_review_speed', currentSpeed).catch(() => {})
      }
    } catch (e) {
      console.error('Library load error:', e)
      setError('Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }

  const isItemSubjectB = (item) => {
    const sec = String(item.fe_section || '').toLowerCase().trim()
    if (sec.includes('subject b') || sec.includes('fe_b') || sec === 'b') return true
    if (sec.includes('subject a') || sec.includes('fe_a') || sec === 'a') return false

    const sub = String(item.subject || '').toLowerCase()
    const title = String(item.title || '').toLowerCase()
    const desc = String(item.description || '').toLowerCase()

    return (
      sub.includes('algorithm') ||
      sub.includes('data structure') ||
      sub.includes('system design') ||
      title.includes('subject b') ||
      title.includes('algorithm') ||
      title.includes('data structure') ||
      title.includes('pseudo') ||
      desc.includes('subject b') ||
      desc.includes('afternoon')
    )
  }

  const currentTrackSubjects = isFE
    ? (feSection === 'FE Subject B' ? FE_B_SUBJECTS : FE_A_SUBJECTS)
    : IP_SUBJECTS

  // Filter reading materials strictly matching personal info target exam track (IP or FE) and Subject A / B section
  const filtered = materials.filter(m => {
    const lvl = (m.exam_level || '').toLowerCase().trim()
    const matchTrack = !lvl || lvl === 'both' || lvl === 'all' ||
      (isFE ? lvl.includes('fe') : (!lvl.includes('fe') || lvl.includes('ip')))

    let matchSection = true
    if (isFE) {
      if (feSection === 'FE Subject B') {
        matchSection = isItemSubjectB(m) || String(m.fe_section || '').toLowerCase() === 'both'
      } else {
        matchSection = !isItemSubjectB(m) || String(m.fe_section || '').toLowerCase() === 'both'
      }
    }

    const matchChip = !activeChip || m.subject === activeChip
    const matchSearch = !search || (
      (m.title && m.title.toLowerCase().includes(search.toLowerCase())) ||
      (m.subtitle && m.subtitle.toLowerCase().includes(search.toLowerCase())) ||
      (m.subject && m.subject.toLowerCase().includes(search.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(search.toLowerCase()))
    )
    return matchTrack && matchSection && matchChip && matchSearch
  })

  // Dynamic available subjects from materials
  const availableSubjects = Array.from(new Set(filtered.map(m => m.subject).filter(Boolean)))
  const displayFilterSubjects = availableSubjects.length > 0 ? availableSubjects : currentTrackSubjects

  // Group reading materials by subject dynamically
  const groupedRaw = {}
  filtered.forEach(item => {
    const sub = item.subject || 'General'
    if (activeChip && activeChip !== sub) return
    if (!groupedRaw[sub]) groupedRaw[sub] = []
    groupedRaw[sub].push(item)
  })

  // Effective review speed for reading material filtering
  const effectiveSpeed = activeSpeed === 'RECOMMENDED'
    ? (userReviewSpeed || 'Standard')
    : (activeSpeed === 'ALL' ? null : activeSpeed)

  /** @type {Record<string, any[]>} */
  const grouped = {}

  if (activeSpeed === 'ALL') {
    Object.keys(groupedRaw).forEach(sub => {
      grouped[sub] = groupedRaw[sub]
    })
  } else if (activeSpeed === 'RECOMMENDED') {
    // "For You" mode: prioritize materials matching user's pace, with fallback to primary subject book
    const targetPaceLower = (userReviewSpeed || 'Standard').toLowerCase()
    Object.keys(groupedRaw).forEach(sub => {
      const items = groupedRaw[sub]
      const matching = items.filter(m => String(m.review_speed || 'Standard').toLowerCase() === targetPaceLower)
      if (matching.length > 0) {
        grouped[sub] = matching
      } else {
        // Fallback: provide 1 item so the subject shelf is not empty in recommended overview
        grouped[sub] = items.slice(0, 1)
      }
    })
  } else {
    // Strict pace filters ('Quick' | 'Standard' | 'Detailed'):
    // Show ONLY items that strictly match the selected review speed!
    const targetPaceLower = String(activeSpeed).toLowerCase()
    Object.keys(groupedRaw).forEach(sub => {
      const items = groupedRaw[sub]
      const matching = items.filter(m => String(m.review_speed || 'Standard').toLowerCase() === targetPaceLower)
      if (matching.length > 0) {
        grouped[sub] = matching
      }
    })
  }

  // Active topic for videos (top activeChip takes precedence, otherwise local videoTopicFilter)
  const activeVideoTopic = activeChip || videoTopicFilter

  // Filter video lectures strictly matching personal info target exam track (IP or FE) and Subject A / B section
  const trackVideos = videos.filter(v => {
    const lvl = (v.exam_level || '').toLowerCase().trim()
    const matchTrack = !lvl || lvl === 'both' || lvl === 'all' ||
      (isFE ? lvl.includes('fe') : (!lvl.includes('fe') || lvl.includes('ip')))

    let matchSection = true
    if (isFE) {
      if (feSection === 'FE Subject B') {
        matchSection = isItemSubjectB(v) || String(v.fe_section || '').toLowerCase() === 'both'
      } else {
        matchSection = !isItemSubjectB(v) || String(v.fe_section || '').toLowerCase() === 'both'
      }
    }

    return matchTrack && matchSection
  })

  // Further filter video lectures by active topic and search
  const filteredVideos = trackVideos.filter(v => {
    const matchesTopic = !activeVideoTopic || v.subject === activeVideoTopic
    const matchesSearch = !search || (
      v.title.toLowerCase().includes(search.toLowerCase()) ||
      (v.description && v.description.toLowerCase().includes(search.toLowerCase())) ||
      (v.subject && v.subject.toLowerCase().includes(search.toLowerCase())) ||
      (v.author && v.author.toLowerCase().includes(search.toLowerCase()))
    )
    return matchesTopic && matchesSearch
  })

  // Group videos strictly by active target exam syllabus topics
  /** @type {Record<string, any[]>} */
  const groupedVideos = currentTrackSubjects.reduce((acc, sub) => {
    if (activeVideoTopic && activeVideoTopic !== sub) return acc
    const vids = filteredVideos.filter(v => v.subject === sub)
    if (vids.length > 0) acc[sub] = vids
    return acc
  }, /** @type {Record<string, any[]>} */ ({}))

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky top bar with Video Lecture toggle button on the right */}
      <View style={[styles.topHeaderBar, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
        {/* Left balance or Back to Books */}
        {libraryMode === 'VIDEOS' ? (
          <TouchableOpacity
            style={styles.headerModeToggleBtn}
            onPress={() => {
              setLibraryMode('READING')
              setSearch('')
            }}
            activeOpacity={0.7}
            accessibilityLabel="Back to Reading Materials"
          >
            <Feather name="arrow-left" size={16} color={NAVY} />
            <Text style={styles.headerModeToggleText}>Books</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 72 }} />
        )}

        {/* Center: Title */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.headerMainTitle}>
            {libraryMode === 'VIDEOS' ? 'Video Lectures' : 'Library'}
          </Text>
        </View>

        {/* Right side: Video lecture logo / Switch back button */}
        {libraryMode === 'READING' ? (
          <TouchableOpacity
            style={styles.headerVideoLogoBtn}
            onPress={() => {
              setLibraryMode('VIDEOS')
              setSearch('')
            }}
            activeOpacity={0.75}
            accessibilityLabel="Open Video Lectures"
          >
            <Ionicons name="videocam" size={17} color="#dc2626" />
            <Text style={styles.headerVideoLogoText}>Videos</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.headerModeToggleBtn, { backgroundColor: '#eff6ff' }]}
            onPress={() => {
              setLibraryMode('READING')
              setSearch('')
            }}
            activeOpacity={0.75}
            accessibilityLabel="Switch to Reading Materials"
          >
            <Feather name="book-open" size={15} color="#2563eb" />
            <Text style={[styles.headerModeToggleText, { color: '#2563eb' }]}>Books</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: getScrollBottomPadding(insets, true, 24) }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[NAVY]} tintColor={NAVY} />
        }
      >
        {loading ? (
          <LibrarySkeleton libraryMode={libraryMode} isFE={isFE} />
        ) : (
          <>
            {/* Search */}
            <View style={styles.searchBar}>
              <Feather name="search" size={20} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder={libraryMode === 'VIDEOS' ? "Search video lectures by title or topic..." : "Search reading materials..."}
                placeholderTextColor="#94a3b8"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

        {/* FE Subject A / Subject B Segmented Switcher */}
        {isFE && (
          <View style={styles.feTrackBar}>
            <View style={styles.feTrackSegment}>
              <TouchableOpacity
                style={[styles.feTrackBtn, feSection === 'FE Subject A' && styles.feTrackBtnActive]}
                onPress={() => {
                  setFeSection('FE Subject A')
                  setActiveChip(null)
                  setVideoTopicFilter(null)
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="laptop"
                  size={14}
                  color={feSection === 'FE Subject A' ? '#fff' : '#64748b'}
                />
                <Text style={[styles.feTrackBtnText, feSection === 'FE Subject A' && styles.feTrackBtnTextActive]}>
                  Subject A (Morning)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.feTrackBtn, feSection === 'FE Subject B' && styles.feTrackBtnActive]}
                onPress={() => {
                  setFeSection('FE Subject B')
                  setActiveChip(null)
                  setVideoTopicFilter(null)
                }}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name="code-braces"
                  size={14}
                  color={feSection === 'FE Subject B' ? '#fff' : '#64748b'}
                />
                <Text style={[styles.feTrackBtnText, feSection === 'FE Subject B' && styles.feTrackBtnTextActive]}>
                  Subject B (Afternoon)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Small Card Filter with Logo & Text */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardFilterScroll}
        >
          {/* "All" Card */}
          <TouchableOpacity
            style={[
              styles.filterCard,
              !activeChip && !videoTopicFilter && styles.filterCardActive,
            ]}
            activeOpacity={0.8}
            onPress={() => {
              setActiveChip(null)
              setVideoTopicFilter(null)
            }}
          >
            <View style={[
              styles.filterCardIconWrapper,
              (!activeChip && !videoTopicFilter) ? styles.filterCardIconWrapperActive : styles.filterCardIconWrapperInactive
            ]}>
              <Feather
                name="layers"
                size={20}
                color={(!activeChip && !videoTopicFilter) ? '#ffffff' : '#13294b'}
              />
            </View>
            <Text
              style={[styles.filterCardText, (!activeChip && !videoTopicFilter) && styles.filterCardTextActive]}
              numberOfLines={1}
            >
              All Topics
            </Text>
          </TouchableOpacity>

          {/* Subject Cards based on active view mode */}
          {displayFilterSubjects.map(sub => {
            const config = SUBJECT_FILTER_CONFIG[sub] || {
              label: sub,
              shortLabel: sub,
              icon: 'book',
              color: '#2563eb',
            }
            const isSelected = (activeChip === sub) || (videoTopicFilter === sub)

            return (
              <TouchableOpacity
                key={sub}
                style={[
                  styles.filterCard,
                  isSelected && styles.filterCardActive,
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  const next = isSelected ? null : sub
                  setActiveChip(next)
                  setVideoTopicFilter(next)
                }}
              >
                <View style={[
                  styles.filterCardIconWrapper,
                  isSelected
                    ? styles.filterCardIconWrapperActive
                    : { backgroundColor: `${config.color}15` }
                ]}>
                  <Feather
                    name={config.icon}
                    size={20}
                    color={isSelected ? '#ffffff' : config.color}
                  />
                </View>
                <Text
                  style={[styles.filterCardText, isSelected && styles.filterCardTextActive]}
                  numberOfLines={1}
                >
                  {config.shortLabel || sub}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* ── Reading Materials Section (Only in READING Mode) ── */}
        {libraryMode === 'READING' && (
          <>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Feather name="book-open" size={20} color={NAVY} />
                <Text style={styles.sectionHeaderText}>Reading Materials</Text>
                <View style={styles.examTrackBadge}>
                  <Text style={styles.examTrackBadgeText}>
                    {isFE ? (feSection === 'FE Subject B' ? 'FE Subject B' : 'FE Subject A') : 'PhilNITS IP'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => loadMaterials(true)}>
                <Feather name="refresh-cw" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

        {/* Review Speed Pace Filter Bar */}
        <View style={styles.paceContainer}>
          <View style={styles.paceHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="zap" size={14} color="#d97706" />
              <Text style={styles.paceTitle}>Target Review Pace:</Text>
            </View>
            <View style={[
              styles.paceActiveBadge,
              effectiveSpeed === 'Quick' ? styles.speedBadgeQuick :
              effectiveSpeed === 'Detailed' ? styles.speedBadgeDetailed :
              styles.speedBadgeStandard
            ]}>
              <Text style={[
                styles.paceActiveBadgeText,
                effectiveSpeed === 'Quick' ? styles.speedBadgeTextQuick :
                effectiveSpeed === 'Detailed' ? styles.speedBadgeTextDetailed :
                styles.speedBadgeTextStandard
              ]}>
                {effectiveSpeed ? `${effectiveSpeed} Pace` : 'All Paces'}
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.paceScroll}>
            <TouchableOpacity
              style={[styles.paceChip, activeSpeed === 'RECOMMENDED' && styles.paceChipActive]}
              onPress={() => setActiveSpeed('RECOMMENDED')}
            >
              <Feather name="star" size={12} color={activeSpeed === 'RECOMMENDED' ? '#fff' : '#d97706'} />
              <Text style={[styles.paceChipText, activeSpeed === 'RECOMMENDED' && styles.paceChipTextActive]}>
                For You ({userReviewSpeed})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paceChip, activeSpeed === 'Quick' && styles.paceChipActive]}
              onPress={() => setActiveSpeed(activeSpeed === 'Quick' ? 'RECOMMENDED' : 'Quick')}
            >
              <Text style={[styles.paceChipText, activeSpeed === 'Quick' && styles.paceChipTextActive]}>
                ⚡ Quick
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paceChip, activeSpeed === 'Standard' && styles.paceChipActive]}
              onPress={() => setActiveSpeed(activeSpeed === 'Standard' ? 'RECOMMENDED' : 'Standard')}
            >
              <Text style={[styles.paceChipText, activeSpeed === 'Standard' && styles.paceChipTextActive]}>
                🎯 Standard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paceChip, activeSpeed === 'Detailed' && styles.paceChipActive]}
              onPress={() => setActiveSpeed(activeSpeed === 'Detailed' ? 'RECOMMENDED' : 'Detailed')}
            >
              <Text style={[styles.paceChipText, activeSpeed === 'Detailed' && styles.paceChipTextActive]}>
                📖 Detailed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.paceChip, activeSpeed === 'ALL' && styles.paceChipActive]}
              onPress={() => setActiveSpeed('ALL')}
            >
              <Text style={[styles.paceChipText, activeSpeed === 'ALL' && styles.paceChipTextActive]}>
                All Speeds
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.centered}>
            <Feather name="alert-circle" size={40} color="#94a3b8" />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => loadMaterials(true)}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content grouped by subject */}
        {!error && Object.keys(grouped).length === 0 && (
          <View style={styles.centered}>
            <Feather name="filter" size={40} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {activeSpeed === 'ALL'
                ? 'No reading materials found.'
                : `No ${activeSpeed} pace reading materials found for ${isFE ? feSection : 'PhilNITS IP'}.`}
            </Text>
            {activeSpeed !== 'ALL' && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => setActiveSpeed('ALL')}
              >
                <Text style={styles.retryText}>Show All Speeds</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {!error && Object.entries(grouped).map(([subject, items]) => (
          <View key={subject} style={styles.subjectSection}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryTitle}>{subject}</Text>
              <Text style={styles.categoryCount}>{items.length} {items.length === 1 ? 'book' : 'books'}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalBookCards}>
              {items.map(item => {
                const itemEffectiveSpeed = item.review_speed || 'Standard'

                return (
                  <MaterialCard
                    key={item.id}
                    item={item}
                    onPress={() => navigation?.navigate('ReadingMaterial', {
                      materialId: item.id,
                      title: item.title,
                      subject: item.subject,
                      reviewSpeed: itemEffectiveSpeed,
                      learningObjective: item.learning_objective,
                      pdfUrl: item.pdf_url,
                      coverImageUrl: item.cover_image_url || item.cover_url || item.thumbnail_url,
                      totalPages: item.total_pages || 1,
                    })}
                  />
                )
              })}
            </ScrollView>
          </View>
        ))}
          </>
        )}

        {/* ── Video Lectures Section (Only in VIDEOS Mode) ── */}
        {libraryMode === 'VIDEOS' && (
          <View style={{ marginTop: 6 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="videocam" size={20} color="#dc2626" />
                <Text style={styles.sectionHeaderText}>Video Lectures</Text>
                <View style={styles.examTrackBadge}>
                  <Text style={styles.examTrackBadgeText}>
                    {isFE ? (feSection === 'FE Subject B' ? 'FE Subject B' : 'FE Subject A') : 'PhilNITS IP'}
                  </Text>
                </View>
              </View>
              <Text style={styles.categoryCount}>
                {filteredVideos.length} {filteredVideos.length === 1 ? 'lecture' : 'lectures'}
              </Text>
            </View>

            {/* Video topic filter pills (when top chip is not restricting) */}
            {!activeChip && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoTopicScroll}>
                <TouchableOpacity
                  style={[styles.videoTopicChip, !videoTopicFilter && styles.videoTopicChipActive]}
                  onPress={() => setVideoTopicFilter(null)}
                >
                  <Text style={[styles.videoTopicChipText, !videoTopicFilter && styles.videoTopicChipTextActive]}>
                    All Topics
                  </Text>
                </TouchableOpacity>
                {currentTrackSubjects.map(sub => (
                  <TouchableOpacity
                    key={sub}
                    style={[styles.videoTopicChip, videoTopicFilter === sub && styles.videoTopicChipActive]}
                    onPress={() => setVideoTopicFilter(videoTopicFilter === sub ? null : sub)}
                  >
                    <Text style={[styles.videoTopicChipText, videoTopicFilter === sub && styles.videoTopicChipTextActive]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {filteredVideos.length === 0 ? (
              <View style={[styles.centered, { paddingVertical: 24 }]}>
                <Ionicons name="film-outline" size={32} color="#94a3b8" />
                <Text style={styles.emptyText}>No video lectures found for this topic.</Text>
              </View>
            ) : (
              Object.entries(groupedVideos).map(([subTitle, vids]) => (
                <View key={subTitle} style={{ marginBottom: 18 }}>
                  <View style={styles.categoryRow}>
                    <Text style={styles.categoryTitle}>{subTitle}</Text>
                    <Text style={styles.categoryCount}>{vids.length} videos</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
                    {vids.map(video => {
                      const durationMins = video.duration_minutes || 15
                      const yId = video.youtube_id || (video.url?.match(/v=([a-zA-Z0-9_-]{11})/)?.[1]) || 'FZGugFqdr60'
                      const thumb = video.thumbnail_url || `https://i.ytimg.com/vi/${yId}/hqdefault.jpg`
                      return (
                        <TouchableOpacity
                          key={video.id || video.url}
                          style={styles.videoCard}
                          activeOpacity={0.85}
                          onPress={() => navigation?.navigate('VideoLectureDetail', { video, hideNav: true })}
                        >
                          <View style={styles.videoThumbnailWrapper}>
                            <Image source={{ uri: thumb }} style={styles.videoThumbnail} />
                            <View style={styles.videoPlayOverlay}>
                              <View style={styles.playIconCircle}>
                                <Ionicons name="play" size={16} color="#ffffff" style={{ marginLeft: 2 }} />
                              </View>
                            </View>
                            <View style={styles.videoDurationBadge}>
                              <Feather name="clock" size={10} color="#ffffff" style={{ marginRight: 3 }} />
                              <Text style={styles.videoDurationBadgeText}>{durationMins}m</Text>
                            </View>
                          </View>
                          <View style={styles.videoBody}>
                            <Text style={styles.videoSubjectTag} numberOfLines={1}>{video.subject}</Text>
                            <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
                            <View style={styles.videoAuthorRow}>
                              <Feather name="video" size={11} color="#64748b" style={{ marginRight: 4 }} />
                              <Text style={styles.videoAuthorText} numberOfLines={1}>{video.author || 'Educational Resource'}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              ))
            )}
          </View>
        )}
          </>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 100 },

  // Top Bar & Navigation Mode Header
  topHeaderBar: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerMainTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  headerVideoLogoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerVideoLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  headerModeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
  },
  headerModeToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },

  // Top (legacy)
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title:        { fontSize: 28, fontWeight: '800', color: NAVY },
  rightSpacer:  { width: 28 },

  // Search
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eef1f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  searchInput:  { flex: 1, fontSize: 14, color: NAVY },

  // Small Card Filter with Logo & Text
  cardFilterScroll: { gap: 10, paddingBottom: 16 },
  filterCard: {
    width: 90,
    height: 78,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  filterCardActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
    elevation: 4,
    shadowColor: NAVY,
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
  },
  filterCardIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  filterCardIconWrapperInactive: {
    backgroundColor: '#eff6ff',
  },
  filterCardIconWrapperActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterCardText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  filterCardTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  // Chips (legacy fallback)
  chipScroll:    { gap: 8, paddingBottom: 14 },
  chip:          { borderWidth: 1.2, borderColor: '#4d72c7', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  chipText:      { color: NAVY, fontSize: 12, fontWeight: '600' },
  chipTextActive:{ color: '#fff' },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderText:{ fontSize: 17, fontWeight: '700', color: NAVY },

  // Loading / empty
  centered:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  emptyText:   { marginTop: 10, fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  retryBtn:    { marginTop: 14, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Subject groups
  subjectSection: { marginBottom: 20 },
  categoryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryTitle:  { fontSize: 15, fontWeight: '700', color: NAVY },
  categoryCount:  { fontSize: 12, color: '#64748b' },
  horizontalCards:{ gap: 12, paddingBottom: 6 },
  horizontalBookCards: { gap: 14, paddingBottom: 10 },

  // ── Book Cover Cards (Full Image Cover) ──
  bookCard: {
    width: 134,
    height: 196,
    borderRadius: 6,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#0b192c',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  bookWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  bookSpineOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  bookSpineCrease: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 8,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  bookPageEdge: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bookSpeedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bookSpeedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  bookProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bookProgressFill: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },

  // ── Default Graphic Book Cover ──
  defaultCoverRoot: {
    width: '100%',
    height: '100%',
    padding: 9,
    justifyContent: 'space-between',
  },
  defaultCoverFrame: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    justifyContent: 'space-between',
  },
  defaultCoverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  defaultCoverCrestText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  defaultCoverCrestBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCoverTitleBlock: {
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  defaultCoverTitleText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 6,
  },
  defaultCoverDivider: {
    width: 24,
    height: 2,
    borderRadius: 1,
    marginBottom: 6,
  },
  defaultCoverSubjectText: {
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  defaultCoverFooterRow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultCoverEditionTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultCoverEditionText: {
    fontSize: 8,
    fontWeight: '800',
  },

  // Legacy cards fallback
  materialCard:            { width: 160, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  materialImagePlaceholder:{ height: 80, backgroundColor: '#dbe8fb', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  materialBody:            { padding: 10 },
  materialTitle:           { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 3 },
  materialSubtitle:        { fontSize: 11, color: '#374151', minHeight: 28, marginBottom: 8 },
  progressRow:             { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack:           { flex: 1, height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill:            { height: '100%', borderRadius: 999, backgroundColor: NAVY },
  progressText:            { fontSize: 10, color: '#6b7280', fontWeight: '600' },
  speedBadge:              { position: 'absolute', top: 6, right: 6, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8 },
  speedBadgeQuick:         { backgroundColor: '#fef3c7' },
  speedBadgeDetailed:      { backgroundColor: '#f1f5f9' },
  speedBadgeStandard:      { backgroundColor: '#eff6ff' },
  speedBadgeText:          { fontSize: 9, fontWeight: '800' },
  speedBadgeTextQuick:     { color: '#d97706' },
  speedBadgeTextDetailed:  { color: '#0f2747' },
  speedBadgeTextStandard:  { color: '#2563eb' },
  headerSpeedBadge:        { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2.5, borderRadius: 12 },
  headerSpeedBadgeText:    { fontSize: 11, fontWeight: '800' },

  // Review Pace selector bar
  paceContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 16,
  },
  paceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  paceActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paceActiveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paceScroll: {
    gap: 6,
  },
  paceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paceChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  paceChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  paceChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Exam Track Badge
  examTrackBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  examTrackBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3730a3',
  },

  // FE Subject A / Subject B Segment Switcher
  feTrackBar: {
    marginBottom: 12,
  },
  feTrackSegment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    padding: 3,
  },
  feTrackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 18,
    gap: 6,
  },
  feTrackBtnActive: {
    backgroundColor: NAVY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  feTrackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  feTrackBtnTextActive: {
    color: '#fff',
    fontWeight: '800',
  },

  // Video topic chips
  videoTopicScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  videoTopicChip: {
    borderWidth: 1,
    borderColor: '#94a3b8',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8fafc',
  },
  videoTopicChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  videoTopicChipText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
  videoTopicChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  // Video Cards
  videoCard: {
    width: 190,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  videoThumbnailWrapper: {
    width: '100%',
    height: 104,
    backgroundColor: '#0f172a',
    position: 'relative',
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(19, 41, 75, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  videoDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoDurationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  videoBody: {
    padding: 10,
  },
  videoSubjectTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 18,
    marginBottom: 6,
    height: 36,
  },
  videoAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  videoAuthorText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    flex: 1,
  },

  // Bottom nav
  bottomNav:    { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d8e0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 8 },
  navIconWrap:  { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  navIconActive:{ backgroundColor: 'rgba(15, 39, 71, 0.08)' },

  // ── Skeleton Styles ──
  skeletonContainer: {
    width: '100%',
  },
  skeletonCardFilterScroll: {
    gap: 10,
    paddingBottom: 16,
  },
  skeletonFilterCard: {
    width: 90,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8edf5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  skeletonSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonPaceContainer: {
    marginBottom: 20,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e8edf5',
  },
  skeletonShelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  skeletonBookCard: {
    width: 134,
    height: 196,
    borderRadius: 8,
    overflow: 'hidden',
  },
  skeletonVideoCard: {
    width: 190,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
})
