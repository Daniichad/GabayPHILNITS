import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, Image, Modal, Linking, ActivityIndicator,
  RefreshControl, Platform, StatusBar,
} from 'react-native'
import { supabase } from '../../../utils/supabase'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { getCache, setCache, clearCache } from '../../../utils/cache'
import { getUnsyncedPoints } from '../../../utils/database'
import { resolveUserTargetExam } from '../../../utils/targetExam'
import {
  addNotificationListener,
  cleanNotificationText,
  extractFirstName,
  formatNotificationTime,
  getNotificationIcon,
} from '../../../utils/notificationManager'

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


const NAVY = '#0f2747'
const ACCENT = '#d85e67'

const IP_DEFAULT_SUBJECTS = [
  { label: 'Technology', progress: 0 },
  { label: 'Management', progress: 0 },
  { label: 'Strategy', progress: 0 },
]

const FE_DEFAULT_SUBJECTS = [
  { label: 'Computer Systems & Architecture', progress: 0 },
  { label: 'Algorithms & Programming', progress: 0 },
  { label: 'Networks & Security', progress: 0 },
  { label: 'IT Management & Strategy', progress: 0 },
]

export default function Home({ session, navigation, route }) {
  const user = session?.user
  const insets = useSafeAreaInsets()
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    user?.email ||
    'Student'
  const firstName = extractFirstName(displayName, user?.email)

  // ─── State ─────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([])
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
  const [rankingTimeframe, setRankingTimeframe] = useState('all_time')
  const [profileName, setProfileName] = useState(() => firstName || 'Student')
  const [streakDays, setStreakDays] = useState(0)
  const [targetExamType, setTargetExamType] = useState('IP')
  const [subjects, setSubjectProgress] = useState(IP_DEFAULT_SUBJECTS)

  // Immediately hydrate streak & readiness from local cache on mount with zero network lag
  useEffect(() => {
    let isMounted = true
    Promise.all([
      getCache('home_streak_days'),
      getCache('home_readiness'),
      getCache('home_profile_name'),
    ]).then(([cachedStreak, cachedReadiness, cachedName]) => {
      if (!isMounted) return
      if (cachedStreak !== null && cachedStreak !== undefined) {
        setStreakDays(Number(cachedStreak))
      }
      if (cachedReadiness !== null && cachedReadiness !== undefined) {
        setReadiness(Number(cachedReadiness))
        setReadinessLoading(false)
      }
      if (cachedName && cachedName.toLowerCase() !== 'learner') {
        setProfileName(extractFirstName(cachedName))
      }
    }).catch(() => {})
    return () => { isMounted = false }
  }, [])

  const quoteTimer = useRef(null)
  const quoteOpacity = useRef(new Animated.Value(1)).current
  const notifSlideAnim = useRef(new Animated.Value(300)).current

  useEffect(() => {
    if (notifVisible) {
      Animated.timing(notifSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    } else {
      notifSlideAnim.setValue(300)
    }
  }, [notifVisible])

  // Open notifications modal if navigated with openNotifs param
  useEffect(() => {
    if (route?.params?.openNotifs) {
      setNotifVisible(true)
    }
  }, [route?.params?.openNotifs])

  // ─── Fetch Supabase & Dynamic In-App Notifications ───────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      // 1. Resolve current user identity
      let currentUser = user
      if (!currentUser) {
        try {
          const { data: sessionData } = await supabase.auth.getSession()
          currentUser = sessionData?.session?.user || null
        } catch (_) {}
      }

      const uid = currentUser?.id || null
      let currentFullName =
        currentUser?.user_metadata?.full_name ||
        currentUser?.user_metadata?.fullName ||
        profileName ||
        ''
      const currentEmail = currentUser?.email || ''

      if (!currentFullName && currentEmail) {
        try {
          const { data: uData } = await supabase
            .from('users')
            .select('fullname')
            .eq('email', currentEmail)
            .maybeSingle()
          if (uData?.fullname) {
            currentFullName = uData.fullname
          }
        } catch (_) {}
      }

      const userFirstName = extractFirstName(currentFullName, currentEmail).toLowerCase()
      const userFullNameLower = (currentFullName || '').toLowerCase()
      const userEmailPrefix = (currentEmail.split('@')[0] || '').toLowerCase()

      // 2. Dynamic in-app notices based on user metrics
      const generated = []
      if (streakDays > 0) {
        generated.push({
          id: 'streak_notice',
          icon: 'fire',
          iconColor: '#f59e0b',
          title: 'Study Streak! 🔥',
          body: `You're on a ${streakDays}-day study streak. Consistency is key!`,
          time: 'Active now',
          timestamp: Date.now(),
          isDbRead: false,
        })
      }

      if (cseSchedule && cseSchedule.daysLeft !== null && cseSchedule.daysLeft >= 0) {
        generated.push({
          id: 'exam_countdown_notice',
          icon: 'calendar-clock',
          iconColor: '#6366f1',
          title: 'PhilNITS Exam Reminder',
          body: `The next PhilNITS exam cycle is in ${cseSchedule.daysLeft} days. Stay focused!`,
          time: 'Upcoming',
          timestamp: Date.now() - 60000,
          isDbRead: false,
        })
      }

      if (readiness > 0) {
        generated.push({
          id: 'readiness_notice',
          icon: 'chart-line',
          iconColor: '#10b981',
          title: 'Exam Readiness Update',
          body: `Your estimated readiness is ${readiness}%. Keep taking practice tests!`,
          time: 'Recent',
          timestamp: Date.now() - 120000,
          isDbRead: false,
        })
      }

      // 3. Fetch from Supabase public.notifications
      let supabaseNotifs = []
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30)

        if (!error && Array.isArray(data)) {
          const now = new Date()
          const relevant = data.filter((n) => {
            // Check status: ignore Drafts, only show Scheduled if scheduled_at is past or now
            const status = (n.status || '').toLowerCase()
            if (status === 'draft') return false
            if (status === 'scheduled') {
              if (n.scheduled_at && new Date(n.scheduled_at) > now) {
                return false
              }
            }

            const aud = (n.target_audience || '').trim()
            const audLower = aud.toLowerCase()

            // Broadcast / General announcements -> visible to everyone
            if (!aud || audLower.includes('all user') || audLower === 'all' || audLower.includes('broadcast')) {
              return true
            }

            // Direct notification check
            if (audLower.startsWith('direct:') || audLower.includes('specific user')) {
              const directTarget = audLower.replace(/^direct:\s*/i, '').trim()
              const uidMatches = n.user_id && uid && n.user_id === uid
              const nameMatches =
                directTarget &&
                (userFirstName.includes(directTarget) ||
                  userFullNameLower.includes(directTarget) ||
                  userEmailPrefix.includes(directTarget) ||
                  directTarget.includes(userFirstName))

              return Boolean(uidMatches || nameMatches)
            }

            // Segment-based campaigns (Struggling, Streak, Inactive): delivered to user's notification center
            return true
          })

          supabaseNotifs = relevant.map((notif) => {
            const iconInfo = getNotificationIcon(notif.type, notif.title)
            const notifDate = notif.created_at || notif.scheduled_at
            return {
              id: String(notif.id),
              icon: iconInfo.name,
              iconColor: iconInfo.color,
              title: cleanNotificationText(notif.title) || 'Notification',
              body: cleanNotificationText(notif.message) || '',
              time: formatNotificationTime(notifDate),
              timestamp: notifDate ? new Date(notifDate).getTime() : 0,
              isDbRead: notif.is_read === true,
            }
          })
        }
      } catch (err) {
        console.warn('Failed to fetch Supabase notifications:', err)
      }

      // Combine both sources
      const allNotifs = [...generated, ...supabaseNotifs]

      // Sort newest first
      allNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))

      // Load read state from cache
      const readStates = (await getCache('notifications_read_state')) || {}

      const merged = allNotifs.map((n) => ({
        ...n,
        read: n.isDbRead === true || readStates[n.id] === true,
      }))

      setNotifications(merged)
    } catch (err) {
      console.warn('fetchNotifications error:', err)
    }
  }, [user, profileName, streakDays, cseSchedule, readiness])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Real-time listener to update badge and notification sheet dynamically
  useEffect(() => {
    const unsubscribe = addNotificationListener(() => {
      fetchNotifications()
    })
    return () => {
      unsubscribe()
    }
  }, [fetchNotifications])

  const markAllNotifsRead = async () => {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    setNotifications(updated)

    const readStates = (await getCache('notifications_read_state')) || {}
    updated.forEach((n) => {
      readStates[n.id] = true
    })
    await setCache('notifications_read_state', readStates)

    try {
      const ids = updated.map((n) => n.id)
      await supabase.from('notifications').update({ is_read: true }).in('id', ids)
    } catch (_) {}
  }

  const markSingleNotifRead = async (id) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    setNotifications(updated)

    const readStates = (await getCache('notifications_read_state')) || {}
    readStates[id] = true
    await setCache('notifications_read_state', readStates)

    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    } catch (_) {}
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  // ─── Dynamic PhilNITS semi-annual cycles (Spring: April, Autumn: October) ──
  const getNextPhilNitsExamCycle = () => {
    const now = new Date()
    const year = now.getFullYear()
    const candidates = []

    for (let y = year; y <= year + 2; y++) {
      // April cycle: 4th Sunday of April
      const apr1 = new Date(y, 3, 1)
      const aprFirstSun = ((7 - apr1.getDay()) % 7) + 1
      const aprExamDate = new Date(y, 3, aprFirstSun + 21)
      candidates.push({
        date: aprExamDate,
        label: aprExamDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
        appPeriod: `January 15 – March 20, ${y}`,
        cycle: `${y} Spring Cycle (April)`,
      })

      // October cycle: 4th Sunday of October
      const oct1 = new Date(y, 9, 1)
      const octFirstSun = ((7 - oct1.getDay()) % 7) + 1
      const octExamDate = new Date(y, 9, octFirstSun + 21)
      candidates.push({
        date: octExamDate,
        label: octExamDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
        appPeriod: `July 15 – September 20, ${y}`,
        cycle: `${y} Autumn Cycle (October)`,
      })
    }

    const future = candidates.filter((c) => c.date > now).sort((a, b) => a.date - b.date)
    return future[0] || candidates[0]
  }

  // ─── Fetch PhilNITS Schedule ────────────────────────────────────
  const fetchCSESchedule = useCallback(async () => {
    const cached = await getCache('home_cse_schedule')
    if (cached) {
      setCseSchedule(cached)
      setCseLoading(false)
    } else {
      setCseLoading(true)
    }

    const nextCycle = getNextPhilNitsExamCycle()
    const now = new Date()
    const diffDays = Math.ceil((nextCycle.date - now) / (1000 * 60 * 60 * 24))
    const payload = {
      date: nextCycle.date.toISOString(),
      label: nextCycle.label,
      daysLeft: Math.max(diffDays, 0),
      appPeriod: nextCycle.appPeriod,
      cycle: nextCycle.cycle,
      source: 'philnits_official',
    }
    setCseSchedule(payload)
    await setCache('home_cse_schedule', payload)
    setCseLoading(false)
  }, [])

  const fetchReadiness = useCallback(async () => {
    const cached = await getCache('home_readiness')
    if (cached !== null && cached !== undefined) {
      setReadiness(Number(cached))
      setReadinessLoading(false)
    } else {
      setReadinessLoading(true)
    }
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      // Fetch user's registered target exam level to filter readiness strictly to their exam
      const targetTrack = await resolveUserTargetExam(uid, 'IP')
      const isFE = targetTrack === 'FE'

      // Query mock exam attempts, MCQ, True/False, Matching, and Flashcards concurrently
      const [attRes, mcqRes, tfRes, matchRes, sesRes] = await Promise.allSettled([
        supabase
          .from('mock_exam_attempts')
          .select('score, total_questions, correct_count, completed_at, mock_exam_configs(title, level_key)')
          .eq('user_id', uid)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(20),
        supabase
          .from('multiple_choice_results')
          .select('is_correct, question_id')
          .eq('user_id', uid),
        supabase
          .from('true_false_results')
          .select('is_correct, question_id')
          .eq('user_id', uid),
        supabase
          .from('matching_results')
          .select('id, pairs_matched, pairs_total, mistakes')
          .eq('user_id', uid),
        supabase
          .from('flashcard_sessions')
          .select('id, cards_seen, cards_total, completed')
          .eq('user_id', uid),
      ])

      const attempts = attRes.status === 'fulfilled' ? (attRes.value.data ?? []) : []
      const mcqList = mcqRes.status === 'fulfilled' ? (mcqRes.value.data ?? []) : []
      const tfList = tfRes.status === 'fulfilled' ? (tfRes.value.data ?? []) : []
      const matchList = matchRes.status === 'fulfilled' ? (matchRes.value.data ?? []) : []
      const sesList = sesRes.status === 'fulfilled' ? (sesRes.value.data ?? []) : []

      // 1. Filter mock attempts matching target track
      const activeAttempts = attempts.filter(a => {
        const lk = (a.mock_exam_configs?.level_key || '').toLowerCase()
        const title = (a.mock_exam_configs?.title || '').toLowerCase()
        if (targetTrack === 'FE') {
          return lk.includes('fe') || title.includes('fundamental') || title.includes('fe')
        } else {
          return lk.includes('ip') || title.includes('passport') || title.includes('ip')
        }
      })

      const mocksTaken = activeAttempts.length
      let mockScore = 0
      if (mocksTaken > 0) {
        const recentMocks = activeAttempts.slice(0, 3)
        const avgRecent = recentMocks.reduce((sum, a) => {
          const p = a.total_questions > 0 ? (a.correct_count / a.total_questions) * 100 : 0
          return sum + p
        }, 0) / recentMocks.length
        const mockConfidence = Math.min(1, mocksTaken / 3)
        mockScore = (avgRecent / 100) * mockConfidence
      }

      // 2. Practice Scores: MCQ (0.35, target 100), Match (0.20, target 40), TF (0.20, target 60), Flashcards (0.25, target 80)
      const mcqAttempts = mcqList.length
      const mcqCorrect = mcqList.filter(r => r.is_correct).length
      const mcqAccuracy = mcqAttempts > 0 ? (mcqCorrect / mcqAttempts) : 0
      const mcqConfidence = Math.min(1, mcqAttempts / 100)
      const mcqScore = mcqAccuracy * mcqConfidence

      const matchAttempts = matchList.reduce((sum, m) => sum + (m.pairs_matched || m.pairs_total || 0), 0)
      const matchCorrect = matchList.reduce((sum, m) => sum + (m.pairs_matched || 0), 0)
      const matchMistakes = matchList.reduce((sum, m) => sum + (m.mistakes || 0), 0)
      const matchTrials = matchCorrect + matchMistakes
      const matchAccuracy = matchTrials > 0 ? (matchCorrect / matchTrials) : (matchAttempts > 0 ? 1 : 0)
      const matchConfidence = Math.min(1, matchAttempts / 40)
      const matchScore = matchAccuracy * matchConfidence

      const tfAttempts = tfList.length
      const tfCorrect = tfList.filter(r => r.is_correct).length
      const tfAccuracy = tfAttempts > 0 ? (tfCorrect / tfAttempts) : 0
      const tfConfidence = Math.min(1, tfAttempts / 60)
      const tfScore = tfAccuracy * tfConfidence

      const fcAttempts = sesList.reduce((sum, s) => sum + (s.cards_seen || (s.completed ? (s.cards_total || 10) : 0)), 0)
      const fcAccuracy = fcAttempts > 0 ? 1.0 : 0
      const fcConfidence = Math.min(1, fcAttempts / 80)
      const fcScore = fcAccuracy * fcConfidence

      const practiceScore = (
        0.35 * mcqScore +
        0.20 * matchScore +
        0.20 * tfScore +
        0.25 * fcScore
      )

      // Combined Exam Readiness matching Performance.js (40% practice + 60% mock)
      const score = Math.round((0.40 * practiceScore + 0.60 * mockScore) * 100)
      setReadiness(score)
      await setCache('home_readiness', score)
    } catch (err) {
      console.warn('Error fetching readiness:', err)
      setReadiness(0)
    } finally {
      setReadinessLoading(false)
    }
  }, [])

  const fetchRankings = useCallback(async (selectedTimeframe = rankingTimeframe) => {
    const cacheKey = `home_rankings_${selectedTimeframe}`
    const cached = (await getCache(cacheKey)) || (await getCache('home_rankings'))
    if (cached && Array.isArray(cached) && cached.length > 0) {
      const sanitized = cached.map(r => ({
        ...r,
        name: (!r.name || r.name.toLowerCase() === 'learner')
          ? (r.isCurrentUser ? (extractFirstName(profileName) || 'You') : 'Student')
          : extractFirstName(r.name)
      }))
      setRankings(sanitized)
      setRankingsLoading(false)
    } else {
      setRankingsLoading(true)
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const currentUserId = session?.user?.id

      let leaderboardData = []
      const viewName = selectedTimeframe === 'monthly'
        ? 'leaderboard_monthly'
        : selectedTimeframe === 'weekly'
          ? 'leaderboard_weekly'
          : 'leaderboard_all_time'

      // Strategy 1: Fetch from official leaderboard view
      const { data: viewData, error: viewErr } = await supabase
        .from(viewName)
        .select('user_id, total_points')
        .limit(20)

      if (!viewErr && viewData && viewData.length > 0) {
        leaderboardData = viewData.map(r => ({
          user_id: r.user_id,
          points: Number(r.total_points || 0),
        }))
      } else {
        // Strategy 2: Query points_ledger directly
        let ledgerQuery = supabase.from('points_ledger').select('user_id, points, created_at')
        if (selectedTimeframe === 'monthly') {
          const startOfMonth = new Date()
          startOfMonth.setDate(1)
          startOfMonth.setHours(0, 0, 0, 0)
          ledgerQuery = ledgerQuery.gte('created_at', startOfMonth.toISOString())
        } else if (selectedTimeframe === 'weekly') {
          const startOfWeek = new Date()
          const day = startOfWeek.getDay()
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
          startOfWeek.setDate(diff)
          startOfWeek.setHours(0, 0, 0, 0)
          ledgerQuery = ledgerQuery.gte('created_at', startOfWeek.toISOString())
        }

        const { data: ledgerData, error: ledgerErr } = await ledgerQuery

        if (!ledgerErr && ledgerData && ledgerData.length > 0) {
          const userMap = {}
          ledgerData.forEach(row => {
            if (!userMap[row.user_id]) userMap[row.user_id] = 0
            userMap[row.user_id] += Number(row.points || 0)
          })
          leaderboardData = Object.keys(userMap).map(uid => ({
            user_id: uid,
            points: userMap[uid],
          }))
        } else {
          // Strategy 3: Legacy fallback calculations
          const { data: publicUsers } = await supabase
            .from('users')
            .select('id, email, fullname, role')
            .neq('role', 'admin')

          const { data: attempts } = await supabase
            .from('mock_exam_attempts')
            .select('user_id, correct_count')
            .eq('status', 'completed')

          const { data: mcqRaw } = await supabase.from('multiple_choice_results').select('user_id, is_correct')
          const { data: tfRaw } = await supabase.from('true_false_results').select('user_id, is_correct')
          const { data: matchRaw } = await supabase.from('matching_results').select('user_id, completed, mistakes')
          const { data: sessions } = await supabase.from('flashcard_sessions').select('user_id, completed')

          const userScores = {}
          if (publicUsers) {
            publicUsers.forEach(u => {
              userScores[u.id] = { name: extractFirstName(u.fullname, u.email), points: 0 }
            })
          }
          if (attempts) {
            attempts.forEach(att => {
              if (userScores[att.user_id]) {
                userScores[att.user_id].points += 150 + (att.correct_count || 0) * 2
              }
            })
          }
          if (mcqRaw) {
            mcqRaw.forEach(r => {
              if (userScores[r.user_id]) {
                userScores[r.user_id].points += 10 + (r.is_correct ? 5 : 0)
              }
            })
          }
          if (tfRaw) {
            tfRaw.forEach(r => {
              if (userScores[r.user_id]) {
                userScores[r.user_id].points += 10 + (r.is_correct ? 5 : 0)
              }
            })
          }
          if (matchRaw) {
            matchRaw.forEach(r => {
              if (userScores[r.user_id] && r.completed) {
                userScores[r.user_id].points += 50 + Math.max(10, 30 - (r.mistakes || 0) * 2)
              }
            })
          }
          if (sessions) {
            sessions.forEach(s => {
              if (userScores[s.user_id]) {
                userScores[s.user_id].points += s.completed ? 30 : 10
              }
            })
          }

          leaderboardData = Object.keys(userScores).map(uid => ({
            user_id: uid,
            points: userScores[uid].points,
          }))
        }
      }

      // Include local unsynced points for current user
      if (currentUserId) {
        try {
          const unsynced = await getUnsyncedPoints()
          const unsyncedTotal = unsynced.reduce((sum, item) => sum + (Number(item.points) || 0), 0)
          const target = leaderboardData.find(item => item.user_id === currentUserId)
          if (target) {
            target.points += unsyncedTotal
          } else if (unsyncedTotal > 0 || leaderboardData.length === 0) {
            leaderboardData.push({ user_id: currentUserId, points: unsyncedTotal })
          }
        } catch (e) {
          console.warn('Could not read unsynced local points:', e)
        }
      }

      // Fetch user names
      const userIds = leaderboardData.map(item => item.user_id).filter(Boolean)
      const nameMap = {}

      // Pre-resolve current user's real first name
      const myResolvedFirstName = extractFirstName(
        profileName || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.fullName,
        session?.user?.email
      )
      if (currentUserId) {
        nameMap[currentUserId] = myResolvedFirstName
      }

      if (userIds.length > 0) {
        // 1. Fetch real names from app_ratings (which stores user_id UUID -> user_name)
        try {
          const { data: ratingsData } = await supabase
            .from('app_ratings')
            .select('user_id, user_name')
            .in('user_id', userIds)

          if (ratingsData) {
            ratingsData.forEach(r => {
              if (r.user_id && r.user_name) {
                nameMap[r.user_id] = extractFirstName(r.user_name)
              }
            })
          }
        } catch (e) {
          console.warn('Error fetching names from app_ratings:', e)
        }

        // 2. Fetch real names from points_ledger metadata
        try {
          const { data: ledgerMeta } = await supabase
            .from('points_ledger')
            .select('user_id, metadata')
            .in('user_id', userIds)

          if (ledgerMeta) {
            ledgerMeta.forEach(row => {
              if (row.user_id && !nameMap[row.user_id] && row.metadata?.user_name) {
                nameMap[row.user_id] = extractFirstName(row.metadata.user_name)
              }
            })
          }
        } catch (e) {
          console.warn('Error fetching names from points_ledger metadata:', e)
        }

        // 3. Query users table (only filter on numeric IDs if present to avoid bigint syntax error, and match current user by email)
        try {
          const numericIds = userIds.filter(id => !isNaN(Number(id)))
          let usersQuery = supabase.from('users').select('id, fullname, email')
          if (numericIds.length > 0) {
            usersQuery = usersQuery.in('id', numericIds)
          }

          const { data: usersData } = await usersQuery

          if (usersData) {
            usersData.forEach(u => {
              const uFirst = extractFirstName(u.fullname, u.email)
              if (u.id) {
                nameMap[String(u.id)] = uFirst
                nameMap[u.id] = uFirst
              }
              if (session?.user?.email && u.email && u.email.toLowerCase() === session.user.email.toLowerCase()) {
                if (currentUserId) {
                  nameMap[currentUserId] = uFirst
                }
              }
            })
          }
        } catch (e) {
          console.warn('Error fetching user names from users table:', e)
        }
      }

      const finalized = leaderboardData.map(item => {
        let name = nameMap[item.user_id]
        if (!name && item.user_id === currentUserId) {
          name = myResolvedFirstName || 'You'
        }
        return {
          uid: item.user_id,
          name: name ? extractFirstName(name) : 'Student',
          score: item.points,
          isCurrentUser: item.user_id === currentUserId,
        }
      })

      finalized.sort((a, b) => b.score - a.score)
      const topRankings = finalized.slice(0, 5)

      setRankings(topRankings)
      await setCache(cacheKey, topRankings)
    } catch (err) {
      console.warn('Error fetching rankings:', err)
    } finally {
      setRankingsLoading(false)
    }
  }, [profileName, rankingTimeframe])



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
    const cachedName = await getCache('home_profile_name')
    const cachedStreak = await getCache('home_streak_days')
    const cachedSubjects = await getCache('home_subject_progress')

    if (cachedStreak !== null && cachedStreak !== undefined) {
      setStreakDays(Number(cachedStreak))
    }
    if (cachedName && cachedName.toLowerCase() !== 'learner') {
      setProfileName(extractFirstName(cachedName))
    }
    if (cachedSubjects && Array.isArray(cachedSubjects)) {
      setSubjectProgress(cachedSubjects)
    }

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

      let resolvedName = firstName || 'Student'
      if (uData && uData.fullname) {
        resolvedName = extractFirstName(uData.fullname, session.user.email)
      } else if (session.user.user_metadata?.full_name || session.user.user_metadata?.fullName) {
        resolvedName = extractFirstName(session.user.user_metadata?.full_name || session.user.user_metadata?.fullName)
      } else if (session.user.email) {
        resolvedName = extractFirstName('', session.user.email)
      }
      setProfileName(resolvedName)
      await setCache('home_profile_name', resolvedName)

      // 2. Fetch activity streak across ALL 5 activities (flashcards, MCQ, True/False, Matching, and Mock Exams)
      const [sesRes, mcqRes, tfRes, matchRes, mockRes] = await Promise.allSettled([
        supabase.from('flashcard_sessions').select('created_at, completed_at, started_at').eq('user_id', uid),
        supabase.from('multiple_choice_results').select('answered_at').eq('user_id', uid),
        supabase.from('true_false_results').select('answered_at').eq('user_id', uid),
        supabase.from('matching_results').select('created_at, completed_at').eq('user_id', uid),
        supabase.from('mock_exam_attempts').select('created_at, completed_at, started_at').eq('user_id', uid),
      ])

      const ses = sesRes.status === 'fulfilled' ? (sesRes.value.data ?? []) : []
      const mcq = mcqRes.status === 'fulfilled' ? (mcqRes.value.data ?? []) : []
      const tf = tfRes.status === 'fulfilled' ? (tfRes.value.data ?? []) : []
      const match = matchRes.status === 'fulfilled' ? (matchRes.value.data ?? []) : []
      const mock = mockRes.status === 'fulfilled' ? (mockRes.value.data ?? []) : []

      const activityDays = new Set([
        ...ses.map(s => (s.completed_at || s.started_at || s.created_at)?.slice(0, 10)),
        ...mcq.map(r => r.answered_at?.slice(0, 10)),
        ...tf.map(r => r.answered_at?.slice(0, 10)),
        ...match.map(m => (m.completed_at || m.created_at)?.slice(0, 10)),
        ...mock.map(m => (m.completed_at || m.started_at || m.created_at)?.slice(0, 10)),
      ].filter(Boolean))

      let streak = 0
      const today = new Date()
      for (let i = 0; i < 30; i++) {
        const d = new Date(today); d.setDate(today.getDate() - i)
        const key = d.toISOString().slice(0, 10)
        if (activityDays.has(key)) {
          streak++
        } else if (i > 0) {
          break
        }
      }
      setStreakDays(streak)
      await setCache('home_streak_days', streak)

      // 3. Fetch target exam level to determine allowed subject areas
      const activeTrack = await resolveUserTargetExam(uid, 'IP')
      const isFE = activeTrack === 'FE'

      setTargetExamType(activeTrack)
      const targetDefaultSubjects = isFE ? FE_DEFAULT_SUBJECTS : IP_DEFAULT_SUBJECTS

      // 4. Fetch MCQ + TF results strictly isolated to user's target exam
      const { data: mcqPerformance } = await supabase
        .from('multiple_choice_results')
        .select(`
          is_correct,
          multiple_choice_questions (
            exam_level,
            fe_section,
            practice_categories (
              name,
              exam_level,
              fe_section
            )
          )
        `)
        .eq('user_id', uid)

      const { data: tfPerformance } = await supabase
        .from('true_false_results')
        .select(`
          is_correct,
          true_false_questions (
            exam_level,
            fe_section,
            practice_categories (
              name,
              exam_level,
              fe_section
            )
          )
        `)
        .eq('user_id', uid)

      const performanceMap = {}
      targetDefaultSubjects.forEach(s => {
        performanceMap[s.label] = { correct: 0, total: 0 }
      })

      const mapCategory = (name) => {
        if (!name) return null
        const n = String(name).trim()
        if (isFE) {
          if (n === 'Computer Systems & Architecture' || n.includes('Architecture') || n.includes('Computer Systems') || n === 'Subject A') return 'Computer Systems & Architecture'
          if (n === 'Algorithms & Programming' || n.includes('Algorithms & Programming') || (n.includes('Programming') && !n.includes('Data Structure')) || n === 'Subject B') return 'Algorithms & Programming'
          if (n === 'Networks & Security' || n.includes('Networks & Security') || n.includes('Network') || (n.includes('Security') && !n.includes('Design'))) return 'Networks & Security'
          if (n === 'IT Management & Strategy' || n.includes('IT Management & Strategy') || n.includes('Management & Strategy')) return 'IT Management & Strategy'
          return null
        } else {
          if (n === 'Technology' || n.includes('Hardware') || n.includes('Software') || n.includes('Database') || n.includes('Network') || n.includes('Security') || n.includes('Computer Systems')) return 'Technology'
          if (n === 'Management' || n.includes('Project Management') || n.includes('IT Service Management') || n.includes('Audit')) return 'Management'
          if (n === 'Strategy' || n.includes('Corporate Strategy') || n.includes('Business') || n.includes('Legal')) return 'Strategy'
          return null
        }
      }

      if (mcqPerformance) {
        mcqPerformance.forEach(r => {
          const q = r.multiple_choice_questions
          const itemTrack = q?.exam_level || q?.practice_categories?.exam_level
          if (itemTrack && itemTrack.toUpperCase() !== activeTrack) return // STRICT SEPARATION: Never mix IP and FE
          const rawName = q?.practice_categories?.name
          const mapped = mapCategory(rawName)
          if (mapped && performanceMap[mapped] !== undefined) {
            performanceMap[mapped].total++
            if (r.is_correct) performanceMap[mapped].correct++
          }
        })
      }

      if (tfPerformance) {
        tfPerformance.forEach(r => {
          const q = r.true_false_questions
          const itemTrack = q?.exam_level || q?.practice_categories?.exam_level
          if (itemTrack && itemTrack.toUpperCase() !== activeTrack) return // STRICT SEPARATION: Never mix IP and FE
          const rawName = q?.practice_categories?.name
          const mapped = mapCategory(rawName)
          if (mapped && performanceMap[mapped] !== undefined) {
            performanceMap[mapped].total++
            if (r.is_correct) performanceMap[mapped].correct++
          }
        })
      }

      const updatedSubjects = targetDefaultSubjects.map(s => {
        const stats = performanceMap[s.label] || { correct: 0, total: 0 }
        const progress = stats.total > 0 ? (stats.correct / stats.total) : 0
        return { label: s.label, progress }
      })

      setSubjectProgress(updatedSubjects)
      await setCache('home_subject_progress', updatedSubjects)
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
    fetchNotifications()
  }, [fetchCSESchedule, fetchReadiness, fetchRankings, fetchHomeData, fetchNotifications])

  // Re-fetch rankings, readiness, home data, and notifications when Home screen comes into focus
  useFocusEffect(
    useCallback(() => {
      // Immediately hydrate cached streak and readiness on screen focus with zero lag
      Promise.all([
        getCache('home_streak_days'),
        getCache('home_readiness'),
      ]).then(([cachedStreak, cachedReadiness]) => {
        if (cachedStreak !== null && cachedStreak !== undefined) {
          setStreakDays(Number(cachedStreak))
        }
        if (cachedReadiness !== null && cachedReadiness !== undefined) {
          setReadiness(Number(cachedReadiness))
          setReadinessLoading(false)
        }
      }).catch(() => {})

      fetchRankings()
      fetchReadiness()
      fetchHomeData()
      fetchNotifications()
    }, [fetchRankings, fetchReadiness, fetchHomeData, fetchNotifications])
  )

  // ─── Pull-to-refresh ───────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    // Clear cache first on pull-to-refresh to ensure loading live data
    await clearCache('home_cse_schedule')
    await clearCache('home_readiness')
    await clearCache('home_rankings')
    await clearCache('home_profile_name')
    await clearCache('home_streak_days')
    await clearCache('home_subject_progress')
    await Promise.all([
      fetchQuote(),
      fetchCSESchedule(),
      fetchReadiness(),
      fetchRankings(),
      fetchHomeData(),
      fetchNotifications()
    ])
    setRefreshing(false)
  }, [fetchQuote, fetchCSESchedule, fetchReadiness, fetchRankings, fetchHomeData, fetchNotifications])

  // ─── Notification helpers ──────────────────────────────────────
  const openNotifications = () => {
    setNotifVisible(true)
  }

  const closeNotifications = () => {
    Animated.timing(notifSlideAnim, {
      toValue: 300,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setNotifVisible(false)
    })
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
        <Image
          source={require('../../../assets/loading.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <View style={styles.topRight}>
          {/* Streak badge */}
          <TouchableOpacity 
            style={styles.streakBadge}
            onPress={() => {
              const serializableSchedule = cseSchedule ? {
                ...cseSchedule,
                date: cseSchedule.date instanceof Date ? cseSchedule.date.toISOString() : cseSchedule.date,
              } : null
              navigation.navigate('ActivityCalendar', { streakDays, cseSchedule: serializableSchedule, profileName })
            }}
            activeOpacity={0.7}
          >
            <Feather name="zap" size={18} color={NAVY} />
            <Text style={styles.streakText}>{streakDays}</Text>
          </TouchableOpacity>

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
          <Text style={styles.greeting}>Hello, {profileName}!</Text>
          <Text style={styles.greetingSub}>Your PhilNITS certification journey continues today.</Text>
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
            <Text style={styles.metricLabel}>until next PhilNITS exam</Text>
          </View>
        </View>

        {/* ── PhilNITS Updates ── */}
        <View style={styles.updatesCard}>
          <Text style={styles.updatesTitle}>PHILNITS UPDATES</Text>

          {cseLoading ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginVertical: 8 }} />
          ) : (
            <>
              <View style={styles.updateRow}>
                <Text style={styles.updateLabel}>Next PhilNITS Exam:</Text>
                <Text style={styles.updateValue}>{cseSchedule?.label ?? 'TBA'}</Text>
              </View>
              {cseSchedule?.cycle && (
                <View style={styles.updateRow}>
                  <Text style={styles.updateLabel}>Exam Cycle:</Text>
                  <Text style={styles.updateValue}>{cseSchedule.cycle}</Text>
                </View>
              )}
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
              <Text style={styles.updateSourceNote}>Official semi-annual ITPEC cycle</Text>
            </>
          )}

          <TouchableOpacity
            style={styles.visitBtn}
            activeOpacity={0.85}
            onPress={() => Linking.openURL('https://www.philnits.org/')}
          >
            <Feather name="external-link" size={14} color={NAVY} style={{ marginRight: 6 }} />
            <Text style={styles.visitBtnText}>Visit PhilNITS Page</Text>
          </TouchableOpacity>
        </View>

        {/* ── Rankings / Leaderboard ── */}
        <View style={styles.rankingsCard}>
          <View style={styles.rankingHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="trophy-outline" size={20} color={NAVY} />
              <Text style={styles.rankingsTitle}>Leaderboard Rankings</Text>
            </View>
          </View>

          {/* Timeframe selector tabs */}
          <View style={styles.timeframeTabs}>
            {[
              { id: 'all_time', label: 'All Time' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'weekly', label: 'Weekly' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.timeframeTab, rankingTimeframe === tab.id && styles.timeframeTabActive]}
                onPress={() => {
                  setRankingTimeframe(tab.id)
                  fetchRankings(tab.id)
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.timeframeTabText, rankingTimeframe === tab.id && styles.timeframeTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {rankingsLoading ? (
            <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 18 }} />
          ) : rankings.length === 0 ? (
            <Text style={styles.emptyRankingsText}>No performance records found yet.</Text>
          ) : (
            rankings.map((rank, idx) => {
              const medalColor = idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : null
              return (
                <View key={rank.uid} style={[styles.rankingRow, rank.isCurrentUser && styles.currentUserRankingRow]}>
                  <View style={styles.rankLeft}>
                    {medalColor ? (
                      <Ionicons name="medal" size={18} color={medalColor} style={styles.rankBadge} />
                    ) : (
                      <Text style={styles.rankIndex}>{idx + 1}</Text>
                    )}
                    <Text style={[styles.rankName, rank.isCurrentUser && styles.currentUserRankText]} numberOfLines={1}>
                      {extractFirstName(rank.name)} {rank.isCurrentUser ? '(You)' : ''}
                    </Text>
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
            onPress={() => navigation?.navigate('Performance')}
          >
            <MaterialCommunityIcons name="chart-box-outline" size={32} color={NAVY} />
            <Text style={styles.actionText}>Performance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Notification Modal ── */}
      <Modal
        visible={notifVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNotifications}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeNotifications}
          />
          <Animated.View style={[styles.notifSheet, { transform: [{ translateY: notifSlideAnim }] }]}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.notifSheetHeader}>
              <View style={styles.notifHeaderTitleRow}>
                <Text style={styles.notifSheetTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.notifCountBadge}>
                    <Text style={styles.notifCountBadgeText}>{unreadCount} new</Text>
                  </View>
                )}
              </View>
              <View style={styles.notifHeaderActions}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={markAllNotifsRead}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.markAllReadBtn}
                  >
                    <Text style={styles.markAllReadText}>Mark all as read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={closeNotifications}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.notifCloseBtn}
                >
                  <Ionicons name="close" size={24} color={NAVY} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.notifEmptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((notif) => (
                  <TouchableOpacity
                    key={notif.id}
                    style={[styles.notifItem, !notif.read && styles.notifItemUnread]}
                    activeOpacity={0.7}
                    onPress={() => markSingleNotifRead(notif.id)}
                  >
                    <View style={[styles.notifIconWrap, !notif.read && styles.notifIconWrapUnread]}>
                      <MaterialCommunityIcons
                        name={notif.icon || 'bell-outline'}
                        size={22}
                        color={notif.read ? '#94a3b8' : (notif.iconColor || ACCENT)}
                      />
                    </View>
                    <View style={styles.notifBody}>
                      <View style={styles.notifTitleRow}>
                        <Text style={[styles.notifTitle, !notif.read && styles.notifTitleUnread]} numberOfLines={1}>
                          {notif.title}
                        </Text>
                        <Text style={styles.notifTime}>{notif.time}</Text>
                      </View>
                      <Text style={[styles.notifText, !notif.read && styles.notifTextUnread]}>
                        {notif.body}
                      </Text>
                    </View>
                    {!notif.read && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animated.View>
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
  logoImage: {
    width: 36,
    height: 36,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  streakText: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  bellWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 1,
    right: 1,
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

  // ── PhilNITS Updates ──
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
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 12,
  },
  updateLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    flexShrink: 0,
  },
  updateValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    flexShrink: 1,
    textAlign: 'right',
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
  timeframeTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  timeframeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 9,
  },
  timeframeTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  timeframeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  timeframeTabTextActive: {
    color: NAVY,
    fontWeight: '700',
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
  currentUserRankingRow: {
    backgroundColor: '#f0f7ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 0,
    marginVertical: 2,
  },
  currentUserRankText: {
    color: NAVY,
    fontWeight: '800',
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
  subjectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
  },
  examBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  examBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  notifHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notifCountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  notifCountBadgeText: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '700',
  },
  markAllReadBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markAllReadText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  notifCloseBtn: {
    padding: 2,
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#ffffff',
    marginVertical: 4,
    gap: 12,
  },
  notifItemUnread: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
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
  notifIconWrapUnread: {
    backgroundColor: '#eff6ff',
  },
  notifBody: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  notifTitleUnread: {
    color: NAVY,
    fontWeight: '700',
  },
  notifText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 2,
  },
  notifTextUnread: {
    color: '#334155',
  },
  notifTime: {
    fontSize: 11,
    color: '#94a3b8',
    flexShrink: 0,
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