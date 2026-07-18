import React from 'react'
import {
  Alert, ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../supabase'

const CATEGORY_ORDER = [
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
  'Logical Reasoning',
  'General Information',
  'Clerical Operations',
]

const FALLBACK_QUESTIONS = [
  {
    id: 'f1',
    category: 'Verbal Ability',
    question: 'Choose the word that is most opposite in meaning to "GENEROUS".',
    options: ['Charitable', 'Stingy', 'Kind', 'Benevolent'],
    correct_answer: 'Stingy',
  },
  {
    id: 'f2',
    category: 'Numerical Ability',
    question: 'Solve for x: 3x - 7 = 14.',
    options: ['5', '6', '7', '8'],
    correct_answer: '7',
  },
  {
    id: 'f3',
    category: 'Analytical Ability',
    question: 'If all dogs are animals, and some animals are loyal, which of the following must be true?',
    options: [
      'All dogs are loyal.',
      'Some dogs are loyal.',
      'Dogs are animals.',
      'None of the above.'
    ],
    correct_answer: 'Dogs are animals.',
  },
  {
    id: 'f4',
    category: 'Logical Reasoning',
    question: 'Find the next number in the sequence: 2, 4, 8, 16, ?',
    options: ['20', '24', '30', '32'],
    correct_answer: '32',
  },
  {
    id: 'f5',
    category: 'General Information',
    question: 'According to the Philippine Constitution, who is the commander-in-chief of all armed forces of the Philippines?',
    options: ['President', 'Vice President', 'Chief of Staff', 'Secretary of National Defense'],
    correct_answer: 'President',
  },
  {
    id: 'f6',
    category: 'Clerical Operations',
    question: 'Which of the following is the correct alphabetical order of the names?',
    options: [
      'Santos A., Santos B., Santos C.',
      'Santos C., Santos B., Santos A.',
      'Santos B., Santos A., Santos C.',
      'Santos A., Santos C., Santos B.'
    ],
    correct_answer: 'Santos A., Santos B., Santos C.',
  }
]

export default function DiagnosticAssessment({ navigation, route }) {
  const from = route?.params?.from
  const [questions,      setQuestions]      = React.useState([])
  const [loading,        setLoading]        = React.useState(true)
  const [loadError,      setLoadError]      = React.useState(null)
  const [started,        setStarted]        = React.useState(false)
  const [questionIndex,  setQuestionIndex]  = React.useState(0)
  const [selectedAnswer, setSelectedAnswer] = React.useState('')
  const [answers,        setAnswers]        = React.useState({})
  const [exitVisible,    setExitVisible]    = React.useState(false)
  const [finished,       setFinished]       = React.useState(false)
  const [saving,         setSaving]         = React.useState(false)
  const [result,         setResult]         = React.useState(null)

  // ── Load questions from Supabase ───────────────────────────
  React.useEffect(() => { loadQuestions() }, [])

  // Disable back gesture on iOS / Android navigators
  React.useEffect(() => {
    navigation.setOptions({
      gestureEnabled: false,
    })
  }, [navigation])

  // Handle hardware back press (3-dot nav / gestures)
  React.useEffect(() => {
    const backAction = () => {
      // If the assessment is active (started and not finished), show the exit modal
      if (started && !finished) {
        setExitVisible(true)
        return true // block default goBack action
      }
      return false // let default goBack action execute
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    )

    return () => backHandler.remove()
  }, [started, finished])

  const loadQuestions = async () => {
    try {
      setLoading(true); setLoadError(null)
      const { data, error } = await supabase
        .from('diagnostic_questions')
        .select('id, category, question, options, correct_answer, sort_order')
        .eq('is_active', true)
        .order('category')
        .order('sort_order')
      
      if (error) {
        console.warn('Supabase fetch failed, falling back to local questions:', error)
        setQuestions(FALLBACK_QUESTIONS)
      } else if (!data || data.length === 0) {
        console.warn('No questions in database, falling back to local questions')
        setQuestions(FALLBACK_QUESTIONS)
      } else {
        setQuestions(data)
      }
    } catch (e) {
      console.warn('Load catch error, using fallback questions:', e)
      setQuestions(FALLBACK_QUESTIONS)
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[questionIndex]
  const progress        = `${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`

  // ── Compute results ────────────────────────────────────────
  const computeResults = React.useCallback((answerMap) => {
    const categoryScores = CATEGORY_ORDER.reduce((acc, cat) => {
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

    const scorePercent = Math.round((correctCount / questions.length) * 100)
    const level = scorePercent >= 80 ? 'Advanced'
                : scorePercent >= 60 ? 'Intermediate'
                : scorePercent >= 40 ? 'Beginner'
                : 'Needs Practice'

    return { correctCount, totalQuestions: questions.length, scorePercent, level, categoryScores, answerMap }
  }, [questions])

  // ── Save attempt ───────────────────────────────────────────
  const saveAttempt = React.useCallback(async (summary) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) throw new Error(userError.message)
    const userId = userData.user?.id
    if (!userId) throw new Error('No logged-in user found')

    const { error } = await supabase.from('diagnostic_assessment_attempts').insert({
      user_id:        userId,
      total_questions:summary.totalQuestions,
      correct_answers:summary.correctCount,
      score_percent:  summary.scorePercent,
      level:          summary.level,
      category_scores:summary.categoryScores,
      answers:        summary.answerMap,
      completed_at:   new Date().toISOString(),
    })
    if (error) throw new Error(error.message)
  }, [])

  // ── Handlers ───────────────────────────────────────────────
  const handleChoose = (option) => setSelectedAnswer(option)

  const handleNext = async () => {
    if (!selectedAnswer) {
      Alert.alert('Select an answer', 'Please choose one option before continuing.')
      return
    }
    const updatedAnswers = { ...answers, [currentQuestion.id]: selectedAnswer }
    setAnswers(updatedAnswers)
    setSelectedAnswer('')

    if (questionIndex < questions.length - 1) {
      setQuestionIndex((v) => v + 1)
      return
    }

    const summary = computeResults(updatedAnswers)
    setFinished(true)
    setSaving(true)
    try {
      await saveAttempt(summary)
      setResult(summary)
    } catch (err) {
      Alert.alert('Save warning', err.message || String(err))
      setResult(summary)
    } finally {
      setSaving(false)
    }
  }

  const handleExitAssessment = () => {
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
          <Text style={styles.loadingText}>Loading questions…</Text>
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
    const weakCategories = CATEGORY_ORDER.filter((cat) => {
      const b = result.categoryScores[cat]
      return b.total > 0 && b.correct < b.total
    }).slice(0, 3)

    const strongCategories = CATEGORY_ORDER.filter((cat) => {
      const b = result.categoryScores[cat]
      return b.total > 0 && b.correct === b.total
    }).slice(0, 3)

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultContainer}>
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultCard}>
              <View style={styles.resultIconWrap}>
                <Text style={styles.resultIcon}>✓</Text>
              </View>
              <Text style={styles.resultTitle}>Assessment Complete!</Text>
              <Text style={styles.resultSubtitle}>Here's your score</Text>

              <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{result.correctCount} / {result.totalQuestions}</Text>
                <Text style={styles.scorePercent}>{result.scorePercent}%</Text>
              </View>

              <View style={styles.levelBox}>
                <Text style={styles.levelText}>{result.level}</Text>
              </View>

              <Text style={styles.sectionTitle}>Category Breakdown</Text>
              <View style={styles.breakdownBox}>
                {CATEGORY_ORDER.map((cat) => {
                  const b = result.categoryScores[cat]
                  return (
                    <View key={cat} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{cat}</Text>
                      <Text style={styles.breakdownValue}>{b.correct}/{b.total}</Text>
                    </View>
                  )
                })}
              </View>

              <View style={styles.insightDangerBox}>
                <Text style={styles.insightTitle}>Areas for Improvement</Text>
                {weakCategories.length > 0
                  ? weakCategories.map((cat) => <Text key={cat} style={styles.insightItem}>• {cat}</Text>)
                  : <Text style={styles.insightItem}>• None detected</Text>}
              </View>

              <View style={styles.insightSafeBox}>
                <Text style={styles.insightTitle}>Strong Areas</Text>
                {strongCategories.length > 0
                  ? strongCategories.map((cat) => <Text key={cat} style={styles.insightItem}>• {cat}</Text>)
                  : <Text style={styles.insightItem}>• Keep practicing to build stronger areas</Text>}
              </View>

              <TouchableOpacity style={styles.finalButton} activeOpacity={0.85} onPress={() => navigation?.replace('Home')}>
                <Text style={styles.finalButtonText}>{saving ? 'SAVING...' : "LET'S START YOUR JOURNEY"}</Text>
              </TouchableOpacity>
            </View>
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
            <Text style={styles.introTitle}>Diagnostic Assessment</Text>
            <Text style={styles.introSubtitle}>Let's see how prepared you are</Text>
            <Text style={styles.introBody}>
              Check your knowledge level and get study recommendations based on your results.
            </Text>
            <View style={styles.bulletBox}>
              <Text style={styles.bulletText}>• {questions.length} questions covering all core areas</Text>
              <Text style={styles.bulletText}>• Takes about {Math.ceil(questions.length / 2.5)} minutes</Text>
              <Text style={styles.bulletText}>• Receive personalized study recommendations</Text>
            </View>
            <TouchableOpacity style={styles.startButton} activeOpacity={0.85} onPress={() => setStarted(true)}>
              <Text style={styles.startButtonText}>START ASSESSMENT</Text>
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
          <View style={styles.backSpacer} />
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((questionIndex + 1) / questions.length) * 100}%` }]} />
        </View>

        <Text style={styles.questionHeader}>{currentQuestion.category}</Text>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>

        <View style={styles.optionsWrap}>
          {(currentQuestion.options ?? []).map((option) => {
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

        <TouchableOpacity style={styles.questionNextButton} activeOpacity={0.85} onPress={handleNext}>
          <Text style={styles.questionNextButtonText}>
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
  safeArea:          { flex: 1, backgroundColor: '#ffffff' },
  centered:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingHorizontal: 24 },
  loadingText:       { marginTop: 14, fontSize: 14, color: '#6b7280', fontWeight: '600' },
  errorText:         { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 20, fontWeight: '600' },
  retryBtn:          { backgroundColor: '#0F2747', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 12 },
  retryText:         { color: '#fff', fontWeight: '700', fontSize: 14 },
  laterLinkBtn:      { padding: 8 },
  introContainer:    { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 22, paddingTop: 18 },
  questionContainer: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 22, paddingTop: 18 },
  resultContainer:   { flex: 1, backgroundColor: '#ffffff' },
  resultScroll:      { flex: 1, backgroundColor: '#ffffff' },
  resultScrollContent:{ paddingHorizontal: 16, paddingVertical: 18, backgroundColor: '#ffffff', flexGrow: 1 },
  topBar:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  questionTopBar:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backText:          { fontSize: 24, color: '#1f2937', width: 24 },
  backSpacer:        { width: 24 },
  stepText:          { fontSize: 13, fontWeight: '700', color: '#6b7280' },
  progressTrack:     { height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden', marginBottom: 18 },
  progressFill:      { height: '100%', borderRadius: 999, backgroundColor: '#0F2747' },
  introCard:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 28 },
  introTitle:        { fontSize: 28, fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: 6 },
  introSubtitle:     { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  introBody:         { fontSize: 14, lineHeight: 22, color: '#374151', textAlign: 'center', marginBottom: 18 },
  bulletBox:         { width: '100%', backgroundColor: '#f8fafc', borderRadius: 22, padding: 18, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  bulletText:        { fontSize: 14, color: '#1f2937', marginBottom: 10 },
  startButton:       { width: '100%', backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 12 },
  startButtonText:   { color: '#fff', fontSize: 15, fontWeight: '800' },
  laterText:         { color: '#6b7280', fontSize: 14, fontWeight: '600' },
  questionHeader:    { fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: '600' },
  questionText:      { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 18 },
  optionsWrap:       { flex: 1 },
  optionButton:      { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 12, backgroundColor: '#fff' },
  optionButtonActive:{ borderColor: '#0F2747', backgroundColor: '#eef2ff' },
  optionText:        { fontSize: 15, color: '#111827' },
  optionTextActive:  { fontWeight: '700' },
  questionNextButton:    { backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  questionNextButtonText:{ color: '#fff', fontSize: 15, fontWeight: '800' },
  exitOverlay:       { flex: 1, backgroundColor: 'rgba(15,30,53,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exitCard:          { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 22, padding: 22, alignItems: 'center' },
  exitTitle:         { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827', marginBottom: 10 },
  exitSubtitle:      { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  exitPrimaryButton: { backgroundColor: '#0F2747', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  exitPrimaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  exitSecondaryText: { color: '#3B82B8', fontSize: 14, fontWeight: '700' },
  resultCard:        { flexGrow: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18 },
  resultIconWrap:    { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#3B82B8', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultIcon:        { fontSize: 24, color: '#3B82B8', fontWeight: '800' },
  resultTitle:       { textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#111827' },
  resultSubtitle:    { textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 12 },
  scoreBox:          { borderWidth: 1.5, borderColor: '#D8E0F0', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  scoreText:         { fontSize: 24, fontWeight: '800', color: '#0F2747' },
  scorePercent:      { fontSize: 15, color: '#3B82B8', fontWeight: '700' },
  levelBox:          { backgroundColor: '#dbeafe', borderRadius: 16, paddingVertical: 14, marginBottom: 16 },
  levelText:         { textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#2563eb' },
  sectionTitle:      { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  breakdownBox:      { borderWidth: 1.2, borderColor: '#d1d5db', borderRadius: 16, padding: 12, marginBottom: 12 },
  breakdownRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  breakdownLabel:    { fontSize: 13, color: '#111827', flex: 1, paddingRight: 12 },
  breakdownValue:    { fontSize: 13, fontWeight: '700', color: '#0F2747' },
  insightDangerBox:  { backgroundColor: '#fee2e2', borderRadius: 16, padding: 14, marginBottom: 12 },
  insightSafeBox:    { backgroundColor: '#d1fae5', borderRadius: 16, padding: 14, marginBottom: 14 },
  insightTitle:      { fontSize: 14, fontWeight: '800', marginBottom: 8, color: '#111827' },
  insightItem:       { fontSize: 13, color: '#111827', marginBottom: 4 },
  finalButton:       { backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  finalButtonText:   { color: '#fff', fontSize: 14, fontWeight: '800' },
})
