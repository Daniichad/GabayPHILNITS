import React, { useState, useEffect, useRef } from 'react'
import {
  Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator
} from 'react-native'
import { supabase } from '../../../utils/supabase'
import { getCache, setCache } from '../../../utils/cache'
import { saveUserSession } from '../../../utils/database'
import { setUserTargetExamTrack, resolveUserTargetExam } from '../../../utils/targetExam'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SkeletonItem } from '../../../components/Skeleton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { withTimeout, safeMutate } from '../../../utils/queryHelper'
import { getScrollBottomPadding, getModalBottomPadding } from '../../../utils/responsiveLayout'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const REVIEW_SPEEDS = ['Detailed', 'Standard', 'Quick']

const SUBJECT_METADATA = {
  'Technology': {
    icon: 'cpu',
    color: '#3b82f6',
    detail: 'Hardware, Software, OS, Databases & Networks',
  },
  'Management': {
    icon: 'briefcase',
    color: '#f59e0b',
    detail: 'Project Management, Service Management & ITIL',
  },
  'Strategy': {
    icon: 'trending-up',
    color: '#8b5cf6',
    detail: 'Corporate Strategy, Business Analysis & Legal Compliance',
  },
  'Computer Systems & Architecture': {
    icon: 'server',
    color: '#3b82f6',
    detail: 'Processor Architecture, Memory & Systems Software',
  },
  'Algorithms & Programming': {
    icon: 'code',
    color: '#10b981',
    detail: 'Data Structures, Pseudo-code Tracing & Complexity',
  },
  'Networks & Security': {
    icon: 'shield',
    color: '#ef4444',
    detail: 'TCP/IP, Cryptography, Firewalls & Threat Defense',
  },
  'IT Management & Strategy': {
    icon: 'pie-chart',
    color: '#8b5cf6',
    detail: 'Enterprise Architecture, SLA & IT Governance',
  },
}

// PhilNITS Examination Syllabi
const IP_SUBJECTS = [
  'Technology',
  'Management',
  'Strategy',
]

const FE_SUBJECTS = [
  'Computer Systems & Architecture',
  'Algorithms & Programming',
  'Networks & Security',
  'IT Management & Strategy',
]

/**
 * @param {any} cat
 * @param {boolean} [isFE]
 */
function mapPhilNitsCategory(cat, isFE) {
  if (!cat) return null
  const c = String(cat).trim()
  if (isFE) {
    if (c === 'Subject B' || c.includes('Subject B')) return 'Algorithms & Programming'
    if (c === 'Subject A' || c.includes('Subject A')) return 'Computer Systems & Architecture'
    if (c.includes('Architecture') || c.includes('Hardware') || c.includes('Computer Systems') || c === 'Technology') return 'Computer Systems & Architecture'
    if (c.includes('Algorithm') || c.includes('Program') || c.includes('Data Structure')) return 'Algorithms & Programming'
    if (c.includes('Network') || c.includes('Security') || c.includes('Database')) return 'Networks & Security'
    if (c.includes('Management') || c.includes('Strategy') || c.includes('Project')) return 'IT Management & Strategy'
    return null
  } else {
    if (c === 'Technology' || c.includes('Tech') || c.includes('Hardware') || c.includes('Software') || c.includes('Network') || c.includes('Security') || c.includes('Algorithm') || c.includes('Architecture')) return 'Technology'
    if (c === 'Management' || c.includes('Manage') || c.includes('Project') || c.includes('Service') || c.includes('Audit')) return 'Management'
    if (c === 'Strategy' || c.includes('Strat') || c.includes('Business') || c.includes('Legal') || c.includes('Corporate')) return 'Strategy'
    return null
  }
}

// Pure helper function to compute ranked weekly focus strictly limited to the target exam's scope
/**
 * @param {string} targetLevel
 * @param {any} attempt
 * @param {any} mcqRaw
 * @param {any} tfRaw
 */
