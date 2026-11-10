import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../supabase';
import { SkeletonItem } from '../../../components/Skeleton';
import {
  getActiveUserSession,
  cacheQuestionsLocally,
  getLocalQuestions,
  enqueueSync,
} from '../../../utils/database';

const NAVY = '#0B2540';

export default function TrueOrFalse({ navigation, route }) {
  const subject = route?.params?.subject;
  const limit = route?.params?.limit ?? 10;
  const passedTargetExam = route?.params?.targetExam;
  const feSection = route?.params?.feSection; // 'morning' | 'afternoon'

  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // true | false | null
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [score, setScore] = useState(0);

  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      let uid = null;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id ?? null;
      } catch (_) {}

      if (!uid) {
        const localSession = await getActiveUserSession();
        uid = localSession?.user_id ?? null;
      }
      setUserId(uid);

      // Resolve user's target exam (IP or FE)
      let activeTrack = passedTargetExam || 'IP';
      if (!passedTargetExam && uid) {
        try {
          const { data: pData } = await supabase
            .from('personal_info')
            .select('target_exam_level')
            .eq('user_id', uid)
            .maybeSingle();
          if (pData?.target_exam_level) {
            const lvl = pData.target_exam_level.toLowerCase();
            activeTrack = (lvl.includes('fe') || lvl.includes('fundamental') || (lvl.includes('pro') && !lvl.includes('sub')))
              ? 'FE'
              : 'IP';
          }
        } catch (_) {}
      }

      const IP_SUBJECTS = ['Technology', 'Management', 'Strategy'];
      const FE_MORNING_SUBJECTS = [
        'Computer Systems & Architecture',
        'Networks & Security',
        'IT Management & Strategy',
        'Databases & SQL',
        'Technology',
        'Management',
        'Strategy',
      ];
      const FE_AFTERNOON_SUBJECTS = [
        'Algorithms & Programming',
        'Algorithms & Data Structures',
        'Security & System Design',
      ];

      let trackSubjects = IP_SUBJECTS;
      if (activeTrack === 'FE') {
        const isSubjectB = String(feSection || '').toLowerCase().includes('b') || String(feSection || '').toLowerCase().includes('afternoon');
        if (isSubjectB) {
          trackSubjects = FE_AFTERNOON_SUBJECTS;
        } else {
          trackSubjects = FE_MORNING_SUBJECTS;
        }
      }
      const cacheScope = `${activeTrack.toLowerCase()}_${feSection || 'all'}_${subject || 'all'}`;

      let loadedQuestions = [];
      const net = await NetInfo.fetch();

      // 1. Try remote fetch if online
      if (net.isConnected) {
        try {
          let q = supabase.from('true_false_questions')
            .select('*, practice_categories!inner(name, exam_level)')
            .eq('is_published', true)
            .eq('exam_level', activeTrack);
          if (subject) {
            q = q.eq('practice_categories.name', subject);
          } else {
            q = q.in('practice_categories.name', trackSubjects);
          }
          const { data, error: qErr } = await q.limit(limit);
          if (!qErr && data && data.length > 0) {
            loadedQuestions = data;
            cacheQuestionsLocally('tf', cacheScope, data).catch(() => {});
          }
        } catch (netErr) {
          console.warn('Network issue loading TrueFalse, falling back to SQLite:', netErr);
        }
      }

      // 2. If offline or online fetch yielded nothing, fall back to SQLite cache
      if (loadedQuestions.length === 0) {
        const localQs = await getLocalQuestions('tf', cacheScope, limit);
        if (localQs && localQs.length > 0) {
          loadedQuestions = localQs;
        }
      }

      if (loadedQuestions.length === 0) {
        setError('No questions available offline. Connect to the internet once to download questions.');
        return;
      }

      const shuffled = [...loadedQuestions].sort(() => 0.5 - Math.random());
      setQuestions(shuffled);
    } catch (err) {
      console.error('TrueFalse load error:', err);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const logResult = async (question, answer) => {
    if (!userId) return;
    const payload = {
      user_id: userId,
      question_id: question.id,
      selected_answer: answer,
      is_correct: answer === question.answer,
      answered_at: new Date().toISOString(),
    };

    try {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        const { error } = await supabase.from('true_false_results').insert(payload);
        if (!error) return;
      }
    } catch (_) {}

    // Offline fallback: queue sync
    await enqueueSync('true_false_results', 'INSERT', payload);
  };

  // ------------------------------------------------------------
  const question = questions[index];
  const isLast = index === questions.length - 1;
  const hasAnswered = selected !== null;
  const isCorrect = hasAnswered && selected === question?.answer;

  const handleSelect = (value) => {
    if (hasAnswered) return;
    setSelected(value);
    logResult(question, value);
    if (value === question?.answer) {
      setScore((s) => s + 1);
    }
  };

  const goToNext = () => {
    if (isLast) {
      navigation.replace('PracticeResult', {
        score,
        total: questions.length,
        subject,
        type: 'True or False'
      });
    } else {
      setSelected(null);
      setIndex((p) => p + 1);
    }
  };

  // ------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <SkeletonItem width={26} height={26} borderRadius={13} />
          <SkeletonItem width={120} height={20} style={{ marginLeft: 16 }} />
          <View style={styles.iconButton} />
        </View>
        <View style={[styles.body, { gap: 20, paddingTop: 20 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <SkeletonItem width={100} height={16} />
            <SkeletonItem width={40} height={16} />
          </View>
          <View style={[styles.card, { justifyContent: 'center', minHeight: 180, gap: 10 }]}>
            <SkeletonItem width="90%" height={16} />
            <SkeletonItem width="80%" height={16} />
            <SkeletonItem width="50%" height={16} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <SkeletonItem width="48%" height={54} borderRadius={12} style={{ flex: 1 }} />
            <SkeletonItem width="48%" height={54} borderRadius={12} style={{ flex: 1 }} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || questions.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>True or False</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="help-circle-outline" size={52} color="#9AA5B1" />
          <Text style={styles.emptyText}>{error ?? 'No questions available.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>True or False</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.bodyScroll}
        contentContainerStyle={styles.bodyScrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Meta info row */}
        <View style={styles.topMetaRow}>
          <Text style={styles.metaSubjectText}>{subject || 'All Subjects'}</Text>
          <Text style={styles.metaProgressText}>{index + 1} / {questions.length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.statementText}>{question.statement}</Text>
        </View>

        <View style={styles.choicesRow}>
          {[true, false].map((val) => {
            const isSelected = selected === val;
            const isTheAnswer = question.answer === val;
            return (
              <TouchableOpacity
                key={String(val)}
                disabled={hasAnswered}
                style={[
                  styles.choiceButton,
                  isSelected && isCorrect && styles.choiceButtonCorrect,
                  isSelected && !isCorrect && styles.choiceButtonIncorrect,
                  hasAnswered && isTheAnswer && !isSelected && styles.choiceButtonReveal,
                ]}
                onPress={() => handleSelect(val)}
              >
                <Text style={[
                  styles.choiceText,
                  isSelected && styles.choiceTextSelected,
                  hasAnswered && isTheAnswer && !isSelected && styles.choiceTextReveal,
                ]}>
                  {val ? 'TRUE' : 'FALSE'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {hasAnswered && (
          <View style={styles.feedbackArea}>
            <View style={styles.resultRow}>
              <Ionicons name={isCorrect ? 'checkmark-circle' : 'close-circle'} size={20} color={isCorrect ? '#3CB878' : '#E0475A'} />
              <Text style={[styles.resultText, { color: isCorrect ? '#3CB878' : '#E0475A' }]}>
                {isCorrect ? 'Correct' : 'Incorrect'}
              </Text>
            </View>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}

        {hasAnswered && (
          <View style={styles.footer}>
            <TouchableOpacity style={styles.nextButton} onPress={goToNext}>
              <Text style={styles.nextButtonText}>{isLast ? 'Start over' : 'Next'}</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: NAVY },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText: { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 28, paddingTop: 16 },
  bodyScroll: { flex: 1 },
  bodyScrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 28, paddingTop: 16, paddingBottom: 40 },
  card: { width: '100%', minHeight: 110, borderRadius: 20, borderWidth: 1, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  statementText: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: NAVY, textAlign: 'center' },
  choicesRow: { flexDirection: 'row', gap: 16, marginTop: 20 },
  choiceButton: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF' },
  choiceButtonCorrect: { backgroundColor: '#3CB878', borderColor: '#3CB878' },
  choiceButtonIncorrect: { backgroundColor: '#E0475A', borderColor: '#E0475A' },
  choiceButtonReveal: { borderColor: '#3CB878', borderWidth: 1.5, backgroundColor: '#EAFBF2' },
  choiceText: { fontSize: 14, fontWeight: '700', color: NAVY, letterSpacing: 0.5 },
  choiceTextSelected: { color: '#FFFFFF' },
  choiceTextReveal: { color: '#3CB878' },
  feedbackArea: { width: '100%', marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: '#F5F7FA' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resultText: { fontSize: 14, fontWeight: '700' },
  explanationText: { fontSize: 13, lineHeight: 19, color: '#4A5563' },
  footer: { alignItems: 'center', paddingTop: 20, paddingBottom: 24 },
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, backgroundColor: NAVY },
  nextButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  topMetaRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  metaSubjectText: { fontSize: 13, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaProgressText: { fontSize: 13, fontWeight: '600', color: '#9AA5B1' },
});
