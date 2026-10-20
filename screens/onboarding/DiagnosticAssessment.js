import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Alert, ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, BackHandler, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { supabase } from '../../supabase'
import { setCache } from '../../utils/cache'
import { saveUserCache } from '../../utils/database'
import { FALLBACK_QUESTIONS } from './DiagnosticFallbackQuestions'

const IP_CATEGORIES = [
  'Technology',
  'Management',
  'Strategy',
]

const FE_CATEGORIES = [
  'Computer Systems & Architecture',
  'Algorithms & Programming',
  'Networks & Security',
  'IT Management & Strategy',
]

const CATEGORY_CONFIG = {
  'Technology': {
    label: 'Technology',
    icon: 'laptop',
    bg: '#E0EDFE',
    color: '#2563EB',
    barColor: '#2563EB',
  },
  'Management': {
    label: 'Management',
    icon: 'clipboard-list-outline',
    bg: '#FEF3C7',
    color: '#D97706',
    barColor: '#F59E0B',
  },
  'Strategy': {
    label: 'Strategy',
    icon: 'lightbulb-outline',
    bg: '#F3E8FF',
    color: '#9333EA',
    barColor: '#9333EA',
  },
  'Computer Systems & Architecture': {
    label: 'Systems & Architecture',
    icon: 'cpu-64-bit',
    bg: '#E0EDFE',
    color: '#2563EB',
    barColor: '#2563EB',
  },
  'Algorithms & Programming': {
    label: 'Algorithms & Code',
    icon: 'code-tags',
    bg: '#DCFCE7',
    color: '#16A34A',
    barColor: '#16A34A',
  },
  'Networks & Security': {
    label: 'Networks & Security',
    icon: 'shield-check-outline',
    bg: '#FEE2E2',
    color: '#EF4444',
    barColor: '#F87171',
  },
  'IT Management & Strategy': {
    label: 'Management & Strategy',
    icon: 'briefcase-outline',
    bg: '#FEF3C7',
    color: '#D97706',
    barColor: '#F59E0B',
  },
}

// Fallback questions loaded from DiagnosticFallbackQuestions.js

const DIAGNOSTIC_TIME_LIMIT_SECONDS = 40 * 60 // 40 minutes (2,400 seconds)