function computeFocusListForLevel(targetLevel, attempt, mcqRaw, tfRaw) {
  const isFE = targetLevel?.toLowerCase().includes('fe') || targetLevel?.toLowerCase().includes('fundamental')
  const allowedSubjects = isFE ? FE_SUBJECTS : IP_SUBJECTS

  /** @type {Record<string, { correct: number, total: number }>} */
  const subjectMap = {}
  allowedSubjects.forEach((cat) => {
    subjectMap[cat] = { correct: 0, total: 0 }
  })

  // 1. Tally from Diagnostic Assessment attempt
  if (attempt?.category_scores) {
    let catScores = attempt.category_scores
    if (typeof catScores === 'string') {
      try {
        catScores = JSON.parse(catScores)
      } catch (e) {
        catScores = {}
      }
    }
    if (catScores && typeof catScores === 'object') {
      Object.entries(catScores).forEach(([cat, scores]) => {
        let normalizedCat = mapPhilNitsCategory(cat, isFE)

        if (normalizedCat && subjectMap[normalizedCat] !== undefined) {
          if (scores && typeof scores === 'object') {
            subjectMap[normalizedCat].correct += (/** @type {any} */ (scores)).correct || 0
            subjectMap[normalizedCat].total += (/** @type {any} */ (scores)).total || 0
          } else if (typeof scores === 'number') {
            subjectMap[normalizedCat].correct += scores
            subjectMap[normalizedCat].total += 10
          }
        }
      })
    }
  }

  // 2. Tally from MCQ practice questions
  if (Array.isArray(mcqRaw)) {
    mcqRaw.forEach((r) => {
      let rawCat = r?.multiple_choice_questions?.practice_categories?.name
      let catName = mapPhilNitsCategory(rawCat, isFE)
      if (catName && subjectMap[catName] !== undefined) {
        subjectMap[catName].total += 1
        if (r.is_correct) subjectMap[catName].correct += 1
      }
    })
  }

  // 3. Tally from True/False practice questions
  if (Array.isArray(tfRaw)) {
    tfRaw.forEach((r) => {
      let rawCat = r?.true_false_questions?.practice_categories?.name
      let catName = mapPhilNitsCategory(rawCat, isFE)
      if (catName && subjectMap[catName] !== undefined) {
        subjectMap[catName].total += 1
        if (r.is_correct) subjectMap[catName].correct += 1
      }
    })
  }

  // 4. Rank categories by accuracy % (lowest accuracy first -> highest priority)
  const rankedSubjects = allowedSubjects.map((catName) => {
    const data = subjectMap[catName] || { correct: 0, total: 0 }
    const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
    return {
      subject: catName,
      accuracy: pct,
      correct: data.correct,
      total: data.total,
    }
  }).sort((a, b) => a.accuracy - b.accuracy)

  // 5. Format weekly study focus items with roles and timing
  const formattedList = rankedSubjects.map((item, index) => {
    let role = 'Maintenance'
    let timePerDay = '15 mins/day'
    let badgeColor = '#10b981'
    let tagText = 'Skill Maintenance'

    if (index === 0) {
      role = 'Primary Focus'
      timePerDay = '35 mins/day'
      badgeColor = '#ef4444'
      tagText = '🔥 Priority Focus'
    } else if (index === 1) {
      role = 'Secondary Focus'
      timePerDay = '25 mins/day'
      badgeColor = '#f59e0b'
      tagText = '⚡ Target Practice'
    } else {
      role = 'Maintenance'
      timePerDay = '15 mins/day'
      badgeColor = '#3b82f6'
      tagText = '📘 Skill Maintenance'
    }

    const meta = (/** @type {Record<string, any>} */ (SUBJECT_METADATA))[item.subject] || {
      icon: 'book-open',
      color: '#3b82f6',
      detail: 'Review core concepts and practice questions',
    }

    return {
      ...item,
      role,
      timePerDay,
      badgeColor,
      tagText,
      meta,
    }
  })

  return formattedList
}

/**
 * @param {string} userId
 * @param {string} levelKey
 */
