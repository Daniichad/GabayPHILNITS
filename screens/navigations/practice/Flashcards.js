import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// STATIC DATA
// Each flashcard has a "term" (shown on the back / dark card) and a
// "definition" (shown on the front / white card).
// ---------------------------------------------------------------------------
const DECK_TITLE = 'Flashcards';
const DECK_SUBTITLE = '1 HP - P Flashcards';

const FLASHCARDS = [
  {
    id: '1',
    term: 'Inference',
    definition:
      'The ability to understand information that is not directly stated by using clues from the text and prior knowledge.',
  },
  {
    id: '2',
    term: 'Context Clues',
    definition:
      'Hints found within a sentence or passage that help a reader understand the meaning of an unfamiliar word.',
  },
  {
    id: '3',
    term: 'Main Idea',
    definition:
      'The central point or most important thought that an author wants to convey about a topic.',
  },
  {
    id: '4',
    term: 'Summarize',
    definition:
      'To briefly restate the most important points of a text in your own words.',
  },
  {
    id: '5',
    term: "Author's Purpose",
    definition:
      "The reason an author writes a piece of text, such as to inform, persuade, or entertain.",
  },
];

export default function Flashcards() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;

  const card = FLASHCARDS[index];

  const flipCard = () => {
    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 180,
      duration: 350,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const goToNext = () => {
    flipAnim.setValue(0);
    setFlipped(false);
    setIndex((prev) => (prev + 1) % FLASHCARDS.length);
  };

  const goToPrev = () => {
    flipAnim.setValue(0);
    setFlipped(false);
    setIndex((prev) => (prev - 1 + FLASHCARDS.length) % FLASHCARDS.length);
  };

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontAnimatedStyle = {
    transform: [{ rotateY: frontInterpolate }],
  };
  const backAnimatedStyle = {
    transform: [{ rotateY: backInterpolate }],
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

      {/* Card */}
      <View style={styles.cardArea}>
        <TouchableOpacity activeOpacity={0.9} onPress={flipCard}>
          <View style={styles.cardWrapper}>
            {/* FRONT - definition, white */}
            <Animated.View
              style={[styles.card, styles.cardFront, frontAnimatedStyle]}
            >
              <Text style={styles.definitionText}>{card.definition}</Text>
            </Animated.View>

            {/* BACK - term, dark navy */}
            <Animated.View
              style={[
                styles.card,
                styles.cardBack,
                styles.cardAbsolute,
                backAnimatedStyle,
              ]}
            >
              <Text style={styles.termText}>{card.term}</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>

        <Text style={styles.hintText}>Tap card to flip</Text>
        <Text style={styles.progressText}>
          {index + 1} / {FLASHCARDS.length}
        </Text>
      </View>

      {/* Navigation */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={goToPrev}>
          <Ionicons name="arrow-back" size={22} color="#0B2540" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={goToNext}>
          <Ionicons name="arrow-forward" size={22} color="#0B2540" />
        </TouchableOpacity>
      </View>
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
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  cardWrapper: {
    width: '100%',
    height: 340,
  },
  card: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
    backfaceVisibility: 'hidden',
  },
  cardAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardFront: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7DEE8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardBack: {
    backgroundColor: NAVY,
  },
  definitionText: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
  },
  termText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  hintText: {
    marginTop: 18,
    fontSize: 13,
    color: '#9AA5B1',
  },
  progressText: {
    marginTop: 6,
    fontSize: 13,
    color: '#9AA5B1',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 30,
    paddingTop: 8,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    backgroundColor: '#F5F7FA',
  },
});