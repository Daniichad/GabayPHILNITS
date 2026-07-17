import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';;
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

const NAVY = '#0B2540';

export default function MultipleChoice({ navigation, route }) {
  const subject = route?.params?.subject;
  const limit   = route?.params?.limit ?? 10;

  const [questions, setQuestions] = useState([]);
  const [index,     setIndex]     = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [score,     setScore]     = useState(0);

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);

      let q = supabase.from('multiple_choice_questions')
        .select('*, practice_categories!inner(name)')
        .eq('is_published', true);
      if (subject) {
        q = q.eq('practice_categories.name', subject);
      }

      const { data, error: qErr } = await q.limit(limit);
      if (qErr) throw qErr;

      const shuffled = (data ?? []).sort(() => 0.5 - Math.random());
      setQuestions(shuffled);
    } catch (err) {
      console.error('MCQ load error:', err);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const logResult = async (question, selectedIdx) => {
    if (!userId) return;
    await supabase.from('multiple_choice_results').insert({
      user_id:        userId,
      question_id:    question.id,
      selected_index: selectedIdx,
      is_correct:     selectedIdx === question.correct_index,
    });
  };

  // ------------------------------------------------------------
  const question   = questions[index];
  const isLast     = index === questions.length - 1;
  const hasAnswered = selected !== null;
  const isCorrect  = hasAnswered && selected === question?.correct_index;

  const handleSelect = (optIdx) => {
    if (hasAnswered) return;
    setSelected(optIdx);
    logResult(question, optIdx);
    if (optIdx === question?.correct_index) {
      setScore((s) => s + 1);
    }
  };

  const goToNext = () => {
    if (isLast) {
      navigation.replace('PracticeResult', {
        score,
        total: questions.length,
        subject,
        type: 'Multiple Choice'
      });
    } else {
      setSelected(null);
      setIndex((p) => p + 1);
    }
  };

  const getLetter = (i) => String.fromCharCode(65 + i);

  // ------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading questions…</Text>
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
          <Text style={styles.headerTitle}>Multiple Choice</Text>
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
        <Text style={styles.headerTitle}>Multiple Choice</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Top Meta info row */}
        <View style={styles.topMetaRow}>
          <Text style={styles.metaSubjectText}>{subject || 'All Subjects'}</Text>
          <Text style={styles.metaProgressText}>{index + 1} / {questions.length}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.promptText}>{question.prompt}</Text>
        </View>

        <View style={styles.optionsList}>
          {question.options.map((option, optIdx) => {
            const isSelected      = selected === optIdx;
            const isTheCorrectOne = optIdx === question.correct_index;

            let optionStyle = styles.optionButton;
            let textStyle   = styles.optionText;

            if (hasAnswered) {
              if (isSelected && isCorrect)  { optionStyle = [styles.optionButton, styles.optionCorrect];   textStyle = [styles.optionText, styles.optionTextActive]; }
              else if (isSelected)           { optionStyle = [styles.optionButton, styles.optionIncorrect]; textStyle = [styles.optionText, styles.optionTextActive]; }
              else if (isTheCorrectOne)      { optionStyle = [styles.optionButton, styles.optionReveal];    textStyle = [styles.optionText, styles.optionTextReveal]; }
            } else if (isSelected) {
              optionStyle = [styles.optionButton, styles.optionSelected];
              textStyle   = [styles.optionText, styles.optionTextActive];
            }

            return (
              <TouchableOpacity key={optIdx} disabled={hasAnswered} style={optionStyle} onPress={() => handleSelect(optIdx)}>
                <Text style={textStyle}>{getLetter(optIdx)}. {option}</Text>
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
      </View>

      {hasAnswered && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.nextButton} onPress={goToNext}>
            <Text style={styles.nextButtonText}>{isLast ? 'Start over' : 'Next'}</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:       { flex: 1, backgroundColor: '#FFFFFF' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:    { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:    { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:      { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:       { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  body:           { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 28, paddingTop: 16 },
  card:           { width: '100%', minHeight: 90, borderRadius: 20, borderWidth: 1, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  promptText:     { fontSize: 16, lineHeight: 22, fontWeight: '600', color: NAVY, textAlign: 'center' },
  optionsList:    { marginTop: 16 },
  optionButton:   { borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 12 },
  optionSelected: { backgroundColor: NAVY, borderColor: NAVY },
  optionCorrect:  { backgroundColor: '#3CB878', borderColor: '#3CB878' },
  optionIncorrect:{ backgroundColor: '#E0475A', borderColor: '#E0475A' },
  optionReveal:   { borderColor: '#3CB878', backgroundColor: '#EAFBF2' },
  optionText:     { fontSize: 14, fontWeight: '600', color: NAVY },
  optionTextActive:{ color: '#FFFFFF' },
  optionTextReveal:{ color: '#3CB878' },
  feedbackArea:   { marginTop: 8, padding: 16, borderRadius: 14, backgroundColor: '#F5F7FA' },
  resultRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resultText:     { fontSize: 14, fontWeight: '700' },
  explanationText:{ fontSize: 13, lineHeight: 19, color: '#4A5563' },
  footer:         { alignItems: 'center', paddingBottom: 30, paddingTop: 4 },
  nextButton:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, backgroundColor: NAVY },
  nextButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  topMetaRow:    { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  metaSubjectText: { fontSize: 13, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaProgressText: { fontSize: 13, fontWeight: '600', color: '#9AA5B1' },
});
