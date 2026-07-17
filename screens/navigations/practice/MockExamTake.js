import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

const NAVY = '#0B2540';

function formatTime(totalSeconds) {
  const hrs  = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad  = (n) => String(n).padStart(2, '0');
  return `${hrs}:${pad(mins)}:${pad(secs)}`;
}

export default function MockExamTake({ navigation, route }) {
  const incomingLevel = route?.params?.level ?? 'sub-professional';
  const initialKey    = incomingLevel === 'professional' ? 'professional' : 'sub_professional';

  // ── UI state ──────────────────────────────────────────────────
  const [levelKey,       setLevelKey]       = useState(initialKey);
  const [stage,          setStage]          = useState('intro');  // 'intro'|'quiz'|'results'
  const [questions,      setQuestions]      = useState([]);
  const [questionIndex,  setQuestionIndex]  = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers,        setAnswers]        = useState([]);
  const [secondsLeft,    setSecondsLeft]    = useState(0);

  // ── Supabase data ─────────────────────────────────────────────
  const [config,         setConfig]         = useState(null);
  const [loadingConfig,  setLoadingConfig]  = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [configError,    setConfigError]    = useState(null);
  const [userId,         setUserId]         = useState(null);
  const [attemptId,      setAttemptId]      = useState(null);

  const timerRef = useRef(null);

  // ── Load config whenever levelKey changes ─────────────────────
  useEffect(() => { loadConfig(); }, [levelKey]);

  const loadConfig = async () => {
    try {
      setLoadingConfig(true); setConfigError(null);
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);

      const { data, error } = await supabase
        .from('mock_exam_configs')
        .select('*')
        .eq('level_key', levelKey)
        .eq('is_published', true)
        .maybeSingle();
      if (error) throw error;
      setConfig(data ?? null);
    } catch (err) {
      console.error('Config load error:', err);
      setConfigError('Failed to load exam configuration.');
    } finally {
      setLoadingConfig(false);
    }
  };

  // ── Timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 'quiz') { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); handleFinish(answers); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [stage]);

  // ── Start exam ────────────────────────────────────────────────
  const startExam = async () => {
    if (!config) return;
    try {
      setLoadingQuestions(true);
      const { data: qs, error } = await supabase
        .from('mock_exam_questions')
        .select('*')
        .eq('config_id', config.id)
        .eq('is_published', true)
        .order('sort_order');
      if (error) throw error;

      let examQuestions = qs ?? [];
      if (examQuestions.length > 0) {
        const targetCount = levelKey === 'professional' ? 170 : 165;
        const originalQuestions = [...examQuestions];
        while (examQuestions.length < targetCount) {
          const cloned = originalQuestions.map((q, idx) => ({
            ...q,
            id: `${q.id}_cloned_${examQuestions.length}_${idx}`
          }));
          examQuestions = examQuestions.concat(cloned);
        }
        examQuestions = examQuestions.slice(0, targetCount);
      }

      setQuestions(examQuestions);
      setQuestionIndex(0);
      setSelectedOption(null);
      setAnswers([]);
      const targetTimeLimit = levelKey === 'professional' ? 11400 : 9600;
      setSecondsLeft(targetTimeLimit);

      // Create attempt record
      if (userId) {
        const { data: attempt } = await supabase
          .from('mock_exam_attempts')
          .insert({
            user_id:            userId,
            config_id:          config.id,
            total_questions:    examQuestions.length,
            time_limit_seconds: targetTimeLimit,
            status:             'in_progress',
          })
          .select().single();
        if (attempt) setAttemptId(attempt.id);
      }

      setStage('quiz');
    } catch (err) {
      console.error('Start exam error:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ── Next question ─────────────────────────────────────────────
  const goToNext = async () => {
    const question = questions[questionIndex];
    const updatedAnswers = [...answers, selectedOption];
    setAnswers(updatedAnswers);

    // Log individual answer
    if (userId && attemptId && question) {
      await supabase.from('mock_exam_answer_logs').insert({
        attempt_id:     attemptId,
        user_id:        userId,
        question_id:    question.id,
        selected_index: selectedOption,
        correct_index:  question.correct_index,
        is_correct:     selectedOption === question.correct_index,
      });
    }

    if (questionIndex === questions.length - 1) {
      handleFinish(updatedAnswers);
    } else {
      setQuestionIndex((p) => p + 1);
      setSelectedOption(null);
    }
  };

  // ── Finish exam ───────────────────────────────────────────────
  const handleFinish = async (finalAnswers) => {
    if (timerRef.current) clearInterval(timerRef.current);

    const correct   = finalAnswers.reduce((c, ans, i) => (questions[i] && ans === questions[i].correct_index ? c + 1 : c), 0);
    const incorrect = finalAnswers.filter((a) => a !== null).length - correct;
    const skipped   = finalAnswers.filter((a) => a === null).length;

    if (attemptId && userId) {
      await supabase.from('mock_exam_attempts').update({
        score:           correct,
        correct_count:   correct,
        incorrect_count: incorrect,
        skipped_count:   skipped,
        status:          'completed',
        completed_at:    new Date().toISOString(),
        duration_seconds: (levelKey === 'professional' ? 11400 : 9600) - secondsLeft,
      }).eq('id', attemptId);
    }

    const timeSpent = (levelKey === 'professional' ? 11400 : 9600) - secondsLeft;

    navigation.replace('MockExamResult', {
      score: correct,
      total: questions.length,
      level: levelKey,
      timeSpent,
      correct,
      incorrect,
      skipped
    });
  };

  const backToHome = () => {
    navigation?.navigate ? navigation.navigate('MockExamHome') : setStage('intro');
  };

  const score = answers.reduce((c, ans, i) => (questions[i] && ans === questions[i].correct_index ? c + 1 : c), 0);

  // ── INTRO STAGE ───────────────────────────────────────────────
  if (stage === 'intro') {
    if (loadingConfig) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={styles.loadingText}>Loading exam…</Text>
          </View>
        </SafeAreaView>
      );
    }

    if (configError || !config) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
              <Ionicons name="chevron-back" size={26} color={NAVY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Mock Exam</Text>
            <View style={styles.iconButton} />
          </View>
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={52} color="#9AA5B1" />
            <Text style={styles.emptyText}>{configError ?? 'Exam configuration not found.'}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadConfig}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    const sections = config.sections ?? [];
    const targetTimeLimit = levelKey === 'professional' ? 11400 : 9600;
    const hours    = Math.floor(targetTimeLimit / 3600);
    const mins     = Math.floor((targetTimeLimit % 3600) / 60);

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


        <View style={styles.heroImage}>
          <Ionicons name="laptop-outline" size={56} color="#8CA0BF" />
        </View>

        <ScrollView style={styles.introScroll} contentContainerStyle={styles.introScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introBody}>
            <Text style={styles.introTitle}>{config.title}</Text>
            <Text style={styles.introSubtitle}>{config.subtitle}</Text>
            <View style={styles.introMetaRow}>
              <View style={styles.introMetaItem}>
                <Ionicons name="document-text-outline" size={14} color="#6B7684" />
                <Text style={styles.introMetaText}>{levelKey === 'professional' ? 170 : 165} Items</Text>
              </View>
              <View style={styles.introMetaItem}>
                <Ionicons name="time-outline" size={14} color="#6B7684" />
                <Text style={styles.introMetaText}>{hours}h {mins}m</Text>
              </View>
            </View>
            <Text style={styles.coverageTitle}>{"What's covered"}</Text>
            {sections.map((sec) => (
              <View key={sec.name} style={styles.coverageRow}>
                <View style={styles.coverageBullet} />
                <View style={styles.coverageTextWrap}>
                  <Text style={styles.coverageName}>{sec.name}</Text>
                  <Text style={styles.coverageDescription}>{sec.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.introFooter}>
          <TouchableOpacity
            style={[styles.primaryButton, loadingQuestions && { opacity: 0.6 }]}
            onPress={startExam}
            disabled={loadingQuestions}
          >
            {loadingQuestions
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>Start Mock Exam</Text>}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── QUIZ STAGE ────────────────────────────────────────────────
  if (stage === 'quiz') {
    const question = questions[questionIndex];
    if (!question) return <SafeAreaView style={styles.safeArea}><StatusBar barStyle="dark-content" /></SafeAreaView>;

    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.quizHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.quizHeaderTitle}>{config?.tag} - Question {questionIndex + 1}</Text>
          <View style={styles.timerPill}>
            <Ionicons name="time-outline" size={14} color={NAVY} />
            <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
          </View>
        </View>

        <View style={styles.quizBody}>
          <Text style={styles.questionCounter}>Question {questionIndex + 1} of {questions.length}</Text>
          <Text style={styles.questionPrompt}>{question.prompt}</Text>
          <View style={styles.optionsList}>
            {(question.options ?? []).map((option, optIdx) => {
              const isSelected = selectedOption === optIdx;
              return (
                <TouchableOpacity
                  key={optIdx} style={styles.optionRow} onPress={() => setSelectedOption(optIdx)}>
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

  // RESULTS STAGE (Handled in separate MockExamResult.js screen)
  return null;
}

const styles = StyleSheet.create({
  safeArea:              { flex: 1, backgroundColor: '#FFFFFF' },
  header:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:            { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:           { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:              { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:           { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:             { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:              { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:             { color: '#fff', fontWeight: '700', fontSize: 14 },
  levelToggleRow:        { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 8 },
  levelToggleButton:     { flex: 1, paddingVertical: 10, borderRadius: 18, borderWidth: 1.5, borderColor: '#D7DEE8', alignItems: 'center' },
  levelToggleButtonActive:{ backgroundColor: NAVY, borderColor: NAVY },
  levelToggleText:       { fontSize: 12, fontWeight: '700', color: NAVY },
  levelToggleTextActive: { color: '#FFFFFF' },
  heroImage:             { marginTop: 20, marginHorizontal: 20, height: 130, borderRadius: 20, backgroundColor: '#EDF1F7', alignItems: 'center', justifyContent: 'center' },
  introScroll:           { flex: 1 },
  introScrollContent:    { paddingBottom: 12 },
  introBody:             { paddingHorizontal: 20, marginTop: 16 },
  introTitle:            { fontSize: 20, fontWeight: '700', color: NAVY, marginBottom: 2 },
  introSubtitle:         { fontSize: 12, color: '#9AA5B1', fontWeight: '600', marginBottom: 14 },
  introMetaRow:          { flexDirection: 'row', gap: 18, marginBottom: 22 },
  introMetaItem:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  introMetaText:         { fontSize: 13, color: '#6B7684', fontWeight: '600' },
  coverageTitle:         { fontSize: 14, fontWeight: '700', color: NAVY, marginBottom: 12 },
  coverageRow:           { flexDirection: 'row', marginBottom: 14 },
  coverageBullet:        { width: 8, height: 8, borderRadius: 4, backgroundColor: NAVY, marginTop: 6, marginRight: 12 },
  coverageTextWrap:      { flex: 1 },
  coverageName:          { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 2 },
  coverageDescription:   { fontSize: 12, lineHeight: 17, color: '#6B7684' },
  introFooter:           { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  primaryButton:         { backgroundColor: NAVY, borderRadius: 24, paddingVertical: 15, alignItems: 'center' },
  primaryButtonText:     { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  quizHeader:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  quizHeaderTitle:       { fontSize: 14, fontWeight: '700', color: NAVY },
  timerPill:             { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8 },
  timerText:             { fontSize: 12, fontWeight: '700', color: NAVY },
  quizBody:              { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  questionCounter:       { fontSize: 12, color: '#9AA5B1', fontWeight: '600', marginBottom: 10 },
  questionPrompt:        { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 20 },
  optionsList:           { gap: 12 },
  optionRow:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#D7DEE8', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  optionText:            { fontSize: 13, color: NAVY, fontWeight: '600', flex: 1, marginRight: 12 },
  radioOuter:            { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#D7DEE8', alignItems: 'center', justifyContent: 'center' },
  radioOuterActive:      { borderColor: NAVY },
  radioInner:            { width: 10, height: 10, borderRadius: 5, backgroundColor: NAVY },
  quizFooter:            { paddingHorizontal: 20, paddingBottom: 30, paddingTop: 8 },
  nextButton:            { backgroundColor: NAVY, borderRadius: 24, paddingVertical: 15, alignItems: 'center' },
  nextButtonDisabled:    { opacity: 0.4 },
  nextButtonText:        { color: '#FFFFFF', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
  resultsBody:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  scoreCircle:           { width: 170, height: 170, borderRadius: 85, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  scoreCircleLabel:      { color: '#B9C3D1', fontSize: 13, fontWeight: '600', marginBottom: 6 },
  scoreCircleValue:      { color: '#FFFFFF', fontSize: 26, fontWeight: '700' },
  congratsTitle:         { fontSize: 20, fontWeight: '700', color: NAVY, marginBottom: 6 },
  congratsSubtitle:      { fontSize: 14, color: '#6B7684' },
  resultsFooter:         { paddingHorizontal: 20, paddingBottom: 30, gap: 12 },
  secondaryButton:       { borderRadius: 24, borderWidth: 1.5, borderColor: '#D7DEE8', paddingVertical: 15, alignItems: 'center' },
  secondaryButtonText:   { color: NAVY, fontWeight: '700', fontSize: 14 },
});
