import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

const NAVY        = '#0B2540';
const MATCH_DELAY   = 450;
const MISMATCH_DELAY = 600;

function buildCards(pairs) {
  const cards = [];
  pairs.forEach((p) => {
    cards.push({ key: p.id + '-term', pairId: p.id, label: p.term });
    cards.push({ key: p.id + '-def',  pairId: p.id, label: p.definition });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function Matching({ navigation, route }) {
  const categoryId = route?.params?.categoryId ?? null;
  const setTitle   = route?.params?.setTitle   ?? null;

  const [pairs,     setPairs]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Game state
  const [cards,     setCards]     = useState([]);
  const [selected,  setSelected]  = useState([]);
  const [matched,   setMatched]   = useState(new Set());
  const [wrongFlash,setWrongFlash]= useState([]);
  const [locked,    setLocked]    = useState(false);
  const [mistakes,  setMistakes]  = useState(0);

  const timeoutRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);

      let q = supabase.from('matching_pairs')
        .select('*').eq('is_published', true).order('sort_order');
      if (categoryId) q = q.eq('category_id', categoryId);
      if (setTitle)   q = q.eq('set_title', setTitle);

      const { data, error: qErr } = await q;
      if (qErr) throw qErr;

      const loadedPairs = data ?? [];
      setPairs(loadedPairs);
      setCards(buildCards(loadedPairs));
      setStartTime(Date.now());
    } catch (err) {
      console.error('Matching load error:', err);
      setError('Failed to load matching pairs.');
    } finally {
      setLoading(false);
    }
  };

  const logResult = async (allMatched) => {
    if (!userId) return;
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
    await supabase.from('matching_results').insert({
      user_id:         userId,
      category_id:     categoryId ?? null,
      set_title:       setTitle ?? (pairs[0]?.set_title ?? 'Matching'),
      pairs_total:     pairs.length,
      pairs_matched:   allMatched,
      mistakes,
      completed:       allMatched === pairs.length,
      duration_seconds: duration,
    });
  };

  // ------------------------------------------------------------
  const totalPairs = pairs.length;
  const allSolved  = matched.size === totalPairs && totalPairs > 0;

  const handlePress = (idx) => {
    if (locked || selected.includes(idx) || matched.has(cards[idx]?.pairId)) return;
    const next = [...selected, idx];
    setSelected(next);

    if (next.length === 2) {
      setLocked(true);
      const [a, b] = next;
      const isMatch = cards[a].pairId === cards[b].pairId;

      if (isMatch) {
        timeoutRef.current = setTimeout(() => {
          setMatched((prev) => { const s = new Set(prev); s.add(cards[a].pairId); return s; });
          setSelected([]); setLocked(false);
          const newMatched = matched.size + 1;
          if (newMatched === totalPairs) logResult(newMatched);
        }, MATCH_DELAY);
      } else {
        setMistakes((m) => m + 1);
        timeoutRef.current = setTimeout(() => {
          setWrongFlash(next);
          setTimeout(() => { setWrongFlash([]); setSelected([]); setLocked(false); }, MISMATCH_DELAY);
        }, 150);
      }
    }
  };

  const resetGame = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSelected([]); setMatched(new Set()); setWrongFlash([]);
    setLocked(false); setMistakes(0);
    setCards(buildCards(pairs));
    setStartTime(Date.now());
  };

  const getCardState = (idx) => {
    if (!cards[idx]) return 'default';
    if (matched.has(cards[idx].pairId)) return 'matched';
    if (wrongFlash.includes(idx))       return 'wrong';
    if (selected.includes(idx))         return 'selected';
    return 'default';
  };

  // ------------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading matching pairs…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || pairs.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => navigation?.goBack?.()}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Matching</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="apps-outline" size={52} color="#9AA5B1" />
          <Text style={styles.emptyText}>{error ?? 'No matching pairs available.'}</Text>
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
        <Text style={styles.headerTitle}>Matching</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {cards.map((card, idx) => {
          const state = getCardState(idx);
          return (
            <TouchableOpacity
              key={card.key}
              activeOpacity={0.85}
              disabled={state === 'matched'}
              onPress={() => handlePress(idx)}
              style={[
                styles.card,
                state === 'selected' && styles.cardSelected,
                state === 'matched'  && styles.cardMatched,
                state === 'wrong'    && styles.cardWrong,
              ]}
            >
              <Text style={[styles.cardText, (state === 'selected' || state === 'matched' || state === 'wrong') && styles.cardTextActive]}>
                {card.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        {allSolved ? (
          <>
            <Text style={styles.footerText}>All matched! Mistakes: {mistakes}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetGame}>
              <Text style={styles.resetButtonText}>Play again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.footerText}>{matched.size} / {totalPairs} matched · Mistakes: {mistakes}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:     { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:     { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:       { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:        { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  grid:            { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'flex-start', paddingHorizontal: 16, paddingTop: 20 },
  card:            { width: '31%', aspectRatio: 0.8, borderRadius: 16, borderWidth: 1, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardSelected:    { backgroundColor: NAVY, borderColor: NAVY },
  cardMatched:     { backgroundColor: NAVY, borderColor: NAVY, opacity: 0.55 },
  cardWrong:       { backgroundColor: '#B23B3B', borderColor: '#B23B3B' },
  cardText:        { fontSize: 12.5, fontWeight: '600', color: NAVY, textAlign: 'center', lineHeight: 16 },
  cardTextActive:  { color: '#FFFFFF' },
  footer:          { paddingVertical: 20, alignItems: 'center' },
  footerText:      { fontSize: 14, fontWeight: '600', color: '#6B7684' },
  resetButton:     { marginTop: 10, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: NAVY },
  resetButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
});
