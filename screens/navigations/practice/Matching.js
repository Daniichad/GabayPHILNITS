import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StatusBar, Platform, ActivityIndicator, ScrollView, Modal
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../supabase';
import { resolveUserTargetExam } from '../../../utils/targetExam';
import { getCache, setCache } from '../../../utils/cache';
import { enqueueSync } from '../../../utils/database';
import NetInfo from '@react-native-community/netinfo';
import { balancePracticeDistribution } from '../../../utils/practiceDistribution';

const NAVY = '#0B2540';
const MATCH_DELAY = 450;
const MISMATCH_DELAY = 600;

function buildCards(pairs) {
  const cards = [];
  pairs.forEach((p) => {
    cards.push({ key: p.id + '-term', pairId: p.id, label: p.term });
    cards.push({ key: p.id + '-def', pairId: p.id, label: p.definition });
  });
  // Shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export default function Matching({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const subject = route?.params?.subject;
  const majorCategory = route?.params?.majorCategory;
  const minorCategory = route?.params?.minorCategory;
  const limit = route?.params?.limit ?? 6; // 6 pairs = 12 cards (1 set default)
  const passedTargetExam = route?.params?.targetExam;
  const feSection = route?.params?.feSection; // 'Subject A' | 'Subject B'

  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [startTime, setStartTime] = useState(null);

  // Game state
  const [cards, setCards] = useState([]);
  const [selected, setSelected] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [wrongFlash, setWrongFlash] = useState([]);
  const [locked, setLocked] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [activeTrack, setActiveTrack] = useState(passedTargetExam || 'IP');

  const timeoutRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  // ------------------------------------------------------------
  const loadData = async () => {
    try {
      setLoading(true); setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      const uemail = session?.user?.email ?? null;
      setUserId(uid);

      // Resolve user's target exam (IP or FE)
      const track = await resolveUserTargetExam(uid, passedTargetExam || 'IP');
      setActiveTrack(track);

      const IP_SUBJECTS = ['Technology', 'Management', 'Strategy'];
      const FE_MORNING_SUBJECTS = ['Technology', 'Management', 'Strategy'];
      const FE_AFTERNOON_SUBJECTS = [
        'General Aspects of Programming',
        'Fundamental Elements for Programming Processes',
        'Data Structures and Algorithms',
        'Application of Programming to Various Fields',
        'Ensuring Information Security',
      ];

      const normSection = String(feSection || '').trim().toLowerCase().replace(/_/g, ' ');
      const isSubjectB = /\b(b|afternoon)\b/i.test(normSection);
      const activeSection = track === 'FE' ? (isSubjectB ? 'Subject B' : 'Subject A') : null;
      const trackSubjects = track === 'FE'
        ? (isSubjectB ? FE_AFTERNOON_SUBJECTS : FE_MORNING_SUBJECTS)
        : IP_SUBJECTS;

      // Translate UI selected subject to database category names
      const getDbCategories = (selectedSub) => {
        if (!selectedSub || selectedSub === 'All') {
          if (track === 'IP') return ['Technology', 'Management', 'Strategy'];
          if (isSubjectB) return ['Algorithms & Programming', 'Algorithms & Data Structures', 'Security & System Design'];
          return ['Technology', 'Management', 'Strategy', 'Computer Systems & Architecture', 'Databases & SQL', 'Networks & Security', 'IT Management & Strategy'];
        }
        if (track === 'IP') return [selectedSub];
        if (isSubjectB) {
          return ['Algorithms & Programming', 'Algorithms & Data Structures', 'Security & System Design'];
        }
        // FE Subject A
        if (selectedSub === 'Technology') {
          return ['Technology', 'Computer Systems & Architecture', 'Databases & SQL', 'Networks & Security'];
        }
        if (selectedSub === 'Management') {
          return ['Management', 'IT Management & Strategy'];
        }
        if (selectedSub === 'Strategy') {
          return ['Strategy', 'IT Management & Strategy'];
        }
        return [selectedSub];
      };

      const targetDbCategories = getDbCategories(subject);
      const cacheKey = `matching_${track.toLowerCase()}_${(subject || 'all').toLowerCase()}_${(majorCategory || 'all').toLowerCase()}_${(minorCategory || 'all').toLowerCase()}`;

      // Instant cached pairs load first
      const cachedPairs = await getCache(cacheKey);
      if (cachedPairs && Array.isArray(cachedPairs) && cachedPairs.length > 0) {
        const shuffledCached = [...cachedPairs].sort(() => 0.5 - Math.random());
        setPairs(shuffledCached);
        setCards(buildCards(shuffledCached));
        setLoading(false);
      }

      // Base query matching target exam and session
      const buildBaseQuery = () => {
        let q = supabase.from('matching_pairs')
          .select('*, practice_categories!inner(name, exam_level)')
          .eq('is_published', true)
          .eq('exam_level', track);

        if (track === 'FE' && activeSection) {
          q = q.eq('fe_section', activeSection);
        }

        if (minorCategory) {
          q = q.eq('minor_category', minorCategory);
        } else if (majorCategory) {
          q = q.eq('major_category', majorCategory);
        } else if (targetDbCategories.length === 1) {
          q = q.eq('practice_categories.name', targetDbCategories[0]);
        } else {
          q = q.in('practice_categories.name', targetDbCategories);
        }
        return q;
      };

      // Fetch up to 60 pairs to enable alternating round-robin distribution
      const { data: rawData, error: qErr } = await buildBaseQuery().limit(60);
      if (qErr) throw qErr;

      let rawPairs = rawData ? [...rawData] : [];

      let loadedPairs = [];
      if (rawPairs.length > 0) {
        loadedPairs = balancePracticeDistribution(rawPairs, limit, subject, majorCategory, minorCategory);
      }

      if (loadedPairs.length === 0 && (!cachedPairs || cachedPairs.length === 0)) {
        setError('No matching pairs found for this configuration.');
        return;
      }

      if (loadedPairs.length > 0) {
        setCache(cacheKey, loadedPairs, 30 * 60 * 1000).catch(() => {});
        const shuffledPairs = [...loadedPairs].sort(() => 0.5 - Math.random());
        setPairs(shuffledPairs);
        setCards(buildCards(shuffledPairs));
      }
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
    const rawSetTitle = pairs[0]?.set_title || subject || 'Matching';
    const taggedTitle = rawSetTitle.includes(`[${activeTrack}]`) ? rawSetTitle : `${rawSetTitle} [${activeTrack}]`;

    const payload = {
      user_id: userId,
      set_title: taggedTitle,
      pairs_total: pairs.length,
      pairs_matched: allMatched,
      mistakes,
      completed: allMatched === pairs.length,
      duration_seconds: duration,
      exam_level: activeTrack,
    };

    try {
      const net = await NetInfo.fetch();
      if (net.isConnected) {
        const { error } = await supabase.from('matching_results').insert(payload);
        if (!error) return;
      }
    } catch (_) {}

    // Offline resilient fallback
    await enqueueSync('matching_results', 'INSERT', payload);
  };

  // ------------------------------------------------------------
  const totalPairs = pairs.length;
  const allSolved = matched.size === totalPairs && totalPairs > 0;

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
          if (newMatched === totalPairs) {
            logResult(newMatched);
            setTimeout(() => {
              navigation.replace('PracticeResult', {
                score: Math.max(0, totalPairs - mistakes),
                total: totalPairs,
                subject,
                type: 'Matching'
              });
            }, 300);
          }
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
    if (wrongFlash.includes(idx)) return 'wrong';
    if (selected.includes(idx)) return 'selected';
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
        <View style={styles.iconButton} />
      </View>

      {/* Top Meta info row */}
      <View style={styles.topMetaRow}>
        <Text style={styles.metaSubjectText}>{subject || 'All Subjects'}</Text>
        <Text style={styles.metaProgressText}>{matched.size} / {totalPairs} pairs matched</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
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
                state === 'matched' && styles.cardMatched,
                state === 'wrong' && styles.cardWrong,
              ]}
            >
              <Text style={[styles.cardText, (state === 'selected' || state === 'matched' || state === 'wrong') && styles.cardTextActive]}>
                {card.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
        <Text style={styles.footerText}>Mistakes: {mistakes}</Text>
      </View>

      {/* Success Modal removed to redirect to PracticeResult instead */}
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
  scroll: { flex: 1 },
  grid: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 20 },
  card: { width: '30%', height: 100, borderRadius: 16, borderWidth: 1, borderColor: '#D7DEE8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardSelected: { backgroundColor: NAVY, borderColor: NAVY },
  cardMatched: { backgroundColor: NAVY, borderColor: NAVY, opacity: 0.45 },
  cardWrong: { backgroundColor: '#B23B3B', borderColor: '#B23B3B' },
  cardText: { fontSize: 11, fontWeight: '600', color: NAVY, textAlign: 'center', lineHeight: 14 },
  cardTextActive: { color: '#FFFFFF' },
  footer: { paddingVertical: 20, alignItems: 'center' },
  footerText: { fontSize: 14, fontWeight: '600', color: '#6B7684' },
  resetButton: { marginTop: 18, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24, backgroundColor: NAVY },
  resetButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 71, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  overlayCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  overlayBody: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
  },
  overlayStats: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  topMetaRow: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 22, marginTop: 10 },
  metaSubjectText: { fontSize: 13, fontWeight: '700', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaProgressText: { fontSize: 13, fontWeight: '600', color: '#9AA5B1' },
});
