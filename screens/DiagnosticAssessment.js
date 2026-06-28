import React from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../utils/supabase'

const QUESTIONS = [
  {
    id: 1,
    category: 'Verbal Ability',
    question: 'Choose the word that is closest in meaning to the underlined word: Confusing',
    options: ['Confusing', 'Lengthy', 'Expressive', 'Mysterious'],
    answer: 'Mysterious',
  },
  {
    id: 2,
    category: 'Verbal Ability',
    question: 'Choose the correct sentence.',
    options: ["She don't like studying.", "She doesn't like studying.", "She doesn't likes studying.", "She don't likes studying."],
    answer: "She doesn't like studying.",
  },
  {
    id: 3,
    category: 'Numerical Ability',
    question: 'A government employee earns ₱18,500 per month. If he receives a 15% salary increase, how much will his new monthly salary be?',
    options: ['₱20,175', '₱21,275', '₱21,500', '₱20,500'],
    answer: '₱21,275',
  },
  {
    id: 4,
    category: 'Numerical Ability',
    question: 'What is 25% of 160?',
    options: ['20', '30', '40', '50'],
    answer: '40',
  },
  {
    id: 5,
    category: 'Analytical Ability',
    question: 'Which figure completes the pattern: triangle, triangle, square, triangle, triangle, square, ?',
    options: ['Triangle', 'Square', 'Circle', 'Hexagon'],
    answer: 'Triangle',
  },
  {
    id: 6,
    category: 'Analytical Ability',
    question: 'If all cats are animals and all animals need water, which statement is true?',
    options: ['All cats need water', 'All water are cats', 'All animals are cats', 'No cats need water'],
    answer: 'All cats need water',
  },
  {
    id: 7,
    category: 'Logical Reasoning',
    question: 'If today is Monday, what day will it be after 3 days?',
    options: ['Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    answer: 'Thursday',
  },
  {
    id: 8,
    category: 'Logical Reasoning',
    question: 'What number comes next: 2, 4, 8, 16, ?',
    options: ['18', '20', '24', '32'],
    answer: '32',
  },
  {
    id: 9,
    category: 'General Information',
    question: 'What is the capital city of the Philippines?',
    options: ['Cebu City', 'Davao City', 'Quezon City', 'Manila'],
    answer: 'Manila',
  },
  {
    id: 10,
    category: 'General Information',
    question: 'Who is the current President of the Philippines?',
    options: ['Rodrigo Duterte', 'Ferdinand Marcos Jr.', 'Gloria Arroyo', 'Benigno Aquino III'],
    answer: 'Ferdinand Marcos Jr.',
  },
  {
    id: 11,
    category: 'Clerical Operations',
    question: 'Which is the correct alphabetical order?',
    options: ['Banana, Apple, Orange', 'Apple, Banana, Orange', 'Orange, Apple, Banana', 'Apple, Orange, Banana'],
    answer: 'Apple, Banana, Orange',
  },
  {
    id: 12,
    category: 'Clerical Operations',
    question: 'Which is the largest unit of data?',
    options: ['Byte', 'Bit', 'Kilobyte', 'Megabyte'],
    answer: 'Megabyte',
  },
]

const CATEGORY_ORDER = [
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
  'Logical Reasoning',
  'General Information',
  'Clerical Operations',
]

export default function DiagnosticAssessment({ navigation }) {
  const [started, setStarted] = React.useState(false)
  const [questionIndex, setQuestionIndex] = React.useState(0)
  const [selectedAnswer, setSelectedAnswer] = React.useState('')
  const [answers, setAnswers] = React.useState({})
  const [exitVisible, setExitVisible] = React.useState(false)
  const [finished, setFinished] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState(null)

  const currentQuestion = QUESTIONS[questionIndex]
  const progress = `${Math.min(questionIndex + 1, QUESTIONS.length)} / ${QUESTIONS.length}`

  const computeResults = React.useCallback((answerMap) => {
    const categoryScores = CATEGORY_ORDER.reduce((accumulator, category) => {
      accumulator[category] = { correct: 0, total: 0 }
      return accumulator
    }, {})

    let correctCount = 0

    QUESTIONS.forEach((question) => {
      const categoryBucket = categoryScores[question.category]
      categoryBucket.total += 1

      if (answerMap[question.id] === question.answer) {
        categoryBucket.correct += 1
        correctCount += 1
      }
    })

    const scorePercent = Math.round((correctCount / QUESTIONS.length) * 100)
    const level = scorePercent >= 80 ? 'Advanced' : scorePercent >= 60 ? 'Intermediate' : scorePercent >= 40 ? 'Beginner' : 'Needs Practice'

    return {
      correctCount,
      totalQuestions: QUESTIONS.length,
      scorePercent,
      level,
      categoryScores,
      answerMap,
    }
  }, [])

  const saveAttempt = React.useCallback(async (summary) => {
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      throw new Error(userError.message || 'Could not load user session')
    }

    const userId = userData.user?.id

    if (!userId) {
      throw new Error('No logged-in user found')
    }

    const { error } = await supabase.from('diagnostic_assessment_attempts').insert({
      user_id: userId,
      total_questions: summary.totalQuestions,
      correct_answers: summary.correctCount,
      score_percent: summary.scorePercent,
      level: summary.level,
      category_scores: summary.categoryScores,
      answers: summary.answerMap,
      completed_at: new Date().toISOString(),
    })

    if (error) {
      throw new Error(error.message || 'Could not save diagnostic assessment')
    }
  }, [])

  const handleChoose = (option) => {
    setSelectedAnswer(option)
  }

  const handleNext = async () => {
    if (!selectedAnswer) {
      Alert.alert('Select an answer', 'Please choose one option before continuing.')
      return
    }

    const updatedAnswers = {
      ...answers,
      [currentQuestion.id]: selectedAnswer,
    }

    setAnswers(updatedAnswers)
    setSelectedAnswer('')

    if (questionIndex < QUESTIONS.length - 1) {
      setQuestionIndex((value) => value + 1)
      return
    }

    const summary = computeResults(updatedAnswers)
    setFinished(true)
    setSaving(true)

    try {
      await saveAttempt(summary)
      setResult(summary)
    } catch (error) {
      Alert.alert('Save warning', error.message || String(error))
      setResult(summary)
    } finally {
      setSaving(false)
    }
  }

  const handleExitAssessment = () => {
    setExitVisible(false)
    navigation?.goBack()
  }

  if (finished && result) {
    const weakCategories = CATEGORY_ORDER.filter((category) => {
      const bucket = result.categoryScores[category]
      return bucket.total > 0 && bucket.correct < bucket.total
    }).slice(0, 3)

    const strongCategories = CATEGORY_ORDER.filter((category) => {
      const bucket = result.categoryScores[category]
      return bucket.total > 0 && bucket.correct === bucket.total
    }).slice(0, 3)

    return (
      <View style={styles.resultContainer}>
        <ScrollView
          style={styles.resultScroll}
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.resultCard}>
            <View style={styles.resultIconWrap}>
              <Text style={styles.resultIcon}>✓</Text>
            </View>
            <Text style={styles.resultTitle}>Assessment Complete!</Text>
            <Text style={styles.resultSubtitle}>Here’s your score</Text>

            <View style={styles.scoreBox}>
              <Text style={styles.scoreText}>
                {result.correctCount} / {result.totalQuestions}
              </Text>
              <Text style={styles.scorePercent}>{result.scorePercent}%</Text>
            </View>

            <View style={styles.levelBox}>
              <Text style={styles.levelText}>{result.level}</Text>
            </View>

            <Text style={styles.sectionTitle}>Category Breakdown</Text>
            <View style={styles.breakdownBox}>
              {CATEGORY_ORDER.map((category) => {
                const bucket = result.categoryScores[category]
                return (
                  <View key={category} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{category}</Text>
                    <Text style={styles.breakdownValue}>
                      {bucket.correct}/{bucket.total}
                    </Text>
                  </View>
                )
              })}
            </View>

            <View style={styles.insightDangerBox}>
              <Text style={styles.insightTitle}>Areas for Improvement</Text>
              {weakCategories.length > 0 ? (
                weakCategories.map((category) => <Text key={category} style={styles.insightItem}>• {category}</Text>)
              ) : (
                <Text style={styles.insightItem}>• None detected</Text>
              )}
            </View>

            <View style={styles.insightSafeBox}>
              <Text style={styles.insightTitle}>Strong Areas</Text>
              {strongCategories.length > 0 ? (
                strongCategories.map((category) => <Text key={category} style={styles.insightItem}>• {category}</Text>)
              ) : (
                <Text style={styles.insightItem}>• Keep practicing to build stronger areas</Text>
              )}
            </View>

            <TouchableOpacity style={styles.finalButton} activeOpacity={0.85} onPress={() => navigation?.replace('Home')}>
              <Text style={styles.finalButtonText}>{saving ? 'SAVING...' : "LET'S START YOUR JOURNEY"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    )
  }

  if (!started) {
    return (
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
          <Text style={styles.introSubtitle}>Let’s see how prepared you are</Text>
          <Text style={styles.introBody}>
            Check your knowledge level and get study recommendations based on your results.
          </Text>

          <View style={styles.bulletBox}>
            <Text style={styles.bulletText}>• 12 questions covering all core areas</Text>
            <Text style={styles.bulletText}>• Takes about 5 minutes</Text>
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
    )
  }

  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionTopBar}>
        <TouchableOpacity onPress={() => setExitVisible(true)}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.stepText}>Question {progress}</Text>
        <View style={styles.backSpacer} />
      </View>

      <Text style={styles.questionHeader}>{currentQuestion.category}</Text>
      <Text style={styles.questionText}>{currentQuestion.question}</Text>

      <View style={styles.optionsWrap}>
        {currentQuestion.options.map((option) => {
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
        <Text style={styles.questionNextButtonText}>{questionIndex === QUESTIONS.length - 1 ? 'FINISH' : 'NEXT'}</Text>
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
  )
}

const styles = StyleSheet.create({
  introContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  questionContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  resultScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  resultScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    backgroundColor: '#ffffff',
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  questionTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backText: {
    fontSize: 24,
    color: '#1f2937',
    width: 24,
  },
  backSpacer: {
    width: 24,
  },
  stepText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
  },
  introCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 28,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  introSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  introBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 18,
  },
  bulletBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  bulletText: {
    fontSize: 14,
    color: '#1f2937',
    marginBottom: 10,
  },
  startButton: {
    width: '100%',
    backgroundColor: '#0F2747',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  laterText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  questionHeader: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 18,
  },
  optionsWrap: {
    flex: 1,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    borderColor: '#0F2747',
    backgroundColor: '#eef2ff',
  },
  optionText: {
    fontSize: 15,
    color: '#111827',
  },
  optionTextActive: {
    fontWeight: '700',
  },
  questionNextButton: {
    backgroundColor: '#0F2747',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  exitOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 53, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exitCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  exitTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    color: '#111827',
    marginBottom: 10,
  },
  exitSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 18,
  },
  exitPrimaryButton: {
    backgroundColor: '#0F2747',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  exitPrimaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  exitSecondaryText: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
  },
  resultIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#3B82B8',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  resultIcon: {
    fontSize: 24,
    color: '#3B82B8',
    fontWeight: '800',
  },
  resultTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  resultSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  scoreBox: {
    borderWidth: 1.5,
    borderColor: '#D8E0F0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2747',
  },
  scorePercent: {
    fontSize: 15,
    color: '#3B82B8',
    fontWeight: '700',
  },
  levelBox: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  levelText: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#2563eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  breakdownBox: {
    borderWidth: 1.2,
    borderColor: '#d1d5db',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#111827',
    flex: 1,
    paddingRight: 12,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2747',
  },
  insightDangerBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  insightSafeBox: {
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111827',
  },
  insightItem: {
    fontSize: 13,
    color: '#111827',
    marginBottom: 4,
  },
  finalButton: {
    backgroundColor: '#0F2747',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
})
