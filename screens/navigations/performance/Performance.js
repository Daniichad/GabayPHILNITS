import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import Svg, { Circle, Line, Polygon, Path, Text as SvgText, TSpan, G } from 'react-native-svg'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { withTimeout } from '../../../utils/queryHelper'
import { getScrollBottomPadding } from '../../../utils/responsiveLayout'
import { getCache, setCache } from '../../../utils/cache'
import { resolveUserTargetExam } from '../../../utils/targetExam'

const NAVY = '#0f2747'
const TABS = ['Overview', 'Predictive', 'Prescriptive']

// PhilNITS Exam Syllabi (IP, FE Subject A, FE Subject B)
const IP_SUBJECTS = [
  'Technology',
  'Management',
  'Strategy',
]

const FE_A_SUBJECTS = [
  'Computer Systems & Architecture',
  'Databases & SQL',
  'Networks & Security',
  'IT Management & Strategy',
]

const FE_B_SUBJECTS = [
  'Algorithms & Programming',
  'Security & System Design',
]

const SUBJECT_COLORS = {
  'Technology': '#2563eb',
  'Management': '#d97706',
  'Strategy': '#9333ea',
  'Computer Systems & Architecture': '#2563eb',
  'Databases & SQL': '#06b6d4',
  'Algorithms & Programming': '#059669',
  'Networks & Security': '#dc2626',
  'IT Management & Strategy': '#9333ea',
  'Algorithms & Data Structures': '#059669',
  'Security & System Design': '#dc2626',
}

// Standardized Study Pace Profiles (Detailed, Standard, Quick)
export const STUDY_PACE_PROFILES = {
  Detailed: {
    id: 'Detailed',
    name: 'Detailed',
    tag: 'Foundational Deep-Dive',
    dailyTarget: 35,
    dailyGoalMins: 45,
    color: '#7c3aed',
    lightBg: '#f5f3ff',
    border: '#ddd6fe',
    badgeBg: '#ede9fe',
    badgeText: '#6d28d9',
    icon: 'book-outline',
    intensity: 'Deep Dive',
    idealRange: 'Readiness < 50%',
    breakdown: [
      { label: 'MCQ Practice', count: '15 items', icon: 'help-circle-outline' },
      { label: 'True / False', count: '10 items', icon: 'checkmark-circle-outline' },
      { label: 'Flashcards', count: '10 items', icon: 'albums-outline' },
    ],
    summary: 'Comprehensive concept reinforcement, in-depth reading review, and step-by-step drills to eliminate foundational knowledge gaps.',
    actionPlan: [
      'Read syllabus notes and chapter definitions for your priority review domain.',
      'Answer 15 targeted Multiple Choice questions; carefully inspect step-by-step explanations.',
      'Solve 10 True/False drills and review flashcards for decayed retention areas.',
    ],
  },
  Standard: {
    id: 'Standard',
    name: 'Standard',
    tag: 'Balanced Progression',
    dailyTarget: 25,
    dailyGoalMins: 30,
    color: '#2563eb',
    lightBg: '#eff6ff',
    border: '#bfdbfe',
    badgeBg: '#dbeafe',
    badgeText: '#1d4ed8',
    icon: 'speedometer-outline',
    intensity: 'Balanced',
    idealRange: 'Readiness 50% - 79%',
    breakdown: [
      { label: 'MCQ Practice', count: '15 items', icon: 'help-circle-outline' },
      { label: 'True / False', count: '10 items', icon: 'checkmark-circle-outline' },
      { label: 'Weekly Mock', count: '1 exam', icon: 'clipboard-outline' },
    ],
    summary: 'Consistent, balanced daily coverage combining mixed multiple-choice drills, true/false questions, and periodic mock simulations.',
    actionPlan: [
      'Complete 15 MCQ practice items focusing on core syllabus domains.',
      'Test rapid concept recall with 10 True/False questions.',
      'Take at least 1 full-length timed mock exam every weekend to benchmark endurance.',
    ],
  },
  Quick: {
    id: 'Quick',
    name: 'Quick',
    tag: 'High-Yield Maintenance',
    dailyTarget: 15,
    dailyGoalMins: 15,
    color: '#059669',
    lightBg: '#ecfdf5',
    border: '#a7f3d0',
    badgeBg: '#d1fae5',
    badgeText: '#047857',
    icon: 'flash-outline',
    intensity: 'High Velocity',
    idealRange: 'Readiness ≥ 80%',
    breakdown: [
      { label: 'High-Yield MCQ', count: '10 items', icon: 'help-circle-outline' },
      { label: 'True / False', count: '5 items', icon: 'checkmark-circle-outline' },
      { label: 'Speed Drill', count: '1 set', icon: 'stopwatch-outline' },
    ],
    summary: 'Fast-paced diagnostic refreshes and timed speed drills to maintain peak performance and exam readiness without fatigue.',
    actionPlan: [
      'Answer 10 rapid-fire Multiple Choice questions focusing on retention-decayed topics.',
      'Complete 5 True/False confirmation questions.',
      'Keep exam pace under 1.5 minutes per question and review missed items only.',
    ],
  },
}

// Target number of practice attempts per domain for full confidence
const DOMAIN_TARGET_ATTEMPTS = {
  // IP Level
  'Technology': 40,
  'Management': 30,
  'Strategy': 30,

  // FE Subject A
  'Computer Systems & Architecture': 30,
  'Databases & SQL': 25,
  'Networks & Security': 25,
  'IT Management & Strategy': 25,

  // FE Subject B
  'Algorithms & Programming': 25,
  'Algorithms & Data Structures': 20,
  'Security & System Design': 20,

  // General fallback for CSE
  'default': 30,
}

// ── Helpers ──────────────────────────────────────────────────────
function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0 }

function fmtMins(mins) {
  if (!mins || mins <= 0) return '0m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function readinessLabel(p, benchmark = 60, hasActivity = true, isLowData = false) {
  if (!hasActivity || p === 0) {
    if (isLowData) return 'Building Baseline'
    return 'No Activity Yet'
  }
  if (isLowData) return 'Building Baseline'
  if (p >= benchmark + 15) return 'High Readiness'
  if (p >= benchmark) return 'Benchmark Met'
  if (p >= benchmark - 20) return 'Moderate Readiness'
  return 'Needs More Practice'
}

function readinessColor(p, benchmark = 60, hasActivity = true, isLowData = false) {
  if (!hasActivity || p === 0) {
    if (isLowData) return '#64748b'
    return '#94a3b8'
  }
  if (isLowData) return '#64748b'
  if (p >= benchmark + 15) return '#16a34a'
  if (p >= benchmark) return '#2563eb'
  if (p >= benchmark - 20) return '#d97706'
  return '#dc2626'
}

function getSubjectTip(subjectName) {
  switch (subjectName) {
    case 'Technology':
      return 'Review binary representations, computer architecture, operating systems, and database queries.'
    case 'Management':
      return 'Focus on project management methodologies, IT service management (ITIL), system audits, and risk assessment.'
    case 'Strategy':
      return 'Study business administration, corporate strategy, legal compliance (IP rights, GDPR), and digital transformation.'
    case 'Computer Systems & Architecture':
      return 'Master CPU architecture, logic circuits, memory hierarchies, and peripheral interfaces.'
    case 'Algorithms & Programming':
      return 'Practice pseudo-code tracing, computational complexity, recursive functions, and sorting/searching routines.'
    case 'Networks & Security':
      return 'Review OSI model layers, TCP/IP protocols, cryptographic algorithms, public key infrastructure, and vulnerability defense.'
    case 'IT Management & Strategy':
      return 'Review enterprise architecture, system development lifecycles, SLA management, and security governance.'
    case 'Algorithms & Data Structures':
      return 'Trace dynamic programming, tree traversals, graph algorithms, and algorithmic space/time optimization.'
    case 'Security & System Design':
      return 'Analyze case-study security threat models, incident responses, and robust software architectural designs.'
    default:
      return 'Complete more practice quizzes and mock exams to sharpen your mastery and retention.'
  }
}


// ── Bar (for progress) ────────────────────────────────────────────
function ProgressBar({ value, color = NAVY }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(value, 3)}%`, backgroundColor: color }]} />
    </View>
  )
}

// ── Domain Mastery Radar Chart (SVG) ──────────────────────────────
function DomainRadarChart({ subjects = [], benchmark = 60 }) {
  if (!subjects || subjects.length < 2) return null

  // If there are exactly 2 subjects (e.g. FE Subject B), create an equilateral triad
  // with Combined Average so the radar forms a complete, functional polygon!
  let chartSubjects = subjects
  if (subjects.length === 2) {
    const avgPct = Math.round((subjects[0].pct + subjects[1].pct) / 2)
    chartSubjects = [
      subjects[0],
      subjects[1],
      {
        name: 'Combined Average',
        pct: avgPct,
        color: '#6366f1',
      },
    ]
  }

  const width = 360
  const height = 270
  const cx = width / 2
  const cy = 135
  const radius = 68
  const n = chartSubjects.length
  const angleStep = (Math.PI * 2) / n
  const startAngle = -Math.PI / 2

  const getCoord = (index, value) => {
    const angle = startAngle + index * angleStep
    const r = (Math.min(Math.max(value, 0), 100) / 100) * radius
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const webLevels = [0.25, 0.5, 0.75, 1.0]

  const userPoints = chartSubjects.map((s, i) => {
    const pt = getCoord(i, s.pct)
    return `${pt.x},${pt.y}`
  }).join(' ')

  const benchmarkPoints = chartSubjects.map((_, i) => {
    const pt = getCoord(i, benchmark)
    return `${pt.x},${pt.y}`
  }).join(' ')

  return (
    <View style={styles.radarContainer}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Concentric webs */}
        {webLevels.map((lvl) => {
          const pts = chartSubjects.map((_, i) => {
            const pt = getCoord(i, lvl * 100)
            return `${pt.x},${pt.y}`
          }).join(' ')
          return (
            <Polygon
              key={`web-${lvl}`}
              points={pts}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          )
        })}

        {/* Axis lines */}
        {chartSubjects.map((_, i) => {
          const outer = getCoord(i, 100)
          return (
            <Line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={outer.x}
              y2={outer.y}
              stroke="#cbd5e1"
              strokeWidth="1"
            />
          )
        })}

        {/* 60% Passing benchmark dashed polygon */}
        <Polygon
          points={benchmarkPoints}
          fill="none"
          stroke="#eab308"
          strokeWidth="1.5"
          strokeDasharray="4, 3"
        />

        {/* User score polygon */}
        <Polygon
          points={userPoints}
          fill="rgba(37, 99, 235, 0.22)"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        {/* Vertex dots */}
        {chartSubjects.map((s, i) => {
          const pt = getCoord(i, s.pct)
          return (
            <Circle
              key={`dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r="4.5"
              fill={s.color || '#2563eb'}
              stroke="#fff"
              strokeWidth="1.5"
            />
          )
        })}

        {/* Outer labels with two-line layout and boundary safety */}
        {chartSubjects.map((s, i) => {
          const angle = startAngle + i * angleStep
          const labelDist = radius + 22
          const lx = cx + labelDist * Math.cos(angle)
          const ly = cy + labelDist * Math.sin(angle)

          const isTop = Math.sin(angle) < -0.7
          const isBottom = Math.sin(angle) > 0.7
          const isLeft = Math.cos(angle) < -0.2
          const isRight = Math.cos(angle) > 0.2

          let textAnchor = 'middle'
          if (!isTop && !isBottom) {
            if (isLeft) textAnchor = 'end'
            else if (isRight) textAnchor = 'start'
          }

          let finalX = lx
          let finalY = ly
          if (textAnchor === 'middle') {
            finalX = Math.max(50, Math.min(310, lx))
            finalY = isTop ? Math.max(18, ly - 4) : Math.min(252, ly + 8)
          } else if (textAnchor === 'start') {
            finalX = Math.min(348, Math.max(220, lx + 2))
            finalY = Math.max(22, Math.min(245, ly - 4))
          } else if (textAnchor === 'end') {
            finalX = Math.max(12, Math.min(140, lx - 2))
            finalY = Math.max(22, Math.min(245, ly - 4))
          }

          let line1 = s.name
          let line2 = `(${s.pct}%)`
          if (s.name.includes('&')) {
            const parts = s.name.split('&')
            line1 = parts[0].trim()
            line2 = `& ${parts[1].trim()} (${s.pct}%)`
          } else if (s.name.length > 15) {
            const words = s.name.split(' ')
            if (words.length > 1) {
              const mid = Math.ceil(words.length / 2)
              line1 = words.slice(0, mid).join(' ')
              line2 = `${words.slice(mid).join(' ')} (${s.pct}%)`
            }
          }

          return (
            <SvgText
              key={`label-${i}`}
              x={finalX}
              y={finalY}
              fontSize="9.5"
              fontWeight="bold"
              fill="#1e293b"
              textAnchor={textAnchor}
            >
              <TSpan x={finalX} dy="0">{line1}</TSpan>
              <TSpan x={finalX} dy="11.5" fill={s.color || '#2563eb'} fontWeight="700">{line2}</TSpan>
            </SvgText>
          )
        })}
      </Svg>

      <View style={styles.radarLegendRow}>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendDot, { backgroundColor: '#2563eb' }]} />
          <Text style={styles.radarLegendText}>Your Domain Mastery</Text>
        </View>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendLine, { borderColor: '#eab308' }]} />
          <Text style={styles.radarLegendText}>{benchmark}% Passing Benchmark</Text>
        </View>
      </View>
    </View>
  )
}

