import React from 'react'
import {
  Alert, ActivityIndicator, Modal, ScrollView,
  StyleSheet, Text, TouchableOpacity, View, BackHandler,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { supabase } from '../../supabase'
import { setCache } from '../../utils/cache'

const SUB_PRO_CATEGORIES = [
  'General Information',
  'Verbal Ability',
  'Numerical Ability',
  'Clerical Operations',
]

const PRO_CATEGORIES = [
  'General Information',
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
]

const FALLBACK_QUESTIONS = [
  // ── GENERAL INFORMATION (10 ITEMS) ──────────────────────────
  {
    id: 'g1',
    category: 'General Information',
    question: 'Republic Act No. 6713 is officially known as what act?',
    options: [
      'Code of Conduct and Ethical Standards for Public Officials and Employees',
      'Anti-Graft and Corrupt Practices Act',
      'Civil Service Reform Act of 1987',
      'Government Procurement Reform Act'
    ],
    correct_answer: 'Code of Conduct and Ethical Standards for Public Officials and Employees',
  },
  {
    id: 'g2',
    category: 'General Information',
    question: 'According to Article II Section 1 of the 1987 Constitution, sovereignty resides in the:',
    options: ['President', 'Congress', 'People', 'Supreme Court'],
    correct_answer: 'People',
  },
  {
    id: 'g3',
    category: 'General Information',
    question: 'Under the 1987 Constitution, executive power is vested in whom?',
    options: ['Chief Justice', 'President of the Philippines', 'Senate President', 'Speaker of the House'],
    correct_answer: 'President of the Philippines',
  },
  {
    id: 'g4',
    category: 'General Information',
    question: 'Which body has the sole power to try and decide all cases of impeachment?',
    options: ['House of Representatives', 'Supreme Court', 'Senate', 'Sandiganbayan'],
    correct_answer: 'Senate',
  },
  {
    id: 'g5',
    category: 'General Information',
    question: 'The independent constitutional office that acts as the protector of the people is the:',
    options: ['Commission on Audit', 'Office of the Ombudsman', 'Civil Service Commission', 'Commission on Elections'],
    correct_answer: 'Office of the Ombudsman',
  },
  {
    id: 'g6',
    category: 'General Information',
    question: 'Public officials must submit their Statement of Assets, Liabilities and Net Worth (SALN) within how many days after assumption of office?',
    options: ['15 days', '30 days', '60 days', '90 days'],
    correct_answer: '30 days',
  },
  {
    id: 'g7',
    category: 'General Information',
    question: 'According to Article XIV of the 1987 Constitution, the national language of the Philippines is:',
    options: ['Tagalog', 'Filipino', 'English', 'Filipino and English'],
    correct_answer: 'Filipino',
  },
  {
    id: 'g8',
    category: 'General Information',
    question: 'Which constitutional commission is responsible for the recruitment and career progression of civil servants?',
    options: ['Commission on Audit', 'Civil Service Commission', 'Commission on Elections', 'Commission on Human Rights'],
    correct_answer: 'Civil Service Commission',
  },
  {
    id: 'g9',
    category: 'General Information',
    question: 'The right of the people to be secure in their persons against unreasonable searches is guaranteed under Article III, Section:',
    options: ['Section 1', 'Section 2', 'Section 4', 'Section 12'],
    correct_answer: 'Section 2',
  },
  {
    id: 'g10',
    category: 'General Information',
    question: 'What principle means that public office is a public trust?',
    options: ['Accountability of Public Officers', 'Doctrine of Immunity', 'Checks and Balances', 'Separation of Powers'],
    correct_answer: 'Accountability of Public Officers',
  },

  // ── VERBAL ABILITY (10 ITEMS) ────────────────────────────────
  {
    id: 'v1',
    category: 'Verbal Ability',
    question: 'Choose the word that is most OPPOSITE in meaning to "BENEVOLENT".',
    options: ['Charitable', 'Malevolent', 'Generous', 'Sympathetic'],
    correct_answer: 'Malevolent',
  },
  {
    id: 'v2',
    category: 'Verbal Ability',
    question: 'Choose the word that is most SIMILAR in meaning to "METICULOUS".',
    options: ['Careless', 'Thorough', 'Hastily', 'Humble'],
    correct_answer: 'Thorough',
  },
  {
    id: 'v3',
    category: 'Verbal Ability',
    question: 'Identify the correctly spelled word:',
    options: ['Acommodate', 'Accommodate', 'Acomodate', 'Accomodate'],
    correct_answer: 'Accommodate',
  },
  {
    id: 'v4',
    category: 'Verbal Ability',
    question: 'Complete the sentence: "Neither of the candidates _____ prepared for the interview."',
    options: ['was', 'were', 'are', 'have been'],
    correct_answer: 'was',
  },
  {
    id: 'v5',
    category: 'Verbal Ability',
    question: 'Identify the error in: "She don\'t know the correct procedure for submission."',
    options: ['She', 'don\'t', 'the correct', 'for submission'],
    correct_answer: 'don\'t',
  },
  {
    id: 'v6',
    category: 'Verbal Ability',
    question: 'Choose the word that best completes the analogy: "LIGHT is to DARK as KNOWLEDGE is to _____".',
    options: ['Ignorance', 'Wisdom', 'Book', 'Intelligence'],
    correct_answer: 'Ignorance',
  },
  {
    id: 'v7',
    category: 'Verbal Ability',
    question: 'Choose the word that is most OPPOSITE in meaning to "OBSTINATE".',
    options: ['Stubborn', 'Flexible', 'Rigid', 'Firm'],
    correct_answer: 'Flexible',
  },
  {
    id: 'v8',
    category: 'Verbal Ability',
    question: 'Complete the sentence: "The panel of judges _____ announced the winners."',
    options: ['has', 'have', 'are', 'were'],
    correct_answer: 'has',
  },
  {
    id: 'v9',
    category: 'Verbal Ability',
    question: 'Select the sentence with correct grammar and usage:',
    options: [
      'Each of the members have submitted their report.',
      'Each of the members has submitted his or her report.',
      'Each of the member has submitted their report.',
      'Each of the members were submitting their report.'
    ],
    correct_answer: 'Each of the members has submitted his or her report.',
  },
  {
    id: 'v10',
    category: 'Verbal Ability',
    question: 'Choose the word that is most SIMILAR in meaning to "CANDID".',
    options: ['Deceptive', 'Frank', 'Secretive', 'Cautious'],
    correct_answer: 'Frank',
  },

  // ── NUMERICAL ABILITY (10 ITEMS) ─────────────────────────────
  {
    id: 'n1',
    category: 'Numerical Ability',
    question: 'Solve for x: 4x + 12 = 36.',
    options: ['5', '6', '7', '8'],
    correct_answer: '6',
  },
  {
    id: 'n2',
    category: 'Numerical Ability',
    question: 'What is 15% of 400?',
    options: ['50', '60', '70', '80'],
    correct_answer: '60',
  },
  {
    id: 'n3',
    category: 'Numerical Ability',
    question: 'Find the next number in the sequence: 3, 7, 15, 31, ?',
    options: ['45', '58', '63', '65'],
    correct_answer: '63',
  },
  {
    id: 'n4',
    category: 'Numerical Ability',
    question: 'If a car travels at a constant speed of 60 km/h, how far does it travel in 2 hours and 30 minutes?',
    options: ['120 km', '135 km', '150 km', '160 km'],
    correct_answer: '150 km',
  },
  {
    id: 'n5',
    category: 'Numerical Ability',
    question: 'Evaluate the expression: (12 ÷ 3) + (5 × 4) - 6.',
    options: ['16', '18', '20', '22'],
    correct_answer: '18',
  },
  {
    id: 'n6',
    category: 'Numerical Ability',
    question: 'Find the average score of a student who scored 85, 90, 78, and 87.',
    options: ['84', '85', '86', '87'],
    correct_answer: '85',
  },
  {
    id: 'n7',
    category: 'Numerical Ability',
    question: 'An item originally priced at ₱1,000 is given a 20% discount. What is the final price?',
    options: ['₱750', '₱800', '₱850', '₱900'],
    correct_answer: '₱800',
  },
  {
    id: 'n8',
    category: 'Numerical Ability',
    question: 'What is the sum of 2/5 and 1/3?',
    options: ['3/8', '7/15', '11/15', '13/15'],
    correct_answer: '11/15',
  },
  {
    id: 'n9',
    category: 'Numerical Ability',
    question: 'Find the next number in the sequence: 100, 90, 81, 73, ?',
    options: ['64', '65', '66', '67'],
    correct_answer: '66',
  },
  {
    id: 'n10',
    category: 'Numerical Ability',
    question: 'If 5 workers can complete a job in 6 days, how many days will 10 workers take working at the same rate?',
    options: ['2 days', '3 days', '4 days', '5 days'],
    correct_answer: '3 days',
  },

  // ── ANALYTICAL ABILITY (10 ITEMS - PRO) ──────────────────────
  {
    id: 'a1',
    category: 'Analytical Ability',
    question: 'If all mammals are warm-blooded, and all dogs are mammals, which statement MUST be true?',
    options: [
      'All warm-blooded animals are dogs.',
      'All dogs are warm-blooded.',
      'Some dogs are not mammals.',
      'None of the above.'
    ],
    correct_answer: 'All dogs are warm-blooded.',
  },
  {
    id: 'a2',
    category: 'Analytical Ability',
    question: 'If TODAY is Wednesday, what day of the week will it be in 100 days?',
    options: ['Thursday', 'Friday', 'Saturday', 'Sunday'],
    correct_answer: 'Friday',
  },
  {
    id: 'a3',
    category: 'Analytical Ability',
    question: 'If "RED" is coded as 18-5-4, how is "BLUE" coded?',
    options: ['2-12-21-5', '2-11-20-5', '3-12-21-6', '2-13-22-5'],
    correct_answer: '2-12-21-5',
  },
  {
    id: 'a4',
    category: 'Analytical Ability',
    question: 'Identify the underlying assumption: "Sales will increase this quarter because we hired additional agents."',
    options: [
      'Additional agents cost less to employ.',
      'Hiring additional agents directly contributes to higher sales volume.',
      'No other company is hiring sales agents.',
      'Current sales agents are unproductive.'
    ],
    correct_answer: 'Hiring additional agents directly contributes to higher sales volume.',
  },
  {
    id: 'a5',
    category: 'Analytical Ability',
    question: 'Complete the letter pattern: A, C, E, G, ?',
    options: ['H', 'I', 'J', 'K'],
    correct_answer: 'I',
  },
  {
    id: 'a6',
    category: 'Analytical Ability',
    question: 'Statement: All high achievers study consistently. Mark passed the exam. Conclusion:',
    options: [
      'Mark is a high achiever.',
      'Mark studied consistently.',
      'Mark may or may not be a high achiever who studied consistently.',
      'Mark did not study.'
    ],
    correct_answer: 'Mark may or may not be a high achiever who studied consistently.',
  },
  {
    id: 'a7',
    category: 'Analytical Ability',
    question: 'A department recorded sales of 120 units in Q1, 150 units in Q2, and 180 units in Q3. What is the quarterly growth trend?',
    options: [
      'Increasing by 30 units per quarter',
      'Decreasing by 10%',
      'Constant sales rate',
      'Doubling each quarter'
    ],
    correct_answer: 'Increasing by 30 units per quarter',
  },
  {
    id: 'a8',
    category: 'Analytical Ability',
    question: 'If Statement P implies Statement Q, and Statement Q is FALSE, what can be concluded about P?',
    options: ['P is TRUE', 'P is FALSE', 'P is UNCERTAIN', 'Q must be TRUE'],
    correct_answer: 'P is FALSE',
  },
  {
    id: 'a9',
    category: 'Analytical Ability',
    question: 'If CIRCLE is written as ELCRIC, how is SQUARE written?',
    options: ['ERAUQS', 'ERAUSQ', 'QSERAU', 'SQUARE'],
    correct_answer: 'ERAUQS',
  },
  {
    id: 'a10',
    category: 'Analytical Ability',
    question: 'Mark is taller than John. John is taller than Paul. Who is the shortest among the three?',
    options: ['Mark', 'John', 'Paul', 'Cannot be determined'],
    correct_answer: 'Paul',
  },

  // ── CLERICAL OPERATIONS (10 ITEMS - SUB PRO) ───────────────
  {
    id: 'c1',
    category: 'Clerical Operations',
    question: 'Which of the following names should be filed FIRST alphabetically?',
    options: ['Alvarado, Carlos', 'Alvarez, Antonio', 'Alvarez, Bernardo', 'Alvarez, Aaron'],
    correct_answer: 'Alvarado, Carlos',
  },
  {
    id: 'c2',
    category: 'Clerical Operations',
    question: 'Compare Item A: "Account No. 84930291" and Item B: "Account No. 84930219". Are they identical?',
    options: ['Identical', 'Not Identical', 'Same digits only', 'Incomplete data'],
    correct_answer: 'Not Identical',
  },
  {
    id: 'c3',
    category: 'Clerical Operations',
    question: 'Arrange in correct alphabetical filing order: (1) De Guzman, A. (2) Dela Cruz, B. (3) Del Rosario, C. (4) Delos Reyes, D.',
    options: [
      '(1), (2), (3), (4)',
      '(2), (1), (3), (4)',
      '(4), (3), (2), (1)',
      '(1), (3), (2), (4)'
    ],
    correct_answer: '(1), (2), (3), (4)',
  },
  {
    id: 'c4',
    category: 'Clerical Operations',
    question: 'Identify the spelling error in: "The secretary filed the documents in the cabinet yesterday."',
    options: ['secretary', 'documents', 'cabinet', 'No error'],
    correct_answer: 'No error',
  },
  {
    id: 'c5',
    category: 'Clerical Operations',
    question: 'In standard numerical filing, which document number comes immediately before #00452?',
    options: ['#00450', '#00451', '#00453', '#00460'],
    correct_answer: '#00451',
  },
  {
    id: 'c6',
    category: 'Clerical Operations',
    question: 'Which of the following words is MISSPELLED?',
    options: ['Receit', 'Maintenance', 'Calendar', 'Guarantee'],
    correct_answer: 'Receit',
  },
  {
    id: 'c7',
    category: 'Clerical Operations',
    question: 'Match target code "A4-9982" with the exact matching option:',
    options: ['A4-9928', 'A4-9982', 'A4-9892', 'A4-9988'],
    correct_answer: 'A4-9982',
  },
  {
    id: 'c8',
    category: 'Clerical Operations',
    question: 'Which name should be placed LAST in alphabetical order?',
    options: ['Brown, A.', 'Brown, Aaron', 'Brown, Adam', 'Brown, Alan'],
    correct_answer: 'Brown, Alan',
  },
  {
    id: 'c9',
    category: 'Clerical Operations',
    question: 'What is the primary function of a paper shredder in an office setting?',
    options: [
      'Binding documents',
      'Disposing confidential files securely',
      'Duplicating papers',
      'Laminating records'
    ],
    correct_answer: 'Disposing confidential files securely',
  },
  {
    id: 'c10',
    category: 'Clerical Operations',
    question: 'Compare Code 1: "CSE-2026-SUBPRO" and Code 2: "CSE-2026-SUPBRO". What is the difference?',
    options: ['No difference', 'Spelling order of SUBPRO vs SUPBRO', 'Numbering difference', 'Case sensitivity'],
    correct_answer: 'Spelling order of SUBPRO vs SUPBRO',
  },
]

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
  const [examType, setExamType] = React.useState('pro')
  const [targetCategories, setTargetCategories] = React.useState(PRO_CATEGORIES)

  // ── Load exam type & questions ─────────────────────────────
  React.useEffect(() => { loadQuestions() }, [])

  // Disable back gesture on iOS / Android navigators
  React.useEffect(() => {
    navigation.setOptions({ gestureEnabled: false })
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
          if (lvl.includes('sub')) {
            return 'sub_pro'
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching exam type:', e)
    }
    return 'pro'
  }

  const loadQuestions = async () => {
    try {
      setLoading(true)
      setLoadError(null)

      const userExamType = await fetchUserExamType()
      setExamType(userExamType)

      const categories = userExamType === 'sub_pro' ? SUB_PRO_CATEGORIES : PRO_CATEGORIES
      setTargetCategories(categories)

      // Attempt to load from Supabase for target categories
      const { data: dbData, error } = await supabase
        .from('diagnostic_questions')
        .select('id, category, question, options, correct_answer')
        .eq('is_active', true)
        .in('category', categories)
        .order('category')

      let assembled = []

      // Assembly: Randomly pick 10 questions per category (40 total)
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

        // Randomly shuffle all questions in this category and pick 10
        const shuffled = [...combined].sort(() => Math.random() - 0.5)
        assembled.push(...shuffled.slice(0, 10))
      })

      if (assembled.length === 0) {
        // Fallback for all categories if anything fails
        assembled = FALLBACK_QUESTIONS.filter((q) => categories.includes(q.category))
      }

      setQuestions(assembled)
    } catch (e) {
      console.warn('Load questions error, using local fallback:', e)
      const categories = examType === 'sub_pro' ? SUB_PRO_CATEGORIES : PRO_CATEGORIES
      setQuestions(FALLBACK_QUESTIONS.filter((q) => categories.includes(q.category)))
    } finally {
      setLoading(false)
    }
  }

  const currentQuestion = questions[questionIndex]
  const progress = `${Math.min(questionIndex + 1, questions.length)} / ${questions.length}`

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

    let weakestCategory = targetCategories[0] || 'Numerical Ability'
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
    // - Slow: Majority wrong (< 50%)
    // - Normal: Middle range (50% - 79%)
    // - Fast: Almost all correct (>= 80%)
    let calculatedSpeed = 'normal'
    if (scorePercent < 50) {
      calculatedSpeed = 'slow'
    } else if (scorePercent >= 80) {
      calculatedSpeed = 'fast'
    } else {
      calculatedSpeed = 'normal'
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
      console.warn('Save diagnostic warning:', err)
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
          <Text style={styles.loadingText}>Loading 40 {examType === 'sub_pro' ? 'Sub-Professional' : 'Professional'} questions…</Text>
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
    const weakCategories = targetCategories.filter((cat) => {
      const b = result.categoryScores[cat]
      return b && b.total > 0 && b.correct < b.total
    }).slice(0, 3)

    const strongCategories = targetCategories.filter((cat) => {
      const b = result.categoryScores[cat]
      return b && b.total > 0 && b.correct === b.total
    }).slice(0, 3)

    const speedLabel = result.calculatedSpeed.toUpperCase()
    const speedDescription = 
      result.calculatedSpeed === 'slow' ? 'Comprehensive step-by-step guidance'
      : result.calculatedSpeed === 'fast' ? 'Concise & fast-paced practice content'
      : 'Standard balanced study plan'

    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.resultContainer}>
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.resultCard}>
              <View style={styles.resultIconWrap}>
                <Text style={styles.resultIcon}>✓</Text>
              </View>
              <Text style={styles.resultTitle}>Assessment Complete!</Text>
              <Text style={styles.resultSubtitle}>
                {examType === 'sub_pro' ? 'Sub-Professional' : 'Professional'} Exam Track (40 Items)
              </Text>

              <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{result.correctCount} / {result.totalQuestions}</Text>
                <Text style={styles.scorePercent}>{result.scorePercent}%</Text>
              </View>

              <View style={styles.levelBox}>
                <Text style={styles.levelText}>{result.level}</Text>
              </View>

              {/* Recommended Review Speed Box */}
              <View style={styles.speedBox}>
                <Text style={styles.speedHeader}>RECOMMENDED STUDY SPEED</Text>
                <Text style={styles.speedBadge}>⚡ {speedLabel} SPEED</Text>
                <Text style={styles.speedDesc}>{speedDescription}</Text>
              </View>

              <Text style={styles.sectionTitle}>Category Breakdown (10 items each)</Text>
              <View style={styles.breakdownBox}>
                {targetCategories.map((cat) => {
                  const b = result.categoryScores[cat] || { correct: 0, total: 10 }
                  return (
                    <View key={cat} style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>{cat}</Text>
                      <Text style={styles.breakdownValue}>{b.correct} / {b.total}</Text>
                    </View>
                  )
                })}
              </View>

              <View style={styles.insightDangerBox}>
                <Text style={styles.insightTitle}>Areas for Improvement</Text>
                {weakCategories.length > 0
                  ? weakCategories.map((cat) => <Text key={cat} style={styles.insightItem}>• {cat}</Text>)
                  : <Text style={styles.insightItem}>• None detected! Excellent performance across all areas.</Text>}
              </View>

              <View style={styles.insightSafeBox}>
                <Text style={styles.insightTitle}>Strong Areas</Text>
                {strongCategories.length > 0
                  ? strongCategories.map((cat) => <Text key={cat} style={styles.insightItem}>• {cat}</Text>)
                  : <Text style={styles.insightItem}>• Keep practicing to build stronger areas.</Text>}
              </View>

              <TouchableOpacity
                style={styles.finalButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (navigation?.reset) {
                    navigation.reset({ index: 0, routes: [{ name: 'Home' }] })
                  } else {
                    navigation?.replace('Home')
                  }
                }}
              >
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
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="clipboard-check-outline" size={50} color="#0F2747" />
            </View>
            <Text style={styles.introTitle}>Diagnostic Assessment</Text>
            <Text style={styles.introSubtitle}>
              {examType === 'sub_pro' ? 'Sub-Professional Level' : 'Professional Level'}
            </Text>
            <Text style={styles.introBody}>
              This 40-item diagnostic test evaluates your readiness across 4 core subjects and automatically sets your optimal review speed.
            </Text>
            <View style={styles.bulletBox}>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>
                  40 questions (10 items each: {targetCategories.join(', ')})
                </Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Takes about 15 - 20 minutes</Text>
              </View>
              <View style={styles.bulletRow}>
                <MaterialCommunityIcons name="speedometer" size={20} color="#d85e67" style={styles.bulletIcon} />
                <Text style={styles.bulletText}>Auto-configures study speed (Slow, Normal, or Fast)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.startButton} activeOpacity={0.85} onPress={() => setStarted(true)}>
              <Text style={styles.startButtonText}>START ASSESSMENT (40 ITEMS)</Text>
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

        <Text style={styles.questionHeader}>
          {currentQuestion?.category} ({examType === 'sub_pro' ? 'Sub-Pro' : 'Pro'})
        </Text>
        <Text style={styles.questionText}>{currentQuestion?.question}</Text>

        <View style={styles.optionsWrap}>
          {(currentQuestion?.options ?? []).map((option) => {
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
  questionNextButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  exitOverlay: { flex: 1, backgroundColor: 'rgba(15,30,53,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  exitCard: { width: '100%', maxWidth: 320, backgroundColor: '#fff', borderRadius: 22, padding: 22, alignItems: 'center' },
  exitTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', color: '#111827', marginBottom: 10 },
  exitSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 18 },
  exitPrimaryButton: { backgroundColor: '#0F2747', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  exitPrimaryButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  exitSecondaryText: { color: '#3B82B8', fontSize: 14, fontWeight: '700' },
  resultCard: { flexGrow: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 18 },
  resultIconWrap: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: '#3B82B8', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  resultIcon: { fontSize: 24, color: '#3B82B8', fontWeight: '800' },
  resultTitle: { textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#111827' },
  resultSubtitle: { textAlign: 'center', fontSize: 13, color: '#6b7280', marginBottom: 12 },
  scoreBox: { borderWidth: 1.5, borderColor: '#D8E0F0', borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  scoreText: { fontSize: 24, fontWeight: '800', color: '#0F2747' },
  scorePercent: { fontSize: 15, color: '#3B82B8', fontWeight: '700' },
  levelBox: { backgroundColor: '#dbeafe', borderRadius: 16, paddingVertical: 14, marginBottom: 12 },
  levelText: { textAlign: 'center', fontSize: 22, fontWeight: '800', color: '#2563eb' },
  speedBox: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac', borderRadius: 16, padding: 14, alignItems: 'center', marginBottom: 16 },
  speedHeader: { fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.5, marginBottom: 4 },
  speedBadge: { fontSize: 18, fontWeight: '900', color: '#15803d', marginBottom: 4 },
  speedDesc: { fontSize: 12, color: '#166534', textAlign: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 8 },
  breakdownBox: { borderWidth: 1.2, borderColor: '#d1d5db', borderRadius: 16, padding: 12, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  breakdownLabel: { fontSize: 13, color: '#111827', flex: 1, paddingRight: 12 },
  breakdownValue: { fontSize: 13, fontWeight: '700', color: '#0F2747' },
  insightDangerBox: { backgroundColor: '#fee2e2', borderRadius: 16, padding: 14, marginBottom: 12 },
  insightSafeBox: { backgroundColor: '#d1fae5', borderRadius: 16, padding: 14, marginBottom: 14 },
  insightTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8, color: '#111827' },
  insightItem: { fontSize: 13, color: '#111827', marginBottom: 4 },
  finalButton: { backgroundColor: '#0F2747', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  finalButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
})
