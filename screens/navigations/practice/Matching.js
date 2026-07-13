import React, { useState, useRef, useMemo } from 'react';
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

const DECK_TITLE = 'Matching';
const DECK_SUBTITLE = '1 HP - P Flashcards';

const PAIRS = [
  { id: 'p1', term: 'Synonym', definition: 'Words with similar meanings' },
  { id: 'p2', term: 'Idiom', definition: 'Expression with a figurative meaning' },
  { id: 'p3', term: 'Analogy', definition: 'Relationship between two pairs of words' },
  { id: 'p4', term: 'Context Clues', definition: 'Clues in the sentence to understand a word' },
];

function buildCards() {
  const cards = [];
  PAIRS.forEach((pair) => {
    cards.push({ key: pair.id + '-term', pairId: pair.id, label: pair.term });
    cards.push({ key: pair.id + '-def', pairId: pair.id, label: pair.definition });
  });
  const order = [3, 0, 6, 5, 1, 7, 2, 4];
  return order.map((i) => cards[i]);
}

const MATCH_DELAY = 450;
const MISMATCH_DELAY = 600;

export default function Matching() {
  const cards = useMemo(function () { return buildCards(); }, []);

  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState([]);
  const [locked, setLocked] = useState(false);
  const timeoutRef = useRef(null);

  const totalPairs = PAIRS.length;
  const allSolved = matched.size === totalPairs;

  const handlePress = (index) => {
    if (locked) return;
    if (selected.includes(index)) return;
    if (matched.has(cards[index].pairId)) return;

    const next = selected.concat([index]);
    setSelected(next);

    if (next.length === 2) {
      setLocked(true);
      const firstIdx = next[0];
      const secondIdx = next[1];
      const isMatch = cards[firstIdx].pairId === cards[secondIdx].pairId;

      if (isMatch) {
        timeoutRef.current = setTimeout(function () {
          setMatched(function (prev) {
            const copy = new Set(prev);
            copy.add(cards[firstIdx].pairId);
            return copy;
          });
          setSelected([]);
          setLocked(false);
        }, MATCH_DELAY);
      } else {
        timeoutRef.current = setTimeout(function () {
          setWrongFlash(next);
          setTimeout(function () {
            setWrongFlash([]);
            setSelected([]);
            setLocked(false);
          }, MISMATCH_DELAY);
        }, 150);
      }
    }
  };

  const resetGame = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelected([]);
    setMatched(new Set());
    setWrongFlash([]);
    setLocked(false);
  };

  const getCardState = (index) => {
    const card = cards[index];
    if (matched.has(card.pairId)) return 'matched';
    if (wrongFlash.includes(index)) return 'wrong';
    if (selected.includes(index)) return 'selected';
    return 'default';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="chevron-back" size={26} color="#0B2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{DECK_TITLE}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color="#0B2540" />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {cards.map((card, index) => {
          const state = getCardState(index);
          return (
            <TouchableOpacity
              key={card.key}
              activeOpacity={0.85}
              disabled={state === 'matched'}
              onPress={() => handlePress(index)}
              style={[
                styles.card,
                state === 'selected' && styles.cardSelected,
                state === 'matched' && styles.cardMatched,
                state === 'wrong' && styles.cardWrong,
              ]}
            >
              <Text
                style={[
                  styles.cardText,
                  (state === 'selected' || state === 'matched' || state === 'wrong') &&
                    styles.cardTextActive,
                ]}
              >
                {card.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        {allSolved ? (
          <>
            <Text style={styles.footerText}>All matched!</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
              <Text style={styles.resetButtonText}>Play again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.footerText}>
            {matched.size} / {totalPairs} matched
          </Text>
        )}
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
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  card: {
    width: '31%',
    aspectRatio: 0.8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7DEE8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  cardMatched: {
    backgroundColor: NAVY,
    borderColor: NAVY,
    opacity: 0.55,
  },
  cardWrong: {
    backgroundColor: '#B23B3B',
    borderColor: '#B23B3B',
  },
  cardText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 16,
  },
  cardTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7684',
  },
  resetButton: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: NAVY,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});