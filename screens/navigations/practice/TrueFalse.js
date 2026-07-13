import React, { useState } from 'react';
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
// Each question is a statement, whether it's actually true or false, and an
// explanation shown after the user answers.
// ---------------------------------------------------------------------------
const DECK_TITLE = 'True or False';
const DECK_SUBTITLE = '1 HP - P Flashcards';

const QUESTIONS = [
  {
    id: 'q1',
    statement: 'The sentence "She don\'t like coffee" is grammatically correct.',
    answer: false,
    explanation:
      'The subject "She" is third-person singular, so the verb must agree: "She doesn\'t like coffee."',
  },
  {
    id: 'q2',
    statement: 'A synonym is a word that means the same as another word.',
    answer: true,
    explanation:
      'Synonyms are different words that share the same or a very similar meaning, like "happy" and "glad."',
  },
  {
    id: 'q3',
    statement: 'An idiom should always be understood literally.',
    answer: false,
    explanation:
      'Idioms carry a figurative meaning different from their literal words, like "break the ice" meaning to ease tension.',
  },
  {
    id: 'q4',
    statement: "Context clues can help you figure out an unfamiliar word's meaning.",
    answer: true,
    explanation:
      'Surrounding words, examples, and sentence structure often hint at what an unfamiliar word means.',
  },
  {
    id: 'q5',
    statement: 'A summary is usually longer than the original text.',
    answer: false,
    explanation:
      'A summary condenses a text into its most important points, so it should be shorter than the original.',
  },
];

export default function TrueOrFalse() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // true | false | null

  const question = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;
  const hasAnswered = selected !== null;
  const isCorrect = hasAnswered && selected === question.answer;

  const handleSelect = (value) => {
    if (hasAnswered) return;
    setSelected(value);
  };

  const goToNext = () => {
    setSelected(null);
    setIndex((prev) => (prev + 1) % QUESTIONS.length);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="chevron-back" size={26} color="#0B2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{DECK_TITLE}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color="#0B2540" />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {/* Statement card */}
        <View style={styles.card}>
          <Text style={styles.statementText}>{question.statement}</Text>
        </View>

        {/* True / False buttons */}
        <View style={styles.choicesRow}>
          <TouchableOpacity
            disabled={hasAnswered}
            style={[
              styles.choiceButton,
              selected === true && !isCorrect && styles.choiceButtonIncorrect,
              selected === true && isCorrect && styles.choiceButtonCorrect,
              hasAnswered && question.answer === true && selected !== true && styles.choiceButtonReveal,
            ]}
            onPress={() => handleSelect(true)}
          >
            <Text
              style={[
                styles.choiceText,
                selected === true && styles.choiceTextSelected,
                hasAnswered && question.answer === true && selected !== true && styles.choiceTextReveal,
              ]}
            >
              TRUE
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={hasAnswered}
            style={[
              styles.choiceButton,
              selected === false && !isCorrect && styles.choiceButtonIncorrect,
              selected === false && isCorrect && styles.choiceButtonCorrect,
              hasAnswered && question.answer === false && selected !== false && styles.choiceButtonReveal,
            ]}
            onPress={() => handleSelect(false)}
          >
            <Text
              style={[
                styles.choiceText,
                selected === false && styles.choiceTextSelected,
                hasAnswered && question.answer === false && selected !== false && styles.choiceTextReveal,
              ]}
            >
              FALSE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Correct / incorrect indicator + explanation */}
        {hasAnswered && (
          <View style={styles.feedbackArea}>
            <View style={styles.resultRow}>
              <Ionicons
                name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={isCorrect ? '#3CB878' : '#E0475A'}
              />
              <Text
                style={[
                  styles.resultText,
                  { color: isCorrect ? '#3CB878' : '#E0475A' },
                ]}
              >
                {isCorrect ? 'Correct' : 'Incorrect'}
              </Text>
            </View>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}

        <Text style={styles.progressText}>
          {index + 1} / {QUESTIONS.length}
        </Text>
      </View>

      {/* Next */}
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

const NAVY = '#0B2540';

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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    minHeight: 140,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  statementText: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
  },
  choicesRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  choiceButton: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
  },
  choiceButtonCorrect: {
    backgroundColor: '#3CB878',
    borderColor: '#3CB878',
  },
  choiceButtonIncorrect: {
    backgroundColor: '#E0475A',
    borderColor: '#E0475A',
  },
  choiceButtonReveal: {
    borderColor: '#3CB878',
    borderWidth: 1.5,
    backgroundColor: '#EAFBF2',
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    letterSpacing: 0.5,
  },
  choiceTextSelected: {
    color: '#FFFFFF',
  },
  choiceTextReveal: {
    color: '#3CB878',
  },
  feedbackArea: {
    width: '100%',
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4A5563',
  },
  progressText: {
    marginTop: 18,
    fontSize: 13,
    color: '#9AA5B1',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingTop: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: NAVY,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});