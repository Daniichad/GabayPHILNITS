import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, Image, Modal, Linking, ActivityIndicator,
  RefreshControl, Platform, StatusBar,
} from 'react-native'
import { supabase } from '../../../utils/supabase'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─── Fallback motivational quotes (used if API fails) ───────────
const FALLBACK_QUOTES = [
  { content: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { content: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { content: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
  { content: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { content: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { content: 'Push yourself, because no one else is going to do it for you.', author: 'Unknown' },
  { content: 'Great things never come from comfort zones.', author: 'Unknown' },
  { content: 'Dream big and dare to fail.', author: 'Norman Vaughan' },
  { content: 'Hard work beats talent when talent doesn\'t work hard.', author: 'Tim Notke' },
  { content: 'You don\'t have to be great to start, but you have to start to be great.', author: 'Zig Ziglar' },
]

// ─── Sample notifications ────────────────────────────────────────
const INITIAL_NOTIFICATIONS = [
  {
    id: 1,
    icon: 'clipboard-text',
    title: 'New Mock Exam Available',
    body: 'A new Civil Service mock exam has been added. Test yourself now!',
    time: '2h ago',
    read: false,
  },
  {
    id: 2,
    icon: 'fire',
    title: 'Study Streak! 🔥',
    body: "You're on a 3-day study streak. Keep it up — consistency is key!",
    time: '1d ago',
    read: false,
  },
  {
    id: 3,
    icon: 'calendar-clock',
    title: 'CSE Exam Reminder',
    body: 'The next CSE exam is in 45 days. Stay on track with your study plan.',
    time: '2d ago',
    read: true,
  },
  {
    id: 4,
    icon: 'book-open-variant',
    title: 'New Reading Material',
    body: 'Vocabulary Chapter 3 has been added to the Library.',
    time: '3d ago',
    read: true,
  },
]

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function Home({ session, navigation }) {
  const user = session?.user
  const insets = useSafeAreaInsets()
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    user?.email ||
    'User'
  const firstName = displayName.split(' ')[0] || 'Learner'

  // ─── State ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  const [notifVisible, setNotifVisible] = useState(false)
  const [quote, setQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [cseSchedule, setCseSchedule] = useState(null)
  const [cseLoading, setCseLoading] = useState(true)
  const [readiness, setReadiness] = useState(0)
  const [readinessLoading, setReadinessLoading] = useState(true)
  const [rankings, setRankings] = useState([])
  const [rankingsLoading, setRankingsLoading] = useState(true)
  const [profileName, setProfileName] = useState('Learner')
  const [streakDays, setStreakDays] = useState(0)

  const quoteTimer = useRef(null)
  const quoteOpacity = useRef(new Animated.Value(1)).current

  const unreadCount = notifications.filter((n) => !n.read).length

  // ─── Known official 2026 CSE dates (verified from csc.gov.ph) ──
  const KNOWN_CSE_DATES_2026 = [
    { date: new Date('2026-03-08'), label: 'March 8, 2026', appPeriod: 'Nov 3 – Dec 28, 2025', cycle: '1st Cycle' },
    { date: new Date('2026-08-09'), label: 'August 9, 2026', appPeriod: 'May 14 – Jun 10, 2026', cycle: '2nd Cycle' },
  ]

  // Returns the nearest upcoming date from a list
  const getNextDate = (dates) => {
    const now = new Date()
    const future = dates.filter((d) => d.date > now).sort((a, b) => a.date - b.date)
    return future[0] || dates[dates.length - 1]
  }

  // Tries to parse CSE exam dates from the CSC RSS feed XML text
  const parseCseDatesFromRSS = (xml) => {
    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December']
    // Match pattern: Month D(D), YYYY — only near CSE-related keywords
    const cseKeywords = /career service exam|cse-ppt|cse ppt|civil service exam/i
    const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(2026|2027)/gi

    const items = xml.split(/<item>|<\/item>/i)
    const found = []

    for (const item of items) {
      if (!cseKeywords.test(item)) continue
      let m
      while ((m = datePattern.exec(item)) !== null) {
        const parsed = new Date(`${m[1]} ${m[2]}, ${m[3]}`)
        if (!isNaN(parsed.getTime())) found.push(parsed)
      }
      datePattern.lastIndex = 0
    }

    // Return unique future dates
    const now = new Date()
    const unique = [...new Set(found.map((d) => d.toDateString()))]
      .map((s) => new Date(s))
      .filter((d) => d > now)
      .sort((a, b) => a - b)

    return unique
  }

  // ─── Fetch CSE Schedule ────────────────────────────────────────
  const fetchCSESchedule = useCallback(async () => {
    setCseLoading(true)
    try {
      // Try RSS feed first — it's publicly accessible
      const res = await fetch('https://www.csc.gov.ph/?format=feed&type=rss', {
        headers: { 'User-Agent': 'GabayPHILCSE/1.0' },
      })
      if (res.ok) {
        const xml = await res.text()
        const parsedDates = parseCseDatesFromRSS(xml)
        if (parsedDates.length > 0) {
          const next = parsedDates[0]
          const now = new Date()
          const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24))
          const label = next.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
          setCseSchedule({ date: next, label, daysLeft: diffDays, appPeriod: null, source: 'live' })
          setCseLoading(false)
          return
        }
      }
    } catch { /* silently fall through */ }

    // Fallback: use known official 2026 dates
    const next = getNextDate(KNOWN_CSE_DATES_2026)
    const now = new Date()
    const diffDays = Math.ceil((next.date - now) / (1000 * 60 * 60 * 24))
    setCseSchedule({
      date: next.date,
      label: next.label,
      daysLeft: diffDays > 0 ? diffDays : 0,
      appPeriod: next.appPeriod,
      cycle: next.cycle,
      source: 'official',
    })
    setCseLoading(false)
  }, [])

  const fetchReadiness = useCallback(async () => {
    setReadinessLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      const { data: attempts, error } = await supabase
        .from('mock_exam_attempts')
        .select('correct_count, total_questions')
        .eq('user_id', uid)
        .eq('status', 'completed')

      if (error) throw error

      if (attempts && attempts.length > 0) {
        const totalPct = attempts.reduce((sum, attempt) => {
          const pct = attempt.total_questions > 0 
            ? (attempt.correct_count / attempt.total_questions) * 100 
            : 0
          return sum + pct
        }, 0)
        setReadiness(Math.round(totalPct / attempts.length))
      } else {
        setReadiness(0)
      }
    } catch (err) {
      console.warn('Error fetching readiness:', err)
      setReadiness(0)
    } finally {
      setReadinessLoading(false)
    }
  }, [])

  const fetchRankings = useCallback(async () => {
    setRankingsLoading(true)
    try {
      // 1. Fetch public profile names (excluding admins)
      const { data: publicUsers, error: uErr } = await supabase
        .from('users')
        .select('id, email, fullname, avatar_url, role')
        .neq('role', 'admin')
      if (uErr) throw uErr

      // 2. Fetch mock exam attempts
      const { data: attempts, error: aErr } = await supabase
        .from('mock_exam_attempts')
        .select('user_id, correct_count, total_questions')
        .eq('status', 'completed')
      if (aErr) throw aErr

      // 3. Fetch MCQ + TF results
      const { data: mcqRaw } = await supabase.from('multiple_choice_results').select('user_id, is_correct, answered_at')
      const { data: tfRaw } = await supabase.from('true_false_results').select('user_id, is_correct, answered_at')

      // 4. Fetch matching results
      const { data: matchRaw } = await supabase.from('matching_results').select('user_id, completed, mistakes, created_at')

      // 5. Fetch flashcard sessions
      const { data: sessions } = await supabase.from('flashcard_sessions').select('user_id, completed, created_at')

      const userScores = {}
      
      // Initialize map
      publicUsers.forEach(u => {
        userScores[u.id] = {
          name: u.fullname || u.email || 'Learner',
          points: 0
        }
      })

      // Add mock exam points (150 points per completed exam + 2 pts per correct answer)
      attempts.forEach(att => {
        const target = userScores[att.user_id]
        if (target) {
          target.points += 150
          target.points += (att.correct_count || 0) * 2
        }
      })

      // Add MCQ points (10 pts per answer + 5 pts bonus if correct)
      if (mcqRaw) {
        mcqRaw.forEach(r => {
          const target = userScores[r.user_id]
          if (target) {
            target.points += 10
            if (r.is_correct) target.points += 5
          }
        })
      }

      // Add TF points (10 pts per answer + 5 pts bonus if correct)
      if (tfRaw) {
        tfRaw.forEach(r => {
          const target = userScores[r.user_id]
          if (target) {
            target.points += 10
            if (r.is_correct) target.points += 5
          }
        })
      }

      // Add Matching points (50 pts per completed match + mistakes bonus)
      if (matchRaw) {
        matchRaw.forEach(r => {
          const target = userScores[r.user_id]
          if (target) {
            if (r.completed) {
              target.points += 50
              target.points += Math.max(10, 30 - (r.mistakes || 0) * 2)
            }
          }
        })
      }

      // Add Flashcard points (30 pts per completed study session)
      if (sessions) {
        sessions.forEach(s => {
          const target = userScores[s.user_id]
          if (target) {
            if (s.completed) target.points += 30
            else target.points += 10
          }
        })
      }

      // Calculate combined scores
      const leaderboard = Object.keys(userScores).map(uid => {
        const u = userScores[uid]
        return {
          uid,
          name: u.name,
          score: u.points
        }
      })

      // Sort by score descending and limit to top 5
      leaderboard.sort((a, b) => b.score - a.score)
      setRankings(leaderboard.slice(0, 5))
    } catch (err) {
      console.warn('Error fetching rankings:', err)
    } finally {
      setRankingsLoading(false)
    }
  }, [])

  const subjects = [
    { label: 'Verbal Ability', progress: 0.08 },
    { label: 'Numerical Ability', progress: 0.0 },
    { label: 'Analytical Ability', progress: 0.15 },
    { label: 'Logical Reasoning', progress: 0.1 },
    { label: 'General Information', progress: 0.0 },
    { label: 'Clerical Operations', progress: 0.0 },
  ]

  // ─── Fetch quote from API ───────────────────────────────────────
  const fetchQuote = useCallback(async (silent = false) => {
    if (!silent) setQuoteLoading(true)

    // Fade out current quote before swapping
    await new Promise((resolve) =>
      Animated.timing(quoteOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(resolve)
    )

    try {
      const response = await fetch('https://api.quotable.io/random?tags=inspirational,motivational', {
        signal: AbortSignal.timeout?.(5000),
      })
      if (!response.ok) throw new Error('API error')
      const data = await response.json()
      setQuote({ content: data.content, author: data.author })
    } catch {
      // Use a random fallback quote
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]
      setQuote(fallback)
    } finally {
      setQuoteLoading(false)
      // Fade in new quote
      Animated.timing(quoteOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start()
    }
  }, [quoteOpacity])

  // Fetch quote on mount and every 30 seconds
  useEffect(() => {
    fetchQuote()
    quoteTimer.current = setInterval(() => fetchQuote(true), 30000)
    return () => clearInterval(quoteTimer.current)
  }, [fetchQuote])

  const fetchHomeData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      // 1. Fetch public.users fullname
      const { data: uData } = await supabase
        .from('users')
        .select('fullname')
        .eq('email', session.user.email)
        .maybeSingle()

      if (uData && uData.fullname) {
        setProfileName(uData.fullname)
      } else {
        const fallback = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || session.user.email || 'Learner'
        setProfileName(fallback)
      }

      // 2. Fetch activity streak
      const { data: sessions } = await supabase
        .from('flashcard_sessions')
        .select('created_at')
        .eq('user_id', uid)

      const { data: mcqRaw } = await supabase
        .from('multiple_choice_results')
        .select('answered_at')
        .eq('user_id', uid)

      const { data: tfRaw } = await supabase
        .from('true_false_results')
        .select('answered_at')
        .eq('user_id', uid)

      const ses = sessions ?? []
      const mcq = mcqRaw ?? []
      const tf = tfRaw ?? []

      const activityDays = new Set([
        ...ses.map(s => s.created_at?.slice(0,10)),
        ...mcq.map(r => r.answered_at?.slice(0,10)),
        ...tf.map(r => r.answered_at?.slice(0,10)),
      ].filter(Boolean))

      let streak = 0
      const today = new Date()
      for (let i = 0; i < 30; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0,10)
        if (activityDays.has(key)) {
          streak++
        } else if (i > 0) {
          break
        }
      }
      setStreakDays(streak)
    } catch (err) {
      console.warn('Error fetching home data:', err)
    }
  }, [])

  // Fetch CSE schedule & readiness on mount
  useEffect(() => {
    fetchCSESchedule()
    fetchReadiness()
    fetchRankings()
    fetchHomeData()
  }, [fetchCSESchedule, fetchReadiness, fetchRankings, fetchHomeData])

  // ─── Pull-to-refresh ───────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchQuote(), fetchCSESchedule(), fetchReadiness(), fetchRankings(), fetchHomeData()])
    setRefreshing(false)
  }, [fetchQuote, fetchCSESchedule, fetchReadiness, fetchRankings, fetchHomeData])

  // ─── Notification helpers ──────────────────────────────────────
  const openNotifications = () => {
    setNotifVisible(true)
    // Mark all as read when opened
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) Alert.alert('Error', error.message)
        },
      },
    ])
  }

  // ─── Render ────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10, paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', marginBottom: 0 }]}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Image
            source={require('../../../assets/loading.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.topRight}>
          {/* Streak badge */}
          <View style={styles.streakBadge}>
            <Feather name="zap" size={15} color={NAVY} />
            <Text style={styles.streakText}>{streakDays}</Text>
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            style={styles.bellWrap}
            onPress={openNotifications}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={26} color={NAVY} />
            {unreadCount > 0 && (
              <View style={styles.notifDot}>
                <Text style={styles.notifDotText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
          />
        }
      >

        {/* ── Hero Card ── */}
        <View style={styles.heroCard}>
          <Text style={styles.greeting}>Hello, {profileName}! 👋</Text>
          <Text style={styles.greetingSub}>Your CSE journey continues today.</Text>
          <TouchableOpacity
            style={styles.studyPlanBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('StudyPlan')}
          >
            <Feather name="book-open" size={16} color={NAVY} style={{ marginRight: 6 }} />
            <Text style={styles.studyPlanText}>Today's Study Plan</Text>
          </TouchableOpacity>
        </View>

        {/* ── Motivational Quote ── */}
        <View style={styles.quoteCard}>
          <View style={styles.quoteHeader}>
            <Feather name="message-circle" size={16} color="#b45309" />
            <Text style={styles.quoteLabel}>  Daily Motivation</Text>
            <TouchableOpacity
              style={styles.refreshQuoteBtn}
              onPress={() => fetchQuote()}
              activeOpacity={0.7}
            >
              <Feather name="refresh-cw" size={14} color="#b45309" />
            </TouchableOpacity>
          </View>
          {quoteLoading ? (
            <ActivityIndicator size="small" color="#b45309" style={{ marginVertical: 18 }} />
          ) : (
            <Animated.View style={{ opacity: quoteOpacity }}>
              <Text style={styles.quoteText}>
                "{quote?.content || '…'}"
              </Text>
              {quote?.author ? (
                <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              ) : null}
            </Animated.View>
          )}
        </View>

        {/* ── Metrics ── */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            {readinessLoading ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <Text style={styles.metricValue}>{readiness}%</Text>
            )}
            <Text style={styles.metricLabel}>Exam Readiness</Text>
          </View>
          <View style={styles.metricCard}>
            {cseLoading ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <Text style={styles.metricValue}>
                {cseSchedule?.daysLeft ?? '—'}{' '}
                <Text style={styles.metricUnit}>days</Text>
              </Text>
            )}
            <Text style={styles.metricLabel}>until next CSE exam</Text>
          </View>
        </View>

        {/* ── CSE Updates ── */}
        <View style={styles.updatesCard}>
          <Text style={styles.updatesTitle}>📢  CSE UPDATES</Text>

          {cseLoading ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginVertical: 8 }} />
          ) : (
            <>
              <View style={styles.updateRow}>
                <Text style={styles.updateLabel}>Next CSE Exam:</Text>
                <Text style={styles.updateValue}>
                  {cseSchedule?.label ?? 'TBA'}
                  {cseSchedule?.cycle ? `  (${cseSchedule.cycle})` : ''}
                </Text>
              </View>
              {cseSchedule?.appPeriod && (
                <View style={styles.updateRow}>
                  <Text style={styles.updateLabel}>Application Period:</Text>
                  <Text style={styles.updateValue}>{cseSchedule.appPeriod}</Text>
                </View>
              )}
              <View style={styles.updateRow}>
                <Text style={styles.updateLabel}>Days Remaining:</Text>
                <Text style={[styles.updateValue, { color: (cseSchedule?.daysLeft ?? 99) <= 30 ? '#fde68a' : '#fff' }]}>
                  {cseSchedule?.daysLeft ?? '—'} days
                </Text>
              </View>
              {cseSchedule?.source === 'official' && (
                <Text style={styles.updateSourceNote}>📌 Official dates from csc.gov.ph</Text>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.visitBtn}
            activeOpacity={0.85}
            onPress={() => Linking.openURL('https://www.csc.gov.ph/')}
          >
            <Feather name="external-link" size={14} color={NAVY} style={{ marginRight: 6 }} />
            <Text style={styles.visitBtnText}>Visit CSC Page</Text>
          </TouchableOpacity>
        </View>

        {/* ── Rankings / Leaderboard ── */}
        <View style={styles.rankingsCard}>
          <View style={styles.rankingHeaderRow}>
            <MaterialCommunityIcons name="trophy-outline" size={20} color={NAVY} />
            <Text style={styles.rankingsTitle}>Leaderboard Rankings</Text>
          </View>

          {rankingsLoading ? (
            <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 12 }} />
          ) : rankings.length === 0 ? (
            <Text style={styles.emptyRankingsText}>No performance records found yet.</Text>
          ) : (
            rankings.map((rank, idx) => {
              const medalColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : null
              return (
                <View key={rank.uid} style={styles.rankingRow}>
                  <View style={styles.rankLeft}>
                    {medalColor ? (
                      <Ionicons name="medal" size={18} color={medalColor} style={styles.rankBadge} />
                    ) : (
                      <Text style={styles.rankIndex}>{idx + 1}</Text>
                    )}
                    <Text style={styles.rankName} numberOfLines={1}>{rank.name}</Text>
                  </View>
                  <Text style={styles.rankScore}>{rank.score} pts</Text>
                </View>
              )
            })
          )}
        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionCard, styles.actionBlue]}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('MockExamHome', { from: 'Home' })}
          >
            <MaterialCommunityIcons name="file-document-edit-outline" size={32} color={NAVY} />
            <Text style={styles.actionText}>Take{'\n'}Mock Exam</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCream]}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('PracticeOverview', { typeId: 'Flashcards', from: 'Home' })}
          >
            <MaterialCommunityIcons name="cards-outline" size={32} color={NAVY} />
            <Text style={styles.actionText}>Review{'\n'}Flashcards</Text>
          </TouchableOpacity>
        </View>

        {/* ── Subject Areas ── */}
        <View style={styles.subjectCard}>
          <Text style={styles.subjectTitle}>Your Subject Areas</Text>
          {subjects.map((s) => (
            <View key={s.label} style={styles.subjectItem}>
              <View style={styles.subjectRow}>
                <Text style={styles.subjectLabel}>{s.label}</Text>
                <Text style={styles.subjectPct}>{Math.round(s.progress * 100)}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.max(s.progress * 100, 4)}%` },
                  ]}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.diagnosticBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('DiagnosticAssessment', { from: 'Home' })}
          >
            <Feather name="activity" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.diagnosticText}>Take Diagnostic</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Notification Modal ── */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotifVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNotifVisible(false)}
        />
        <View style={styles.notifSheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.notifSheetHeader}>
            <Text style={styles.notifSheetTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setNotifVisible(false)}>
              <Ionicons name="close" size={24} color={NAVY} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.length === 0 ? (
              <View style={styles.notifEmpty}>
                <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
                <Text style={styles.notifEmptyText}>No notifications yet</Text>
              </View>
            ) : (
              notifications.map((notif) => (
                <View
                  key={notif.id}
                  style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                >
                  <View style={styles.notifIconWrap}>
                    <MaterialCommunityIcons
                      name={notif.icon || 'bell'}
                      size={22}
                      color={notif.read ? '#94a3b8' : ACCENT}
                    />
                  </View>
                  <View style={styles.notifBody}>
                    <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]}>
                      {notif.title}
                    </Text>
                    <Text style={styles.notifText}>{notif.body}</Text>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                  </View>
                  {!notif.read && <View style={styles.unreadDot} />}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  logoImage: {
    width: 36,
    height: 36,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  bellWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  notifDotText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  // ── Hero Card ──
  heroCard: {
    backgroundColor: '#dbe8fb',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    color: '#1f3b63',
    marginBottom: 16,
  },
  studyPlanBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studyPlanText: {
    fontSize: 16,
    color: NAVY,
    fontWeight: '700',
  },

  // ── Quote Card ──
  quoteCard: {
    backgroundColor: '#fff8f0',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 20,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  refreshQuoteBtn: {
    padding: 4,
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#78350f',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '600',
    textAlign: 'right',
  },

  // ── Metrics ──
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '800',
    color: NAVY,
  },
  metricUnit: {
    fontSize: 13,
    fontWeight: '600',
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },

  // ── CSE Updates ──
  updatesCard: {
    backgroundColor: ACCENT,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  updatesTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  updateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  updateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },
  updateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  visitBtn: {
    marginTop: 14,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  visitBtnText: {
    fontSize: 15,
    color: NAVY,
    fontWeight: '700',
  },
  updateSourceNote: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Leaderboard ──
  rankingsCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  rankingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  rankingsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  emptyRankingsText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 10,
    fontWeight: '600',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 20,
    textAlign: 'center',
  },
  rankIndex: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    width: 20,
    textAlign: 'center',
  },
  rankName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  rankScore: {
    fontSize: 12,
    fontWeight: '800',
    color: ACCENT,
  },

  // ── Quick Actions ──
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionBlue: {
    backgroundColor: '#dbe8fb',
  },
  actionCream: {
    backgroundColor: '#fff8f0',
  },
  actionText: {
    fontSize: 15,
    lineHeight: 20,
    textAlign: 'center',
    color: NAVY,
    fontWeight: '700',
  },

  // ── Subject Areas ──
  subjectCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 16,
  },
  subjectItem: {
    marginBottom: 14,
  },
  subjectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subjectLabel: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '500',
  },
  subjectPct: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: '#e8edf5',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: NAVY,
  },
  diagnosticBtn: {
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  diagnosticText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },

  // ── Notification Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  notifSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '75%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  notifSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  notifSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
  },
  notifEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  notifEmptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#94a3b8',
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: '#fef9ff',
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifBody: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  notifTitleUnread: {
    color: NAVY,
    fontWeight: '700',
  },
  notifText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 6,
    flexShrink: 0,
  },
})