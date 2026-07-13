import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// STATIC DATA
// Two exam levels — same screen, just a different question count and time
// limit for each. Swap LEVEL_CONFIGS / QUESTION_POOL for real content later.
// ---------------------------------------------------------------------------
const LEVEL_CONFIGS = {
  professional: {
    key: 'professional',
    tag: '1 DA',
    title: 'Professional Level',
    totalQuestions: 180,
    hours: 3,
  },
  subProfessional: {
    key: 'subProfessional',
    tag: '1 DA',
    title: 'Sub-Professional Level',
    totalQuestions: 120,
    hours: 2,
  },
};

// A small pool of sample questions — cycled to fill however many questions
// the chosen level needs (180 or 120), so both levels reuse the same static
// content but end up with a different total.
const QUESTION_POOL = [
  {
    prompt: 'Choose the correct sentence.',
    options: [
      "She don't like studying.",
      "She doesn't likes studying.",
      "She doesn't like studying.",
      "She don't likes studying.",
    ],
    correctIndex: 2,
  },
  {
    prompt: 'Which word is a synonym for "happy"?',
    options: ['Glad', 'Sad', 'Angry', 'Tired'],
    correctIndex: 0,
  },
  {
    prompt: 'Which sentence uses the correct verb tense?',
    options: [
      'Yesterday, I go to the store.',
      'Yesterday, I went to the store.',
      'Yesterday, I goes to the store.',
      'Yesterday, I going to the store.',
    ],
    correctIndex: 1,
  },
  {
    prompt: 'Which of these is an idiom?',
    options: [
      'It is raining outside.',
      'Break a leg!',
      'The sky is blue.',
      'She walked to school.',
    ],
    correctIndex: 1,
  },
  {
    prompt: 'Choose the correctly punctuated sentence.',
    options: [
      "Its a beautiful day.",
      "It's a beautiful day.",
      "Its' a beautiful day.",
      "Its a, beautiful day.",
    ],
    correctIndex: 1,
  },
];

function buildExamQuestions(totalQuestions) {
  const questions = [];
  for (let i = 0; i < totalQuestions; i += 1) {
    questions.push(QUESTION_POOL[i % QUESTION_POOL.length]);
  }
  return questions;
}

