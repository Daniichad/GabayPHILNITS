import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { withTimeout } from '../../../utils/queryHelper'
import { getScrollBottomPadding } from '../../../utils/responsiveLayout'
import { resolveUserTargetExam } from '../../../utils/targetExam'
import { getCache, setCache } from '../../../utils/cache'


// ─── Colours matching the image ────────────────────────────────
const NAVY = '#0f2747'

// ─── 2x2 Practice Cards Definition ─────────────────────────────
const PRACTICE_CARDS = [
  {
    id: 'Flashcards',
    label: 'FLASHCARDS',
    bg: '#3B5BA5',
    text: '#fff',
    icon: 'cards-outline',
    iconBg: 'rgba(255, 255, 255, 0.22)',
  },
  {
    id: 'Matching',
    label: 'MATCHING',
    bg: '#E8967A',
    text: '#fff',
    icon: 'puzzle-outline',
    iconBg: 'rgba(255, 255, 255, 0.22)',
  },
  {
    id: 'TrueFalse',
    label: 'TRUE OR FALSE',
    bg: '#9B2335',
    text: '#fff',
    icon: 'checkbox-marked-circle-outline',
    iconBg: 'rgba(255, 255, 255, 0.22)',
  },
  {
    id: 'MultipleChoice',
    label: 'MULTIPLE CHOICE',
    bg: '#B8D4EA',
    text: '#1e3a5f',
    icon: 'format-list-checks',
    iconBg: 'rgba(30, 58, 95, 0.12)',
  },
]

// (Static RECENT array removed and replaced with dynamic supabase queries)


const IP_SUBJECTS = ['Technology', 'Management', 'Strategy'];
const FE_SUBJECTS = [
  'Technology',
  'Management',
  'Strategy',
  'General Aspects of Programming',
  'Fundamental Elements for Programming Processes',
  'Data Structures and Algorithms',
  'Application of Programming to Various Fields',
  'Ensuring Information Security',
  'Computer Systems & Architecture',
  'Algorithms & Programming',
  'Networks & Security',
  'IT Management & Strategy',
  'Databases & SQL',
];

// ─── Main component ───────────────────────────────────────────
/**
 * @param {{ navigation: any }} props
 */
