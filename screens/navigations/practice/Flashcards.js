import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView, View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';

const NAVY = '#0B2540';

export default function Flashcards({ navigation, route }) {
  const deckId    = route?.params?.deckId;
  const categoryId = route?.params?.categoryId;
  const from      = route?.params?.from;

  const handleBack = () => {
    if (from === 'Home') navigation?.navigate('Home');
    else navigation?.goBack?.();
  };

  const [cards,     setCards]     = useState([]);
  const [deckTitle, setDeckTitle] = useState('Flashcards');
  const [index,     setIndex]     = useState(0);
  const [flipped,   setFlipped]   = useState(false);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [userId,    setUserId]    = useState(null);
  const [startTime, setStartTime] = useState(null);

  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      setUserId(uid);

      // Resolve deck
      let q = supabase.from('flashcard_decks').select('*').eq('is_published', true);
      if (deckId)    q = q.eq('id', deckId);
      else if (categoryId) q = q.eq('category_id', categoryId);
      const { data: deck } = await q.limit(1).maybeSingle();

      const resolvedDeckId = deck?.id ?? null;
      if (deck?.title) setDeckTitle(deck.title);

      // Fetch cards
      let cq = supabase.from('flashcards').select('*');
      if (resolvedDeckId) cq = cq.eq('deck_id', resolvedDeckId);
      const { data: flashcards, error: cErr } = await cq.order('sort_order');
      if (cErr) throw cErr;
      setCards(flashcards ?? []);

      // Create session log
      if (uid && resolvedDeckId && (flashcards ?? []).length > 0) {
        const { data: sess } = await supabase
          .from('flashcard_sessions')
          .insert({ user_id: uid, deck_id: resolvedDeckId, cards_total: flashcards.length, cards_seen: 0, completed: false })
          .select().single();
        if (sess) setSessionId(sess.id);
      }
      setStartTime(Date.now());
    } catch (err) {
      console.error('Flashcards load error:', err);
      setError('Failed to load flashcards.');
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async (seen, completed = false) => {
    if (!sessionId) return;
    const payload = { cards_seen: seen, completed };
    if (completed) {
      payload.completed_at = new Date().toISOString();
      payload.duration_seconds = startTime ? Math.round((Date.now() - startTime) / 1000) : null;
    }
    await supabase.from('flashcard_sessions').update(payload).eq('id', sessionId);
  };

  // ------------------------------------------------------------
  const card = cards[index];

  const flipCard = () => {
    Animated.timing(flipAnim, { toValue: flipped ? 0 : 180, duration: 350, useNativeDriver: true }).start();
    setFlipped(!flipped);
  };

  const goToNext = () => {
    flipAnim.setValue(0); setFlipped(false);
    const next = (index + 1) % cards.length;
    const completing = index === cards.length - 1;
    setIndex(next);
    updateSession(index + 1, completing);
  };

  const goToPrev = () => {
    flipAnim.setValue(0); setFlipped(false);
    setIndex((p) => (p - 1 + cards.length) % cards.length);
  };

  const frontAnim = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backAnim  = flipAnim.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  // ------------------------------------------------------------
  // LOADING
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading flashcards…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // EMPTY / ERROR
  if (error || cards.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{deckTitle}</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.centered}>
          <Ionicons name="card-outline" size={52} color="#9AA5B1" />
          <Text style={styles.emptyText}>{error ?? 'No flashcards available.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{deckTitle}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardArea}>
        <TouchableOpacity activeOpacity={0.9} onPress={flipCard}>
          <View style={styles.cardWrapper}>
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontAnim }] }]}>
              <Text style={styles.definitionText}>{card.definition}</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardBack, styles.cardAbsolute, { transform: [{ rotateY: backAnim }] }]}>
              <Text style={styles.termText}>{card.term}</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>
        <Text style={styles.hintText}>Tap card to flip</Text>
        <Text style={styles.progressText}>{index + 1} / {cards.length}</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={goToPrev}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={goToNext}>
          <Ionicons name="arrow-forward" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: '#FFFFFF', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:   { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:     { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:      { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  cardWrapper:   { width: '100%', height: 340 },
  card:          { width: '100%', height: '100%', borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, backfaceVisibility: 'hidden' },
  cardAbsolute:  { position: 'absolute', top: 0, left: 0 },
  cardFront:     { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D7DEE8', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  cardBack:      { backgroundColor: NAVY },
  definitionText:{ fontSize: 19, lineHeight: 27, fontWeight: '600', color: NAVY, textAlign: 'center' },
  termText:      { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  hintText:      { marginTop: 18, fontSize: 13, color: '#9AA5B1' },
  progressText:  { marginTop: 6, fontSize: 13, color: '#9AA5B1' },
  actionsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingBottom: 30, paddingTop: 8 },
  actionButton:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: '#F5F7FA' },
});
