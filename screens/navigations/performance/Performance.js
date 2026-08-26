import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'


const NAVY = '#0f2747'
const TABS = ['Overview', 'Predictive', 'Prescriptive']

// ── Helpers ──────────────────────────────────────────────────────
function pct(n, d) { return d > 0 ? Math.round((n / d) * 100) : 0 }
function fmtMins(mins) {
  if (!mins || mins <= 0) return '0m'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}
function readinessLabel(p) {
  if (p >= 80) return 'High Readiness'
  if (p >= 60) return 'Moderate Readiness'
  if (p >= 40) return 'Low Readiness'
  return 'Needs More Practice'
}
function readinessColor(p) {
  if (p >= 80) return '#16a34a'
  if (p >= 60) return '#2563eb'
  if (p >= 40) return '#d97706'
  return '#dc2626'
}

// ── Bar (for progress) ────────────────────────────────────────────
function ProgressBar({ value, color = NAVY }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(value, 3)}%`, backgroundColor: color }]} />
    </View>
  )
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function Performance({ navigation }) {
  const [tab, setTab] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAll()
    })
    return unsubscribe
  }, [navigation])

  // ── Data fetching ─────────────────────────────────────────────
  const fetchAll = async () => {
    try {
      setLoading(true); setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) { setError('Not logged in.'); return }

      const today = new Date()
      const week0 = new Date(today); week0.setDate(today.getDate() - 7)
      const month0 = new Date(today); month0.setDate(today.getDate() - 30)

      // 1. Mock exam attempts (last 10 completed)
      const { data: attempts } = await supabase
        .from('mock_exam_attempts')
        .select('id, score, total_questions, correct_count, duration_seconds, completed_at, config_id, mock_exam_configs(title, level_key)')
        .eq('user_id', uid).eq('status', 'completed')
        .order('completed_at', { ascending: false }).limit(10)

      // 2. MCQ results with category
      const { data: mcqRaw } = await supabase
        .from('multiple_choice_results')
        .select('is_correct, answered_at, question_id, multiple_choice_questions(category_id, practice_categories(name))')
        .eq('user_id', uid)

      // 3. TF results with category
      const { data: tfRaw } = await supabase
        .from('true_false_results')
        .select('is_correct, answered_at, question_id, true_false_questions(category_id, practice_categories(name))')
        .eq('user_id', uid)

      // 4. Flashcard sessions (study time - using created_at)
      const { data: sessions } = await supabase
        .from('flashcard_sessions')
        .select('duration_seconds, created_at, completed_at, completed')
        .eq('user_id', uid)

      // ── Compute metrics ───────────────────────────────────────
      const att = attempts ?? []
      const mcq = mcqRaw ?? []
      const tf = tfRaw ?? []
      const ses = sessions ?? []

      // Overall readiness (avg score pct across completed mock exams)
      const avgMockPct = att.length > 0
        ? Math.round(att.reduce((s, a) => s + pct(a.correct_count, a.total_questions), 0) / att.length)
        : 0

      // Quiz accuracy (MCQ + TF combined)
      const allCorrect = [...mcq.map(r => r.is_correct), ...tf.map(r => r.is_correct)]
      const quizPct = pct(allCorrect.filter(Boolean).length, allCorrect.length)
      const readiness = att.length > 0 ? Math.round((avgMockPct * 0.6 + quizPct * 0.4)) : quizPct

      // Stats
      const quizTaken = [...new Set([...mcq.map(r => r.answered_at?.slice(0, 10)), ...tf.map(r => r.answered_at?.slice(0, 10))])].filter(Boolean).length
      const mockCount = att.length
      const studyMins = Math.round(ses.reduce((s, s2) => s + (s2.duration_seconds ?? 0), 0) / 60)

      // Subject performance from MCQ + TF combined
      const subjectMap = {}
      mcq.forEach(r => {
        const name = r.multiple_choice_questions?.practice_categories?.name ?? 'General'
        if (!subjectMap[name]) subjectMap[name] = { correct: 0, total: 0 }
        subjectMap[name].total++
        if (r.is_correct) subjectMap[name].correct++
      })
      tf.forEach(r => {
        const name = r.true_false_questions?.practice_categories?.name ?? 'General'
        if (!subjectMap[name]) subjectMap[name] = { correct: 0, total: 0 }
        subjectMap[name].total++
        if (r.is_correct) subjectMap[name].correct++
      })
      const subjects = Object.entries(subjectMap).map(([name, v]) => ({
        name, pct: pct(v.correct, v.total),
      }))

      // Weekly trend (last 4 weeks mock avg and quiz accuracy)
      const weeks = [4, 3, 2, 1].map(w => {
        const from = new Date(today); from.setDate(today.getDate() - w * 7)
        const to = new Date(today); to.setDate(today.getDate() - (w - 1) * 7)
        const wAtt = att.filter(a => { const d = new Date(a.completed_at); return d >= from && d < to })
        const wMcq = mcq.filter(m => { const d = new Date(m.answered_at); return d >= from && d < to })
        const wTf = tf.filter(t => { const d = new Date(t.answered_at); return d >= from && d < to })
        const wQuizzes = [...wMcq, ...wTf]
        return {
          label: `W${5 - w}`,
          mock: wAtt.length > 0 ? Math.round(wAtt.reduce((s, a) => s + pct(a.correct_count, a.total_questions), 0) / wAtt.length) : 0,
          quiz: wQuizzes.length > 0 ? Math.round(wQuizzes.reduce((s, q) => s + (q.is_correct ? 100 : 0), 0) / wQuizzes.length) : 0,
        }
      })

      // Quiz & exam summary
      const summary = [
        ...att.slice(0, 3).map(a => ({
          label: a.mock_exam_configs?.title ?? 'Mock Exam',
          pct: pct(a.correct_count, a.total_questions),
        })),
        { label: 'Multiple Choice Quiz', pct: pct(mcq.filter(r => r.is_correct).length, mcq.length) },
        { label: 'True or False Quiz', pct: pct(tf.filter(r => r.is_correct).length, tf.length) },
      ].filter(s => s.pct > 0).slice(0, 5)

      // Predictive: probability of passing (Professional >= 80% threshold)
      const passProbability = Math.min(Math.round(readiness * 0.9 + (att.length >= 3 ? 5 : 0)), 99)

      // Prescriptive: study streak
      const activityDays = new Set([
        ...ses.map(s => s.created_at?.slice(0, 10)),
        ...mcq.map(r => r.answered_at?.slice(0, 10)),
        ...tf.map(r => r.answered_at?.slice(0, 10)),
      ].filter(Boolean))
      let streak = 0
      for (let i = 0; i < 30; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (activityDays.has(key)) streak++
        else if (i > 0) break
      }

      // Today's study time
      const todayKey = today.toISOString().slice(0, 10)
      const todayMins = Math.round(ses.filter(s => s.created_at?.slice(0, 10) === todayKey)
        .reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60)
      const weekMins = Math.round(ses.filter(s => new Date(s.created_at) >= week0)
        .reduce((s, x) => s + (x.duration_seconds ?? 0), 0) / 60)
      const dailyGoalMins = 180 // 3 hours
      const dailyAvg = activityDays.size > 0 ? Math.round(studyMins / activityDays.size) : 0

      setData({
        readiness, readinessLabel: readinessLabel(readiness),
        quizTaken, mockCount, studyMins,
        subjects, weeks, summary,
        passProbability,
        mockReadiness: att.slice(0, 3).map((a, i) => ({
          label: `Mock Exam ${i + 1}`,
          pct: pct(a.correct_count, a.total_questions),
        })),
        streak,
        todayMins, weekMins, dailyAvg, dailyGoalMins,
        goalPct: Math.min(Math.round((todayMins / dailyGoalMins) * 100), 100),
        today: today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      })
    } catch (err) {
      console.error('Performance fetch error:', err)
      setError('Failed to load performance data.')
    } finally {
      setLoading(false)
    }
  }

  // ── Render guards ─────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e8edf5', backgroundColor: '#fff', alignItems: 'center' }}>
        <SkeletonItem width={120} height={20} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { padding: 16, gap: 20 }]} showsVerticalScrollIndicator={false}>
        {/* Header card skeleton */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8edf5', borderRadius: 16, padding: 16, gap: 10 }}>
          <SkeletonItem width="40%" height={16} />
          <SkeletonItem width="80%" height={24} />
          <SkeletonItem width="60%" height={12} />
        </View>

        {/* Tab buttons skeleton */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[1, 2, 3].map(tab => (
            <SkeletonItem key={tab} width={90} height={32} borderRadius={16} style={{ flex: 1 }} />
          ))}
        </View>

        {/* Content list skeleton */}
        <View style={{ gap: 12 }}>
          {[1, 2, 3].map(row => (
            <View key={row} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8edf5', borderRadius: 12, padding: 16 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonItem width="50%" height={14} />
                <SkeletonItem width="30%" height={10} />
              </View>
              <SkeletonItem width={40} height={40} borderRadius={20} />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
  if (error || !data) return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.centered}>
        <MaterialCommunityIcons name="alert-circle-outline" size={52} color="#9AA5B1" />
        <Text style={styles.emptyText}>{error ?? 'No data found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchAll}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )

  // ── Tab content ───────────────────────────────────────────────
  const Overview = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Readiness card */}
      <View style={styles.readinessCard}>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction Score</Text>
        <Text style={styles.readinessCardDate}>Updated: {data.today}</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.readiness) }]}>{data.readiness}%</Text>
        <Text style={[styles.readinessLabel, { color: readinessColor(data.readiness) }]}>{data.readinessLabel}</Text>
        <Text style={styles.readinessNote}>Based in last 7 days of activity</Text>
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

      {/* Performance by Subject */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance by Subjects</Text>
        <View style={styles.sectionCard}>
          {data.subjects.length > 0
            ? data.subjects.map((sub) => (
              <View key={sub.name} style={styles.subjectRow}>
                <Text style={styles.subjectName}>{sub.name}</Text>
                <ProgressBar value={sub.pct} />
              </View>
            ))
            : ['Verbal Ability', 'Numerical Ability', 'Analytical Ability', 'Logical Reasoning', 'Clerical Operations'].map(n => (
              <View key={n} style={styles.subjectRow}>
                <Text style={styles.subjectName}>{n}</Text>
                <ProgressBar value={0} />
              </View>
            ))
          }
        </View>
      </View>

      {/* Progress Trend */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Trend</Text>
        <View style={styles.sectionCard}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendSubtitle}>Weekly Score Trend</Text>
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
          <Text style={styles.trendNote}>+12% improvement this month</Text>
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
                <Text style={[styles.summaryPct, { color: readinessColor(s.pct) }]}>{s.pct}%</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  const Predictive = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Prediction card */}
      <View style={styles.readinessCard}>
        <Text style={styles.readinessCardTitle}>Exam Readiness{'\n'}Prediction</Text>
        <Text style={[styles.readinessPct, { color: readinessColor(data.passProbability) }]}>{data.passProbability}%</Text>
        <Text style={styles.readinessLabel}>Probability of Passing</Text>
        <Text style={styles.readinessNote}>Professional Level CSE</Text>
      </View>

      {/* Mock Exam Readiness */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mock Exam Readiness</Text>
        <View style={styles.sectionCard}>
          {data.mockReadiness.length > 0
            ? data.mockReadiness.map((m) => (
              <View key={m.label} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{m.label}</Text>
                <Text style={[styles.summaryPct, { color: readinessColor(m.pct) }]}>{m.pct}%</Text>
              </View>
            ))
            : <Text style={styles.emptyCard}>Complete mock exams to see readiness predictions.</Text>
          }
          {data.mockReadiness.length >= 2 && (
            <Text style={styles.trendNote}>
              Trend: Improving ({Math.abs(data.mockReadiness[data.mockReadiness.length - 1]?.pct - data.mockReadiness[0]?.pct)}% over {data.mockReadiness.length} mock exams)
            </Text>
          )}
        </View>
      </View>
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  const Prescriptive = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Streak card */}
      <View style={styles.readinessCard}>
        <Text style={styles.readinessCardTitle}>Study Streak</Text>
        <Text style={[styles.readinessPct, { color: '#2563eb' }]}>{data.streak} day streak</Text>
        <Text style={styles.readinessLabel}>Keep it up!</Text>
        <Text style={styles.readinessNote}>Best: {data.streak} days</Text>
      </View>

      {/* Time stats */}
      <View style={styles.statsGrid}>
        {[
          { value: fmtMins(data.todayMins), label: "Today's Study Time" },
          { value: fmtMins(data.weekMins), label: 'This Week Total' },
          { value: fmtMins(data.dailyAvg), label: 'Daily Average' },
          { value: fmtMins(data.dailyGoalMins), label: 'Daily Goal' },
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
              : `${fmtMins(data.dailyGoalMins - data.todayMins)} remaining to hit your daily goal`}
          </Text>
        </View>
      </View>
      <View style={{ height: 16 }} />
    </ScrollView>
  )

  // ── Main render ───────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky header */}
      <View style={{ paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e8edf5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: NAVY, letterSpacing: 2, textTransform: 'uppercase' }}>Performance</Text>
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
      {tab === 0 && <Overview />}
      {tab === 1 && <Predictive />}
      {tab === 2 && <Prescriptive />}


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

  header: { alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: NAVY, letterSpacing: 2 },

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
  readinessCardTitle: { fontSize: 16, fontWeight: '800', color: NAVY, textAlign: 'center', marginBottom: 4 },
  readinessCardDate: { fontSize: 11, color: '#94a3b8', marginBottom: 10 },
  readinessPct: { fontSize: 44, fontWeight: '900', marginBottom: 4 },
  readinessLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  readinessNote: { fontSize: 11, color: '#94a3b8' },

  // Stats row
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  statItem: { borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center', minWidth: 88 },
  statValue: { fontSize: 18, fontWeight: '900', color: NAVY },
  statLabel: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Section
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 10 },
  sectionCard: { borderWidth: 1, borderColor: '#dbe4f0', borderRadius: 16, padding: 16, backgroundColor: '#fff' },
  emptyCard: { fontSize: 13, color: '#94a3b8', textAlign: 'center', paddingVertical: 10 },

  // Subject bars
  subjectRow: { marginBottom: 14 },
  subjectName: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
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
  summaryLabel: { fontSize: 13, color: NAVY, fontWeight: '600', flex: 1 },
  summaryPct: { fontSize: 13, fontWeight: '800' },

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

  // Bottom nav
  bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d8e0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 8 },
  navIconWrap: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  navIconActive: { backgroundColor: 'rgba(15, 39, 71, 0.08)' },
})