// ── Exam Trajectory Forecast Chart (SVG) ──────────────────────────
function TrajectoryForecastChart({ mockHistory = [], projectedScore = 0, benchmark = 60, confidenceInterval = [0, 0] }) {
  const width = 310
  const height = 140
  const paddingX = 35
  const paddingY = 20
  const chartW = width - paddingX * 2
  const chartH = height - paddingY * 2

  const historyPoints = mockHistory.map((m, idx) => ({
    label: `M${idx + 1}`,
    score: m.pct,
    isProjected: false,
  }))

  const allPoints = [
    ...historyPoints,
    { label: 'Exam', score: projectedScore, isProjected: true },
  ]

  const getY = (val) => paddingY + chartH - ((Math.min(Math.max(val, 0), 100) / 100) * chartH)
  const getX = (idx) => paddingX + (idx / Math.max(1, allPoints.length - 1)) * chartW

  const benchmarkY = getY(benchmark)
  const ciLowY = getY(confidenceInterval[0])
  const ciHighY = getY(confidenceInterval[1])
  const lastHistoryX = getX(Math.max(0, historyPoints.length - 1))
  const examX = getX(allPoints.length - 1)

  let historyPath = ''
  if (historyPoints.length > 0) {
    historyPath = historyPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(pt.score)}`).join(' ')
  }

  const projPath = historyPoints.length > 0
    ? `M ${lastHistoryX} ${getY(historyPoints[historyPoints.length - 1].score)} L ${examX} ${getY(projectedScore)}`
    : `M ${getX(0)} ${getY(projectedScore)} L ${examX} ${getY(projectedScore)}`

  return (
    <View style={styles.trajectoryChartWrap}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grid */}
        {[20, 40, 60, 80].map((v) => {
          const y = getY(v)
          return (
            <G key={`grid-${v}`}>
              <Line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" />
              <SvgText x={paddingX - 6} y={y + 3} fontSize="9" fill="#94a3b8" textAnchor="end">{v}%</SvgText>
            </G>
          )
        })}

        {/* 95% Confidence Band */}
        {historyPoints.length >= 1 && (
          <Polygon
            points={`${lastHistoryX},${getY(historyPoints[historyPoints.length - 1].score)} ${examX},${ciHighY} ${examX},${ciLowY}`}
            fill="rgba(59, 130, 246, 0.15)"
          />
        )}

        {/* 60% Benchmark Line */}
        <Line
          x1={paddingX}
          y1={benchmarkY}
          x2={width - paddingX}
          y2={benchmarkY}
          stroke="#16a34a"
          strokeWidth="1.5"
          strokeDasharray="4, 3"
        />
        <SvgText x={width - paddingX + 2} y={benchmarkY + 3} fontSize="9" fontWeight="bold" fill="#16a34a" textAnchor="start">
          Pass
        </SvgText>

        {/* Historical line */}
        {historyPath ? (
          <Path d={historyPath} fill="none" stroke="#0f2747" strokeWidth="2.5" />
        ) : null}

        {/* Forecast trajectory line */}
        <Path d={projPath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeDasharray="5, 3" />

        {/* Historical markers */}
        {historyPoints.map((pt, i) => {
          const x = getX(i)
          const y = getY(pt.score)
          return (
            <G key={`hdot-${i}`}>
              <Circle cx={x} cy={y} r="4" fill="#0f2747" stroke="#fff" strokeWidth="1.5" />
              <SvgText x={x} y={height - 4} fontSize="9" fill="#64748b" textAnchor="middle">{pt.label}</SvgText>
            </G>
          )
        })}

        {/* Projected target dot */}
        <Circle cx={examX} cy={getY(projectedScore)} r="5.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
        <SvgText x={examX} y={height - 4} fontSize="9" fontWeight="bold" fill="#2563eb" textAnchor="middle">Exam</SvgText>
      </Svg>

      <View style={styles.trajectoryLegendRow}>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendDot, { backgroundColor: '#0f2747' }]} />
          <Text style={styles.radarLegendText}>Mock Exams</Text>
        </View>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendLine, { borderColor: '#2563eb', borderStyle: 'dashed' }]} />
          <Text style={styles.radarLegendText}>Forecast</Text>
        </View>
        <View style={styles.radarLegendItem}>
          <View style={[styles.radarLegendLine, { borderColor: '#16a34a' }]} />
          <Text style={styles.radarLegendText}>{benchmark}% Benchmark</Text>
        </View>
      </View>
    </View>
  )
}

// ── Helper: Disambiguate question or session exam track ──────────────
function getItemExamLevel(item, type) {
  if (type === 'mcq') {
    const q = item.multiple_choice_questions
    const direct = q?.exam_level || q?.practice_categories?.exam_level || item.exam_level
    if (direct) {
      const s = String(direct).trim().toUpperCase()
      if (s.includes('FE')) return 'FE'
      if (s.includes('IP')) return 'IP'
    }
    const catName = q?.practice_categories?.name || ''
    if (IP_SUBJECTS.includes(catName)) return 'IP'
    if (FE_A_SUBJECTS.includes(catName) || FE_B_SUBJECTS.includes(catName) || catName === 'Databases & SQL') return 'FE'
    return null
  }
  if (type === 'tf') {
    const q = item.true_false_questions
    const direct = q?.exam_level || q?.practice_categories?.exam_level || item.exam_level
    if (direct) {
      const s = String(direct).trim().toUpperCase()
      if (s.includes('FE')) return 'FE'
      if (s.includes('IP')) return 'IP'
    }
    const catName = q?.practice_categories?.name || ''
    if (IP_SUBJECTS.includes(catName)) return 'IP'
    if (FE_A_SUBJECTS.includes(catName) || FE_B_SUBJECTS.includes(catName) || catName === 'Databases & SQL') return 'FE'
    return null
  }
  if (type === 'flashcard') {
    const d = item.flashcard_decks
    const direct = d?.exam_level || d?.practice_categories?.exam_level || item.exam_level
    if (direct) {
      const s = String(direct).trim().toUpperCase()
      if (s.includes('FE')) return 'FE'
      if (s.includes('IP')) return 'IP'
    }
    const catName = d?.practice_categories?.name || d?.title || ''
    if (IP_SUBJECTS.some(s => catName.includes(s))) return 'IP'
    if (FE_A_SUBJECTS.some(s => catName.includes(s)) || FE_B_SUBJECTS.some(s => catName.includes(s)) || catName.includes('FE') || catName.includes('Databases')) return 'FE'
    return null
  }
  if (type === 'matching') {
    if (item.exam_level) {
      const s = String(item.exam_level).trim().toUpperCase()
      if (s.includes('FE')) return 'FE'
      if (s.includes('IP')) return 'IP'
    }
    const title = item.set_title || ''
    if (title.includes('[FE]') || title.toLowerCase().includes('fe')) return 'FE'
    if (title.includes('[IP]') || title.toLowerCase().includes('ip')) return 'IP'
    if (FE_A_SUBJECTS.some(s => title.includes(s)) || FE_B_SUBJECTS.some(s => title.includes(s)) || title.includes('Memory') || title.includes('Pipelining') || title.includes('Databases')) return 'FE'
    if (IP_SUBJECTS.some(s => title.includes(s))) return 'IP'
    return null
  }
  return null
}

// ── Metric Computation Engine ─────────────────────────────────────
function normalizeCategory(cat, level) {
  if (!cat) return null
  const c = String(cat).trim()

  if (level === 'IP') {
    if (c === 'Technology' || c.toLowerCase() === 'technology') return 'Technology'
    if (c === 'Management' || c.toLowerCase() === 'management') return 'Management'
    if (c === 'Strategy' || c.toLowerCase() === 'strategy') return 'Strategy'
    if (c.includes('Hardware') || c.includes('Software') || c.includes('Database') || c.includes('Network') || c.includes('Security') || c.includes('Computer Systems') || c.includes('Computer Architecture')) return 'Technology'
    if (c.includes('Project Management') || c.includes('IT Service Management') || c.includes('Audit')) return 'Management'
    if (c.includes('Corporate Strategy') || c.includes('Business') || c.includes('Legal') || c.includes('Governance') || c.includes('Ethics')) return 'Strategy'
    return null
  } else if (level === 'FE Subject A') {
    if (
      c === 'Computer Systems & Architecture' ||
      c.includes('Architecture') ||
      c.includes('Computer Systems') ||
      c.includes('Memory Hierarchy') ||
      c.includes('Pipelining') ||
      c === 'Subject A'
    ) return 'Computer Systems & Architecture'

    if (
      c === 'Databases & SQL' ||
      c.includes('Databases') ||
      c.includes('Database') ||
      c.includes('SQL') ||
      c.includes('Normalization')
    ) return 'Databases & SQL'

    if (
      c === 'Networks & Security' ||
      c.includes('Networks & Security') ||
      c.includes('Network') ||
      c.includes('Protocols') ||
      c.includes('Cybersecurity') ||
      c.includes('Cryptography') ||
      (c.includes('Security') && !c.includes('Design'))
    ) return 'Networks & Security'

    if (
      c === 'IT Management & Strategy' ||
      c.includes('IT Management & Strategy') ||
      c.includes('Management & Strategy') ||
      c.includes('IT Management') ||
      c.includes('Management') ||
      c.includes('Strategy') ||
      c.includes('Governance') ||
      c.includes('Legal')
    ) return 'IT Management & Strategy'

    return null
  } else if (level === 'FE Subject B') {
    if (
      c === 'Algorithms & Programming' ||
      c === 'Algorithms & Data Structures' ||
      c.includes('Algorithms') ||
      c.includes('Programming') ||
      c.includes('Data Structure') ||
      c.includes('Pseudo') ||
      c.includes('Big-O') ||
      c === 'Subject B'
    ) return 'Algorithms & Programming'

    if (
      c === 'Security & System Design' ||
      c.includes('Security') ||
      c.includes('System Design') ||
      c.includes('Cryptography') ||
      c.includes('Network') ||
      c.includes('Architecture')
    ) return 'Security & System Design'

    return null
  }
  return null
}

// ── Metric Computation Engine ─────────────────────────────────────
function computePerformanceData(level, rawData) {
  let allowedSubjects = IP_SUBJECTS
  let targetItems = 100
  let minPassItems = 55
  let examDuration = '2h 00m'
  let passBenchmark = 55
  let trackKey = 'ip'

  if (level === 'FE Subject A') {
    allowedSubjects = FE_A_SUBJECTS
    targetItems = 60
    minPassItems = 36
    examDuration = '1h 30m'
    passBenchmark = 60
    trackKey = 'fe_a'
  } else if (level === 'FE Subject B') {
    allowedSubjects = FE_B_SUBJECTS
    targetItems = 20
    minPassItems = 12
    examDuration = '1h 40m'
    passBenchmark = 60
    trackKey = 'fe_b'
  }

  const { att = [], mcq = [], tf = [], ses = [], match = [] } = rawData

  const today = new Date()
  const week0 = new Date(today); week0.setDate(today.getDate() - 7)

  // Explicit track separation: 'IP' vs 'FE'
  const targetTrack = level.startsWith('FE') ? 'FE' : 'IP'

  // 1. Subject mapping strictly limited to active exam syllabus
  const subjectMap = {}
  allowedSubjects.forEach((s) => {
    subjectMap[s] = { correct: 0, total: 0, lastPracticed: null }
  })

  // 2. Filter mock exams strictly matching target track
  const levelAttempts = att.filter((a) => {
    const lk = (a.mock_exam_configs?.level_key || '').toLowerCase()
    const title = (a.mock_exam_configs?.title || '').toLowerCase()
    if (level === 'IP') {
      return (lk.includes('ip') || title.includes('passport')) && !lk.includes('fe')
    }
    if (level === 'FE Subject A') {
      return (lk.includes('fe_a') || lk.includes('fe a') || lk === 'fe' || title.includes('subject a')) && !lk.includes('fe_b') && !lk.includes('ip')
    }
    if (level === 'FE Subject B') {
      return (lk.includes('fe_b') || lk.includes('fe b') || title.includes('subject b')) && !lk.includes('ip')
    }
    return false
  })
  const activeAttempts = levelAttempts.length > 0 ? levelAttempts : []
  const mocksTaken = activeAttempts.length

  // 3. Four Practice Types with Confidence Scaling strictly filtered by targetTrack
  // MCQ: Weight 0.35, Target 100
  const levelMcq = mcq.filter((r) => {
    const track = getItemExamLevel(r, 'mcq')
    if (track && track !== targetTrack) return false

    // Section specific filtering for FE
    const q = r.multiple_choice_questions
    const sec = q?.fe_section || q?.practice_categories?.fe_section
    const rawCat = q?.practice_categories?.name || ''

    if (level === 'FE Subject A') {
      const isSecB = sec === 'Subject B' || String(sec || '').toLowerCase().includes('afternoon')
      if (isSecB) return false
    } else if (level === 'FE Subject B') {
      const isSecA = sec === 'Subject A' || String(sec || '').toLowerCase().includes('morning')
      if (isSecA) return false
    }

    const cat = normalizeCategory(rawCat, level)
    return cat && subjectMap[cat] !== undefined
  })

  // Tally strictly from filtered user practice answers (MCQ)
  levelMcq.forEach((r) => {
    const rawCat = r.multiple_choice_questions?.practice_categories?.name
    const cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) {
      subjectMap[cat].total++
      if (r.is_correct) subjectMap[cat].correct++
      if (r.answered_at) {
        const d = new Date(r.answered_at)
        if (!subjectMap[cat].lastPracticed || d > subjectMap[cat].lastPracticed) {
          subjectMap[cat].lastPracticed = d
        }
      }
    }
  })

  // True / False: Weight 0.20, Target 60
  const levelTf = tf.filter((r) => {
    const track = getItemExamLevel(r, 'tf')
    if (track && track !== targetTrack) return false

    // Section specific filtering for FE
    const q = r.true_false_questions
    const sec = q?.fe_section || q?.practice_categories?.fe_section
    const rawCat = q?.practice_categories?.name || ''

    if (level === 'FE Subject A') {
      const isSecB = sec === 'Subject B' || String(sec || '').toLowerCase().includes('afternoon')
      if (isSecB) return false
    } else if (level === 'FE Subject B') {
      const isSecA = sec === 'Subject A' || String(sec || '').toLowerCase().includes('morning')
      if (isSecA) return false
    }

    const cat = normalizeCategory(rawCat, level)
    return cat && subjectMap[cat] !== undefined
  })

  // Tally strictly from filtered user practice answers (TF)
  levelTf.forEach((r) => {
    const rawCat = r.true_false_questions?.practice_categories?.name
    const cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) {
      subjectMap[cat].total++
      if (r.is_correct) subjectMap[cat].correct++
      if (r.answered_at) {
        const d = new Date(r.answered_at)
        if (!subjectMap[cat].lastPracticed || d > subjectMap[cat].lastPracticed) {
          subjectMap[cat].lastPracticed = d
        }
      }
    }
  })

  // Matching: Weight 0.20, Target 40 pairs
  const levelMatch = match.filter((m) => {
    const track = getItemExamLevel(m, 'matching')
    if (track && track !== targetTrack) return false

    const title = m.set_title || ''
    if (level === 'FE Subject A') {
      if (title.includes('Subject B') || title.includes('Data Structures & Algorithms')) return false
    } else if (level === 'FE Subject B') {
      if (title.includes('Subject A') || title.includes('Memory Hierarchy') || title.includes('Pipelining') || title.includes('Databases & Normalization')) return false
    }

    const cat = normalizeCategory(title, level)
    return cat && subjectMap[cat] !== undefined
  })

  levelMatch.forEach((m) => {
    const cat = normalizeCategory(m.set_title, level)
    if (cat && subjectMap[cat] !== undefined) {
      const pairAttempts = (m.pairs_matched || 0) + (m.mistakes || 0)
      subjectMap[cat].total += pairAttempts
      subjectMap[cat].correct += (m.pairs_matched || 0)
      if (m.completed_at || m.created_at) {
        const d = new Date(m.completed_at || m.created_at)
        if (!subjectMap[cat].lastPracticed || d > subjectMap[cat].lastPracticed) {
          subjectMap[cat].lastPracticed = d
        }
      }
    }
  })

  // Flashcards: Weight 0.25, Target 80 cards
  const levelSes = ses.filter((s) => {
    const track = getItemExamLevel(s, 'flashcard')
    if (track && track !== targetTrack) return false

    const d = s.flashcard_decks
    const sec = d?.fe_section || d?.practice_categories?.fe_section
    const title = d?.title || ''

    if (level === 'FE Subject A') {
      if (sec === 'Subject B' || title.includes('Subject B') || title.includes('Algorithms, Data Structures')) return false
    } else if (level === 'FE Subject B') {
      if (sec === 'Subject A' || title.includes('Subject A') || title.includes('Architecture Review') || title.includes('Databases')) return false
    }

    return true
  })

  // Tally flashcards into subject domains
  levelSes.forEach((s) => {
    const rawCat = s.flashcard_decks?.practice_categories?.name || s.flashcard_decks?.title
    const cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) {
      const cards = s.cards_seen || (s.completed ? (s.cards_total || 10) : 0)
      if (cards > 0) {
        subjectMap[cat].total += cards
        subjectMap[cat].correct += Math.round(cards * 0.85)
        if (s.completed_at || s.started_at) {
          const d = new Date(s.completed_at || s.started_at)
          if (!subjectMap[cat].lastPracticed || d > subjectMap[cat].lastPracticed) {
            subjectMap[cat].lastPracticed = d
          }
        }
      }
    }
  })

  // Confidence-scaled domain competency score & Ebbinghaus Retention Decay
  const subjects = allowedSubjects.map((name) => {
    const s = subjectMap[name] || { correct: 0, total: 0, lastPracticed: null }
    const target = DOMAIN_TARGET_ATTEMPTS[name] || DOMAIN_TARGET_ATTEMPTS.default
    const attempts = s.total
    const correct = s.correct

    const accuracy = attempts > 0 ? (correct / attempts) : 0
    const confidence = Math.min(1, attempts / target)
    const score = accuracy * confidence
    const p = Math.round(score * 100)
    const rawAccuracyPct = Math.round(accuracy * 100)

    // Ebbinghaus Memory Retention: R = exp(-0.05 * delta_days)
    let daysSince = null
    let retentionPct = 100
    let retentionStatus = 'Unassessed'
    let retentionColor = '#94a3b8'

    if (s.lastPracticed) {
      daysSince = Math.max(0, Math.round((today - s.lastPracticed) / (1000 * 60 * 60 * 24)))
      retentionPct = Math.round(Math.exp(-0.05 * daysSince) * 100)
      if (daysSince <= 7) {
        retentionStatus = 'Fresh'
        retentionColor = '#16a34a'
      } else if (daysSince <= 14) {
        retentionStatus = 'Review Soon'
        retentionColor = '#d97706'
      } else {
        retentionStatus = 'Decayed'
        retentionColor = '#dc2626'
      }
    }

    return {
      name,
      pct: p,
      rawAccuracyPct,
      correct,
      total: attempts,
      target,
      confidence,
      color: SUBJECT_COLORS[name] || NAVY,
      isPassing: attempts >= Math.round(target * 0.4) && p >= passBenchmark,
      daysSince,
      retentionPct,
      retentionStatus,
      retentionColor,
      lastPracticed: s.lastPracticed,
    }
  })

  const mcqAttempts = levelMcq.length
  const mcqCorrect = levelMcq.filter((r) => r.is_correct).length
  const mcqAccuracy = mcqAttempts > 0 ? (mcqCorrect / mcqAttempts) : 0
  const mcqConfidence = Math.min(1, mcqAttempts / 100)
  const mcqScore = mcqAccuracy * mcqConfidence

  const matchAttempts = levelMatch.reduce((sum, m) => sum + (m.pairs_matched || m.pairs_total || 0), 0)
  const matchCorrect = levelMatch.reduce((sum, m) => sum + (m.pairs_matched || 0), 0)
  const matchMistakes = levelMatch.reduce((sum, m) => sum + (m.mistakes || 0), 0)
  const matchTrials = matchCorrect + matchMistakes
  const matchAccuracy = matchTrials > 0 ? (matchCorrect / matchTrials) : (matchAttempts > 0 ? 1 : 0)
  const matchConfidence = Math.min(1, matchAttempts / 40)
  const matchScore = matchAccuracy * matchConfidence

  const tfAttempts = levelTf.length
  const tfCorrect = levelTf.filter((r) => r.is_correct).length
  const tfAccuracy = tfAttempts > 0 ? (tfCorrect / tfAttempts) : 0
  const tfConfidence = Math.min(1, tfAttempts / 60)
  const tfScore = tfAccuracy * tfConfidence

  const fcAttempts = levelSes.reduce((sum, s) => sum + (s.cards_seen || (s.completed ? (s.cards_total || 10) : 0)), 0)
  const fcAccuracy = fcAttempts > 0 ? 1.0 : 0
  const fcConfidence = Math.min(1, fcAttempts / 80)
  const fcScore = fcAccuracy * fcConfidence

  // Weighted practice score (0..1)
  const practiceScore = (
    0.35 * mcqScore +
    0.20 * matchScore +
    0.20 * tfScore +
    0.25 * fcScore
  )

  // 4. Mock Score: Average of last 3 mock exams scaled by confidence (0..1)
  let mockScore = 0
  let avgRecentMockScore = 0
  if (mocksTaken > 0) {
    const recentMocks = activeAttempts.slice(0, 3)
    avgRecentMockScore = recentMocks.reduce((sum, a) => sum + pct(a.correct_count, a.total_questions), 0) / recentMocks.length
    const mockConfidence = Math.min(1, mocksTaken / 3)
    mockScore = (avgRecentMockScore / 100) * mockConfidence
  }

  // 5. Combined Exam Readiness (0..100)
  const readiness = Math.round((0.40 * practiceScore + 0.60 * mockScore) * 100)

  // 6. Activity counts & Low-data state determination
  const totalPracticeAttempts = mcqAttempts + matchAttempts + tfAttempts + fcAttempts
  const isLowData = totalPracticeAttempts < 20 && mocksTaken === 0
  const hasActivity = totalPracticeAttempts > 0 || mocksTaken > 0

  const quizTaken = mcqAttempts + tfAttempts
  const mockCount = mocksTaken

  // Comprehensive Study Time Estimation: Flashcards, Mocks, Matching, plus MCQ & TF (est. 45s per answered question)
  const mcqMins = Math.round((levelMcq.length * 45) / 60)
  const tfMins = Math.round((levelTf.length * 40) / 60)
  const matchMins = Math.round(levelMatch.reduce((sum, m) => sum + (m.duration_seconds || 45), 0) / 60)
  const flashcardMins = Math.round(levelSes.reduce((s, s2) => s + (s2.duration_seconds ?? 0), 0) / 60)
  const mockMins = Math.round(activeAttempts.reduce((s, a) => s + (a.duration_seconds ?? 0), 0) / 60)
  const studyMins = flashcardMins + mockMins + matchMins + mcqMins + tfMins

  // 7. Weekly trends
  const weeks = [4, 3, 2, 1].map((w) => {
    const from = new Date(today); from.setDate(today.getDate() - w * 7)
    const to = new Date(today); to.setDate(today.getDate() - (w - 1) * 7)
    const wAtt = activeAttempts.filter((a) => {
      const d = new Date(a.completed_at)
      return d >= from && d < to
    })
    const wMcq = mcq.filter((m) => {
      let cat = normalizeCategory(m.multiple_choice_questions?.practice_categories?.name, level)
      if (!cat || subjectMap[cat] === undefined) return false
      const d = new Date(m.answered_at)
      return d >= from && d < to
    })
    const wTf = tf.filter((t) => {
      let cat = normalizeCategory(t.true_false_questions?.practice_categories?.name, level)
      if (!cat || subjectMap[cat] === undefined) return false
      const d = new Date(t.answered_at)
      return d >= from && d < to
    })
    const wQuizzes = [...wMcq, ...wTf]
    return {
      label: `W${5 - w}`,
      mock: wAtt.length > 0 ? Math.round(wAtt.reduce((s, a) => s + pct(a.correct_count, a.total_questions), 0) / wAtt.length) : 0,
      quiz: wQuizzes.length > 0 ? Math.round(wQuizzes.reduce((s, q) => s + (q.is_correct ? 100 : 0), 0) / wQuizzes.length) : 0,
    }
  })

  // 8. Quiz & Exam Breakdown Summary
  const summary = [
    ...activeAttempts.slice(0, 3).map((a) => ({
      label: a.mock_exam_configs?.title ?? `${level} Mock Exam`,
      pct: pct(a.correct_count, a.total_questions),
      sub: `${a.correct_count}/${a.total_questions} items (${pct(a.correct_count, a.total_questions)}%)`,
    })),
    ...(mcqAttempts > 0 ? [{
      label: `Multiple Choice (${level})`,
      pct: pct(mcqCorrect, mcqAttempts),
      sub: `${mcqAttempts}/100 target attempts • ${Math.round(mcqConfidence * 100)}% confidence`,
    }] : []),
    ...(tfAttempts > 0 ? [{
      label: `True or False (${level})`,
      pct: pct(tfCorrect, tfAttempts),
      sub: `${tfAttempts}/60 target attempts • ${Math.round(tfConfidence * 100)}% confidence`,
    }] : []),
    ...(matchAttempts > 0 ? [{
      label: 'Matching Pairs',
      pct: Math.round(matchAccuracy * 100),
      sub: `${matchAttempts}/40 target pairs • ${Math.round(matchConfidence * 100)}% confidence`,
    }] : []),
    ...(fcAttempts > 0 ? [{
      label: 'Flashcards Reviewed',
      pct: Math.min(Math.round((fcAttempts / 80) * 100), 100),
      sub: `${fcAttempts}/80 target cards • ${Math.round(fcConfidence * 100)}% confidence`,
    }] : []),
  ].slice(0, 6)

  // 9. Chronological Mock History & Trajectory Projection
  const chronologicalMocks = [...activeAttempts].reverse().map((a, i) => ({
    label: `M${i + 1}`,
    title: a.mock_exam_configs?.title || `${level} Mock #${i + 1}`,
    pct: pct(a.correct_count, a.total_questions),
    correct: a.correct_count,
    total: a.total_questions,
    completed_at: a.completed_at,
    isPassed: pct(a.correct_count, a.total_questions) >= passBenchmark,
  }))

  let projectedScore = readiness
  let ciMargin = 8
  let trendSlope = 0

  if (chronologicalMocks.length >= 2) {
    const n = chronologicalMocks.length
    const xVals = chronologicalMocks.map((_, i) => i)
    const yVals = chronologicalMocks.map((m) => m.pct)
    const meanX = (n - 1) / 2
    const meanY = yVals.reduce((a, b) => a + b, 0) / n

    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
      num += (xVals[i] - meanX) * (yVals[i] - meanY)
      den += Math.pow(xVals[i] - meanX, 2)
    }
    trendSlope = den > 0 ? num / den : 0
    const intercept = meanY - trendSlope * meanX

    const rawProj = intercept + trendSlope * n
    projectedScore = Math.min(Math.max(Math.round(rawProj), 15), 98)

    const residuals = yVals.map((y, i) => y - (intercept + trendSlope * xVals[i]))
    const variance = residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, n - 2)
    const stdErr = Math.sqrt(Math.max(variance, 4))
    ciMargin = Math.round(1.96 * stdErr)
    ciMargin = Math.max(4, Math.min(ciMargin, 16))
  } else if (chronologicalMocks.length === 1) {
    projectedScore = Math.round(0.4 * (practiceScore * 100) + 0.6 * chronologicalMocks[0].pct)
    ciMargin = 10
  } else {
    projectedScore = readiness > 0 ? Math.round(readiness * 1.05) : 0
    ciMargin = 12
  }

  const confidenceInterval = [
    Math.max(0, projectedScore - ciMargin),
    Math.min(100, projectedScore + ciMargin),
  ]

  // Pass probability based on readiness & projected score
  const passProbability = hasActivity && !isLowData && projectedScore > 0
    ? Math.min(Math.max(Math.round(((projectedScore - passBenchmark + 20) / 40) * 100), 5), 98)
    : 0

  // 10. Weakest subject for Prescriptive
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.total === 0 && b.total > 0) return 1
    if (b.total === 0 && a.total > 0) return -1
    return a.pct - b.pct
  })
  const weakestSubject = sortedSubjects[0] || subjects[0]

  // Prescriptive study strategy & pace profiles (Detailed, Standard, Quick)
  const recommendedPace = readiness < 50 ? 'Detailed' : readiness < 80 ? 'Standard' : 'Quick'
  const activePace = rawData?.userReviewSpeed || recommendedPace
  const currentPaceConfig = STUDY_PACE_PROFILES[activePace] || STUDY_PACE_PROFILES.Standard
  const dailyQuestionTarget = currentPaceConfig.dailyTarget
  const dailyGoalMins = currentPaceConfig.dailyGoalMins
  const studyPace = currentPaceConfig.name
  const decayedSubjects = subjects.filter((s) => s.retentionStatus === 'Decayed' || s.retentionStatus === 'Review Soon')

  // 11. Mock readiness history (most recent first)
  const mockReadiness = activeAttempts.slice(0, 5).map((a, i) => ({
    label: a.mock_exam_configs?.title || `${level} Mock Exam #${i + 1}`,
    pct: pct(a.correct_count, a.total_questions),
    correct: a.correct_count,
    total: a.total_questions,
    isPassed: pct(a.correct_count, a.total_questions) >= passBenchmark,
  }))

  // 12. Prescriptive study streak & time
  // Activity streak strictly tracks unique days the user practiced (flashcards, MCQ, TF, and mock attempts)
  const activityDays = new Set([
    ...ses.map((s) => (s.completed_at || s.started_at)?.slice(0, 10)),
    ...mcq.map((r) => r.answered_at?.slice(0, 10)),
    ...tf.map((r) => r.answered_at?.slice(0, 10)),
    ...(att || []).map((m) => (m.completed_at || m.started_at)?.slice(0, 10)),
  ].filter(Boolean))

  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (activityDays.has(key)) streak++
    else if (i > 0) break
  }

  const todayKey = today.toISOString().slice(0, 10)
  // Comprehensive Today's Study Time (Flashcards, Mocks, and 45s/question for MCQ & TF)
  const sesTodaySec = ses.filter((s) => (s.completed_at || s.started_at)?.slice(0, 10) === todayKey)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0)
  const attTodaySec = activeAttempts.filter((a) => (a.completed_at || a.started_at)?.slice(0, 10) === todayKey)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0)
  const mcqTodaySec = mcq.filter((r) => r.answered_at?.slice(0, 10) === todayKey).length * 45
  const tfTodaySec = tf.filter((r) => r.answered_at?.slice(0, 10) === todayKey).length * 40
  const todayMins = Math.round((sesTodaySec + attTodaySec + mcqTodaySec + tfTodaySec) / 60)

  // Comprehensive This Week Total Study Time
  const sesWeekSec = ses.filter((s) => new Date(s.completed_at || s.started_at || 0) >= week0)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0)
  const attWeekSec = activeAttempts.filter((a) => new Date(a.completed_at || a.started_at || 0) >= week0)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0)
  const mcqWeekSec = mcq.filter((r) => new Date(r.answered_at || 0) >= week0).length * 45
  const tfWeekSec = tf.filter((r) => new Date(r.answered_at || 0) >= week0).length * 40
  const weekMins = Math.round((sesWeekSec + attWeekSec + mcqWeekSec + tfWeekSec) / 60)

  // Daily Average based on active study days
  const dailyAvg = activityDays.size > 0 ? Math.round(studyMins / activityDays.size) : todayMins

  return {
    level,
    trackKey,
    hasActivity,
    isLowData,
    totalPracticeAttempts,
    practiceScore,
    mockScore,
    targetItems,
    minPassItems,
    examDuration,
    passBenchmark,
    readiness,
    readinessLabel: readinessLabel(readiness, passBenchmark, hasActivity, isLowData),
    quizTaken,
    mockCount,
    studyMins,
    subjects,
    weeks,
    summary,
    passProbability,
    projectedScore,
    confidenceInterval,
    chronologicalMocks,
    dailyQuestionTarget,
    studyPace,
    recommendedPace,
    activePace,
    currentPaceConfig,
    paceProfiles: STUDY_PACE_PROFILES,
    decayedSubjects,
    mockReadiness,
    weakestSubject,
    streak,
    todayMins,
    weekMins,
    dailyAvg,
    dailyGoalMins,
    goalPct: Math.min(Math.round((todayMins / dailyGoalMins) * 100), 100),
    today: today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Performance({ navigation }) {
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userTargetExam, setUserTargetExam] = useState('IP')
  const insets = useSafeAreaInsets()
  const [examLevel, setExamLevel] = useState('IP')
  const [data, setData] = useState(null)
  const [selectedPace, setSelectedPace] = useState(null)
  const [paceSavedNotice, setPaceSavedNotice] = useState(false)

  // Immediately resolve user target exam from persistent cache & SQLite session on mount
  useEffect(() => {
    resolveUserTargetExam(null, userTargetExam).then((trk) => {
      if (trk && trk !== userTargetExam) {
        setUserTargetExam(trk)
        if (trk === 'FE' && examLevel === 'IP') setExamLevel('FE Subject A')
      }
    })
  }, [])

  const rawDataRef = useRef({
    uid: null,
    email: null,
    userReviewSpeed: null,
    att: [],
    mcq: [],
    tf: [],
    ses: [],
    match: [],
    diag: null,
  })

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAll()
    })
    return unsubscribe
  }, [navigation])

  // ── Resilient Parallel Data fetching ─────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      const userEmail = session?.user?.email
      if (!uid) { setError('Not logged in.'); return }

      // Parallelize all queries concurrently with timeouts so no single request blocks
      const [
        uRes,
        pRes,
        attRes,
        mcqRes,
        tfRes,
        sesRes,
        matchRes
      ] = await Promise.allSettled([
        userEmail
          ? withTimeout(supabase.from('users').select('review_speed').ilike('email', userEmail).maybeSingle(), 8000)
          : Promise.resolve({ data: null }),
        resolveUserTargetExam(uid, userTargetExam),
        withTimeout(supabase.from('mock_exam_attempts').select('id, score, total_questions, correct_count, duration_seconds, completed_at, config_id, mock_exam_configs(title, level_key)').eq('user_id', uid).eq('status', 'completed').order('completed_at', { ascending: false }).limit(20), 8000),
        withTimeout(supabase.from('multiple_choice_results').select(`
          is_correct,
          answered_at,
          question_id,
          multiple_choice_questions (
            category_id,
            exam_level,
            fe_section,
            practice_categories (
              name,
              exam_level,
              fe_section
            )
          )
        `).eq('user_id', uid), 8000),
        withTimeout(supabase.from('true_false_results').select(`
          is_correct,
          answered_at,
          question_id,
          true_false_questions (
            category_id,
            exam_level,
            fe_section,
            practice_categories (
              name,
              exam_level,
              fe_section
            )
          )
        `).eq('user_id', uid), 8000),
        withTimeout(supabase.from('flashcard_sessions').select(`
          cards_total,
          cards_seen,
          duration_seconds,
          started_at,
          completed_at,
          completed,
          deck_id,
          flashcard_decks (
            exam_level,
            fe_section,
            practice_categories (
              name,
              exam_level,
              fe_section
            )
          )
        `).eq('user_id', uid), 8000),
        withTimeout(supabase.from('matching_results').select('set_title, pairs_total, pairs_matched, mistakes, completed, duration_seconds').eq('user_id', uid), 8000)
      ])

      // 0. Extract review speed
      let userReviewSpeed = null
      if (uRes.status === 'fulfilled' && uRes.value?.data?.review_speed) {
        const s = String(uRes.value.data.review_speed).trim().toLowerCase()
        if (s.startsWith('det')) userReviewSpeed = 'Detailed'
        else if (s.startsWith('qui')) userReviewSpeed = 'Quick'
        else if (s.startsWith('stan')) userReviewSpeed = 'Standard'
      }

      // 1. Extract target exam level strictly via unified resolver
      const targetType = (pRes.status === 'fulfilled' && pRes.value) ? pRes.value : userTargetExam
      const currentLevel = targetType === 'FE'
        ? (examLevel.includes('FE') ? examLevel : 'FE Subject A')
        : 'IP'
      setUserTargetExam(targetType)
      setExamLevel(currentLevel)

      // 2. Extract practice results safely
      const attempts = (attRes.status === 'fulfilled' && attRes.value?.data) ? attRes.value.data : []
      const mcqRaw = (mcqRes.status === 'fulfilled' && mcqRes.value?.data) ? mcqRes.value.data : []
      const tfRaw = (tfRes.status === 'fulfilled' && tfRes.value?.data) ? tfRes.value.data : []
      const sessions = (sesRes.status === 'fulfilled' && sesRes.value?.data) ? sesRes.value.data : []
      const matchRaw = (matchRes.status === 'fulfilled' && matchRes.value?.data) ? matchRes.value.data : []

      // Cache raw data in ref for instant level toggling
      rawDataRef.current = {
        uid,
        email: userEmail,
        userReviewSpeed,
        att: attempts,
        mcq: mcqRaw,
        tf: tfRaw,
        ses: sessions,
        match: matchRaw,
      }

      // Compute metrics tailored to user's exam track
      const computed = computePerformanceData(currentLevel, rawDataRef.current)
      setData(computed)

      // Sync readiness and streak to home cache
      if (computed) {
        setCache('home_readiness', computed.readiness).catch(() => {})
        setCache('home_streak_days', computed.streak).catch(() => {})
      }

      // Automatically cache calibrated adaptive pace if review speed is not set yet
      if (computed?.recommendedPace) {
        const calibratedPace = computed.recommendedPace
        if (!userReviewSpeed) {
          setCache('user_review_speed', calibratedPace).catch(() => {})
          if (rawDataRef.current) {
            rawDataRef.current.userReviewSpeed = calibratedPace
          }
        }
      }
    } catch (err) {
      console.error('Performance fetch error:', err)
      setError('Failed to load performance data.')
    } finally {
      setLoading(false)
    }
  }

  // ── Optimistic Study Pace selection handler ─────────────────────────────
  const handlePaceSelect = async (paceKey) => {
    setSelectedPace(paceKey)
    setPaceSavedNotice(true)
    setTimeout(() => setPaceSavedNotice(false), 3000)

    // Optimistically update local view immediately with zero lag
    if (rawDataRef.current) {
      rawDataRef.current.userReviewSpeed = paceKey
    }
    if (data) {
      const updated = computePerformanceData(examLevel, {
        ...rawDataRef.current,
        userReviewSpeed: paceKey,
      })
      setData(updated)
    }

    // Persist to local cache and database in background
    try {
      await setCache('user_review_speed', paceKey)
      const email = rawDataRef.current?.email
      if (email) {
        withTimeout(
          supabase.from('users').update({ review_speed: paceKey }).ilike('email', email),
          5000
        ).catch((err) => {
          console.warn('Review speed update background sync notice:', err?.message || err)
        })
      }
    } catch (err) {
      console.warn('Background pace update notice:', err)
    }
  }

  // ── Switch exam paper on-demand (only between papers for user's target exam) ──
  const handleTrackSwitch = (newLevel) => {
    if (newLevel === examLevel) return
    setExamLevel(newLevel)

    // Instantly recompute metrics for selected paper
    if (rawDataRef.current) {
      const computed = computePerformanceData(newLevel, {
        ...rawDataRef.current,
        userReviewSpeed: selectedPace || rawDataRef.current.userReviewSpeed,
      })
      setData(computed)
      if (computed) {
        setCache('home_readiness', computed.readiness).catch(() => {})
        setCache('home_streak_days', computed.streak).catch(() => {})
      }
    }
  }

  // ── Skeleton Loader ──────────────────────────────────────────
  const SkeletonContent = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { gap: 16, paddingBottom: getScrollBottomPadding(insets, true, 20) }]} showsVerticalScrollIndicator={false}>
      {/* Readiness / Top Metric Card Skeleton */}
      <View style={styles.readinessCard}>
        <SkeletonItem width={160} height={18} style={{ marginBottom: 8 }} />
        <SkeletonItem width={120} height={12} style={{ marginBottom: 14 }} />
        <SkeletonItem width={100} height={46} borderRadius={8} style={{ marginBottom: 8 }} />
        <SkeletonItem width={140} height={14} style={{ marginBottom: 6 }} />
        <SkeletonItem width={180} height={12} />
      </View>

      {/* Stats Row Skeleton */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.statItem}>
            <SkeletonItem width={38} height={18} style={{ marginBottom: 6 }} />
            <SkeletonItem width={56} height={11} />
          </View>
        ))}
      </View>

      {/* Performance by Subject Skeleton */}
      <View style={styles.section}>
        <SkeletonItem width={160} height={16} style={{ marginBottom: 10 }} />
        <View style={[styles.sectionCard, { gap: 14 }]}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.subjectRow}>
              <SkeletonItem width={120} height={13} style={{ marginBottom: 8 }} />
              <SkeletonItem width="100%" height={7} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* Weekly Trends Skeleton */}
      <View style={styles.section}>
        <SkeletonItem width={130} height={16} style={{ marginBottom: 10 }} />
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <SkeletonItem width={90} height={13} />
            <SkeletonItem width={110} height={13} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80, marginBottom: 8 }}>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={{ alignItems: 'center', gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <SkeletonItem width={14} height={28 + i * 12} borderRadius={4} />
                  <SkeletonItem width={14} height={18 + i * 14} borderRadius={4} />
                </View>
                <SkeletonItem width={22} height={12} />
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={{ height: 24 }} />
    </ScrollView>
  )

  // ── Tab 0: Overview ──────────────────────────────────────────
  const Overview = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets, true, 20) }]} showsVerticalScrollIndicator={false}>
      {/* Readiness card */}
      <View style={styles.readinessCard}>
        <View style={styles.trackBadge}>
          <Ionicons name="ribbon" size={13} color="#2563eb" />
          <Text style={styles.trackBadgeText}>
            {data.targetItems} Items • {data.examDuration}
          </Text>
        </View>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction Score</Text>
        <Text style={styles.readinessCardDate}>Updated: {data.today}</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.readiness, data.passBenchmark, data.hasActivity, data.isLowData) }]}>{data.readiness}%</Text>
        <Text style={[styles.readinessLabel, { color: readinessColor(data.readiness, data.passBenchmark, data.hasActivity, data.isLowData) }]}>{data.readinessLabel}</Text>
        <Text style={styles.readinessNote}>
          {data.isLowData
            ? `Baseline building: ${data.totalPracticeAttempts}/20 practice attempts completed. Answer 20 questions or take 1 mock exam for confident readiness scoring.`
            : data.hasActivity
              ? `Practice score: ${Math.round(data.practiceScore * 100)}% (40% weight) • Mock score: ${Math.round(data.mockScore * 100)}% (60% weight)`
              : `No mock exams or practice activity answered yet`}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { value: data.quizTaken, label: 'Quiz Taken' },
          { value: data.mockCount, label: 'Mock Exams' },
          { value: fmtMins(data.studyMins), label: 'Study Time' },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Domain Mastery Radar Chart (Visual Multi-Axis Polygon) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Domain Mastery Radar</Text>
          <Text style={styles.sectionSubBadge}>{data.level}</Text>
        </View>
        <View style={styles.sectionCard}>
          <DomainRadarChart subjects={data.subjects} benchmark={data.passBenchmark} />
        </View>
      </View>

      {/* Performance by Subject strictly tailored */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Performance by Domains</Text>
          <Text style={styles.sectionSubBadge}>{data.level}</Text>
        </View>
        <View style={styles.sectionCard}>
          {data.subjects.map((sub) => {
            const isLowAttempts = sub.total > 0 && sub.total < Math.round(sub.target * 0.35)
            return (
              <View key={sub.name} style={styles.subjectRow}>
                <View style={styles.subjectLabelRow}>
                  <Text style={styles.subjectName}>{sub.name}</Text>
                  <Text style={[styles.subjectPct, { color: sub.total > 0 ? readinessColor(sub.pct, data.passBenchmark, data.hasActivity, isLowAttempts) : '#94a3b8' }]}>
                    {sub.total > 0 ? `${sub.pct}%` : '0%'}
                  </Text>
                </View>
                <ProgressBar value={sub.pct} color={sub.color} />
                <View style={styles.domainMetaRow}>
                  <Text style={styles.subjectHint}>
                    {sub.total === 0 ? (
                      'No practice answered yet'
                    ) : sub.total < sub.target ? (
                      `${sub.total}/${sub.target} target • ${sub.rawAccuracyPct}% acc`
                    ) : (
                      `Target met (${sub.total}) • ${sub.rawAccuracyPct}% acc`
                    )}
                  </Text>
                  {sub.retentionStatus !== 'Unassessed' && (
                    <View style={[styles.retentionPill, { backgroundColor: sub.retentionColor + '18', borderColor: sub.retentionColor }]}>
                      <View style={[styles.retentionDot, { backgroundColor: sub.retentionColor }]} />
                      <Text style={[styles.retentionText, { color: sub.retentionColor }]}>
                        {sub.retentionStatus} ({sub.retentionPct}%)
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* Progress Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Trend</Text>
        <View style={styles.sectionCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendSubtitle}>Weekly Score Trend ({data.level})</Text>
            <View style={styles.trendLegend}>
              <View style={[styles.legendDot, { backgroundColor: '#3B5BA5' }]} />
              <Text style={styles.legendText}>Quiz</Text>
              <View style={[styles.legendDot, { backgroundColor: '#9B2335' }]} />
              <Text style={styles.legendText}>Mock</Text>
            </View>
          </View>
          <View style={styles.barChart}>
            {data.weeks.map((w) => (
              <View key={w.label} style={styles.barGroup}>
                <View style={styles.barPair}>
                  <View style={[styles.bar, { height: w.quiz > 0 ? Math.max((w.quiz / 100) * 70, 6) : 2, backgroundColor: w.quiz > 0 ? '#3B5BA5' : '#e2e8f0' }]} />
                  <View style={[styles.bar, { height: w.mock > 0 ? Math.max((w.mock / 100) * 70, 6) : 2, backgroundColor: w.mock > 0 ? '#9B2335' : '#e2e8f0' }]} />
                </View>
                <Text style={styles.barLabel}>{w.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.trendNote}>
            {data.hasActivity
              ? `Evaluated against ${data.level} PhilNITS/ITPEC syllabus requirements`
              : `No weekly exam or quiz activity recorded yet`}
          </Text>
        </View>
      </View>

      {/* Quiz & Exam Summary */}
      {data.summary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz & Exam Summary</Text>
          <View style={styles.sectionCard}>
            {data.summary.map((s) => (
              <View key={s.label} style={styles.summaryRow}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.summaryLabel}>{s.label}</Text>
                  {s.sub ? <Text style={styles.summarySub}>{s.sub}</Text> : null}
                </View>
                <Text style={[styles.summaryPct, { color: readinessColor(s.pct, data.passBenchmark) }]}>{s.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  // ── Tab 1: Predictive ────────────────────────────────────────
  const Predictive = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets, true, 20) }]} showsVerticalScrollIndicator={false}>
      {/* Prediction card */}
      <View style={styles.readinessCard}>
        <View style={styles.trackBadge}>
          <Ionicons name="sparkles" size={13} color="#2563eb" />
          <Text style={styles.trackBadgeText}>Predictive Preparedness</Text>
        </View>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.passProbability, data.passBenchmark, data.hasActivity, data.isLowData) }]}>
          {data.isLowData ? '—' : `${data.passProbability}%`}
        </Text>
        <Text style={styles.readinessLabel}>
          {data.isLowData ? 'Building Baseline' : data.hasActivity ? 'Estimated Preparedness' : 'No Activity Yet'}
        </Text>
        <Text style={styles.readinessNote}>
          {data.isLowData
            ? `Confidence building (${data.totalPracticeAttempts}/20 items completed)`
            : data.hasActivity
              ? `${data.level} (${data.targetItems} Items • Benchmark: ${data.passBenchmark}%)`
              : `No activity recorded yet • Benchmark: ${data.passBenchmark}%`}
        </Text>
      </View>

      {/* Trajectory Forecast Chart (Linear Regression & 95% Confidence Band) */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Exam Trajectory & Forecast</Text>
          <Text style={styles.sectionSubBadge}>Projection</Text>
        </View>
        <View style={styles.sectionCard}>
          <TrajectoryForecastChart
            mockHistory={data.chronologicalMocks}
            projectedScore={data.projectedScore}
            benchmark={data.passBenchmark}
            confidenceInterval={data.confidenceInterval}
          />
          <View style={styles.trajectoryStatsGrid}>
            <View style={styles.trajectoryStatBox}>
              <Text style={styles.trajectoryStatLabel}>Projected Score</Text>
              <Text style={[styles.trajectoryStatVal, { color: data.projectedScore >= data.passBenchmark ? '#16a34a' : '#2563eb' }]}>
                {data.projectedScore}%
              </Text>
              <Text style={styles.trajectoryStatSub}>
                95% CI: {data.confidenceInterval[0]}% - {data.confidenceInterval[1]}%
              </Text>
            </View>
            <View style={styles.trajectoryStatBox}>
              <Text style={styles.trajectoryStatLabel}>Pass Probability</Text>
              <Text style={[styles.trajectoryStatVal, { color: data.passProbability >= 60 ? '#16a34a' : '#d97706' }]}>
                {data.passProbability}%
              </Text>
              <Text style={styles.trajectoryStatSub}>
                {data.projectedScore >= data.passBenchmark
                  ? 'Meets Standard'
                  : `Gap: +${data.passBenchmark - data.projectedScore}% needed`}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Official PhilNITS Passing Benchmark Card */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PhilNITS Certification Benchmark</Text>
        <View style={styles.sectionCard}>
          <View style={styles.benchmarkHeaderRow}>
            <MaterialCommunityIcons name="certificate" size={24} color={NAVY} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.benchmarkTitle}>PhilNITS / ITPEC Passing Standard</Text>
              <Text style={styles.benchmarkSubtitle}>Practice Readiness Benchmark: {data.passBenchmark}.00% (Scaled Equivalent: 600/1000)</Text>
            </View>
          </View>

          <View style={styles.benchmarkDetailsGrid}>
            <View style={styles.benchmarkDetailItem}>
              <Text style={styles.benchmarkDetailVal}>{data.minPassItems} / {data.targetItems}</Text>
              <Text style={styles.benchmarkDetailLabel}>Target Correct Items</Text>
            </View>
            <View style={styles.benchmarkDetailItem}>
              <Text style={styles.benchmarkDetailVal}>{data.examDuration}</Text>
              <Text style={styles.benchmarkDetailLabel}>Exam Duration</Text>
            </View>
          </View>

          <View style={[styles.benchmarkStatusBox, {
            backgroundColor: !data.hasActivity ? '#f8fafc' : data.isLowData ? '#f1f5f9' : (data.passProbability >= data.passBenchmark ? '#ecfdf5' : '#fefce8'),
            borderColor: !data.hasActivity ? '#e2e8f0' : data.isLowData ? '#cbd5e1' : (data.passProbability >= data.passBenchmark ? '#a7f3d0' : '#fef08a')
          }]}>
            <Ionicons
              name={!data.hasActivity ? 'information-circle-outline' : data.isLowData ? 'timer-outline' : (data.passProbability >= data.passBenchmark ? 'checkmark-circle' : 'alert-circle')}
              size={18}
              color={!data.hasActivity ? '#64748b' : data.isLowData ? '#475569' : (data.passProbability >= data.passBenchmark ? '#059669' : '#d97706')}
            />
            <Text style={[styles.benchmarkStatusText, {
              color: !data.hasActivity ? '#64748b' : data.isLowData ? '#334155' : (data.passProbability >= data.passBenchmark ? '#065f46' : '#92400e')
            }]}>
              {data.isLowData
                ? `Building readiness baseline (${data.totalPracticeAttempts}/20 practice attempts). Complete at least 20 questions or 1 mock exam to calculate a reliable pass probability.`
                : data.hasActivity
                  ? (data.passProbability >= data.passBenchmark
                      ? `You meet the ${data.passBenchmark}% practice readiness target for ${data.level}!`
                      : `Score gap: +${data.passBenchmark - data.passProbability}% required to reach the ${data.passBenchmark}% practice benchmark.`)
                  : `No activity recorded yet for ${data.level}. Complete mock exams or quizzes to calculate your pass probability.`}
            </Text>
          </View>
        </View>
      </View>

      {/* Tested Domain Competency Matrix */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domain Readiness Checklist</Text>
        <View style={styles.sectionCard}>
          {data.subjects.map((sub) => {
            const isLowAttempts = sub.total > 0 && sub.total < Math.round(sub.target * 0.4)
            return (
              <View key={sub.name} style={styles.checklistRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checklistName}>{sub.name}</Text>
                  <Text style={styles.checklistScore}>
                    {sub.total === 0
                      ? 'No attempts yet'
                      : isLowAttempts
                      ? `Building baseline • ${sub.total}/${sub.target} target attempts (${sub.pct}% readiness)`
                      : `${sub.pct}% domain readiness • ${sub.total}/${sub.target} target attempts`}
                  </Text>
                </View>
                <View style={[styles.checklistBadge, {
                  backgroundColor: sub.total === 0
                    ? '#f1f5f9'
                    : isLowAttempts
                    ? '#fef3c7'
                    : (sub.isPassing ? '#dcfce7' : '#fee2e2')
                }]}>
                  <Text style={[styles.checklistBadgeText, {
                    color: sub.total === 0
                      ? '#64748b'
                      : isLowAttempts
                      ? '#d97706'
                      : (sub.isPassing ? '#15803d' : '#b91c1c')
                  }]}>
                    {sub.total === 0
                      ? 'Pending'
                      : isLowAttempts
                      ? 'Low Data'
                      : (sub.isPassing ? `Ready (≥${data.passBenchmark}%)` : 'Needs Practice')}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>

      {/* Mock Exam Readiness */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mock Exam Attempts ({data.level})</Text>
        <View style={styles.sectionCard}>
          {data.mockReadiness.length > 0 ? (
            data.mockReadiness.map((m) => (
              <View key={m.label} style={styles.summaryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.summaryLabel}>{m.label}</Text>
                  <Text style={styles.summarySub}>
                    {m.correct}/{m.total} items • {m.isPassed ? `Benchmark Met (≥${data.passBenchmark}%)` : `Below ${data.passBenchmark}%`}
                  </Text>
                </View>
                <Text style={[styles.summaryPct, { color: readinessColor(m.pct, data.passBenchmark) }]}>{m.pct}%</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyMockBox}>
              <MaterialCommunityIcons name="clipboard-text-search-outline" size={38} color="#94a3b8" />
              <Text style={styles.emptyCard}>
                No completed {data.level} mock exams yet.
              </Text>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation?.navigate('MockExamTake', { trackKey: data.trackKey })}
              >
                <Text style={styles.actionBtnText}>Take {data.level} Mock Exam</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  // ── Tab 2: Prescriptive ──────────────────────────────────────
  const Prescriptive = () => {
    // Dynamic pace profile directly driven by user exam readiness (<50%: Detailed, 50-79%: Standard, >=80%: Quick)
    const activePaceKey = data.recommendedPace || 'Standard'
    const activeProfile = data.paceProfiles?.[activePaceKey] || STUDY_PACE_PROFILES[activePaceKey] || STUDY_PACE_PROFILES.Standard
    const goalMins = activeProfile.dailyGoalMins || data.dailyGoalMins || 30
    const currentGoalPct = Math.min(Math.round((data.todayMins / goalMins) * 100), 100)
    const isSavedActive = (selectedPace || rawDataRef.current?.userReviewSpeed) === activePaceKey

    return (
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets, true, 20) }]} showsVerticalScrollIndicator={false}>
        {/* Streak card */}
        <View style={styles.readinessCard}>
          <Text style={styles.readinessCardTitle}>Study Streak</Text>
          <Text style={[styles.readinessPct, { color: '#2563eb' }]}>{data.streak} day{data.streak === 1 ? '' : 's'}</Text>
          <Text style={styles.readinessLabel}>Keep up the momentum!</Text>
          <Text style={styles.readinessNote}>Based on your active study days for {data.level}</Text>
        </View>

        {/* Level-Specific Prescriptive Recommendation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority Review Domain for {data.level}</Text>
          <View style={styles.prescriptiveCard}>
            <View style={styles.prescriptiveHeaderRow}>
              <View style={styles.prescriptiveIconWrap}>
                <Ionicons name="compass" size={20} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.prescriptiveCategory}>PRIORITY REVIEW DOMAIN</Text>
                <Text style={styles.prescriptiveSubject}>{data.weakestSubject?.name}</Text>
              </View>
              <View style={styles.prescriptiveScorePill}>
                <Text style={styles.prescriptiveScoreText}>{data.weakestSubject?.pct}%</Text>
              </View>
            </View>

            {/* Prescriptive Pace & Daily Targets */}
            <View style={styles.paceRow}>
              <View style={styles.paceItem}>
                <Text style={styles.paceLabel}>STUDY PACE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: activeProfile.color }} />
                  <Text style={[styles.paceValue, { color: activeProfile.color }]}>{activeProfile.name}</Text>
                </View>
              </View>
              <View style={[styles.paceItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
                <Text style={styles.paceLabel}>DAILY TARGET</Text>
                <Text style={styles.paceValue}>{activeProfile.dailyTarget} items/day</Text>
              </View>
              <View style={[styles.paceItem, { borderLeftWidth: 1, borderLeftColor: '#e2e8f0' }]}>
                <Text style={styles.paceLabel}>EST. TIME</Text>
                <Text style={styles.paceValue}>{activeProfile.dailyGoalMins} mins</Text>
              </View>
            </View>

            <Text style={styles.prescriptiveAdvice}>
              {data.hasActivity
                ? getSubjectTip(data.weakestSubject?.name)
                : `No activity recorded yet for ${data.level}. Start answering practice questions or take a mock exam to receive personalized study recommendations.`}
            </Text>

            {/* Memory Decay Warning if any domain has elapsed > 7 days */}
            {data.decayedSubjects && data.decayedSubjects.length > 0 && (
              <View style={styles.decayAlertBox}>
                <View style={styles.decayAlertTitleRow}>
                  <Ionicons name="warning-outline" size={16} color="#d97706" />
                  <Text style={styles.decayAlertTitle}>Memory Retention Alert (Ebbinghaus)</Text>
                </View>
                <Text style={styles.decayAlertText}>
                  {data.decayedSubjects.map(s => `${s.name} (${s.daysSince}d ago - ${s.retentionPct}% retained)`).join(', ')}. Review these domains soon to prevent retention loss.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.practiceFocusBtn}
              onPress={() => navigation?.navigate('PracticeLibrary')}
            >
              <Feather name="play-circle" size={16} color="#fff" />
              <Text style={styles.practiceFocusBtnText}>Practice {data.weakestSubject?.name}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Adaptive Study Pace Section (Calibrated strictly to User Readiness) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Adaptive Study Strategy</Text>
              <Text style={styles.sectionSubtitle}>
                Calibrated to your {data.readiness}% {data.level} readiness
              </Text>
            </View>
          </View>

          {/* Calibrated Pace Details Card */}
          <View style={[styles.paceDetailCard, { borderColor: activeProfile.border }]}>
            <View style={styles.paceDetailHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <Text style={[styles.paceDetailTitle, { color: activeProfile.color }]}>
                    {activeProfile.name} Pace
                  </Text>
                  <View style={[styles.paceTagPill, { backgroundColor: activeProfile.badgeBg }]}>
                    <Text style={[styles.paceTagText, { color: activeProfile.badgeText }]}>
                      {activeProfile.tag}
                    </Text>
                  </View>
                </View>
                <Text style={styles.paceDetailIdeal}>
                  {`⭐ Calibrated for your ${data.readiness}% Exam Readiness (${activeProfile.idealRange})`}
                </Text>
              </View>
            </View>

            {/* 3 Metric Badges */}
            <View style={styles.paceMetricsRow}>
              <View style={styles.paceMetricBox}>
                <Text style={styles.paceMetricLabel}>DAILY TARGET</Text>
                <Text style={[styles.paceMetricValue, { color: activeProfile.color }]}>
                  {activeProfile.dailyTarget} <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748b' }}>items/day</Text>
                </Text>
              </View>
              <View style={[styles.paceMetricBox, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e2e8f0' }]}>
                <Text style={styles.paceMetricLabel}>EST. DURATION</Text>
                <Text style={[styles.paceMetricValue, { color: activeProfile.color }]}>
                  {activeProfile.dailyGoalMins} <Text style={{ fontSize: 10, fontWeight: '600', color: '#64748b' }}>mins/day</Text>
                </Text>
              </View>
              <View style={styles.paceMetricBox}>
                <Text style={styles.paceMetricLabel}>INTENSITY</Text>
                <Text style={[styles.paceMetricValue, { color: activeProfile.color }]}>
                  {activeProfile.intensity}
                </Text>
              </View>
            </View>

            {/* Today's Question Mix */}
            <Text style={styles.paceSubheading}>TODAY'S QUESTION MIX</Text>
            <View style={styles.breakdownRow}>
              {activeProfile.breakdown.map((item, idx) => (
                <View key={idx} style={[styles.breakdownItem, { backgroundColor: activeProfile.lightBg, borderColor: activeProfile.border }]}>
                  <Ionicons name={item.icon} size={14} color={activeProfile.color} />
                  <Text style={[styles.breakdownCount, { color: activeProfile.color }]}>{item.count}</Text>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Summary */}
            <Text style={styles.paceSummaryText}>{activeProfile.summary}</Text>

            {/* Action Plan */}
            <Text style={styles.paceSubheading}>RECOMMENDED ACTION STEPS</Text>
            {activeProfile.actionPlan.map((step, idx) => (
              <View key={idx} style={styles.actionStepRow}>
                <View style={[styles.actionStepNumber, { backgroundColor: activeProfile.badgeBg }]}>
                  <Text style={[styles.actionStepNumberText, { color: activeProfile.badgeText }]}>{idx + 1}</Text>
                </View>
                <Text style={styles.actionStepText}>{step}</Text>
              </View>
            ))}

            {/* Sync / Apply Button to insert into user's review_speed */}
            <TouchableOpacity
              style={[
                styles.setPaceBtn,
                isSavedActive ? styles.setPaceBtnActive : { backgroundColor: activeProfile.color },
              ]}
              onPress={() => handlePaceSelect(activePaceKey)}
              disabled={isSavedActive}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSavedActive ? 'checkmark-circle' : 'flash'}
                size={16}
                color={isSavedActive ? '#059669' : '#fff'}
              />
              <Text style={[styles.setPaceBtnText, isSavedActive && { color: '#059669' }]}>
                {isSavedActive
                  ? `Active Profile Review Speed: ${activeProfile.name}`
                  : `Apply ${activeProfile.name} Pace to My Review Speed`}
              </Text>
            </TouchableOpacity>

            {paceSavedNotice && (
              <View style={styles.paceNoticeBox}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                <Text style={styles.paceNoticeText}>
                  {`Adaptive pace (${activeProfile.name}) inserted into your profile review speed!`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Time stats */}
        <View style={styles.statsGrid}>
          {[
            { value: fmtMins(data.todayMins), label: "Today's Study Time" },
            { value: fmtMins(data.weekMins), label: 'This Week Total' },
            { value: fmtMins(data.dailyAvg), label: 'Daily Average' },
            { value: fmtMins(goalMins), label: `${activeProfile.name} Pace Goal` },
          ].map((s) => (
            <View key={s.label} style={styles.gridItem}>
              <Text style={styles.gridValue}>{s.value}</Text>
              <Text style={styles.gridLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Goal progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{"Today's Goal Progress"}</Text>
          <View style={styles.sectionCard}>
            <View style={styles.goalRow}>
              <Text style={styles.goalValue}>{fmtMins(data.todayMins)}</Text>
              <Text style={styles.goalSlash}>/</Text>
              <Text style={styles.goalTotal}>{fmtMins(goalMins)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${currentGoalPct}%`,
                    backgroundColor: activeProfile.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.goalNote}>
              {data.todayMins > 0
                ? (data.todayMins >= goalMins
                    ? `🎉 Daily ${activeProfile.name} goal achieved!`
                    : `${fmtMins(goalMins - data.todayMins)} remaining to reach your ${activeProfile.name} daily goal`)
                : `0m completed today. Start practicing to reach your ${activeProfile.name} daily goal (${goalMins}m).`}
            </Text>
          </View>
        </View>
        <View style={{ height: 16 }} />
      </ScrollView>
    )
  }

  // ── Main Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PERFORMANCE</Text>
      </View>

      {/* FE Paper Switcher (Subject A / Subject B) without redundant target exam text */}
      {userTargetExam === 'FE' && (
        <View style={[styles.trackBar, { paddingVertical: 6 }]}>
          <View style={styles.trackSegment}>
            <TouchableOpacity
              style={[styles.trackBtn, examLevel === 'FE Subject A' && styles.trackBtnActive]}
              onPress={() => handleTrackSwitch('FE Subject A')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="laptop"
                size={14}
                color={examLevel === 'FE Subject A' ? '#fff' : '#64748b'}
              />
              <Text style={[styles.trackBtnText, examLevel === 'FE Subject A' && styles.trackBtnTextActive]}>
                Subject A (Morning)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.trackBtn, examLevel === 'FE Subject B' && styles.trackBtnActive]}
              onPress={() => handleTrackSwitch('FE Subject B')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="code-braces"
                size={14}
                color={examLevel === 'FE Subject B' ? '#fff' : '#64748b'}
              />
              <Text style={[styles.trackBtnText, examLevel === 'FE Subject B' && styles.trackBtnTextActive]}>
                Subject B (Afternoon)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t, i) => (
          <TouchableOpacity key={t} style={styles.tabBtn} onPress={() => setTab(i)}>
            <Text style={[styles.tabText, tab === i && styles.tabTextActive]}>{t}</Text>
            {tab === i && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <SkeletonContent />
      ) : error || !data ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={52} color="#9AA5B1" />
          <Text style={styles.emptyText}>{error ?? 'No data found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {tab === 0 && <Overview />}
          {tab === 1 && <Predictive />}
          {tab === 2 && <Prescriptive />}
        </>
      )}
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  header: {
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Exam Track Switcher Bar
  trackBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  trackSegment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    padding: 3,
  },
  trackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 18,
    gap: 6,
  },
  trackBtnActive: {
    backgroundColor: NAVY,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  trackBtnTextActive: {
    color: '#fff',
    fontWeight: '800',
  },
  singleTrackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    width: '100%',
  },
  singleTrackTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  singleTrackSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3b82f6',
    marginTop: 2,
  },
  feTrackHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    gap: 6,
  },
  feTrackHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: NAVY, fontWeight: '800' },
  tabUnderline: { height: 2, width: '60%', backgroundColor: NAVY, borderRadius: 2, marginTop: 4 },

  scroll: { flex: 1 },
  scrollContent: { padding: 16 },

  // Readiness card
  readinessCard: {
    borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 18,
    padding: 20, alignItems: 'center', marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  trackBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10,
  },
  trackBadgeText: { fontSize: 11, fontWeight: '700', color: '#1e40af' },
  readinessCardTitle: { fontSize: 16, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 4 },
  readinessCardDate: { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  readinessPct: { fontSize: 44, fontWeight: '900', marginBottom: 4 },
  readinessLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  readinessNote: { fontSize: 11, color: '#94a3b8', textAlign: 'center' },

  // Stats row
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', minWidth: 88 },
  statValue: { fontSize: 18, fontWeight: '900', color: NAVY },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Section
  section: { marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 10 },
  sectionSubBadge: { fontSize: 11, fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sectionCard: { borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 16, padding: 16, backgroundColor: '#fff' },
  emptyCard: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },

  // Subject bars
  subjectRow: { marginBottom: 14 },
  subjectLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subjectName: { fontSize: 13, fontWeight: '700', color: NAVY },
  subjectPct: { fontSize: 12, fontWeight: '700' },
  subjectHint: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 3 },
  barTrack: { height: 7, borderRadius: 999, backgroundColor: '#dbe8fb', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  // Bar chart
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  trendSubtitle: { fontSize: 12, fontWeight: '700', color: NAVY },
  trendLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#64748b' },
  barChart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 80, marginBottom: 10 },
  barGroup: { alignItems: 'center', gap: 6 },
  barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { width: 14, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  trendNote: { fontSize: 11, color: '#64748b', marginTop: 4, fontStyle: 'italic' },

  // Summary
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  summaryLabel: { fontSize: 13, color: NAVY, fontWeight: '600' },
  summarySub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  summaryPct: { fontSize: 13, fontWeight: '800' },

  // Benchmark card (Predictive)
  benchmarkHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  benchmarkTitle: { fontSize: 14, fontWeight: '800', color: NAVY },
  benchmarkSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },
  benchmarkDetailsGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  benchmarkDetailItem: { flex: 1, backgroundColor: '#f8fafc', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  benchmarkDetailVal: { fontSize: 14, fontWeight: '800', color: NAVY },
  benchmarkDetailLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
  benchmarkStatusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  benchmarkStatusText: { fontSize: 11, fontWeight: '700', flex: 1 },

  // Domain Checklist (Predictive)
  checklistRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  checklistName: { fontSize: 13, fontWeight: '700', color: NAVY },
  checklistScore: { fontSize: 11, color: '#64748b', marginTop: 2 },
  checklistBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  checklistBadgeText: { fontSize: 10, fontWeight: '800' },

  // Mock Empty / Action Box
  emptyMockBox: { alignItems: 'center', paddingVertical: 12 },
  actionBtn: { marginTop: 10, backgroundColor: NAVY, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Prescriptive Card
  prescriptiveCard: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 16,
    padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  prescriptiveHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  prescriptiveIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  prescriptiveCategory: { fontSize: 10, fontWeight: '800', color: '#64748b', letterSpacing: 0.5 },
  prescriptiveSubject: { fontSize: 15, fontWeight: '900', color: NAVY },
  prescriptiveScorePill: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  prescriptiveScoreText: { fontSize: 12, fontWeight: '800', color: '#dc2626' },
  prescriptiveAdvice: { fontSize: 12, color: '#334155', lineHeight: 18, marginBottom: 14 },
  practiceFocusBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: NAVY, paddingVertical: 10, borderRadius: 10,
  },
  practiceFocusBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Grid (prescriptive)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  gridItem: { width: '46%', borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 14, padding: 14, alignItems: 'center' },
  gridValue: { fontSize: 20, fontWeight: '900', color: NAVY, marginBottom: 4 },
  gridLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', textAlign: 'center' },

  // Goal
  goalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 12 },
  goalValue: { fontSize: 28, fontWeight: '900', color: '#2563eb' },
  goalSlash: { fontSize: 18, color: '#94a3b8' },
  goalTotal: { fontSize: 18, fontWeight: '700', color: '#94a3b8' },
  goalNote: { fontSize: 12, color: '#64748b', marginTop: 10, textAlign: 'center' },

  // Radar Chart styles
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  radarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  radarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  radarLegendLine: {
    width: 14,
    height: 0,
    borderTopWidth: 2,
  },
  radarLegendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },

  // Retention pills
  domainMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  retentionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  retentionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  retentionText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Trajectory styles
  trajectoryChartWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  trajectoryLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
  },
  trajectoryStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  trajectoryStatBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  trajectoryStatLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  trajectoryStatVal: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 2,
  },
  trajectoryStatSub: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
  },

  // Prescriptive target badges
  paceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paceItem: {
    alignItems: 'center',
    flex: 1,
  },
  paceLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 2,
  },
  paceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: NAVY,
  },
  decayAlertBox: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fef08a',
    marginBottom: 12,
  },
  decayAlertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  decayAlertTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  decayAlertText: {
    fontSize: 11,
    color: '#78350f',
    lineHeight: 16,
  },

  // Enhanced Study Pace Styles (Detailed, Standard, Quick)
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 10,
  },
  paceSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  paceTabCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  recBadge: {
    position: 'absolute',
    top: -8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
  },
  paceTabIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  paceTabName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    marginBottom: 2,
  },
  paceTabSubtitle: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  paceDetailCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  paceDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paceDetailTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  paceTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paceTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  paceDetailIdeal: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  paceMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  paceMetricBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  paceMetricValue: {
    fontSize: 14,
    fontWeight: '900',
  },
  paceSubheading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  breakdownItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  breakdownCount: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },
  breakdownLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 1,
  },
  paceSummaryText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 14,
  },
  actionStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  actionStepNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionStepNumberText: {
    fontSize: 11,
    fontWeight: '900',
  },
  actionStepText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  setPaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  setPaceBtnActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  setPaceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  paceNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  paceNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
})
