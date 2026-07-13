import React, { useState, useEffect } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

const NAVY = '#0B2540';

export default function TrueOrFalse({ navigation, route }) {
  const categoryId = route?.params?.categoryId ?? null;

  const [questions, setQuestions] = useState([]);
  const [index,     setIndex]     = useState(0);
  const [selected,  setSelected]  = useState(null); // true | false | null
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [userId,    setUserId]    = useState(null);

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);

      let q = supabase.from('true_false_questions')
        .select('*').eq('is_published', true).order('sort_order');
      if (categoryId) q = q.eq('category_id', categoryId);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;
      setQuestions(data ?? []);
    } catch (err) {
      console.error('TrueFalse load error:', err);
      setError('Failed to load questions.');
    } finally {
      setLoading(false);
    }
  };

  const logResult = async (question, answer) => {
    if (!userId) return;
    await supabase.from('true_false_results').insert({
      user_id:         userId,
      question_id:     question.id,
      selected_answer: answer,
      is_correct:      answer === question.answer,
    });
  };

  // ------------------------------------------------------------
  const question    = questions[index];
  const isLast      = index === questions.length - 1;
  const hasAnswered  = selected !== null;
  const isCorrect    = hasAnswered && selected === question?.answer;

  const handleSelect = (value) => {
    if (hasAnswered) return;
    setSelected(value);
    logResult(question, value);
  };

  const goToNext = () => {
    setSelected(null);
    setIndex((p) => (p + 1) % questions.length);
  };

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

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.statementText}>{question.statement}</Text>
        </View>

        <View style={styles.choicesRow}>
          {[true, false].map((val) => {
            const isSelected   = selected === val;
            const isTheAnswer  = question.answer === val;
            return (
              <TouchableOpacity
                key={String(val)}
                disabled={hasAnswered}
                style={[
                  styles.choiceButton,
                  isSelected && isCorrect  && styles.choiceButtonCorrect,
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

        <Text style={styles.progressText}>{index + 1} / {questions.length}</Text>
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
  safeArea:          { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:        { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:       { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:       { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:         { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:          { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:         { color: '#fff', fontWeight: '700', fontSize: 14 },
  body:              { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  card:              { width: '100%', minHeight: 140, borderRadius: 20, borderWidth: 1, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  statementText:     { fontSize: 17, lineHeight: 24, fontWeight: '600', color: NAVY, textAlign: 'center' },
  choicesRow:        { flexDirection: 'row', gap: 16, marginTop: 24 },
  choiceButton:      { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF' },
  choiceButtonCorrect:  { backgroundColor: '#3CB878', borderColor: '#3CB878' },
  choiceButtonIncorrect:{ backgroundColor: '#E0475A', borderColor: '#E0475A' },
  choiceButtonReveal:   { borderColor: '#3CB878', borderWidth: 1.5, backgroundColor: '#EAFBF2' },
  choiceText:        { fontSize: 14, fontWeight: '700', color: NAVY, letterSpacing: 0.5 },
  choiceTextSelected:{ color: '#FFFFFF' },
  choiceTextReveal:  { color: '#3CB878' },
  feedbackArea:      { width: '100%', marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: '#F5F7FA' },
  resultRow:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  resultText:        { fontSize: 14, fontWeight: '700' },
  explanationText:   { fontSize: 13, lineHeight: 19, color: '#4A5563' },
  progressText:      { marginTop: 18, fontSize: 13, color: '#9AA5B1' },
  footer:            { alignItems: 'center', paddingBottom: 30, paddingTop: 4 },
  nextButton:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, backgroundColor: NAVY },
  nextButtonText:    { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