function formatTime(totalSeconds) {
  const mins = Math.floor(Math.max(totalSeconds, 0) / 60)
  const secs = Math.max(totalSeconds, 0) % 60
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(mins)}:${pad(secs)}`
}

export default function DiagnosticAssessment({ navigation, route }) {
  const from = route?.params?.from
  const [questions, setQuestions] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState(null)
  const [started, setStarted] = React.useState(false)
  const [questionIndex, setQuestionIndex] = React.useState(0)
  const [selectedAnswer, setSelectedAnswer] = React.useState('')
  const [answers, setAnswers] = React.useState({})
  const [exitVisible, setExitVisible] = React.useState(false)
  const [finished, setFinished] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState(null)
  const [examType, setExamType] = React.useState('ip')
  const [targetCategories, setTargetCategories] = React.useState(IP_CATEGORIES)
  const [secondsLeft, setSecondsLeft] = React.useState(DIAGNOSTIC_TIME_LIMIT_SECONDS)

  const timerRef = React.useRef(null)
  const answersRef = React.useRef(answers)
  const selectedAnswerRef = React.useRef(selectedAnswer)
  const currentQuestionRef = React.useRef(null)

  React.useEffect(() => { answersRef.current = answers }, [answers])
  React.useEffect(() => { selectedAnswerRef.current = selectedAnswer }, [selectedAnswer])

  // ── Load exam type & questions ─────────────────────────────
  React.useEffect(() => { loadQuestions() }, [])

  // Disable back gesture on iOS / Android navigators
  React.useEffect(() => {
    navigation?.setOptions?.({ gestureEnabled: false })
  }, [navigation])

  // Handle hardware back press (3-dot nav / gestures)
  React.useEffect(() => {
    const backAction = () => {
      if (started && !finished) {
        setExitVisible(true)
        return true
      }
      return false
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
    return () => backHandler.remove()
  }, [started, finished])

  const fetchUserExamType = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.id) {
        const { data } = await supabase
          .from('personal_info')
          .select('target_exam_level')
          .eq('user_id', userData.user.id)
          .maybeSingle()

        if (data?.target_exam_level) {
          const lvl = data.target_exam_level.toLowerCase()
          if (lvl.includes('fe') || lvl.includes('engineer')) {
            return 'fe'
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching exam type:', e)
    }
    return 'ip'
  }

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const userExamType = await fetchUserExamType()
      setExamType(userExamType)

      const categories = userExamType === 'fe' ? FE_CATEGORIES : IP_CATEGORIES
      setTargetCategories(categories)
      setSecondsLeft((userExamType === 'fe' ? 40 : 30) * 60)

      // Attempt to load from Supabase for target categories
      const { data: dbData, error } = await supabase
        .from('diagnostic_questions')
        .select('id, category, question, options, correct_answer')
        .eq('is_active', true)
        .in('category', categories)
        .order('category')

      let assembled = []

      // Assembly: Randomly pick questions per category
      categories.forEach((cat) => {
        const dbCatQuestions = (dbData || []).filter((q) => q.category === cat)
        const fallbackCatQuestions = FALLBACK_QUESTIONS.filter((q) => q.category === cat)

        // Combine DB questions first, fill remaining with fallback if needed
        let combined = [...dbCatQuestions]
        if (combined.length < 10) {
          const needed = 10 - combined.length
          const existingIds = new Set(combined.map((q) => q.id))
          const fillers = fallbackCatQuestions.filter((q) => !existingIds.has(q.id))
          combined = [...combined, ...fillers]
        }

        // Randomly shuffle all questions in this category and pick up to 10
        const shuffled = [...combined].sort(() => Math.random() - 0.5)
        assembled.push(...shuffled.slice(0, 10))
      })

      if (assembled.length === 0) {
        // Fallback for all categories if anything fails
        assembled = FALLBACK_QUESTIONS.filter((q) => categories.includes(q.category))
      }

      // Ensure options are strictly arrays of strings
      const normalized = assembled.map((q) => {
        let opts = q.options
        if (typeof opts === 'string') {
          try {
            opts = JSON.parse(opts)
          } catch (e) {
            opts = []
          }
        }
        return {
          ...q,
          options: Array.isArray(opts) ? opts : [],
        }
      })

      setQuestions(normalized)
    } catch (e) {
      console.warn('Load questions error, using local fallback:', e)
      const categories = examType === 'fe' ? FE_CATEGORIES : IP_CATEGORIES
      const fallbackList = FALLBACK_QUESTIONS.filter((q) => categories.includes(q.category))
      setQuestions(fallbackList)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[questionIndex]
  const progress = `${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`

  React.useEffect(() => { currentQuestionRef.current = currentQuestion }, [currentQuestion])

  // ── Compute results & Review Speed ─────────────────────────
  const computeResults = React.useCallback((answerMap) => {
    const categoryScores = targetCategories.reduce((acc, cat) => {
      acc[cat] = { correct: 0, total: 0 }
      return acc
    }, {})

    let correctCount = 0
    questions.forEach((q) => {
      const bucket = categoryScores[q.category]
      if (bucket) {
        bucket.total += 1
        if (answerMap[q.id] === q.correct_answer) {
          bucket.correct += 1
          correctCount++
        }
      }
    })

    let weakestCategory = targetCategories[0] || 'Technology'
    let lowestPct = 101

    Object.entries(categoryScores).forEach(([cat, bucket]) => {
      const pctVal = bucket.total > 0 ? Math.round((bucket.correct / bucket.total) * 100) : 0
      bucket.percentage = pctVal
      if (pctVal < lowestPct) {
        lowestPct = pctVal
        weakestCategory = cat
      }
    })

    const totalQuestions = questions.length || 40
    const scorePercent = Math.round((correctCount / totalQuestions) * 100)

    // Level assessment
    const level = scorePercent >= 80 ? 'Advanced'
      : scorePercent >= 60 ? 'Intermediate'
        : scorePercent >= 40 ? 'Beginner'
          : 'Needs Practice'

    // Auto-calculate review speed based on performance:
    // - Detailed: Majority wrong (< 50%)
    // - Standard: Middle range (50% - 79%)
    // - Quick: Almost all correct (>= 80%)
    let calculatedSpeed = 'Standard'
    if (scorePercent < 50) {
      calculatedSpeed = 'Detailed'
    } else if (scorePercent >= 80) {
      calculatedSpeed = 'Quick'
    } else {
      calculatedSpeed = 'Standard'
    }

    return {
      correctCount,
      totalQuestions,
      scorePercent,
      level,
      categoryScores,
      weakestCategory,
      lowestPct: lowestPct === 101 ? 0 : lowestPct,
      answerMap,
      calculatedSpeed
    }
  }, [questions, targetCategories])

  // ── Auto-submit when 40 minutes expire ──────────────────────
  const handleTimeoutFinish = React.useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current)
    const latestAnswers = { ...answersRef.current }
    if (selectedAnswerRef.current && currentQuestionRef.current?.id) {
      latestAnswers[currentQuestionRef.current.id] = selectedAnswerRef.current
    }
    Alert.alert(
      "Time's Up!",
      'The 40-minute limit for the diagnostic assessment has expired. Your current answers have been submitted automatically.',
      [{ text: 'View Results' }]
    )
    const summary = computeResults(latestAnswers)
    setFinished(true)
    setSaving(true)
    try {
      await saveAttempt(summary)
      setResult(summary)
    } catch (err) {
      console.warn('Save diagnostic warning on timeout:', err)
      setResult(summary)
    } finally {
      setSaving(false)
    }
  }, [computeResults, saveAttempt])

  // ── 40-Minute Countdown Timer ──────────────────────────────
  React.useEffect(() => {
    if (!started || finished) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleTimeoutFinish()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [started, finished, handleTimeoutFinish])

  // ── Save attempt & update user review_speed ───────────────
  const saveAttempt = React.useCallback(async (summary) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw new Error(userError.message)
    const userId = userData.user?.id
    const userEmail = userData.user?.email
    if (!userId) throw new Error('No logged-in user found')

    // 1. Record diagnostic assessment attempt
    const { error: attemptError } = await supabase.from('diagnostic_assessment_attempts').insert({
      user_id: userId,
      total_questions: summary.totalQuestions,
      correct_answers: summary.correctCount,
      score_percent: summary.scorePercent,
      level: summary.level,
      category_scores: summary.categoryScores,
      answers: summary.answerMap,
      completed_at: new Date().toISOString(),
    })
    if (attemptError) throw new Error(attemptError.message)

    // 2. Cache weekly study focus for the Study Plan
    try {
      await setCache(`user_study_plan_focus_${userId}`, {
        primaryFocus: summary.weakestCategory,
        lowestPct: summary.lowestPct,
        categoryScores: summary.categoryScores,
        scorePercent: summary.scorePercent,
        completedAt: new Date().toISOString(),
      }, 7 * 24 * 60 * 60 * 1000)
    } catch (cErr) {
      console.warn('Study plan cache warning:', cErr)
    }

    // 3. Automatically update user's review_speed preference in `users` table
    if (userEmail) {
      const formattedSpeed = summary.calculatedSpeed.charAt(0).toUpperCase() + summary.calculatedSpeed.slice(1).toLowerCase()
      await supabase
        .from('users')
        .update({ review_speed: formattedSpeed })
        .eq('email', userEmail)
    }

    // 4. Update local user cache so offline / initial routing recognizes diagnostic is completed
    try {
      await saveUserCache(userId, null, true, true)
    } catch (cacheErr) {
      console.warn('Local cache save warning:', cacheErr)
    }
  }, [])

  // ── Handlers ───────────────────────────────────────────────
  const handleChoose = (option) => setSelectedAnswer(option)

  const handleNext = async () => {
    if (!selectedAnswer) return
    const updatedAnswers = { ...answers, [currentQuestion.id]: selectedAnswer }
    setAnswers(updatedAnswers)
    setSelectedAnswer('')

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((v) => v + 1)
      return
    }

    if (timerRef.current) clearInterval(timerRef.current)
    const summary = computeResults(updatedAnswers)
    setFinished(true)
    setSaving(true)
    try {
      await saveAttempt(summary)
      setResult(summary)
    } catch (err) {
      console.warn('Save diagnostic warning:', err)
      setResult(summary)
    } finally {
      setSaving(false)
    }
  }

  const handleExitAssessment = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setExitVisible(false)
    if (from === 'Home') navigation?.navigate('Home')
    else navigation?.goBack()
  }

  // ─────────────────────────────── LOADING STATE ────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#0F2747" />
          <Text style={styles.loadingText}>Loading {examType === 'fe' ? 40 : 30} {examType === 'fe' ? 'Fundamental IT Engineer (FE)' : 'IT Passport (IP)'} questions…</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (loadError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadQuestions}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.laterLinkBtn} onPress={() => navigation?.replace('Home')}>
            <Text style={styles.laterText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  // ─────────────────────────────── RESULT STATE ────────────
  if (finished && result) {
    const scoreFormatted = (result.scorePercent || 0).toFixed(2)

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultContainer}>
          <ScrollView
            style={styles.resultScroll}
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Center Checkmark & Title */}
            <View style={styles.resultHeaderWrap}>
              <View style={styles.resultCheckCircle}>
                <MaterialCommunityIcons name="check" size={32} color="#2563EB" />
              </View>
              <Text style={styles.resultMainTitle}>Assessment Complete!</Text>
              <Text style={styles.resultMainSubtitle}>Here's your diagnostic report</Text>
            </View>

            {/* Overall Score Card */}
            <View style={styles.reportScoreCard}>
              <View style={styles.scoreCircle}>
                <Text style={styles.scoreCircleValue}>
                  {result.correctCount}
                  <Text style={styles.scoreCircleTotal}>/{result.totalQuestions}</Text>
                </Text>
              </View>
              <View style={styles.scoreCardDetails}>
                <Text style={styles.scoreCardLabel}>Overall Score</Text>
                <Text style={styles.scoreCardBigPercent}>{scoreFormatted}%</Text>
                <Text style={styles.scoreCardSub}>Correct Answers</Text>
              </View>
            </View>

            {/* Your Level Card */}
            <View style={styles.reportLevelCard}>
              <View style={styles.levelIconCircle}>
                <MaterialCommunityIcons name="chart-bar" size={24} color="#3B82F6" />
              </View>
              <View style={styles.levelCardDetails}>
                <View style={styles.levelRow}>
                  <Text style={styles.levelLabel}>Your Level:  </Text>
                  <Text style={styles.levelValue}>{result.level}</Text>
                </View>
                <Text style={styles.levelSub}>Knowledge Level</Text>
              </View>
            </View>

            {/* Category Breakdown */}
            <View style={styles.breakdownHeaderRow}>
              <Text style={styles.breakdownTitle}>Category Breakdown</Text>
              <Text style={styles.breakdownTotalQuestions}>Total: {result.totalQuestions} Questions</Text>
            </View>

            {targetCategories.map((cat) => {
              const b = result.categoryScores[cat] || { correct: 0, total: 10 }
              const pct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0
              const cfg = CATEGORY_CONFIG[cat] || {
                label: cat,
                icon: 'format-list-checks',
                bg: '#EFF6FF',
                color: '#2563EB',
                barColor: '#2563EB',
              }

              return (
                <View key={cat} style={styles.catCard}>
                  <View style={[styles.catIconWrap, { backgroundColor: cfg.bg }]}>
                    <MaterialCommunityIcons name={cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={styles.catInfoWrap}>
                    <View style={styles.catRowTop}>
                      <Text style={styles.catLabelText}>{cfg.label}</Text>
                      <View style={styles.catScoreRight}>
                        <Text style={styles.catFractionText}>{b.correct}/{b.total}</Text>
                        <Text style={styles.catPercentText}>{pct}%</Text>
                      </View>
                    </View>
                    <View style={styles.catBarTrack}>
                      <View
                        style={[
                          styles.catBarFill,
                          { backgroundColor: cfg.barColor, width: `${Math.max(pct, 4)}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )
            })}

            {/* Areas for Improvement */}
            <Text style={styles.areasImprovementHeader}>Areas for Improvement</Text>
            <View style={styles.areasImprovementCard}>
              {targetCategories.map((cat) => (
                <Text key={cat} style={styles.areaBulletText}>
                  •  {cat}
                </Text>
              ))}
            </View>

            {/* Strong Areas */}
            <Text style={styles.strongAreasHeader}>Strong Areas</Text>
            <View style={styles.strongAreasCard}>
              {targetCategories.map((cat) => (
                <Text key={cat} style={styles.areaBulletText}>
                  •  {cat}
                </Text>
              ))}
            </View>

            {/* Action Button: LET'S START STUDYING! */}
            <TouchableOpacity
              style={styles.studyNowButton}
              activeOpacity={0.85}
              onPress={() => {
                if (navigation?.reset) {
                  navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
                } else {
                  navigation?.replace('Home')
                }
              }}
            >
              <Text style={styles.studyNowButtonText}>
                {saving ? 'SAVING...' : "LET'S START STUDYING!"}
              </Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // ─────────────────────────────── INTRO STATE ────────────
  if (!started) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.introContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => setExitVisible(true)}>
              <Text style={styles.backText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.stepText}>Diagnostic Assessment</Text>
            <View style={styles.backSpacer} />
          </View>

          <View style={styles.introCard}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={50} color="#0F2747" />
            </View>
            <Text style={styles.introTitle}>Diagnostic Assessment</Text>
            <Text style={styles.introSubtitle}>
              {examType === 'fe' ? 'Fundamental IT Engineer (FE)' : 'Information Technology Passport (IP)'}
            </Text>
            <Text style={styles.introBody}>
              This {questions.length || (examType === 'fe' ? 40 : 30)}-item diagnostic test evaluates your readiness across {examType === 'fe' ? '4 core technical subjects' : '3 core domains (Technology, Management, Strategy)'} and automatically sets your optimal review speed.
            </Text>
            <View style={styles.bulletBox}>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  {questions.length || (examType === 'fe' ? 40 : 30)} questions (10 items each: {targetCategories.join(', ')})
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Time limit: {Math.round(secondsLeft / 60)} minutes (1 minute per question)</Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Auto-configures study speed (Detailed, Standard, or Quick)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.startButton} activeOpacity={0.85} onPress={() => setStarted(true)}>
              <Text style={styles.startButtonText}>START ASSESSMENT ({questions.length || (examType === 'fe' ? 40 : 30)} ITEMS)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.replace('Home')}>
              <Text style={styles.laterText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>

          <Modal transparent visible={exitVisible} animationType="fade" onRequestClose={() => setExitVisible(false)}>
            <View style={styles.exitOverlay}>
              <View style={styles.exitCard}>
                <Text style={styles.exitTitle}>Are You Sure You Want to Exit?</Text>
                <Text style={styles.exitSubtitle}>Your progress will not be saved if you exit now.</Text>
                <TouchableOpacity style={styles.exitPrimaryButton} onPress={handleExitAssessment}>
                  <Text style={styles.exitPrimaryButtonText}>Continue Assessment</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation?.replace('Home')}>
                  <Text style={styles.exitSecondaryText}>Exit Anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </SafeAreaView>
    )
  }

  // ─────────────────────────────── QUESTION STATE ────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.questionContainer}>
        <View style={styles.questionTopBar}>
          <TouchableOpacity onPress={() => setExitVisible(true)}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.stepText}>Question {progress}</Text>
          <View style={[styles.timerBadge, secondsLeft <= 300 && styles.timerBadgeUrgent]}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color={secondsLeft <= 300 ? '#dc2626' : '#0F2747'}
            />
            <Text style={[styles.timerText, secondsLeft <= 300 && styles.timerTextUrgent]}>
              {formatTime(secondsLeft)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / questions.length) * 100}%` }]} />
        </View>

        <Text style={styles.questionHeader}>
          {currentQuestion?.category} ({examType === 'fe' ? 'FE' : 'IP'})
        </Text>
        <Text style={styles.questionText}>{currentQuestion?.question}</Text>

        <View style={styles.optionsWrap}>
          {(Array.isArray(currentQuestion?.options) ? currentQuestion.options : []).map((option) => {
            const active = selectedAnswer === option
            return (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, active && styles.optionButtonActive]}
                activeOpacity={0.85}
                onPress={() => handleChoose(option)}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option}</Text>
              </TouchableOpacity>
            )
          })}
        </View>

        <TouchableOpacity
          style={[styles.questionNextButton, !selectedAnswer && styles.questionNextButtonDisabled]}
          activeOpacity={0.85}
          disabled={!selectedAnswer}
          onPress={handleNext}
        >
          <Text style={[styles.questionNextButtonText, !selectedAnswer && styles.questionNextButtonTextDisabled]}>
            {questionIndex === questions.length - 1 ? 'FINISH' : 'NEXT'}
          </Text>
        </TouchableOpacity>

        <Modal transparent visible={exitVisible} animationType="fade" onRequestClose={() => setExitVisible(false)}>
          <View style={styles.exitOverlay}>
            <View style={styles.exitCard}>
              <Text style={styles.exitTitle}>Are You Sure You Want to Exit?</Text>
              <Text style={styles.exitSubtitle}>Your progress will not be saved if you exit now.</Text>
              <TouchableOpacity style={styles.exitPrimaryButton} onPress={() => setExitVisible(false)}>
                <Text style={styles.exitPrimaryButtonText}>Continue Assessment</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.replace('Home')}>
                <Text style={styles.exitSecondaryText}>Exit Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24 },
  loadingText: { marginTop: 14, fontSize: 14, color: '#6b7280', fontWeight: '600' },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  retryBtn: { backgroundColor: '#0F2747', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  laterLinkBtn: { padding: 8 },
  introContainer: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 22, paddingTop: 18 },
  questionContainer: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 22, paddingTop: 18 },
  resultContainer: { flex: 1, backgroundColor: '#ffffff' },
  resultScroll: { flex: 1, backgroundColor: '#ffffff' },
  resultScrollContent: { paddingHorizontal: 16, paddingVertical: 18, backgroundColor: '#ffffff', flexGrow: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  questionTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backText: { fontSize: 24, color: '#1f2937', width: 24 },
  backSpacer: { width: 24 },
  stepText: { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timerBadgeUrgent: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  timerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2747',
    fontVariant: ['tabular-nums'],
  },
  timerTextUrgent: {
    color: '#dc2626',
  },
  progressTrack: { height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 18 },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: '#0F2747' },
  introCard: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 28 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  introTitle: { fontSize: 26, fontWeight: '800', color: '#0F2747', textAlign: 'center', marginBottom: 6 },
  introSubtitle: { fontSize: 16, color: '#d85e67', textAlign: 'center', marginBottom: 18, fontWeight: '600' },
  introBody: { fontSize: 14, lineHeight: 22, color: '#374151', textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 },
  bulletBox: { width: '100%', backgroundColor: '#ffffff', borderRadius: 22, padding: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  bulletIcon: { marginRight: 12 },
  bulletText: { fontSize: 14, color: '#1f2937', flex: 1, lineHeight: 20 },
  startButton: { width: '100%', backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 12 },
  startButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  laterText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  questionHeader: { fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: '600' },
  questionText: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 18 },
  optionsWrap: { flex: 1 },
  optionButton: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#fff' },
  optionButtonActive: { borderColor: '#0F2747', backgroundColor: '#eef2ff' },
  optionText: { fontSize: 15, color: '#111827' },
  optionTextActive: { fontWeight: '700' },
  questionNextButton: { backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  questionNextButtonDisabled: { backgroundColor: '#e2e8f0' },
  questionNextButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  questionNextButtonTextDisabled: { color: '#94a3b8' },
  exitOverlay: { flex: 1, backgroundColor: 'rgba(15,30,53,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exitCard: { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 22, padding: 22, alignItems: 'center' },
  exitTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827', marginBottom: 10 },
  exitSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  exitPrimaryButton: { backgroundColor: '#0F2747', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  exitPrimaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  exitSecondaryText: { color: '#3B82B8', fontSize: 14, fontWeight: '700' },
  // ── Result Report Styles ──────────────────────────────────
  resultHeaderWrap: { alignItems: 'center', marginTop: 10, marginBottom: 22 },
  resultCheckCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#3B82F6',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  resultMainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2747',
    textAlign: 'center',
    marginBottom: 4,
  },
  resultMainSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  reportScoreCard: {
    backgroundColor: '#EDF5FD',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#D9EAFC',
    borderWidth: 2.5,
    borderColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreCircleValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  scoreCircleTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  scoreCardDetails: {
    marginLeft: 18,
    flex: 1,
  },
  scoreCardLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 2,
  },
  scoreCardBigPercent: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F2747',
    marginBottom: 2,
  },
  scoreCardSub: {
    fontSize: 12,
    color: '#64748B',
  },
  reportLevelCard: {
    backgroundColor: '#EDF5FD',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  levelIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCardDetails: {
    marginLeft: 16,
    flex: 1,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  levelValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2747',
  },
  levelSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2747',
  },
  breakdownTotalQuestions: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
  },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EBF1F6',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catInfoWrap: {
    flex: 1,
    marginLeft: 14,
  },
  catRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2747',
  },
  catScoreRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catFractionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  catPercentText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  catBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  areasImprovementHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D85E67',
    marginTop: 14,
    marginBottom: 8,
  },
  areasImprovementCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 18,
  },
  strongAreasHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
    marginBottom: 8,
  },
  strongAreasCard: {
    backgroundColor: '#EDF5FD',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 28,
  },
  areaBulletText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    lineHeight: 24,
  },
  studyNowButton: {
    backgroundColor: '#0A2540',
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 28,
    shadowColor: '#0A2540',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  studyNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  footerLogoWrap: {
    alignItems: 'center',
    marginBottom: 24,
  },
  footerLogoImage: {
    width: 170,
    height: 48,
  },
})
