import React, { useEffect, useState, useMemo } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Calendar } from 'react-native-calendars'
import { supabase } from '../../../utils/supabase'
import { getPHDateKey, getPHDateKeyOffset, utcToPHDateKey, getNextPhilNitsExamCycle } from '../../../utils/dateHelper'
import { getCache, setCache } from '../../../utils/cache'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const RANGE_BG = '#e0edfd'
const RANGE_TEXT = '#1e3a8a'
const TODAY_BLUE = '#2563eb'

const formatToLocalDateString = (d) => {
  return getPHDateKey(d)
}

export default function ActivityCalendar({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { streakDays: initialStreak = 0, cseSchedule: initialSchedule } = route.params || {}

  const [activeSchedule] = useState(() => {
    if (initialSchedule && initialSchedule.date) return initialSchedule
    const nextCycle = getNextPhilNitsExamCycle()
    return {
      date: nextCycle.date.toISOString(),
      label: nextCycle.label,
      daysLeft: nextCycle.daysLeft,
      appPeriod: nextCycle.appPeriod,
      cycle: nextCycle.cycle,
      source: 'philnits_official',
    }
  })

  const [loading, setLoading] = useState(true)
  const [activityEvents, setActivityEvents] = useState({})
  const [totalStudyDuration, setTotalStudyDuration] = useState(0) // in minutes
  const [calculatedStreak, setCalculatedStreak] = useState(initialStreak)
  const [activityStats, setActivityStats] = useState({
    practiceCount: 0,
    mcqCount: 0,
    tfCount: 0,
    matchingCount: 0,
    flashcardCount: 0,
    mockCount: 0,
    streakCount: 0,
  })

  // Modal states
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  // Current calendar month view (defaults to today)
  const todayStr = useMemo(() => formatToLocalDateString(new Date()), [])
  const [calendarMonth, setCalendarMonth] = useState(todayStr || '')

  const examDateStr = useMemo(() => {
    if (!activeSchedule?.date) return null
    return formatToLocalDateString(activeSchedule.date)
  }, [activeSchedule])

  const daysUntilExam = useMemo(() => {
    if (activeSchedule?.daysLeft !== undefined && activeSchedule?.daysLeft !== null) {
      return activeSchedule.daysLeft
    }
    if (examDateStr && todayStr) {
      const msDiff = new Date(examDateStr + 'T00:00:00') - new Date(todayStr + 'T00:00:00')
      return Math.max(0, Math.ceil(msDiff / (1000 * 60 * 60 * 24)))
    }
    return 0
  }, [activeSchedule, examDateStr, todayStr])

  // Build range of dates from today up to examination date
  const rangeDates = useMemo(() => {
    if (!todayStr || !examDateStr || todayStr > examDateStr) return []
    const dates = []
    let curr = new Date(todayStr + 'T00:00:00')
    const end = new Date(examDateStr + 'T00:00:00')
    let safeCount = 0
    while (curr <= end && safeCount < 400) {
      dates.push(formatToLocalDateString(curr))
      curr.setDate(curr.getDate() + 1)
      safeCount++
    }
    return dates
  }, [todayStr, examDateStr])

  useEffect(() => {
    fetchActivity()
  }, [])

  const fetchActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) {
        setLoading(false)
        return
      }

      // Fast-hydrate from local cache first so calendar renders dots instantly with zero delay
      const cacheKey = `activity_calendar_cache_${uid}`
      const cached = await getCache(cacheKey)
      if (cached) {
        if (cached.activityEvents) setActivityEvents(cached.activityEvents)
        if (cached.totalMinutes !== undefined) setTotalStudyDuration(cached.totalMinutes)
        if (cached.activityStats) setActivityStats(cached.activityStats)
        if (cached.finalStreak !== undefined) setCalculatedStreak(cached.finalStreak)
        setLoading(false)
      } else {
        setLoading(true)
      }

      // Fetch practice, mock examination, and points activities in parallel (reading materials excluded from analytics)
      const [
        qSessions,
        qMcq,
        qTf,
        qMatching,
        qMock,
        qPhilDiag,
        qDiag,
        qPoints
      ] = await Promise.allSettled([
        // 1. Flashcard practice sessions
        supabase
          .from('flashcard_sessions')
          .select('id, started_at, completed_at, duration_seconds, completed, flashcard_decks(title)')
          .eq('user_id', uid)
          .order('started_at', { ascending: false }),

        // 2. MCQ practice results
        supabase
          .from('multiple_choice_results')
          .select('id, answered_at, is_correct, multiple_choice_questions(category_id, practice_categories(name))')
          .eq('user_id', uid)
          .order('answered_at', { ascending: false }),

        // 3. True/False practice results
        supabase
          .from('true_false_results')
          .select('id, answered_at, is_correct, true_false_questions(category_id, practice_categories(name))')
          .eq('user_id', uid)
          .order('answered_at', { ascending: false }),

        // 4. Matching game practice results
        supabase
          .from('matching_results')
          .select('id, set_title, completed, mistakes, duration_seconds, pairs_total, pairs_matched')
          .eq('user_id', uid),

        // 5. Mock Examination attempts
        supabase
          .from('mock_exam_attempts')
          .select('id, score, total_questions, correct_count, incorrect_count, status, started_at, completed_at, duration_seconds, mock_exam_configs(title, level_key)')
          .eq('user_id', uid)
          .order('completed_at', { ascending: false }),

        // 6. PhilNITS Diagnostic Assessment attempts
        supabase
          .from('philnits_diagnostic_attempts')
          .select('id, exam_level, total_questions, correct_answers, score_percent, proficiency_level, completed_at')
          .eq('user_id', uid)
          .order('completed_at', { ascending: false }),

        // 7. General Diagnostic Assessment attempts
        supabase
          .from('diagnostic_assessment_attempts')
          .select('id, exam_level, total_questions, correct_answers, score_percent, completed_at')
          .eq('user_id', uid)
          .order('completed_at', { ascending: false }),

        // 8. Points ledger (streak bonuses)
        supabase
          .from('points_ledger')
          .select('id, category, points, metadata, created_at')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
      ])

      const eventsMap = {}
      let totalMinutes = 0
      const activeDaysSet = new Set()

      let practiceCount = 0
      let mcqCount = 0
      let tfCount = 0
      let matchingCount = 0
      let flashcardCount = 0
      let mockCount = 0

      const addEventToDay = (dayStr, event) => {
        if (!dayStr) return
        activeDaysSet.add(dayStr)
        if (!eventsMap[dayStr]) eventsMap[dayStr] = []
        eventsMap[dayStr].push(event)
        totalMinutes += (event.duration || 0)
      }

      // ── Process Flashcards ─────────────────────────────────────
      const sessions = qSessions.status === 'fulfilled' && qSessions.value?.data ? qSessions.value.data : []
      sessions.forEach(s => {
        const rawDate = s.completed_at || s.started_at
        if (!rawDate) return
        const day = utcToPHDateKey(rawDate)
        if (!day) return
        const dur = s.duration_seconds ? Math.max(Math.ceil(s.duration_seconds / 60), 2) : 5
        const deckTitle = s.flashcard_decks?.title || 'Flashcards Review'
        flashcardCount++
        practiceCount++
        addEventToDay(day, {
          type: 'Flashcards Review',
          category: 'practice',
          title: deckTitle,
          details: s.completed ? 'Session completed' : 'Practice set reviewed',
          time: new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: dur,
          iconFamily: 'MaterialCommunityIcons',
          iconName: 'cards-outline',
          badgeColor: '#3b5ba5',
          badgeBg: '#eef2ff',
        })
      })

      // ── Process Multiple Choice Questions ──────────────────────
      const mcqRaw = qMcq.status === 'fulfilled' && qMcq.value?.data ? qMcq.value.data : []
      // Group MCQs by day and subject to prevent hundreds of single-item clutter
      const mcqByDay = {}
      mcqRaw.forEach(item => {
        if (!item.answered_at) return
        const day = utcToPHDateKey(item.answered_at)
        if (!day) return
        const subj = item.multiple_choice_questions?.practice_categories?.name || 'General'
        if (!mcqByDay[day]) mcqByDay[day] = {}
        if (!mcqByDay[day][subj]) {
          mcqByDay[day][subj] = { total: 0, correct: 0, lastTime: item.answered_at }
        }
        mcqByDay[day][subj].total++
        if (item.is_correct) mcqByDay[day][subj].correct++
      })

      Object.entries(mcqByDay).forEach(([day, subjMap]) => {
        Object.entries(subjMap).forEach(([subj, stat]) => {
          // Each completed quiz session (from start to end) counts as 1 practice activity
          mcqCount++
          practiceCount++
          const dur = Math.max(Math.ceil(stat.total * 1.5), 3)
          addEventToDay(day, {
            type: 'Multiple Choice Quiz',
            category: 'practice',
            title: `MCQ: ${subj}`,
            details: `${stat.total} question${stat.total === 1 ? '' : 's'} (${stat.correct}/${stat.total} correct • ${Math.round((stat.correct / stat.total) * 100)}%)`,
            time: new Date(stat.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: dur,
            iconFamily: 'MaterialCommunityIcons',
            iconName: 'format-list-checks',
            badgeColor: '#2563eb',
            badgeBg: '#eff6ff',
          })
        })
      })

      // ── Process True / False Questions ─────────────────────────
      const tfRaw = qTf.status === 'fulfilled' && qTf.value?.data ? qTf.value.data : []
      const tfByDay = {}
      tfRaw.forEach(item => {
        if (!item.answered_at) return
        const day = utcToPHDateKey(item.answered_at)
        if (!day) return
        const subj = item.true_false_questions?.practice_categories?.name || 'General'
        if (!tfByDay[day]) tfByDay[day] = {}
        if (!tfByDay[day][subj]) {
          tfByDay[day][subj] = { total: 0, correct: 0, lastTime: item.answered_at }
        }
        tfByDay[day][subj].total++
        if (item.is_correct) tfByDay[day][subj].correct++
      })

      Object.entries(tfByDay).forEach(([day, subjMap]) => {
        Object.entries(subjMap).forEach(([subj, stat]) => {
          // Each completed T/F quiz session (from start to end) counts as 1 practice activity
          tfCount++
          practiceCount++
          const dur = Math.max(Math.ceil(stat.total * 1.2), 3)
          addEventToDay(day, {
            type: 'True or False Quiz',
            category: 'practice',
            title: `True/False: ${subj}`,
            details: `${stat.total} item${stat.total === 1 ? '' : 's'} (${stat.correct}/${stat.total} correct • ${Math.round((stat.correct / stat.total) * 100)}%)`,
            time: new Date(stat.lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: dur,
            iconFamily: 'Ionicons',
            iconName: 'checkbox-marked-circle-outline',
            badgeColor: '#9b2335',
            badgeBg: '#ffe4e6',
          })
        })
      })

      // ── Process Matching Games ─────────────────────────────────
      const matchingRaw = qMatching.status === 'fulfilled' && qMatching.value?.data ? qMatching.value.data : []
      matchingRaw.forEach((m, idx) => {
        const rawDate = m.created_at || todayStr
        const day = rawDate.slice(0, 10)
        const dur = m.duration_seconds ? Math.max(Math.ceil(m.duration_seconds / 60), 2) : 4
        matchingCount++
        practiceCount++
        addEventToDay(day, {
          type: 'Matching Game',
          category: 'practice',
          title: m.set_title || 'Matching Challenge',
          details: `${m.completed ? 'Completed' : 'Practice round'} • ${m.mistakes || 0} mistake${m.mistakes === 1 ? '' : 's'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: dur,
          iconFamily: 'MaterialCommunityIcons',
          iconName: 'puzzle-outline',
          badgeColor: '#e8967a',
          badgeBg: '#fff1ee',
        })
      })

      // ── Process Mock Examinations ──────────────────────────────
      const mockRaw = qMock.status === 'fulfilled' && qMock.value?.data ? qMock.value.data : []
      mockRaw.forEach(m => {
        const rawDate = m.completed_at || m.started_at
        if (!rawDate) return
        const day = utcToPHDateKey(rawDate)
        if (!day) return
        const configTitle = m.mock_exam_configs?.title || 'Full Mock Examination'
        const total = m.total_questions || 60
        const score = m.score !== null ? m.score : (m.correct_count || 0)
        const pct = Math.round((score / total) * 100)
        const dur = m.duration_seconds ? Math.max(Math.ceil(m.duration_seconds / 60), 10) : 45
        mockCount++
        addEventToDay(day, {
          type: 'Mock Examination',
          category: 'mock_exam',
          title: configTitle,
          details: `Score: ${score}/${total} (${pct}%) • ${m.status === 'completed' ? 'Passed / Completed' : 'Completed'}`,
          time: new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: dur,
          iconFamily: 'MaterialCommunityIcons',
          iconName: 'file-document-edit-outline',
          badgeColor: '#7c3aed',
          badgeBg: '#f5f3ff',
        })
      })

      // ── Process Diagnostic Assessments ────────────────────────
      const philDiagRaw = qPhilDiag.status === 'fulfilled' && qPhilDiag.value?.data ? qPhilDiag.value.data : []
      philDiagRaw.forEach(d => {
        if (!d.completed_at) return
        const day = utcToPHDateKey(d.completed_at)
        if (!day) return
        mockCount++
        addEventToDay(day, {
          type: 'Diagnostic Assessment',
          category: 'mock_exam',
          title: `PhilNITS ${d.exam_level || 'IP'} Diagnostic`,
          details: `Score: ${d.score_percent}% • Proficiency: ${d.proficiency_level || 'Evaluated'}`,
          time: new Date(d.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: 30,
          iconFamily: 'Ionicons',
          iconName: 'shield-checkmark-outline',
          badgeColor: '#10b981',
          badgeBg: '#ecfdf5',
        })
      })

      const diagRaw = qDiag.status === 'fulfilled' && qDiag.value?.data ? qDiag.value.data : []
      diagRaw.forEach(d => {
        if (!d.completed_at) return
        const day = utcToPHDateKey(d.completed_at)
        if (!day) return
        mockCount++
        addEventToDay(day, {
          type: 'Diagnostic Assessment',
          category: 'mock_exam',
          title: `${d.exam_level || 'General'} Diagnostic Exam`,
          details: `Score: ${d.score_percent}% (${d.correct_answers}/${d.total_questions} correct)`,
          time: new Date(d.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: 30,
          iconFamily: 'Ionicons',
          iconName: 'shield-checkmark-outline',
          badgeColor: '#10b981',
          badgeBg: '#ecfdf5',
        })
      })

      // ── Process Points Ledger (Reading, Practice, Exam & Streak) ───
      const pointsRaw = qPoints.status === 'fulfilled' && qPoints.value?.data ? qPoints.value.data : []
      pointsRaw.forEach(p => {
        if (!p.created_at) return
        const day = p.metadata?.date || utcToPHDateKey(p.created_at)
        if (!day) return
        // Check if it was a streak bonus
        if (p.category === 'streak') {
          const streakNum = p.metadata?.streakDay || 1
          addEventToDay(day, {
            type: 'Daily Login Streak',
            category: 'streak',
            title: `Daily Login • Day ${streakNum}`,
            details: `Maintained active streak • +${p.points} points`,
            time: new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: 5,
            iconFamily: 'Feather',
            iconName: 'zap',
            badgeColor: '#f59e0b',
            badgeBg: '#fffbeb',
          })
        }
      })

      // ── Dynamic Login Streak Calculation across ALL activities (12:00 AM PH Time) ──
      let streak = 0
      const todayPH = getPHDateKey()
      activeDaysSet.add(todayPH)
      for (let i = 0; i < 60; i++) {
        const key = getPHDateKeyOffset(i)
        if (activeDaysSet.has(key)) {
          streak++
          // Ensure a Daily Login Streak event is visible on each active streak day
          if (!eventsMap[key]?.some(e => e.category === 'streak')) {
            if (!eventsMap[key]) eventsMap[key] = []
            eventsMap[key].unshift({
              type: 'Daily Login Streak',
              category: 'streak',
              title: `Daily Login Streak • Day ${streak}`,
              details: `Active login & study session verified`,
              time: '12:00 AM',
              duration: 5,
              iconFamily: 'Feather',
              iconName: 'zap',
              badgeColor: '#f59e0b',
              badgeBg: '#fffbeb',
            })
          }
        } else if (i > 0) {
          break
        }
      }

      const finalStreak = Math.max(streak, initialStreak)
      const statsObj = {
        practiceCount,
        mcqCount,
        tfCount,
        matchingCount,
        flashcardCount,
        mockCount,
        streakCount: finalStreak,
      }
      setCalculatedStreak(finalStreak)
      setActivityEvents(eventsMap)
      setTotalStudyDuration(Math.floor(totalMinutes))
      setActivityStats(statsObj)

      // Save to local cache for instant zero-lag rendering next time
      setCache(cacheKey, {
        activityEvents: eventsMap,
        totalMinutes: Math.floor(totalMinutes),
        activityStats: statsObj,
        finalStreak,
      }, 10 * 60 * 1000).catch(() => { })
    } catch (error) {
      console.warn('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  // Generate period markings highlighting today up to the examination date
  const markedDates = useMemo(() => {
    const marked = {}

    // 1. Highlight range from Today up to Exam Date
    if (rangeDates.length > 0) {
      rangeDates.forEach((dayKey, index) => {
        const isStart = index === 0
        const isEnd = index === rangeDates.length - 1
        const hasActivity = !!activityEvents[dayKey] && activityEvents[dayKey].length > 0

        if (isStart && isEnd) {
          // Exam day is today!
          marked[dayKey] = {
            startingDay: true,
            endingDay: true,
            color: ACCENT,
            textColor: '#ffffff',
            customContainerStyle: {
              backgroundColor: ACCENT,
              borderRadius: 17,
            },
            customTextStyle: {
              color: '#ffffff',
              fontWeight: 'bold',
            },
            marked: hasActivity,
            dotColor: '#10b981',
          }
        } else if (isStart) {
          // Today (start of countdown / preparation period)
          marked[dayKey] = {
            startingDay: true,
            color: RANGE_BG,
            textColor: '#ffffff',
            customContainerStyle: {
              backgroundColor: TODAY_BLUE,
              borderRadius: 17,
            },
            customTextStyle: {
              color: '#ffffff',
              fontWeight: 'bold',
            },
            marked: hasActivity,
            dotColor: '#10b981',
          }
        } else if (isEnd) {
          // Date of examination
          marked[dayKey] = {
            endingDay: true,
            color: RANGE_BG,
            textColor: '#ffffff',
            customContainerStyle: {
              backgroundColor: ACCENT,
              borderRadius: 17,
            },
            customTextStyle: {
              color: '#ffffff',
              fontWeight: 'bold',
            },
            marked: hasActivity,
            dotColor: '#10b981',
          }
        } else {
          // Intermediate preparation period days
          marked[dayKey] = {
            color: RANGE_BG,
            textColor: RANGE_TEXT,
            customTextStyle: {
              fontWeight: '600',
              color: RANGE_TEXT,
            },
            marked: hasActivity,
            dotColor: '#10b981',
          }
        }
      })
    }

    // 2. Add past user activity dates outside the range
    Object.keys(activityEvents).forEach((dayKey) => {
      if (!marked[dayKey]) {
        marked[dayKey] = {
          marked: true,
          dotColor: '#10b981',
        }
      }
    })

    return marked
  }, [activityEvents, rangeDates])

  // Merge selected date highlight with active period markings
  const displayMarkedDates = useMemo(() => {
    if (!selectedDate) return markedDates
    const existing = markedDates[selectedDate] || {}
    return {
      ...markedDates,
      [selectedDate]: {
        ...existing,
        customContainerStyle: {
          ...(existing.customContainerStyle || {}),
          borderWidth: 2,
          borderColor: NAVY,
          borderRadius: 17,
        },
      },
    }
  }, [markedDates, selectedDate])

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return ''
    try {
      const d = new Date(selectedDate + 'T00:00:00')
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return selectedDate
    }
  }, [selectedDate])

  // Helper to render activity item icon
  const renderEventIcon = (ev) => {
    const color = ev.badgeColor || NAVY
    if (ev.iconFamily === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons name={ev.iconName || 'cards-outline'} size={22} color={color} />
    } else if (ev.iconFamily === 'Ionicons') {
      return <Ionicons name={ev.iconName || 'checkbox-outline'} size={22} color={color} />
    }
    return <Feather name={ev.iconName || 'book-open'} size={20} color={color} />
  }

  const renderCalendar = () => {
    return (
      <View style={styles.calendarContainer}>
        {/* Calendar Header with navigation shortcuts */}
        <View style={styles.calendarHeaderRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.sectionTitle}>Activity Calendar</Text>
            {activeSchedule?.label && (
              <Text style={styles.calendarSubtitle}>
                Today → Exam Date ({activeSchedule.label})
              </Text>
            )}
          </View>
          <View style={styles.jumpButtonsRow}>
            {todayStr && (
              <TouchableOpacity
                style={[
                  styles.jumpBtn,
                  calendarMonth.slice(0, 7) === todayStr.slice(0, 7) && styles.jumpBtnActive
                ]}
                onPress={() => setCalendarMonth(todayStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.jumpBtnText,
                    calendarMonth.slice(0, 7) === todayStr.slice(0, 7) && styles.jumpBtnTextActive
                  ]}
                >
                  Today
                </Text>
              </TouchableOpacity>
            )}

            {examDateStr && (
              <TouchableOpacity
                style={[
                  styles.jumpBtn,
                  calendarMonth.slice(0, 7) === examDateStr.slice(0, 7) && styles.jumpBtnActive
                ]}
                onPress={() => setCalendarMonth(examDateStr)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.jumpBtnText,
                    calendarMonth.slice(0, 7) === examDateStr.slice(0, 7) && styles.jumpBtnTextActive
                  ]}
                >
                  Exam
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Calendar
          key={calendarMonth ? calendarMonth.slice(0, 7) : 'cal-view'}
          current={calendarMonth}
          markingType="period"
          markedDates={displayMarkedDates}
          enableSwipeMonths={true}
          onDayPress={(day) => {
            setSelectedDate(day.dateString)
            setModalVisible(true)
          }}
          onMonthChange={(month) => {
            setCalendarMonth(month.dateString)
          }}
          theme={{
            selectedDayBackgroundColor: NAVY,
            todayTextColor: TODAY_BLUE,
            arrowColor: NAVY,
            dotColor: '#10b981',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
          }}
        />

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: TODAY_BLUE }]} />
            <Text style={styles.legendText}>Today</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBarIndicator, { backgroundColor: RANGE_BG }]} />
            <Text style={styles.legendText}>Prep Period</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: ACCENT }]} />
            <Text style={styles.legendText}>Exam Date</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDotIndicator, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText}>User Activity</Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Streak & Duration */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#fffbeb' }]}>
              <Feather name="zap" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>{calculatedStreak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#e0f2fe' }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#0284c7" />
            </View>
            <Text style={styles.statValue}>
              {loading ? '-' : `${Math.floor(totalStudyDuration / 60)}h ${totalStudyDuration % 60}m`}
            </Text>
            <Text style={styles.statLabel}>Total Study Time</Text>
          </View>
        </View>

        {/* Activity Breakdown Overview Bar */}
        <View style={styles.breakdownCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.breakdownTitle}>All-Time Activity Summary</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>
              4 Practice + Mock Exam
            </Text>
          </View>

          {/* Top Row: Overall Practice, Mock Exams, and Streak */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.miniIconWrap, { backgroundColor: '#eff6ff' }]}>
                <MaterialCommunityIcons name="trophy-outline" size={16} color="#2563eb" />
              </View>
              <Text style={styles.breakdownNum}>{activityStats.practiceCount}</Text>
              <Text style={styles.breakdownLabel}>Total Practice</Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <View style={[styles.miniIconWrap, { backgroundColor: '#f5f3ff' }]}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={16} color="#7c3aed" />
              </View>
              <Text style={styles.breakdownNum}>{activityStats.mockCount}</Text>
              <Text style={styles.breakdownLabel}>Mock Exams</Text>
            </View>

            <View style={styles.breakdownDivider} />

            <View style={styles.breakdownItem}>
              <View style={[styles.miniIconWrap, { backgroundColor: '#fffbeb' }]}>
                <Feather name="zap" size={15} color="#f59e0b" />
              </View>
              <Text style={styles.breakdownNum}>{activityStats.streakCount}</Text>
              <Text style={styles.breakdownLabel}>Streak Days</Text>
            </View>
          </View>

          {/* Sub-row: The 4 Practice Types Breakdown */}
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 }} />
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{activityStats.mcqCount}</Text>
              <Text style={[styles.breakdownLabel, { fontSize: 10 }]}>Multiple Choice</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{activityStats.tfCount}</Text>
              <Text style={[styles.breakdownLabel, { fontSize: 10 }]}>True / False</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{activityStats.matchingCount}</Text>
              <Text style={[styles.breakdownLabel, { fontSize: 10 }]}>Matching</Text>
            </View>
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownItem}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>{activityStats.flashcardCount}</Text>
              <Text style={[styles.breakdownLabel, { fontSize: 10 }]}>Flashcards</Text>
            </View>
          </View>
        </View>

        {/* PhilNITS Exam Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upcoming Examination</Text>
          {activeSchedule ? (
            <View style={{ marginTop: 12 }}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={NAVY} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Date of Examination</Text>
                  <Text style={styles.infoValue}>{activeSchedule.label}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={NAVY} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Period of Application</Text>
                  <Text style={styles.infoValue}>{activeSchedule.appPeriod || 'To be announced'}</Text>
                </View>
              </View>

              {daysUntilExam !== null && daysUntilExam >= 0 && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{daysUntilExam} days left to prepare!</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming exam schedule found.</Text>
          )}
        </View>

        {/* Real Calendar Component */}
        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 40 }} />
        ) : (
          renderCalendar()
        )}

      </ScrollView>

      {/* Events Popup Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Activity on {formattedSelectedDate}</Text>
                <Text style={styles.modalSubTitle}>
                  {selectedDate && activityEvents[selectedDate]?.length
                    ? `${activityEvents[selectedDate].length} completed session${activityEvents[selectedDate].length === 1 ? '' : 's'}`
                    : 'No recorded activity'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Context banner for selected date */}
            {selectedDate === examDateStr && (
              <View style={[styles.modalBanner, { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }]}>
                <Ionicons name="flag" size={20} color={ACCENT} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.modalBannerTitle, { color: ACCENT }]}>Target Examination Day</Text>
                  <Text style={[styles.modalBannerSub, { color: '#be123c' }]}>
                    {activeSchedule?.label || 'PhilNITS Examination'}
                  </Text>
                </View>
              </View>
            )}

            {selectedDate === todayStr && (
              <View style={[styles.modalBanner, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                <Feather name="zap" size={20} color={TODAY_BLUE} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.modalBannerTitle, { color: '#1d4ed8' }]}>Today (Start of Countdown)</Text>
                  <Text style={[styles.modalBannerSub, { color: TODAY_BLUE }]}>
                    {daysUntilExam > 0 ? `${daysUntilExam} days remaining until examination` : 'Examination day is today!'}
                  </Text>
                </View>
              </View>
            )}

            {selectedDate > todayStr && selectedDate < examDateStr && (
              <View style={[styles.modalBanner, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                <Ionicons name="school-outline" size={20} color="#166534" />
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={[styles.modalBannerTitle, { color: '#166534' }]}>Preparation Window</Text>
                  <Text style={[styles.modalBannerSub, { color: '#15803d' }]}>
                    Study period leading to the PhilNITS exam.
                  </Text>
                </View>
              </View>
            )}

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDate && activityEvents[selectedDate] && activityEvents[selectedDate].length > 0 ? (
                activityEvents[selectedDate].map((ev, i) => (
                  <View key={i} style={styles.eventItem}>
                    <View style={[styles.eventIconWrap, { backgroundColor: ev.badgeBg || '#f1f5f9' }]}>
                      {renderEventIcon(ev)}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={[styles.eventBadgeText, { color: ev.badgeColor || NAVY }]}>
                          {ev.type}
                        </Text>
                        <Text style={styles.eventDurationPill}>
                          {ev.duration} mins
                        </Text>
                      </View>
                      <Text style={styles.eventName}>{ev.title}</Text>
                      <Text style={styles.eventDetails}>{ev.details}</Text>
                      <Text style={styles.eventTime}>{ev.time}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyEventContainer}>
                  <MaterialCommunityIcons name="calendar-blank" size={44} color="#cbd5e1" />
                  <Text style={styles.emptyEventText}>No study or practice activity recorded on this date.</Text>
                  <Text style={styles.emptyEventSub}>Complete practice quizzes or mock exams to build your study history!</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
  },
  miniIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  breakdownNum: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 2,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  breakdownDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e8edf5',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 3,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8edf5',
    marginVertical: 10,
    marginLeft: 32,
  },
  countdownBadge: {
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  countdownText: {
    color: ACCENT,
    fontWeight: '700',
    fontSize: 13,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  jumpButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jumpBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jumpBtnActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  jumpBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  jumpBtnTextActive: {
    color: TODAY_BLUE,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    marginHorizontal: 4,
  },
  legendIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendBarIndicator: {
    width: 14,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendDotIndicator: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 71, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxHeight: '75%',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
  },
  modalSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  modalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  modalBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalBannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalScroll: {
    maxHeight: 340,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  eventIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  eventBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  eventDurationPill: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginTop: 2,
    marginBottom: 2,
  },
  eventDetails: {
    fontSize: 12,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  emptyEventContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyEventText: {
    color: NAVY,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyEventSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
})