function formatTime(totalSeconds) {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${hrs}:${pad(mins)}:${pad(secs)}`;
}

const NAVY = '#0B2540';

export default function MockExamTake({ navigation, route }) {
  const incomingLevelId = route?.params?.level; // 'professional' | 'sub-professional'
  const initialLevelKey =
    incomingLevelId === 'professional'
      ? 'professional'
      : incomingLevelId === 'sub-professional'
      ? 'subProfessional'
      : 'subProfessional';

  const [levelKey, setLevelKey] = useState(initialLevelKey);
  const [stage, setStage] = useState('intro'); // 'intro' | 'quiz' | 'results'
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]); // selected option index per question
  const [secondsLeft, setSecondsLeft] = useState(0);

  const timerRef = useRef(null);
  const level = LEVEL_CONFIGS[levelKey];

  useEffect(() => {
    if (incomingLevelId) {
      startExam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== 'quiz') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          finishExam(answers);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const startExam = () => {
    const examQuestions = buildExamQuestions(level.totalQuestions);
    setQuestions(examQuestions);
    setQuestionIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    setSecondsLeft(level.hours * 3600);
    setStage('quiz');
  };

  const selectOption = (optionIndex) => {
    setSelectedOption(optionIndex);
  };

  const goToNext = () => {
    const updatedAnswers = [...answers, selectedOption];
    setAnswers(updatedAnswers);

    const isLastQuestion = questionIndex === questions.length - 1;
    if (isLastQuestion) {
      finishExam(updatedAnswers);
    } else {
      setQuestionIndex((prev) => prev + 1);
      setSelectedOption(null);
    }
  };

  const finishExam = (finalAnswers) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStage('results');
    setAnswers(finalAnswers);
  };

  const backToHome = () => {
    if (navigation?.navigate) {
      navigation.navigate('MockExamHome');
    } else {
      setStage('intro');
    }
  };

  const score = answers.reduce((count, answer, i) => {
    const q = questions[i];
    return q && answer === q.correctIndex ? count + 1 : count;
  }, 0);

  // ---------------------------------------------------------------------
  // INTRO STAGE
  // ---------------------------------------------------------------------
  if (stage === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mock Exam</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={NAVY} />
          </TouchableOpacity>
        </View>

        <View style={styles.levelToggleRow}>
          {Object.values(LEVEL_CONFIGS).map((cfg) => (
            <TouchableOpacity
              key={cfg.key}
              style={[
                styles.levelToggleButton,
                levelKey === cfg.key && styles.levelToggleButtonActive,
              ]}
              onPress={() => setLevelKey(cfg.key)}
            >
              <Text
                style={[
                  styles.levelToggleText,
                  levelKey === cfg.key && styles.levelToggleTextActive,
                ]}
              >
                {cfg.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.heroImage}>
          <Ionicons name="laptop-outline" size={56} color="#8CA0BF" />
        </View>

        <View style={styles.introBody}>
          <Text style={styles.introTitle}>{level.title}</Text>
          <View style={styles.introMetaRow}>
            <View style={styles.introMetaItem}>
              <Ionicons name="document-text-outline" size={14} color="#6B7684" />
              <Text style={styles.introMetaText}>{level.totalQuestions} Questions</Text>
            </View>
            <View style={styles.introMetaItem}>
              <Ionicons name="time-outline" size={14} color="#6B7684" />
              <Text style={styles.introMetaText}>{level.hours} Hours</Text>
            </View>
          </View>
        </View>

        <View style={styles.introFooter}>
          <TouchableOpacity style={styles.primaryButton} onPress={startExam}>
            <Text style={styles.primaryButtonText}>Start Mock Exam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------
  // QUIZ STAGE
  // ---------------------------------------------------------------------
  if (stage === 'quiz') {
    const question = questions[questionIndex];
    if (!question) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.quizHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.quizHeaderTitle}>
            {level.tag} - Question {questionIndex + 1}
          </Text>
          <View style={styles.timerPill}>
            <Ionicons name="time-outline" size={14} color={NAVY} />
            <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
          </View>
        </View>

        <View style={styles.quizBody}>
          <Text style={styles.questionCounter}>
            Question {questionIndex + 1} of {questions.length}
          </Text>
          <Text style={styles.questionPrompt}>{question.prompt}</Text>

          <View style={styles.optionsList}>
            {question.options.map((option, optionIndex) => {
              const isSelected = selectedOption === optionIndex;
              return (
                <TouchableOpacity
                  key={optionIndex}
                  style={styles.optionRow}
                  onPress={() => selectOption(optionIndex)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterActive]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.quizFooter}>
          <TouchableOpacity
            style={[styles.nextButton, selectedOption === null && styles.nextButtonDisabled]}
            onPress={goToNext}
            disabled={selectedOption === null}
          >
            <Text style={styles.nextButtonText}>NEXT</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------
  // RESULTS STAGE
  // ---------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={backToHome}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {level.tag} - Question {questions.length}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.resultsBody}>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreCircleLabel}>Your Score</Text>
          <Text style={styles.scoreCircleValue}>
            {score}/{questions.length}
          </Text>
        </View>

        <Text style={styles.congratsTitle}>Congratulations!</Text>
        <Text style={styles.congratsSubtitle}>Great job, You Did It</Text>
      </View>

      <View style={styles.resultsFooter}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>View Full Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={backToHome}>
          <Text style={styles.secondaryButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
  },

  // intro
  levelToggleRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  levelToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    alignItems: 'center',
  },
  levelToggleButtonActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  levelToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  levelToggleTextActive: {
    color: '#FFFFFF',
  },
  heroImage: {
    marginTop: 20,
    marginHorizontal: 20,
    height: 170,
    borderRadius: 20,
    backgroundColor: '#EDF1F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  introBody: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 10,
  },
  introMetaRow: {
    flexDirection: 'row',
    gap: 18,
  },
  introMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  introMetaText: {
    fontSize: 13,
    color: '#6B7684',
    fontWeight: '600',
  },
  introFooter: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  // quiz
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  quizHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  quizBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  questionCounter: {
    fontSize: 12,
    color: '#9AA5B1',
    fontWeight: '600',
    marginBottom: 10,
  },
  questionPrompt: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: NAVY,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NAVY,
  },
  quizFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 8,
  },
  nextButton: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },

  // results
  resultsBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  scoreCircle: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  scoreCircleLabel: {
    color: '#B9C3D1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  scoreCircleValue: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  congratsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  congratsSubtitle: {
    fontSize: 14,
    color: '#6B7684',
  },
  resultsFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  secondaryButton: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: NAVY,
    fontWeight: '700',
    fontSize: 14,
  },
});