export default function PracticeLibraryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [recentActivities, setRecentActivities] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [userTargetExam, setUserTargetExam] = useState('IP');

  // Immediately resolve target exam from persistent cache / SQLite session on mount
  useEffect(() => {
    resolveUserTargetExam(null, userTargetExam).then((trk) => {
      if (trk && trk !== userTargetExam) setUserTargetExam(trk);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRecentActivity();
    });
    return unsubscribe;
  }, [navigation]);

  const loadRecentActivity = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) {
        setLoading(false);
        return;
      }

      // 1. Immediately hydrate cached recent activities to render tab with zero loading lag
      const cacheKey = `practice_recent_activities_${uid}`;
      const cached = await getCache(cacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setRecentActivities(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Concurrently query target exam track and recent activity across types with timeouts
      const [resolvedTrack, mcqRes, tfRes, matchRes] = await Promise.allSettled([
        resolveUserTargetExam(uid, userTargetExam),
        withTimeout(supabase.from('multiple_choice_results').select('is_correct, answered_at, multiple_choice_questions(practice_categories(name))').eq('user_id', uid).order('answered_at', { ascending: false }).limit(15), 8000),
        withTimeout(supabase.from('true_false_results').select('is_correct, answered_at, true_false_questions(practice_categories(name))').eq('user_id', uid).order('answered_at', { ascending: false }).limit(15), 8000),
        withTimeout(supabase.from('matching_results').select('set_title, completed, mistakes, duration_seconds, id').eq('user_id', uid).order('id', { ascending: false }).limit(5), 8000)
      ]);

      // 1. Resolve registered target exam level strictly
      const targetTrack = (resolvedTrack.status === 'fulfilled' && resolvedTrack.value)
        ? resolvedTrack.value
        : userTargetExam;
      setUserTargetExam(targetTrack);
      const validSubjects = targetTrack === 'FE' ? FE_SUBJECTS : IP_SUBJECTS;

      const mcqRaw = (mcqRes.status === 'fulfilled' && Array.isArray(mcqRes.value?.data)) ? mcqRes.value.data : [];
      const tfRaw = (tfRes.status === 'fulfilled' && Array.isArray(tfRes.value?.data)) ? tfRes.value.data : [];
      const matchRaw = (matchRes.status === 'fulfilled' && Array.isArray(matchRes.value?.data)) ? matchRes.value.data : [];

      /** @type {any[]} */
      const activities = [];

      // Group MCQ by category name
      if (mcqRaw && mcqRaw.length > 0) {
        /** @type {Record<string, { correct: number, total: number, date: any }>} */
        const mcqGroups = {};
        mcqRaw.forEach(item => {
          const qObj = /** @type {any} */ (item).multiple_choice_questions;
          const catObj = Array.isArray(qObj) ? qObj[0]?.practice_categories : qObj?.practice_categories;
          const categoryName = (Array.isArray(catObj) ? catObj[0]?.name : catObj?.name) || 'General';
          if (!validSubjects.includes(categoryName)) return;
          if (!mcqGroups[categoryName]) {
            mcqGroups[categoryName] = { correct: 0, total: 0, date: item.answered_at };
          }
          mcqGroups[categoryName].total += 1;
          if (item.is_correct) mcqGroups[categoryName].correct += 1;
        });
        
        Object.keys(mcqGroups).forEach(cat => {
          activities.push({
            id: 'mcq-' + cat,
            type: 'Multiple Choice',
            title: cat,
            subtitle: `${mcqGroups[cat].correct}/${mcqGroups[cat].total} Correct`,
            timestamp: mcqGroups[cat].date ? new Date(mcqGroups[cat].date).getTime() : Date.now(),
            route: 'PracticeOverview',
            params: { typeId: 'MultipleChoice', subject: cat, targetExam: targetTrack }
          });
        });
      }

      // Group TF by category name
      if (tfRaw && tfRaw.length > 0) {
        /** @type {Record<string, { correct: number, total: number, date: any }>} */
        const tfGroups = {};
        tfRaw.forEach(item => {
          const qObj = /** @type {any} */ (item).true_false_questions;
          const catObj = Array.isArray(qObj) ? qObj[0]?.practice_categories : qObj?.practice_categories;
          const categoryName = (Array.isArray(catObj) ? catObj[0]?.name : catObj?.name) || 'General';
          if (!validSubjects.includes(categoryName)) return;
          if (!tfGroups[categoryName]) {
            tfGroups[categoryName] = { correct: 0, total: 0, date: item.answered_at };
          }
          tfGroups[categoryName].total += 1;
          if (item.is_correct) tfGroups[categoryName].correct += 1;
        });

        Object.keys(tfGroups).forEach(cat => {
          activities.push({
            id: 'tf-' + cat,
            type: 'True or False',
            title: cat,
            subtitle: `${tfGroups[cat].correct}/${tfGroups[cat].total} Correct`,
            timestamp: tfGroups[cat].date ? new Date(tfGroups[cat].date).getTime() : Date.now(),
            route: 'PracticeOverview',
            params: { typeId: 'TrueFalse', subject: cat, targetExam: targetTrack }
          });
        });
      }

      // Format Matching activities
      if (matchRaw && matchRaw.length > 0) {
        matchRaw.forEach((item, idx) => {
          activities.push({
            id: 'match-' + item.id,
            type: 'Matching',
            title: item.set_title || 'Matching Game',
            subtitle: item.completed ? `Completed · ${item.mistakes} Mistakes` : `Incomplete`,
            timestamp: Date.now() - idx * 60000,
            route: 'PracticeOverview',
            params: { typeId: 'Matching', subject: item.set_title, targetExam: targetTrack }
          });
        });
      }

      // Sort by newest first
      activities.sort((a, b) => b.timestamp - a.timestamp);
      const topRecent = activities.slice(0, 5);
      setRecentActivities(topRecent);
      setCache(cacheKey, topRecent, 10 * 60 * 1000).catch(() => {});
    } catch (err) {
      console.error('Error loading recent activity:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e8edf5', backgroundColor: '#fff' }}>
        <View style={{ width: 36 }} />
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '900', color: NAVY, letterSpacing: 2, textTransform: 'uppercase' }}>Practice</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: getScrollBottomPadding(insets, true, 24) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Practice Section ── */}
        <View style={styles.practiceSection}>
          {/* Mock Examination (as is, placed above 2x2 cards with small logo) */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.mockExamBtn}
            onPress={() => navigation.navigate('MockExamHome')}
          >
            <MaterialCommunityIcons
              name="file-document-edit-outline"
              size={20}
              color={NAVY}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.mockExamText}>MOCK EXAMINATION</Text>
          </TouchableOpacity>

          {/* 2x2 Practice Cards Grid */}
          <View style={styles.cardsGrid}>
            {PRACTICE_CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                activeOpacity={0.85}
                style={[styles.card, { backgroundColor: card.bg }]}
                onPress={() => navigation.navigate('PracticeOverview', { typeId: card.id, targetExam: userTargetExam })}
              >
                <View style={[styles.cardIconWrap, { backgroundColor: card.iconBg }]}>
                  <MaterialCommunityIcons name={/** @type {any} */ (card.icon)} size={26} color={card.text} />
                </View>
                <Text
                  style={[styles.cardLabel, { color: card.text }]}
                  numberOfLines={2}
                >
                  {card.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Activity</Text>

          {loading ? (
            <View style={{ gap: 8 }}>
              {[1, 2, 3].map((item) => (
                <View key={item} style={styles.activityCard}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <SkeletonItem width="60%" height={14} />
                    <SkeletonItem width="40%" height={10} />
                  </View>
                  <SkeletonItem width={16} height={16} borderRadius={8} />
                </View>
              ))}
            </View>
          ) : recentActivities.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity yet. Start practicing!</Text>
          ) : (
            recentActivities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                activeOpacity={0.82}
                style={styles.activityCard}
                onPress={() => navigation.navigate(activity.route, activity.params)}
              >
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityCount}>{activity.type} · {activity.subtitle}</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Spacer for bottom nav */}
        <View style={{ height: 90 }} />
      </ScrollView>


    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: NAVY,
    letterSpacing: 1.5,
  },
  headerIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Scroll ──
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 16 },

  // ── Practice Section ──
  practiceSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  mockExamBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#c8d4e0',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  mockExamText: {
    color: NAVY,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  card: {
    width: '48%',
    height: 112,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  // ── Recent Activity ──
  recentSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '600',
  },
  activityGroup: {
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  viewAll: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8edf5',
  },
  activityInfo: { flex: 1 },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  activityCount: {
    fontSize: 12,
    color: '#64748b',
  },
  activityDots: {
    padding: 4,
    marginLeft: 8,
  },

  // ── Bottom Nav ──
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d8e0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  navIconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  navIconActive: {
    backgroundColor: 'rgba(15, 39, 71, 0.08)',
  },
})
