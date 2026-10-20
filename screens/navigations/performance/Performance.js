import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'

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
  'Algorithms & Programming',
  'Networks & Security',
  'IT Management & Strategy',
]

const FE_B_SUBJECTS = [
  'Algorithms & Data Structures',
  'Security & System Design',
]

const SUBJECT_COLORS = {
  'Technology': '#2563eb',
  'Management': '#d97706',
  'Strategy': '#9333ea',
  'Computer Systems & Architecture': '#2563eb',
  'Algorithms & Programming': '#059669',
  'Networks & Security': '#dc2626',
  'IT Management & Strategy': '#9333ea',
  'Algorithms & Data Structures': '#059669',
  'Security & System Design': '#dc2626',
}

// ── Helpers ──────────────────────────────────────────────────────
function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0 }

function fmtMins(mins) {
  if (!mins || mins <= 0) return '0m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function readinessLabel(p, benchmark = 60) {
  if (p >= benchmark + 15) return 'High Readiness'
  if (p >= benchmark) return 'Benchmark Met'
  if (p >= benchmark - 20) return 'Moderate Readiness'
  return 'Needs More Practice'
}

function readinessColor(p, benchmark = 60) {
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

// ── Metric Computation Engine ─────────────────────────────────────
function normalizeCategory(cat, level) {
  if (!cat) return null
  const c = String(cat).trim()
  if (level === 'IP') {
    if (c === 'Technology' || c.includes('Tech') || c.includes('Hardware') || c.includes('Software') || c.includes('Network') || c.includes('Database') || c.includes('Security') || c.includes('Algorithm')) return 'Technology'
    if (c === 'Management' || c.includes('Manage') || c.includes('Project') || c.includes('Service') || c.includes('Audit')) return 'Management'
    if (c === 'Strategy' || c.includes('Strat') || c.includes('Business') || c.includes('Legal') || c.includes('Corporate')) return 'Strategy'
    return 'Technology'
  } else if (level === 'FE Subject A') {
    if (c.includes('Architecture') || c.includes('Hardware') || c.includes('Computer Systems') || c === 'Technology') return 'Computer Systems & Architecture'
    if (c.includes('Algorithm') || c.includes('Program') || c.includes('Data Structure')) return 'Algorithms & Programming'
    if (c.includes('Network') || c.includes('Security') || c.includes('Database')) return 'Networks & Security'
    if (c.includes('Management') || c.includes('Strategy') || c.includes('Project')) return 'IT Management & Strategy'
    return 'Computer Systems & Architecture'
  } else if (level === 'FE Subject B') {
    if (c.includes('Algorithm') || c.includes('Program') || c.includes('Data Structure')) return 'Algorithms & Data Structures'
    if (c.includes('Security') || c.includes('System Design') || c.includes('Network')) return 'Security & System Design'
    return 'Algorithms & Data Structures'
  }
  return c
}

// ── Metric Computation Engine ─────────────────────────────────────
function computePerformanceData(level, rawData) {
  let allowedSubjects = IP_SUBJECTS
  let targetItems = 100
  let minPassItems = 55
  let examDuration = '2h 00m'
  let passBenchmark = 55
  let dailyGoalMins = 120
  let trackKey = 'ip'

  if (level === 'FE Subject A') {
    allowedSubjects = FE_A_SUBJECTS
    targetItems = 60
    minPassItems = 36
    examDuration = '1h 30m'
    passBenchmark = 60
    dailyGoalMins = 150
    trackKey = 'fe_a'
  } else if (level === 'FE Subject B') {
    allowedSubjects = FE_B_SUBJECTS
    targetItems = 20
    minPassItems = 12
    examDuration = '1h 40m'
    passBenchmark = 60
    dailyGoalMins = 150
    trackKey = 'fe_b'
  }

  const { att = [], mcq = [], tf = [], ses = [], diag = null } = rawData

  const today = new Date()
  const week0 = new Date(today); week0.setDate(today.getDate() - 7)

  // 1. Subject mapping strictly limited to active exam syllabus
  const subjectMap = {}
  allowedSubjects.forEach((s) => {
    subjectMap[s] = { correct: 0, total: 0 }
  })

  // Tally from diagnostic assessment if available
  if (diag?.category_scores) {
    let catScores = diag.category_scores
    if (typeof catScores === 'string') {
      try { catScores = JSON.parse(catScores) } catch (e) { catScores = {} }
    }
    if (catScores && typeof catScores === 'object') {
      Object.entries(catScores).forEach(([cat, scores]) => {
        let normCat = normalizeCategory(cat, level)
        if (normCat && subjectMap[normCat] !== undefined) {
          if (scores && typeof scores === 'object') {
            subjectMap[normCat].correct += scores.correct || 0
            subjectMap[normCat].total += scores.total || 0
          } else if (typeof scores === 'number') {
            subjectMap[normCat].correct += scores
            subjectMap[normCat].total += 10
          }
        }
      })
    }
  }

  // Tally from MCQ
  mcq.forEach((r) => {
    let rawCat = r.multiple_choice_questions?.practice_categories?.name
    let cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) {
      subjectMap[cat].total++
      if (r.is_correct) subjectMap[cat].correct++
    }
  })

  // Tally from TF
  tf.forEach((r) => {
    let rawCat = r.true_false_questions?.practice_categories?.name
    let cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) {
      subjectMap[cat].total++
      if (r.is_correct) subjectMap[cat].correct++
    }
  })

  const subjects = allowedSubjects.map((name) => {
    const s = subjectMap[name] || { correct: 0, total: 0 }
    const p = pct(s.correct, s.total)
    return {
      name,
      pct: p,
      correct: s.correct,
      total: s.total,
      color: SUBJECT_COLORS[name] || NAVY,
      isPassing: p >= passBenchmark,
    }
  })

  // 2. Filter mock exams matching target track
  const levelAttempts = att.filter((a) => {
    const lk = (a.mock_exam_configs?.level_key || '').toLowerCase()
    if (level === 'IP') return lk.includes('ip')
    if (level === 'FE Subject A') return lk.includes('fe_a') || lk.includes('fe a') || lk === 'fe'
    if (level === 'FE Subject B') return lk.includes('fe_b') || lk.includes('fe b')
    return false
  })
  const activeAttempts = levelAttempts.length > 0 ? levelAttempts : []

  const avgMockPct = activeAttempts.length > 0
    ? Math.round(activeAttempts.reduce((s, a) => s + pct(a.correct_count, a.total_questions), 0) / activeAttempts.length)
    : 0

  // 3. Quiz accuracy restricted to allowed subjects
  const levelQuizItems = []
  mcq.forEach((r) => {
    let rawCat = r.multiple_choice_questions?.practice_categories?.name
    let cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) levelQuizItems.push(r.is_correct)
  })
  tf.forEach((r) => {
    let rawCat = r.true_false_questions?.practice_categories?.name
    let cat = normalizeCategory(rawCat, level)
    if (cat && subjectMap[cat] !== undefined) levelQuizItems.push(r.is_correct)
  })
  const quizPct = pct(levelQuizItems.filter(Boolean).length, levelQuizItems.length)

  // 4. Combined Readiness
  let readiness = 0
  if (activeAttempts.length > 0) {
    readiness = Math.round(avgMockPct * 0.6 + quizPct * 0.4)
  } else if (levelQuizItems.length > 0) {
    readiness = quizPct
  } else if (diag?.score_percent) {
    readiness = Math.round(diag.score_percent)
  }

  // 5. Activity counts
  const quizTaken = [...new Set([
    ...mcq.filter((m) => {
      let cat = normalizeCategory(m.multiple_choice_questions?.practice_categories?.name, level)
      return cat && subjectMap[cat] !== undefined
    }).map((r) => r.answered_at?.slice(0, 10)),
    ...tf.filter((t) => {
      let cat = normalizeCategory(t.true_false_questions?.practice_categories?.name, level)
      return cat && subjectMap[cat] !== undefined
    }).map((r) => r.answered_at?.slice(0, 10)),
  ])].filter(Boolean).length

  const mockCount = activeAttempts.length
  const studyMins = Math.round(ses.reduce((s, s2) => s + (s2.duration_seconds ?? 0), 0) / 60)

  // 6. Weekly trends
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

  // 7. Summary
  const summary = [
    ...activeAttempts.slice(0, 3).map((a) => ({
      label: a.mock_exam_configs?.title ?? `${level} Mock Exam`,
      pct: pct(a.correct_count, a.total_questions),
    })),
    {
      label: `Multiple Choice (${level})`,
      pct: pct(
        mcq.filter((r) => {
          let cat = normalizeCategory(r.multiple_choice_questions?.practice_categories?.name, level)
          return cat && subjectMap[cat] !== undefined && r.is_correct
        }).length,
        mcq.filter((r) => {
          let cat = normalizeCategory(r.multiple_choice_questions?.practice_categories?.name, level)
          return cat && subjectMap[cat] !== undefined
        }).length
      ),
    },
    {
      label: `True or False (${level})`,
      pct: pct(
        tf.filter((r) => {
          let cat = normalizeCategory(r.true_false_questions?.practice_categories?.name, level)
          return cat && subjectMap[cat] !== undefined && r.is_correct
        }).length,
        tf.filter((r) => {
          let cat = normalizeCategory(r.true_false_questions?.practice_categories?.name, level)
          return cat && subjectMap[cat] !== undefined
        }).length
      ),
    },
  ].filter((s) => s.pct > 0).slice(0, 5)

  // 8. Predictive Pass Probability
  const passProbability = readiness > 0
    ? Math.min(Math.round(readiness * 0.92 + (activeAttempts.length >= 2 ? 6 : 0)), 99)
    : 0

  // 9. Mock readiness history
  const mockReadiness = activeAttempts.slice(0, 5).map((a, i) => ({
    label: a.mock_exam_configs?.title || `${level} Mock Exam #${i + 1}`,
    pct: pct(a.correct_count, a.total_questions),
    correct: a.correct_count,
    total: a.total_questions,
    isPassed: pct(a.correct_count, a.total_questions) >= passBenchmark,
  }))

  // 10. Weakest subject for Prescriptive
  const sortedSubjects = [...subjects].sort((a, b) => {
    if (a.total === 0 && b.total > 0) return -1
    if (b.total === 0 && a.total > 0) return 1
    return a.pct - b.pct
  })
  const weakestSubject = sortedSubjects[0] || subjects[0]

  // 11. Prescriptive study streak & time
  const activityDays = new Set([
    ...ses.map((s) => s.created_at?.slice(0, 10)),
    ...mcq.map((r) => r.answered_at?.slice(0, 10)),
    ...tf.map((r) => r.answered_at?.slice(0, 10)),
  ].filter(Boolean))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    if (activityDays.has(key)) streak++
    else if (i > 0) break
  }

  const todayKey = today.toISOString().slice(0, 10)
  const todayMins = Math.round(ses.filter((s) => s.created_at?.slice(0, 10) === todayKey)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60)
  const weekMins = Math.round(ses.filter((s) => new Date(s.created_at) >= week0)
    .reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60)
  const dailyAvg = activityDays.size > 0 ? Math.round(studyMins / activityDays.size) : 0

  return {
    level,
    trackKey,
    targetItems,
    minPassItems,
    examDuration,
    passBenchmark,
    readiness,
    readinessLabel: readinessLabel(readiness, passBenchmark),
    quizTaken,
    mockCount,
    studyMins,
    subjects,
    weeks,
    summary,
    passProbability,
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
  const [examLevel, setExamLevel] = useState('IP')
  const [data, setData] = useState(null)

  const rawDataRef = useRef({
    uid: null,
    att: [],
    mcq: [],
    tf: [],
    ses: [],
    diag: null,
  })

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAll()
    })
    return unsubscribe
  }, [navigation])

  // ── Data fetching ─────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) { setError('Not logged in.'); return }

      // 1. Fetch user's registered target exam level from personal_info
      let currentLevel = 'IP'
      const { data: pData } = await supabase
        .from('personal_info')
        .select('target_exam_level')
        .eq('user_id', uid)
        .maybeSingle()

      if (pData?.target_exam_level) {
        const lvl = pData.target_exam_level.toLowerCase()
        if (lvl.includes('fe_b') || lvl.includes('subject b')) {
          currentLevel = 'FE Subject B'
        } else if (lvl.includes('fe') || lvl.includes('fundamental')) {
          currentLevel = 'FE Subject A'
        } else {
          currentLevel = 'IP'
        }
      }
      setExamLevel(currentLevel)

      // 2. Mock exam attempts
      const { data: attempts } = await supabase
        .from('mock_exam_attempts')
        .select('id, score, total_questions, correct_count, duration_seconds, completed_at, config_id, mock_exam_configs(title, level_key)')
        .eq('user_id', uid).eq('status', 'completed')
        .order('completed_at', { ascending: false }).limit(20)

      // 3. MCQ results
      const { data: mcqRaw } = await supabase
        .from('multiple_choice_results')
        .select('is_correct, answered_at, question_id, multiple_choice_questions(category_id, practice_categories(name))')
        .eq('user_id', uid)

      // 4. TF results
      const { data: tfRaw } = await supabase
        .from('true_false_results')
        .select('is_correct, answered_at, question_id, true_false_questions(category_id, practice_categories(name))')
        .eq('user_id', uid)

      // 5. Flashcard sessions
      const { data: sessions } = await supabase
        .from('flashcard_sessions')
        .select('duration_seconds, created_at, completed_at, completed')
        .eq('user_id', uid)

      // 6. Latest Diagnostic Assessment attempt
      const { data: diagAttempt } = await supabase
        .from('diagnostic_assessment_attempts')
        .select('score_percent, category_scores, level, completed_at')
        .eq('user_id', uid)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Cache raw data in ref for fast level toggling
      rawDataRef.current = {
        uid,
        att: attempts ?? [],
        mcq: mcqRaw ?? [],
        tf: tfRaw ?? [],
        ses: sessions ?? [],
        diag: diagAttempt ?? null,
      }

      // Compute metrics tailored to user's exam track
      const computed = computePerformanceData(currentLevel, rawDataRef.current)
      setData(computed)
    } catch (err) {
      console.error('Performance fetch error:', err)
      setError('Failed to load performance data.')
    } finally {
      setLoading(false)
    }
  }

  // ── Switch exam track on-demand ──────────────────────────────
  const handleTrackSwitch = async (newLevel) => {
    if (newLevel === examLevel) return
    setExamLevel(newLevel)

    // Instantly recompute metrics for selected track
    const computed = computePerformanceData(newLevel, rawDataRef.current)
    setData(computed)

    // Persist choice to Supabase personal_info
    const uid = rawDataRef.current.uid
    if (uid) {
      try {
        await supabase
          .from('personal_info')
          .upsert({
            user_id: uid,
            target_exam_level: newLevel,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
      } catch (err) {
        console.warn('Error syncing target exam level:', err)
      }
    }
  }

  // ── Skeleton Loader ──────────────────────────────────────────
  const SkeletonContent = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { gap: 16 }]} showsVerticalScrollIndicator={false}>
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Readiness card */}
      <View style={styles.readinessCard}>
        <View style={styles.trackBadge}>
          <Ionicons name="ribbon" size={13} color="#2563eb" />
          <Text style={styles.trackBadgeText}>
            {data.level} Track • {data.targetItems} Items • {data.examDuration}
          </Text>
        </View>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction Score</Text>
        <Text style={styles.readinessCardDate}>Updated: {data.today}</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.readiness, data.passBenchmark) }]}>{data.readiness}%</Text>
        <Text style={[styles.readinessLabel, { color: readinessColor(data.readiness, data.passBenchmark) }]}>{data.readinessLabel}</Text>
        <Text style={styles.readinessNote}>
          Based on {data.mockCount} {data.level} mock exam{data.mockCount === 1 ? '' : 's'} & active quizzes
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { value: data.quizTaken, label: 'Quiz Taken' },
          { value: data.mockCount, label: `${data.level} Mocks` },
          { value: fmtMins(data.studyMins), label: 'Study Time' },
        ].map((s) => (
          <View key={s.label} style={styles.statItem}>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Performance by Subject strictly tailored */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Performance by Domains</Text>
          <Text style={styles.sectionSubBadge}>{data.level}</Text>
        </View>
        <View style={styles.sectionCard}>
          {data.subjects.map((sub) => (
            <View key={sub.name} style={styles.subjectRow}>
              <View style={styles.subjectLabelRow}>
                <Text style={styles.subjectName}>{sub.name}</Text>
                <Text style={[styles.subjectPct, { color: sub.total > 0 ? readinessColor(sub.pct, data.passBenchmark) : '#94a3b8' }]}>
                  {sub.total > 0 ? `${sub.pct}% (${sub.correct}/${sub.total})` : '0%'}
                </Text>
              </View>
              <ProgressBar value={sub.pct} color={sub.color} />
              {sub.total === 0 && (
                <Text style={styles.subjectHint}>No practice answered yet for this domain</Text>
              )}
            </View>
          ))}
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
                  <View style={[styles.bar, { height: Math.max(w.quiz, 4), backgroundColor: '#3B5BA5' }]} />
                  <View style={[styles.bar, { height: Math.max(w.mock, 4), backgroundColor: '#9B2335' }]} />
                </View>
                <Text style={styles.barLabel}>{w.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.trendNote}>Evaluated against {data.level} PhilNITS/ITPEC syllabus requirements</Text>
        </View>
      </View>

      {/* Quiz & Exam Summary */}
      {data.summary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiz & Exam Summary</Text>
          <View style={styles.sectionCard}>
            {data.summary.map((s) => (
              <View key={s.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{s.label}</Text>
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
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Prediction card */}
      <View style={styles.readinessCard}>
        <View style={styles.trackBadge}>
          <Ionicons name="sparkles" size={13} color="#2563eb" />
          <Text style={styles.trackBadgeText}>{data.level} Track</Text>
        </View>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.passProbability, data.passBenchmark) }]}>{data.passProbability}%</Text>
        <Text style={styles.readinessLabel}>Estimated Preparedness</Text>
        <Text style={styles.readinessNote}>
          {data.level} ({data.targetItems} Items • Benchmark: {data.passBenchmark}%)
        </Text>
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
            backgroundColor: data.passProbability >= data.passBenchmark ? '#ecfdf5' : '#fefce8',
            borderColor: data.passProbability >= data.passBenchmark ? '#a7f3d0' : '#fef08a'
          }]}>
            <Ionicons
              name={data.passProbability >= data.passBenchmark ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={data.passProbability >= data.passBenchmark ? '#059669' : '#d97706'}
            />
            <Text style={[styles.benchmarkStatusText, {
              color: data.passProbability >= data.passBenchmark ? '#065f46' : '#92400e'
            }]}>
              {data.passProbability >= data.passBenchmark
                ? `You meet the ${data.passBenchmark}% practice readiness target for ${data.level}!`
                : `Score gap: +${data.passBenchmark - data.passProbability}% required to reach the ${data.passBenchmark}% practice benchmark.`}
            </Text>
          </View>
        </View>
      </View>

      {/* Tested Domain Competency Matrix */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domain Readiness Checklist</Text>
        <View style={styles.sectionCard}>
          {data.subjects.map((sub) => (
            <View key={sub.name} style={styles.checklistRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.checklistName}>{sub.name}</Text>
                <Text style={styles.checklistScore}>
                  {sub.total > 0 ? `${sub.pct}% accuracy (${sub.correct}/${sub.total} items)` : 'No attempts yet'}
                </Text>
              </View>
              <View style={[styles.checklistBadge, {
                backgroundColor: sub.total === 0 ? '#f1f5f9' : (sub.isPassing ? '#dcfce7' : '#fee2e2')
              }]}>
                <Text style={[styles.checklistBadgeText, {
                  color: sub.total === 0 ? '#64748b' : (sub.isPassing ? '#15803d' : '#b91c1c')
                }]}>
                  {sub.total === 0 ? 'Pending' : (sub.isPassing ? `Ready (≥${data.passBenchmark}%)` : 'Needs Review')}
                </Text>
              </View>
            </View>
          ))}
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
  const Prescriptive = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Streak card */}
      <View style={styles.readinessCard}>
        <Text style={styles.readinessCardTitle}>Study Streak</Text>
        <Text style={[styles.readinessPct, { color: '#2563eb' }]}>{data.streak} day{data.streak === 1 ? '' : 's'}</Text>
        <Text style={styles.readinessLabel}>Keep up the momentum!</Text>
        <Text style={styles.readinessNote}>Targeting {data.level} Examination</Text>
      </View>

      {/* Level-Specific Prescriptive Recommendation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Action Plan for {data.level}</Text>
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

          <Text style={styles.prescriptiveAdvice}>
            {getSubjectTip(data.weakestSubject?.name)}
          </Text>

          <TouchableOpacity
            style={styles.practiceFocusBtn}
            onPress={() => navigation?.navigate('PracticeLibraryScreen')}
          >
            <Feather name="play-circle" size={16} color="#fff" />
            <Text style={styles.practiceFocusBtnText}>Practice {data.weakestSubject?.name}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Time stats */}
      <View style={styles.statsGrid}>
        {[
          { value: fmtMins(data.todayMins), label: "Today's Study Time" },
          { value: fmtMins(data.weekMins), label: 'This Week Total' },
          { value: fmtMins(data.dailyAvg), label: 'Daily Average' },
          { value: fmtMins(data.dailyGoalMins), label: `Target Exam Goal` },
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
            <Text style={styles.goalTotal}>{fmtMins(data.dailyGoalMins)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${data.goalPct}%`, backgroundColor: '#2563eb' }]} />
          </View>
          <Text style={styles.goalNote}>
            {data.goalPct >= 100
              ? "🎉 Daily goal achieved!"
              : `${fmtMins(data.dailyGoalMins - data.todayMins)} remaining to hit your ${data.level} daily goal`}
          </Text>
        </View>
      </View>
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  // ── Main Render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PERFORMANCE</Text>
      </View>

      {/* Exam Track Switcher Bar */}
      <View style={styles.trackBar}>
        <View style={styles.trackSegment}>
          <TouchableOpacity
            style={[styles.trackBtn, examLevel === 'IP' && styles.trackBtnActive]}
            onPress={() => handleTrackSwitch('IP')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="school"
              size={14}
              color={examLevel === 'IP' ? '#fff' : '#64748b'}
            />
            <Text style={[styles.trackBtnText, examLevel === 'IP' && styles.trackBtnTextActive]}>
              IP
            </Text>
          </TouchableOpacity>

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
              FE Subj A
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
              FE Subj B
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
})
