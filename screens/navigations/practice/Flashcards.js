import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Platform, ActivityIndicator,
  Modal, Switch, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../../../supabase';
import {
  getActiveUserSession,
  cacheQuestionsLocally,
  getLocalQuestions,
  enqueueSync,
} from '../../../utils/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 44, 400);
const CARD_HEIGHT = Math.min(Math.max(Math.round(SCREEN_HEIGHT * 0.44), 360), 430);

const NAVY = '#0B2540';
const SETTINGS_KEY = '@gabay_flashcard_settings';

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
  const [completed, setCompleted] = useState(false);

  // ── Flashcard Study Settings ──
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [frontSide, setFrontSide] = useState('definition'); // 'definition' or 'term'
  const [isShuffle, setIsShuffle] = useState(true);
  const [autoResetSide, setAutoResetSide] = useState(true);
  const rawCardsRef = useRef([]);

  const subject    = route?.params?.subject;
  const limit      = route?.params?.limit ?? 10;
  const passedTargetExam = route?.params?.targetExam;
  const feSection  = route?.params?.feSection; // 'morning' | 'afternoon'

  const flipAnim = useRef(new Animated.Value(0)).current;

  // Load saved settings
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s.frontSide) setFrontSide(s.frontSide);
          if (s.isShuffle !== undefined) setIsShuffle(s.isShuffle);
          if (s.autoResetSide !== undefined) setAutoResetSide(s.autoResetSide);
        } catch (_) {}
      }
    });
    loadData();
  }, []);

  const saveSettings = async (updates) => {
    try {
      const merged = { frontSide, isShuffle, autoResetSide, ...updates };
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    } catch (_) {}
  };

  const applyDeckOrder = (shufflePref = isShuffle) => {
    if (rawCardsRef.current.length === 0) return;
    const base = [...rawCardsRef.current];
    const ordered = shufflePref ? base.sort(() => 0.5 - Math.random()) : base;
    setCards(ordered);
    setIndex(0);
    flipAnim.setValue(0);
    setFlipped(false);
  };

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

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

      let loadedCards = [];
      const net = await NetInfo.fetch();

      // 1. Try remote fetch if online
      if (net.isConnected) {
        try {
          let cq = supabase.from('flashcards')
            .select('*, flashcard_decks!inner(category_id, practice_categories!inner(name))');
          if (subject) {
            cq = cq.eq('flashcard_decks.practice_categories.name', subject);
          } else {
            cq = cq.in('flashcard_decks.practice_categories.name', trackSubjects);
          }
          
          const { data: flashcards, error: cErr } = await cq.limit(limit);
          if (!cErr && flashcards && flashcards.length > 0) {
            loadedCards = flashcards;
            cacheQuestionsLocally('flashcard', cacheScope, flashcards).catch(() => {});
          }
        } catch (netErr) {
          console.warn('Network issue loading flashcards, falling back to SQLite:', netErr);
        }
      }

      // 2. Fall back to local SQLite cache
      if (loadedCards.length === 0) {
        const localCards = await getLocalQuestions('flashcard', cacheScope, limit);
        if (localCards && localCards.length > 0) {
          loadedCards = localCards;
        }
      }

      if (loadedCards.length === 0) {
        setError('No flashcards available offline. Connect to the internet once to download flashcards.');
        return;
      }

      rawCardsRef.current = loadedCards;
      const initialCards = isShuffle ? [...loadedCards].sort(() => 0.5 - Math.random()) : [...loadedCards];
      setCards(initialCards);

      // Create session log
      if (uid && initialCards.length > 0) {
        const payload = {
          user_id: uid,
          cards_total: initialCards.length,
          cards_seen: 0,
          completed: false,
          created_at: new Date().toISOString(),
        };

        if (net.isConnected) {
          try {
            const { data: sess } = await supabase
              .from('flashcard_sessions')
              .insert(payload)
              .select().single();
            if (sess) setSessionId(sess.id);
          } catch (_) {
            enqueueSync('flashcard_sessions', 'INSERT', payload);
          }
        } else {
          enqueueSync('flashcard_sessions', 'INSERT', payload);
        }
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

    try {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        await supabase.from('flashcard_sessions').update(payload).eq('id', sessionId);
        return;
      }
    } catch (_) {}

    // Offline fallback
    await enqueueSync('flashcard_sessions', 'UPDATE', { id: sessionId, ...payload });
  };

  // ------------------------------------------------------------
  const card = cards[index];

  const flipCard = () => {
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 180,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
    setFlipped(!flipped);
  };

  const goToNext = () => {
    const completing = index === cards.length - 1;
    if (completing) {
      updateSession(index + 1, true);
      setCompleted(true);
    } else {
      if (autoResetSide) {
        flipAnim.setValue(0);
        setFlipped(false);
      }
      setIndex((p) => p + 1);
      updateSession(index + 1, false);
    }
  };

  const goToPrev = () => {
    if (autoResetSide) {
      flipAnim.setValue(0);
      setFlipped(false);
    }
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
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
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

  // COMPLETED STATE SCREEN
  if (completed) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{deckTitle}</Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.completedBody}>
          <View style={styles.successIconBadge}>
            <Ionicons name="checkmark-circle" size={54} color="#3CB878" />
          </View>
          <Text style={styles.completedTitle}>Deck Completed!</Text>
          <Text style={styles.completedSubtitle}>
            You have successfully reviewed all {cards.length} cards in this deck.
          </Text>
        </View>

        <View style={styles.completedFooter}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              flipAnim.setValue(0);
              setFlipped(false);
              setIndex(0);
              setCompleted(false);
              setStartTime(Date.now());
            }}
          >
            <Text style={styles.primaryButtonText}>Practice Again</Text>
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleBack}>
            <Text style={styles.secondaryButtonText}>Back to Library</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // MAIN
  const isFrontTerm = frontSide === 'term';
  const frontContent = isFrontTerm ? card.term : card.definition;
  const backContent = isFrontTerm ? card.definition : card.term;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{deckTitle}</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => setSettingsVisible(true)}>
          <Ionicons name="settings-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <View style={styles.cardArea}>
        {/* Top Meta info row */}
        <View style={styles.topMetaRow}>
          <Text style={styles.metaSubjectText}>{subject || 'All Subjects'}</Text>
          <Text style={styles.metaProgressText}>{index + 1} / {cards.length}</Text>
        </View>

        <TouchableOpacity activeOpacity={0.9} onPress={flipCard} style={styles.cardTouchable}>
          <View style={styles.cardWrapper}>
            <Animated.View style={[styles.card, styles.cardFront, { transform: [{ rotateY: frontAnim }] }]}>
              <Text style={styles.cardBadge}>{isFrontTerm ? 'TERM' : 'DEFINITION'}</Text>
              <View style={styles.cardContentWrapper}>
                <Text
                  style={isFrontTerm ? styles.termTextFront : styles.definitionText}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {frontContent}
                </Text>
              </View>
            </Animated.View>
            <Animated.View style={[styles.card, styles.cardBack, styles.cardAbsolute, { transform: [{ rotateY: backAnim }] }]}>
              <Text style={styles.cardBadgeBack}>{isFrontTerm ? 'DEFINITION' : 'TERM'}</Text>
              <View style={styles.cardContentWrapper}>
                <Text
                  style={isFrontTerm ? styles.definitionTextBack : styles.termText}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {backContent}
                </Text>
              </View>
            </Animated.View>
          </View>
        </TouchableOpacity>
        <Text style={styles.hintText}>Tap card to flip</Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={goToPrev}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={goToNext}>
          <Ionicons name="arrow-forward" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* ── Settings Bottom Sheet Modal ── */}
      <Modal
        visible={settingsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSettingsVisible(false)}
        />
        <View style={styles.settingsSheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="settings-outline" size={20} color={NAVY} />
              <Text style={styles.sheetTitle}>Flashcard Settings</Text>
            </View>
            <TouchableOpacity onPress={() => setSettingsVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Setting 1: Card Orientation */}
            <View style={styles.settingGroup}>
              <Text style={styles.settingGroupTitle}>CARD FRONT SIDE</Text>
              <Text style={styles.settingGroupSub}>Choose whether to see the definition or term first</Text>
              
              <View style={styles.segmentRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, frontSide === 'definition' && styles.segmentBtnActive]}
                  onPress={() => {
                    setFrontSide('definition');
                    saveSettings({ frontSide: 'definition' });
                  }}
                >
                  <Ionicons name="document-text-outline" size={16} color={frontSide === 'definition' ? '#fff' : NAVY} />
                  <Text style={[styles.segmentBtnText, frontSide === 'definition' && styles.segmentBtnTextActive]}>
                    Definition First
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, frontSide === 'term' && styles.segmentBtnActive]}
                  onPress={() => {
                    setFrontSide('term');
                    saveSettings({ frontSide: 'term' });
                  }}
                >
                  <Ionicons name="text-outline" size={16} color={frontSide === 'term' ? '#fff' : NAVY} />
                  <Text style={[styles.segmentBtnText, frontSide === 'term' && styles.segmentBtnTextActive]}>
                    Term First
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Setting 2: Shuffle Order */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingLabel}>Shuffle Cards</Text>
                <Text style={styles.settingSub}>Randomize flashcard presentation order</Text>
              </View>
              <Switch
                value={isShuffle}
                onValueChange={(val) => {
                  setIsShuffle(val);
                  saveSettings({ isShuffle: val });
                  applyDeckOrder(val);
                }}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>

            {/* Setting 3: Auto-Reset Side */}
            <View style={styles.settingRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.settingLabel}>Auto-Flip to Front</Text>
                <Text style={styles.settingSub}>Always reset to front side when moving to next card</Text>
              </View>
              <Switch
                value={autoResetSide}
                onValueChange={(val) => {
                  setAutoResetSide(val);
                  saveSettings({ autoResetSide: val });
                }}
                trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                thumbColor="#fff"
              />
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActionBox}>
              <TouchableOpacity
                style={styles.restartDeckBtn}
                onPress={() => {
                  applyDeckOrder(isShuffle);
                  setSettingsVisible(false);
                }}
              >
                <Ionicons name="refresh" size={16} color={NAVY} />
                <Text style={styles.restartDeckText}>Restart & Reshuffle Deck</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setSettingsVisible(false)}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: '#FFFFFF' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  iconButton:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 17, fontWeight: '700', color: NAVY },
  centered:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  loadingText:   { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600' },
  emptyText:     { marginTop: 12, fontSize: 14, color: '#9AA5B1', fontWeight: '600', textAlign: 'center' },
  retryBtn:      { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:     { color: '#fff', fontWeight: '700', fontSize: 14 },
  cardArea:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  cardTouchable: { width: CARD_WIDTH, height: CARD_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  cardWrapper:   { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  card:          { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24, backfaceVisibility: 'hidden', overflow: 'hidden' },
  cardAbsolute:  { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cardContentWrapper: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  cardFront:     { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#D7DEE8' },
  cardBack:      { backgroundColor: NAVY, borderWidth: 1.5, borderColor: NAVY },
  definitionText:{ fontSize: 19, lineHeight: 28, fontWeight: '600', color: NAVY, textAlign: 'center' },
  termText:      { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  hintText:      { marginTop: 18, fontSize: 13, color: '#9AA5B1' },
  actionsRow:    { flexDirection: 'row', justifyContent: 'center', gap: 24, paddingBottom: 30, paddingTop: 8 },
  actionButton:  { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D7DEE8', backgroundColor: '#F5F7FA' },
  topMetaRow:    { width: CARD_WIDTH, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  metaSubjectText: { fontSize: 13, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaProgressText: { fontSize: 13, fontWeight: '600', color: '#9AA5B1' },
  completedBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  successIconBadge: {
    backgroundColor: '#EAFBF2',
    padding: 12,
    borderRadius: 40,
    marginBottom: 20,
  },
  completedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  completedSubtitle: {
    fontSize: 14,
    color: '#6B7684',
    textAlign: 'center',
    lineHeight: 20,
  },
  completedFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: NAVY,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Settings Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 37, 64, 0.45)',
  },
  settingsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
  },
  closeBtn: {
    padding: 4,
  },
  settingGroup: {
    marginBottom: 18,
  },
  settingGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  settingGroupSub: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 10,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  segmentBtnActive: {
    borderColor: NAVY,
    backgroundColor: NAVY,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  segmentBtnTextActive: {
    color: '#fff',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  settingSub: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  quickActionBox: {
    marginTop: 18,
    marginBottom: 14,
  },
  restartDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  restartDeckText: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  doneBtn: {
    backgroundColor: NAVY,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardBadge: {
    position: 'absolute',
    top: 14,
    left: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  cardBadgeBack: {
    position: 'absolute',
    top: 14,
    left: 18,
    fontSize: 10,
    fontWeight: '800',
    color: '#cbd5e1',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  termTextFront: {
    fontSize: 24,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },
  definitionTextBack: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '500',
    color: '#fff',
    textAlign: 'center',
  },
});
