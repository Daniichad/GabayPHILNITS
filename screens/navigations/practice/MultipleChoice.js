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
// Each question has a prompt, a list of options (A, B, C, ...), the index of
// the correct option, and an explanation shown after answering.
// ---------------------------------------------------------------------------
const DECK_TITLE = 'Multiple Choice';
const DECK_SUBTITLE = '1 HP - P Flashcards';

const QUESTIONS = [
  {
    id: 'q1',
    prompt: 'Which of the following is the best synonym for "rapid"?',
    options: ['Slow', 'Quick', 'Late'],
    correctIndex: 1,
    explanation:
      '"Quick" means happening fast, which matches the meaning of "rapid." "Slow" and "late" mean the opposite.',
  },
  {
    id: 'q2',
    prompt: 'Which sentence uses an idiom correctly?',
    options: [
      'It was raining cats and dogs outside.',
      'The cat was raining outside.',
      'Dogs and cats fell from the sky.',
    ],
    correctIndex: 0,
    explanation:
      '"Raining cats and dogs" is a common idiom meaning it\'s raining very heavily — it\'s not meant literally.',
  },
  {
    id: 'q3',
    prompt: 'What is the main idea of a paragraph about hurricanes forming over warm ocean water?',
    options: [
      'Hurricanes only happen in summer.',
      'Warm ocean water is a key ingredient in hurricane formation.',
      'Hurricanes are named after people.',
    ],
    correctIndex: 1,
    explanation:
      'The main idea is the central point the passage focuses on — here, that warm ocean water helps hurricanes form.',
  },
  {
    id: 'q4',
    prompt: 'Which word means the opposite of "transparent"?',
    options: ['Clear', 'Opaque', 'Visible'],
    correctIndex: 1,
    explanation:
      '"Opaque" means light cannot pass through, the opposite of "transparent." "Clear" and "visible" are closer in meaning to transparent.',
  },
];

export default function MultipleChoice() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null); // selected option index | null

  const question = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;
  const hasAnswered = selected !== null;
  const isCorrect = hasAnswered && selected === question.correctIndex;

  const handleSelect = (optionIndex) => {
    if (hasAnswered) return;
    setSelected(optionIndex);
  };

  const goToNext = () => {
    setSelected(null);
    setIndex((prev) => (prev + 1) % QUESTIONS.length);
  };

  const getLetter = (i) => String.fromCharCode(65 + i); // 0 -> A, 1 -> B, ...

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
        {/* Prompt card */}
        <View style={styles.card}>
          <Text style={styles.promptText}>{question.prompt}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsList}>
          {question.options.map((option, optionIndex) => {
            const isSelected = selected === optionIndex;
            const isTheCorrectOne = optionIndex === question.correctIndex;

            let optionStyle = styles.optionButton;
            let textStyle = styles.optionText;

            if (hasAnswered) {
              if (isSelected && isCorrect) {
                optionStyle = [styles.optionButton, styles.optionCorrect];
                textStyle = [styles.optionText, styles.optionTextActive];
              } else if (isSelected && !isCorrect) {
                optionStyle = [styles.optionButton, styles.optionIncorrect];
                textStyle = [styles.optionText, styles.optionTextActive];
              } else if (isTheCorrectOne) {
                optionStyle = [styles.optionButton, styles.optionReveal];
                textStyle = [styles.optionText, styles.optionTextReveal];
              }
            } else if (isSelected) {
              optionStyle = [styles.optionButton, styles.optionSelected];
              textStyle = [styles.optionText, styles.optionTextActive];
            }

            return (
              <TouchableOpacity
                key={optionIndex}
                disabled={hasAnswered}
                style={optionStyle}
                onPress={() => handleSelect(optionIndex)}
              >
                <Text style={textStyle}>
                  {getLetter(optionIndex)}. {option}
                </Text>
              </TouchableOpacity>
            );
          })}
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
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    width: '100%',
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
  },
  optionsList: {
    marginTop: 20,
  },
  optionButton: {
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  optionSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  optionCorrect: {
    backgroundColor: '#3CB878',
    borderColor: '#3CB878',
  },
  optionIncorrect: {
    backgroundColor: '#E0475A',
    borderColor: '#E0475A',
  },
  optionReveal: {
    borderColor: '#3CB878',
    backgroundColor: '#EAFBF2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  optionTextReveal: {
    color: '#3CB878',
  },
  feedbackArea: {
    marginTop: 8,
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
    marginTop: 16,
    fontSize: 13,
    color: '#9AA5B1',
    textAlign: 'center',
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