async function checkDiagnosticForLevel(userId, levelKey) {
  // levelKey is 'IP' or 'FE'
  if (!userId) return null

  // 1. Check philnits_diagnostic_attempts
  try {
    const { data, error } = await supabase
      .from('philnits_diagnostic_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_level', levelKey)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  } catch (_) {}

  // 2. Check diagnostic_assessment_attempts with exam_level column
  try {
    const { data, error } = await supabase
      .from('diagnostic_assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('exam_level', levelKey)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) return data
  } catch (_) {}

  // 3. Fallback: inspect category_scores in diagnostic_assessment_attempts
  try {
    const { data, error } = await supabase
      .from('diagnostic_assessment_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(5)

    if (!error && Array.isArray(data)) {
      for (const att of data) {
        const cats = Object.keys(att.category_scores || {})
        if (levelKey === 'FE') {
          if (cats.some(c => c.toLowerCase().includes('subject') || c.toLowerCase().includes('algorithm') || c.toLowerCase().includes('architecture') || c.toLowerCase().includes('network'))) {
            return att
          }
        } else {
          if (cats.some(c => c === 'Technology' || c === 'Management' || c === 'Strategy')) {
            return att
          }
        }
      }
    }
  } catch (_) {}

  return null
}

/**
 * @param {{ navigation: any }} props
 */
export default function StudyPlan({ navigation }) {
  const insets = useSafeAreaInsets()
  const [examLevel, setExamLevel] = useState('Information Technology Passport (IP)')
  const [savingExamLevel, setSavingExamLevel] = useState(false)
  const [examSavedNotice, setExamSavedNotice] = useState(false)
  const [checkingDiagnostic, setCheckingDiagnostic] = useState(false)
  const rawQuizDataRef = useRef({ attempt: null, mcqRaw: /** @type {any[]} */ ([]), tfRaw: /** @type {any[]} */ ([]) })

  // Confirmation modal states
  const [confirmModalVisible, setConfirmModalVisible] = useState(false)
  const [pendingExamLevel, setPendingExamLevel] = useState('')
  const [pendingAttempt, setPendingAttempt] = useState(/** @type {any} */ (null))
  const [hasDiagnosticForPending, setHasDiagnosticForPending] = useState(false)

  const [reviewSpeed, setReviewSpeed] = useState('Standard')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diagnosticAttempt, setDiagnosticAttempt] = useState(/** @type {any} */ (null))
  const [focusList, setFocusList] = useState(/** @type {any[]} */ ([]))
  const [primaryFocus, setPrimaryFocus] = useState(/** @type {any} */ (null))
  
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')

  useEffect(() => {
    navigation?.setParams?.({ hideNav: true })
    loadStudyPlanData()

    const unsubscribe = navigation?.addListener?.('focus', () => {
      loadStudyPlanData()
    })
    return unsubscribe
  }, [navigation])

  const loadStudyPlanData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Parallelize user preferences, personal info, and quiz results concurrently
      const [uRes, pRes, mcqRes, tfRes] = await Promise.allSettled([
        user.email ? withTimeout(supabase.from('users').select('review_speed').eq('email', user.email).maybeSingle(), 8000) : Promise.resolve({ data: null }),
        withTimeout(supabase.from('personal_info').select('target_exam_level').eq('user_id', user.id).maybeSingle(), 8000),
        withTimeout(supabase.from('multiple_choice_results').select('is_correct, multiple_choice_questions(practice_categories(name))').eq('user_id', user.id).limit(200), 8000),
        withTimeout(supabase.from('true_false_results').select('is_correct, true_false_questions(practice_categories(name))').eq('user_id', user.id).limit(200), 8000)
      ])

      // 1. User review speed
      const userData = (uRes.status === 'fulfilled' && uRes.value?.data) ? uRes.value.data : null
      if (userData?.review_speed && typeof userData.review_speed === 'string') {
        let speed = userData.review_speed.charAt(0).toUpperCase() + userData.review_speed.slice(1).toLowerCase()
        if (speed === 'Slow') speed = 'Detailed'
        if (speed === 'Normal') speed = 'Standard'
        if (speed === 'Fast') speed = 'Quick'
        setReviewSpeed(speed)
      }

      // 2. Target exam level
      const resolvedTrack = await resolveUserTargetExam(user.id, examLevel?.includes('FE') ? 'FE' : 'IP')
      const currentLevel = resolvedTrack === 'FE'
        ? 'Fundamental IT Engineer (FE)'
        : 'Information Technology Passport (IP)'
      setExamLevel(currentLevel)

      // 3. Diagnostic attempt
      const currentTrackKey = currentLevel.includes('FE') ? 'FE' : 'IP'
      const attempt = await checkDiagnosticForLevel(user.id, currentTrackKey)

      // 4. Practice quiz results
      const mcqRaw = (mcqRes.status === 'fulfilled' && Array.isArray(mcqRes.value?.data)) ? mcqRes.value.data : []
      const tfRaw = (tfRes.status === 'fulfilled' && Array.isArray(tfRes.value?.data)) ? tfRes.value.data : []

      // Store in ref for instant switching without re-querying
      rawQuizDataRef.current = {
        attempt: attempt || null,
        mcqRaw: mcqRaw,
        tfRaw: tfRaw,
      }

      setDiagnosticAttempt(attempt || null)

      // 5. Focus list strictly filtered for current exam level
      const formattedList = computeFocusListForLevel(
        currentLevel,
        attempt,
        mcqRaw,
        tfRaw
      )

      setFocusList(formattedList)
      setPrimaryFocus(formattedList[0] || null)

    } catch (err) {
      console.warn('Error loading study plan data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExamLevelButtonPress = async (/** @type {string} */ newLevel) => {
    if (newLevel === examLevel) return
    setCheckingDiagnostic(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const trackKey = newLevel.includes('FE') ? 'FE' : 'IP'
      const attempt = user?.id ? await checkDiagnosticForLevel(user.id, trackKey) : null
      setPendingExamLevel(newLevel)
      setPendingAttempt(attempt)
      setHasDiagnosticForPending(!!attempt)
      setConfirmModalVisible(true)
    } catch (e) {
      console.warn('Error checking diagnostic attempt for level:', e)
    } finally {
      setCheckingDiagnostic(false)
    }
  }

  const handleConfirmLevelChange = async () => {
    if (!pendingExamLevel) return
    const isFE = pendingExamLevel.includes('FE')
    const trackKey = isFE ? 'fe' : 'ip'

    setSavingExamLevel(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        // Fetch existing personal_info to preserve existing profile fields (birthdate, contact_number, etc.)
        const { data: existingInfo } = await supabase
          .from('personal_info')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle()

        const payload = {
          ...(existingInfo || {}),
          user_id: user.id,
          target_exam_level: pendingExamLevel,
          updated_at: new Date().toISOString(),
        }

        // Try upserting target_exam_level
        let { error: pErr } = await supabase
          .from('personal_info')
          .upsert(payload, { onConflict: 'user_id' })

        // Fallback: If update fails due to age constraint in legacy database schemas
        if (pErr) {
          const errDetail = String(pErr.message || '') + ' ' + String(pErr.details || '')
          if (errDetail.toLowerCase().includes('age') || pErr.code === '23502') {
            const fallbackAge = existingInfo?.age ?? 21
            const { error: retryErr } = await supabase
              .from('personal_info')
              .upsert({ ...payload, age: fallbackAge }, { onConflict: 'user_id' })
            if (retryErr) {
              console.error('Retry upsert target_exam_level error:', retryErr)
            }
          } else {
            console.error('Error upserting target_exam_level to personal_info:', pErr)
          }
        }

        // Update unified target exam cache, SQLite session, and Supabase
        await setUserTargetExamTrack(isFE ? 'FE' : 'IP', user)
      }
    } catch (err) {
      console.warn('Error saving target exam level:', err)
    } finally {
      setSavingExamLevel(false)
    }

    setExamLevel(pendingExamLevel)

    if (hasDiagnosticForPending) {
      // User already completed a diagnostic attempt for this exam
      setDiagnosticAttempt(pendingAttempt)
      rawQuizDataRef.current.attempt = pendingAttempt
      const updatedList = computeFocusListForLevel(
        pendingExamLevel,
        pendingAttempt,
        rawQuizDataRef.current.mcqRaw,
        rawQuizDataRef.current.tfRaw
      )
      setFocusList(updatedList)
      setPrimaryFocus(updatedList[0] || null)
      setConfirmModalVisible(false)
      setExamSavedNotice(true)
      setTimeout(() => setExamSavedNotice(false), 2500)
    } else {
      // User has not taken the diagnostic for this track, navigate to it
      setConfirmModalVisible(false)
      navigation?.navigate('DiagnosticAssessment', { examType: trackKey, from: 'StudyPlan' })
    }
  }

  const showCustomAlert = (/** @type {string} */ title, /** @type {string} */ message, type = 'error') => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setAlertVisible(true)
  }

  const handleSaveAndStart = async () => {
    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError || !userData?.user) {
        showCustomAlert('Session Error', 'Could not load user session. Please log in again.')
        return
      }

      const user = userData.user
      const userEmail = user.email

      if (userEmail) {
        await supabase
          .from('users')
          .update({ review_speed: reviewSpeed })
          .eq('email', userEmail)
      }

      // Persist target exam level
      const { data: existingInfo } = await supabase
        .from('personal_info')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const savePayload = {
        ...(existingInfo || {}),
        user_id: user.id,
        target_exam_level: examLevel,
        updated_at: new Date().toISOString(),
      }

      let { error: pSaveErr } = await supabase
        .from('personal_info')
        .upsert(savePayload, { onConflict: 'user_id' })

      if (pSaveErr) {
        const errDetail = String(pSaveErr.message || '') + ' ' + String(pSaveErr.details || '')
        if (errDetail.toLowerCase().includes('age') || pSaveErr.code === '23502') {
          await supabase
            .from('personal_info')
            .upsert({ ...savePayload, age: existingInfo?.age ?? 21 }, { onConflict: 'user_id' })
        }
      }

      await saveUserSession(user, { target_exam_level: examLevel })

      // Navigate to Practice or Library focusing on primary focus area
      navigation?.navigate('PracticeLibrary')
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Adaptive Study Plan</Text>
        <TouchableOpacity style={styles.backBtn} onPress={loadStudyPlanData}>
          <Feather name="refresh-cw" size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets, true, 30) }]} showsVerticalScrollIndicator={false}>

        {/* Loading Skeleton */}
        {loading ? (
          <View style={{ gap: 16 }}>
            <SkeletonItem width="100%" height={120} borderRadius={16} />
            <SkeletonItem width={160} height={20} style={{ marginTop: 8 }} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
          </View>
        ) : (
          <>
            {/* ── Exam Level Switcher Card ── */}
            <View style={styles.examLevelCard}>
              <View style={styles.examLevelHeaderRow}>
                <View style={styles.examLevelIconWrap}>
                  <Ionicons name="school" size={17} color={NAVY} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.examLevelHeaderSub}>TARGET EXAMINATION</Text>
                  <Text style={styles.examLevelHeaderTitle}>PhilNITS Examination Track</Text>
                </View>
                {(savingExamLevel || checkingDiagnostic) && (
                  <ActivityIndicator size="small" color="#c14954" style={{ marginRight: 6 }} />
                )}
                {examSavedNotice && (
                  <View style={styles.examSavedBadge}>
                    <Feather name="check" size={12} color="#10b981" />
                    <Text style={styles.examSavedBadgeText}>Saved</Text>
                  </View>
                )}
              </View>

              <Text style={styles.examLevelDesc}>
                Select the PhilNITS exam you are preparing for. Your study schedule and weekly focus are tailored to include only the domains tested in your target track.
              </Text>

              <View style={styles.examTypeSwitchRow}>
                {/* IP Button */}
                <TouchableOpacity
                  style={[
                    styles.examTypeBtn,
                    examLevel === 'Information Technology Passport (IP)' && styles.examTypeBtnActive,
                  ]}
                  activeOpacity={0.85}
                  disabled={checkingDiagnostic || savingExamLevel}
                  onPress={() => handleExamLevelButtonPress('Information Technology Passport (IP)')}
                >
                  <View style={styles.examTypeBtnContent}>
                    <View style={styles.examTypeTopRow}>
                      <Ionicons
                        name={examLevel === 'Information Technology Passport (IP)' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={17}
                        color={examLevel === 'Information Technology Passport (IP)' ? '#fff' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.examTypeBtnText,
                          examLevel === 'Information Technology Passport (IP)' && styles.examTypeBtnTextActive,
                        ]}
                      >
                        IT Passport (IP)
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.examTypeSubText,
                        examLevel === 'Information Technology Passport (IP)' && styles.examTypeSubTextActive,
                      ]}
                    >
                      3 Domains • Tech, Strategy, Mgmt
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* FE Button */}
                <TouchableOpacity
                  style={[
                    styles.examTypeBtn,
                    examLevel === 'Fundamental IT Engineer (FE)' && styles.examTypeBtnActive,
                  ]}
                  activeOpacity={0.85}
                  disabled={checkingDiagnostic || savingExamLevel}
                  onPress={() => handleExamLevelButtonPress('Fundamental IT Engineer (FE)')}
                >
                  <View style={styles.examTypeBtnContent}>
                    <View style={styles.examTypeTopRow}>
                      <Ionicons
                        name={examLevel === 'Fundamental IT Engineer (FE)' ? 'checkmark-circle' : 'ellipse-outline'}
                        size={17}
                        color={examLevel === 'Fundamental IT Engineer (FE)' ? '#fff' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.examTypeBtnText,
                          examLevel === 'Fundamental IT Engineer (FE)' && styles.examTypeBtnTextActive,
                        ]}
                      >
                        FE Engineer
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.examTypeSubText,
                        examLevel === 'Fundamental IT Engineer (FE)' && styles.examTypeSubTextActive,
                      ]}
                    >
                      4 Domains • Systems, Algo, Security
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekly Focus Section */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>This Week's Focus</Text>
                <Text style={styles.focusExamScopeLabel}>
                  {examLevel === 'Fundamental IT Engineer (FE)' ? 'Fundamental IT Engineer Track (4 Domains)' : 'IT Passport Track (3 Domains)'}
                </Text>
              </View>
              <Text style={styles.sectionBadge}>Performance-Based</Text>
            </View>

            <View style={styles.cardsContainer}>
              {focusList.map((item) => (
                <FocusCard 
                  key={item.subject}
                  title={item.subject}
                  subtitle={item.timePerDay}
                  detail={item.meta.detail}
                  icon={item.meta.icon}
                  color={item.meta.color}
                  tagText={item.tagText}
                  accuracy={item.accuracy}
                  isPrimary={item.role === 'Primary Focus'}
                />
              ))}
            </View>

            {/* Review Speed Selector */}
            <Text style={styles.sectionTitle}>Review Speed</Text>
            <Text style={styles.sectionSubtitle}>
              Adjust how quickly practice questions and study modules are recommended
            </Text>

            <View style={styles.speedTabsContainer}>
              {REVIEW_SPEEDS.map((speed) => {
                const isSelected = reviewSpeed === speed
                return (
                  <TouchableOpacity
                    key={speed}
                    activeOpacity={0.8}
                    onPress={() => setReviewSpeed(speed)}
                    style={[
                      styles.speedTab,
                      isSelected && styles.speedTabActive
                    ]}
                  >
                    <Text style={[
                      styles.speedTabText,
                      isSelected && styles.speedTabTextActive
                    ]}>
                      {speed}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            {/* Start Button */}
            <TouchableOpacity 
              style={[styles.startButton, saving && { opacity: 0.7 }]} 
              activeOpacity={0.85} 
              onPress={handleSaveAndStart} 
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.startButtonText}>
                    START STUDYING FOCUS AREA
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={[styles.alertBackdrop, { paddingBottom: getModalBottomPadding(insets, 16) }]}>
          <View style={styles.alertCard}>
            <View style={{ 
              backgroundColor: alertType === 'success' ? '#ECFDF5' : '#FEE2E2', 
              padding: 12, 
              borderRadius: 32, 
              marginBottom: 16 
            }}>
              <Feather 
                name={alertType === 'success' ? 'check-circle' : 'alert-circle'} 
                size={32} 
                color={alertType === 'success' ? '#10B981' : '#EF4444'} 
              />
            </View>
            <Text style={styles.alertCardTitle}>{alertTitle}</Text>
            <Text style={styles.alertCardMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={[styles.alertOkBtn, { backgroundColor: alertType === 'success' ? '#10B981' : '#EF4444' }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Track Switch & Diagnostic Confirmation Modal ── */}
      <Modal
        transparent
        visible={confirmModalVisible}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={[styles.alertBackdrop, { paddingBottom: getModalBottomPadding(insets, 16) }]}>
          <View style={styles.confirmCard}>
            <View style={[
              styles.confirmIconWrap,
              { backgroundColor: hasDiagnosticForPending ? '#EFF6FF' : '#FEF3C7' }
            ]}>
              <Ionicons
                name={hasDiagnosticForPending ? 'school' : 'alert-circle'}
                size={32}
                color={hasDiagnosticForPending ? '#2563EB' : '#D97706'}
              />
            </View>

            <Text style={styles.confirmCardTitle}>
              {hasDiagnosticForPending ? 'Switch Target Exam?' : 'Diagnostic Exam Required'}
            </Text>

            <Text style={styles.confirmCardMessage}>
              {hasDiagnosticForPending
                ? `Switch your target exam to ${pendingExamLevel.includes('FE') ? 'Fundamental IT Engineer (FE)' : 'Information Technology Passport (IP)'}? Your study schedule, focus priorities, and readiness tracking will adapt to this syllabus.`
                : `You haven't completed the diagnostic assessment for ${pendingExamLevel.includes('FE') ? 'Fundamental IT Engineer (FE)' : 'Information Technology Passport (IP)'} yet. In order to tailor your adaptive study plan, you must complete the diagnostic assessment for this track first.`}
            </Text>

            <View style={styles.confirmActionsCol}>
              <TouchableOpacity
                style={[
                  styles.confirmPrimaryBtn,
                  { backgroundColor: hasDiagnosticForPending ? NAVY : '#D97706' }
                ]}
                activeOpacity={0.85}
                disabled={savingExamLevel}
                onPress={handleConfirmLevelChange}
              >
                {savingExamLevel ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmPrimaryBtnText}>
                    {hasDiagnosticForPending
                      ? `Confirm & Switch Track`
                      : `Take Diagnostic Exam`}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmCancelBtn}
                activeOpacity={0.7}
                disabled={savingExamLevel}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/**
 * @param {{ title?: any, subtitle?: any, detail?: any, icon?: any, color?: any, tagText?: any, accuracy?: any, isPrimary?: boolean }} [props]
 */
function FocusCard({ title = '', subtitle = '', detail = '', icon = 'book-open', color = '#3b82f6', tagText = '', accuracy = 0, isPrimary = false } = {}) {
  return (
    <View style={[styles.card, isPrimary && styles.primaryCard]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isPrimary ? '#fee2e2' : `${color}14` }]}>
            <Text style={[styles.badgeText, { color: isPrimary ? '#dc2626' : color }]}>{subtitle}</Text>
          </View>
        </View>

        <Text style={styles.cardDetail}>{detail}</Text>

        <View style={styles.cardFooterRow}>
          <View style={[styles.tagBadge, { backgroundColor: isPrimary ? '#fef2f2' : '#f1f5f9' }]}>
            <Text style={[styles.tagBadgeText, { color: isPrimary ? '#b91c1c' : '#475569' }]}>
              {tagText}
            </Text>
          </View>
          <View style={styles.accuracyWrap}>
            <Text style={styles.accuracyLabel}>Accuracy: </Text>
            <Text style={[styles.accuracyValue, { color: accuracy < 50 ? '#dc2626' : accuracy < 75 ? '#d97706' : '#16a34a' }]}>
              {accuracy}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },

  // ── Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },
  // ── Exam Level Card ──
  examLevelCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  examLevelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  examLevelIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  examLevelHeaderSub: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#3b82f6',
    letterSpacing: 0.8,
  },
  examLevelHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  examLevelDesc: {
    fontSize: 12.5,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 14,
  },
  examSavedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  examSavedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  examTypeSwitchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  examTypeBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  examTypeBtnActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  examTypeBtnContent: {
    gap: 3,
  },
  examTypeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examTypeBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
  },
  examTypeBtnTextActive: {
    color: '#ffffff',
  },
  examTypeSubText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '500',
  },
  examTypeSubTextActive: {
    color: '#93c5fd',
  },
  focusExamScopeLabel: {
    fontSize: 11.5,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },

  insightBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    marginBottom: 20,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.8,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
  },
  insightBody: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 19,
    marginBottom: 12,
  },
  insightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },

  // ── Cards ──
  cardsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  primaryCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffdfd',
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetail: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accuracyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  accuracyValue: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Speed Tab Bar ──
  speedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
  },
  speedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  speedTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  speedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  speedTabTextActive: {
    color: NAVY,
    fontWeight: '700',
  },

  // ── Buttons ──
  startButton: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: NAVY,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Custom Alert Modal ──
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 53, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  alertCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertCardMessage: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertOkBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },

  // ── Track Confirmation Modal ──
  confirmCard: {
    width: '92%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  confirmCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmCardMessage: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  confirmActionsCol: {
    width: '100%',
    gap: 10,
  },
  confirmPrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  confirmPrimaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  confirmCancelBtn: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: '#f1f5f9',
  },
  confirmCancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
})
