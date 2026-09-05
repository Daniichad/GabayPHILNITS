import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, StatusBar, Platform, ActivityIndicator,
  AppState, Alert, BackHandler
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as handpose from '@tensorflow-models/handpose';
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

  const answersRef = useRef(answers);
  const secondsLeftRef = useRef(secondsLeft);

  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { secondsLeftRef.current = secondsLeft; }, [secondsLeft]);

  // ── Anti-cheat & BackHandler ──────────────────────────────────
  useEffect(() => {
    if (stage !== 'quiz') return;

    // Snapshot loop for hand tracking
    let isProcessing = false;
    const interval = setInterval(async () => {
      if (isProcessing || !modelRef.current || !cameraActive || !cameraRef.current) return;
      isProcessing = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
        if (photo?.base64) {
          const imgBuffer = tf.util.encodeString(photo.base64, 'base64').buffer;
          const raw = new Uint8Array(imgBuffer);
          const imageTensor = decodeJpeg(raw);
          const predictions = await modelRef.current.estimateHands(imageTensor);
          imageTensor.dispose();

          console.log('Hand predictions:', predictions.length);

          if (predictions.length === 0) {
            setHandDetected(false);
            setHandLandmarks(null);
            warningCountRef.current += 1;
            setHandWarnings(warningCountRef.current);
            if (warningCountRef.current >= 3) {
              Alert.alert('Exam Terminated', 'Hands were not detected in the camera frame multiple times. Your exam has been automatically submitted.', [{ text: 'OK' }]);
              handleFinish(answersRef.current);
            }
          } else {
             setHandDetected(true);
             setHandLandmarks(predictions[0].landmarks);
             setPhotoSize({ width: photo.width, height: photo.height });
             // Reset warnings if hands are found? (Optional, let's keep them cumulative for strictness)
          }
        }
      } catch (err) {
        console.warn('Hand detection error:', err);
      } finally {
        isProcessing = false;
      }
    }, 4500);

    const onBackPress = () => {
      Alert.alert('Exam in Progress', 'You cannot go back during the exam. Please finish the exam.', [{ text: 'OK' }]);
      return true; // Prevent default back behavior
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        Alert.alert('Exam Terminated', 'You left the app during the mock exam. Your exam has been automatically submitted.', [{ text: 'OK' }]);
        handleFinish(answersRef.current);
      }
    });

    return () => {
      clearInterval(interval);
      backHandler.remove();
      subscription.remove();
    };
  }, [stage, cameraActive]);

  // ── Supabase data ─────────────────────────────────────────────
  const [config,         setConfig]         = useState(null);
  const [loadingConfig,  setLoadingConfig]  = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [configError,    setConfigError]    = useState(null);
  const [userId,         setUserId]         = useState(null);
  const [attemptId,      setAttemptId]      = useState(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [handWarnings, setHandWarnings] = useState(0);
  const [handDetected, setHandDetected] = useState(true);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [photoSize, setPhotoSize] = useState({ width: 1, height: 1 });
  const [tfReady, setTfReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const timerRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const warningCountRef = useRef(0);

  // Initialize TFJS and Handpose
  useEffect(() => {
    const initTF = async () => {
      try {
        await tf.ready();
        modelRef.current = await handpose.load();
        setTfReady(true);
      } catch (err) {
        console.warn('TFJS Load Error:', err);
      }
    };
    initTF();
  }, []);

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

    const timeSpent = (levelKey === 'professional' ? 11400 : 9600) - secondsLeftRef.current;

    if (attemptId && userId) {
      await supabase.from('mock_exam_attempts').update({
        score:           correct,
        correct_count:   correct,
        incorrect_count: incorrect,
        skipped_count:   skipped,
        status:          'completed',
        completed_at:    new Date().toISOString(),
        duration_seconds: timeSpent,
      }).eq('id', attemptId);
    }

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
            style={[styles.primaryButton, (!tfReady || loadingQuestions) && { opacity: 0.6 }]}
            onPress={async () => {
              if (!permission?.granted) {
                const req = await requestPermission();
                if (!req.granted) {
                  Alert.alert('Permission Required', 'Camera access is required for anti-cheat tracking.');
                  return;
                }
              }
              startExam();
            }}
            disabled={!tfReady || loadingQuestions}
          >
            {!tfReady || loadingQuestions
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
        
        {/* Anti-cheat Camera PiP */}
        <View style={[styles.pipContainer, { borderColor: handDetected ? '#22c55e' : '#eab308' }]}>
          <CameraView 
            ref={cameraRef}
            style={styles.pipCamera} 
            facing="front" 
            onCameraReady={() => setCameraActive(true)}
          />
          {handLandmarks && handLandmarks.map((point, index) => {
            // Assuming CameraView scales to cover the 80x100 container.
            const scale = Math.max(80 / photoSize.width, 100 / photoSize.height);
            const xOffset = (photoSize.width * scale - 80) / 2;
            const yOffset = (photoSize.height * scale - 100) / 2;
            
            // For front camera, the preview is horizontally mirrored, so we mirror the X coordinate
            const flippedX = photoSize.width - point[0];
            const x = flippedX * scale - xOffset;
            const y = point[1] * scale - yOffset;

            return (
              <View 
                key={index}
                style={{
                  position: 'absolute',
                  left: x - 2,
                  top: y - 2,
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#22c55e', // green landmark point
                }}
              />
            );
          })}
          {handWarnings > 0 && (
            <View style={styles.warningBadge}>
              <Text style={styles.warningBadgeText}>{handWarnings}/3</Text>
            </View>
          )}
        </View>

        <View style={styles.quizHeader}>
          <TouchableOpacity style={styles.iconButton} onPress={() => {
            Alert.alert('Exam in Progress', 'You cannot go back during the exam. Please finish the exam.', [{ text: 'OK' }]);
          }}>
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
  pipContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 80,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D7DEE8',
    zIndex: 999,
    backgroundColor: '#000',
  },
  pipCamera: {
    flex: 1,
  },
  warningBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingVertical: 2,
    alignItems: 'center',
  },
  warningBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
