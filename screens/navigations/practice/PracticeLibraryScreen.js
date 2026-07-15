import React from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar, Platform,
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'


// ─── Colours matching the image ────────────────────────────────
const NAVY = '#0f2747'

// ─── Practice type buttons (ordered as in image) ───────────────
const PRACTICE_TYPES = [
  { id: 'Flashcards',    label: 'FLASHCARDS',      bg: '#3B5BA5', text: '#fff'     },
  { id: 'Matching',      label: 'MATCHING',         bg: '#E8967A', text: '#fff'     },
  { id: 'TrueFalse',    label: 'TRUE OR FALSE',    bg: '#9B2335', text: '#fff'     },
  { id: 'MultipleChoice',label: 'MULTIPLE CHOICE',  bg: '#B8D4EA', text: '#1e3a5f'  },
  { id: 'MockExamHome',  label: 'MOCK EXAMINATION', bg: '#fff',    text: NAVY, outlined: true },
]

// ─── Recent activity data (static for now) ────────────────────
const RECENT = [
  {
    section: 'Flashcard sets',
    items: [
      { id: 1, title: 'Vocabulary',           count: '21 items', hasIcon: true },
      { id: 2, title: 'Reading Comprehension', count: '21 items', hasIcon: false },
    ],
  },
  {
    section: 'True or False',
    items: [
      { id: 3, title: 'Fractions & Decimals', count: '21 items', hasIcon: false },
    ],
  },
]


// ─── Main component ───────────────────────────────────────────
export default function PracticeLibraryScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ width: 36 }} />
        <Text style={styles.headerTitle}>PRACTICE</Text>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('PracticeScreen')}>
          <MaterialCommunityIcons name="folder-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Practice Type Buttons ── */}
        <View style={styles.practiceSection}>
          {PRACTICE_TYPES.map((pt) => (
            <TouchableOpacity
              key={pt.id}
              activeOpacity={0.82}
              style={[
                styles.practiceBtn,
                { backgroundColor: pt.bg },
                pt.outlined && styles.practiceBtnOutlined,
              ]}
              onPress={() => navigation.navigate(pt.id)}
            >
              <Text style={[styles.practiceBtnText, { color: pt.text }]}>
                {pt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recent Activity</Text>

          {RECENT.map((group) => (
            <View key={group.section} style={styles.activityGroup}>
              {/* Section header */}
              <View style={styles.sectionRow}>
                <Text style={styles.sectionLabel}>{group.section}</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
              </View>

              {/* Activity cards */}
              {group.items.map((item) => (
                <View key={item.id} style={styles.activityCard}>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityCount}>{item.count}</Text>
                  </View>
                  {item.hasIcon && (
                    <View style={styles.activityIconCircle}>
                      <MaterialCommunityIcons name="wrench" size={18} color="#fff" />
                    </View>
                  )}
                  {!item.hasIcon && (
                    <TouchableOpacity style={styles.activityDots}>
                      <MaterialCommunityIcons name="dots-vertical" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))}
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
    paddingTop: Platform.OS === 'android' ? 30 : 0,
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

  // ── Practice Buttons ──
  practiceSection: {
    paddingHorizontal: 20,
    paddingTop: 22,
    gap: 10,
  },
  practiceBtn: {
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  practiceBtnOutlined: {
    borderWidth: 1.5,
    borderColor: '#c8d4e0',
  },
  practiceBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
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
    backgroundColor: '#3d5a80',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  activityInfo: { flex: 1 },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  activityCount: {
    fontSize: 12,
    color: '#b0c4d8',
  },
  activityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c4563',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
