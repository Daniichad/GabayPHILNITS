import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, StatusBar, Platform, TextInput,
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'

const NAVY = '#0f2747'

// ─── Filter tabs ──────────────────────────────────────────────
const TABS = [
  { id: 'all',      label: 'All'            },
  { id: 'matching', label: 'Matching'       },
  { id: 'writing',  label: 'Writing'        },
  { id: 'truefalse',label: 'True / False'   },
  { id: 'mcq',      label: 'Multiple Choice'},
  { id: 'analytics',label: 'Analytics'      },
]

// ─── Static library data grouped by time ─────────────────────
const LIBRARY_GROUPS = [
  {
    period: 'Today',
    items: [
      { id: 1, title: 'Vocabulary',          count: '21 items', tag: 'mcq',      hasIcon: true  },
    ],
  },
  {
    period: 'In March 2026',
    items: [
      { id: 2, title: 'Ratio and Proportion',count: '21 items', tag: 'mcq',      hasIcon: false },
      { id: 3, title: 'Algebra Basics',      count: '21 items', tag: 'matching', hasIcon: true  },
    ],
  },
  {
    period: 'In January 2026',
    items: [
      { id: 4, title: 'Sentence Completion', count: '21 items', tag: 'writing',  hasIcon: false },
    ],
  },
  {
    period: 'Yesterday',
    items: [
      { id: 5, title: 'Statistics Basics',   count: '21 items', tag: 'mcq',      hasIcon: false },
      { id: 6, title: 'Idioms and Phrases',  count: '21 items', tag: 'writing',  hasIcon: false },
    ],
  },
  {
    period: 'Last Week',
    items: [
      { id: 7, title: 'Analogy',             count: '25 items', tag: 'matching', hasIcon: false },
      { id: 8, title: 'Basic Arithmetic',    count: '18 items', tag: 'mcq',      hasIcon: true  },
    ],
  },
  {
    period: 'In January 2026',
    items: [
      { id: 9, title: 'Word Problems',       count: '30 items', tag: 'mcq',      hasIcon: false },
    ],
  },
  {
    period: 'In January 2026',
    items: [
      { id: 10, title: 'Active and Passive Voice', count: '12 items', tag: 'writing', hasIcon: true },
    ],
  },
]

// ─── Bottom nav helper ────────────────────────────────────────
function NavIcon({ icon, onPress, active }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.navIconWrap, active && styles.navIconActive]}
    >
      {icon}
    </TouchableOpacity>
  )
}

// ─── Main component ───────────────────────────────────────────
export default function PracticeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('all')
  const [search,    setSearch]    = useState('')

  // Filter by tab
  const filtered = LIBRARY_GROUPS
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        const matchesTab    = activeTab === 'all' || item.tag === activeTab
        const matchesSearch = search === '' || item.title.toLowerCase().includes(search.toLowerCase())
        return matchesTab && matchesSearch
      }),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Library</Text>
        <TouchableOpacity style={styles.headerSortBtn}>
          <MaterialCommunityIcons name="sort" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* ── Category Tabs ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabActive]}
              onPress={() => setActiveTab(t.id)}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Search + Sort row ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search library..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.sortBtn}>
          <MaterialCommunityIcons name="filter-variant" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* ── Grouped List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={48} color="#c0ccd8" />
            <Text style={styles.emptyText}>No items found</Text>
          </View>
        ) : (
          filtered.map((group, gi) => (
            <View key={`${group.period}-${gi}`} style={styles.group}>
              {/* Period header */}
              <View style={styles.groupHeader}>
                <Text style={styles.groupPeriod}>{group.period}</Text>
                <TouchableOpacity>
                  <Text style={styles.viewAll}>View all</Text>
                </TouchableOpacity>
              </View>

              {/* Cards */}
              {group.items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardCount}>{item.count}</Text>
                  </View>
                  {item.hasIcon ? (
                    <View style={styles.cardIconCircle}>
                      <MaterialCommunityIcons name="wrench" size={18} color="#fff" />
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.cardDots}>
                      <MaterialCommunityIcons name="dots-vertical" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* ── Bottom Nav ── */}
      <View style={styles.bottomNav}>
        <NavIcon
          icon={<Ionicons name="home-outline" size={26} color="#64748b" />}
          onPress={() => navigation.navigate('Home')}
        />
        <NavIcon
          icon={<Ionicons name="document-text-outline" size={26} color="#64748b" />}
          onPress={() => navigation.navigate('Library')}
        />
        <NavIcon
          active
          icon={<Feather name="clipboard" size={24} color={NAVY} />}
          onPress={() => navigation.navigate('PracticeLibrary')}
        />
        <NavIcon
          icon={<Feather name="bar-chart-2" size={24} color="#64748b" />}
          onPress={() => navigation.navigate('Performance')}
        />
        <NavIcon
          icon={<Feather name="user" size={24} color="#64748b" />}
          onPress={() => navigation.navigate('PersonalInfo')}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  headerBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 18, fontWeight: '900', color: NAVY, letterSpacing: 0.5 },
  headerSortBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  // Category tabs
  tabsWrapper:  { borderBottomWidth: 1, borderBottomColor: '#e8edf5' },
  tabsContent:  { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabActive:     { backgroundColor: NAVY },
  tabText:       { fontSize: 12, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#fff' },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: NAVY },
  sortBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll:        { flex: 1 },
  scrollContent: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText:  { marginTop: 12, fontSize: 14, color: '#94a3b8', fontWeight: '600' },

  // Groups
  group:       { marginBottom: 6 },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  groupPeriod: { fontSize: 12, fontWeight: '800', color: NAVY, letterSpacing: 0.3 },
  viewAll:     { fontSize: 11, color: '#64748b', fontWeight: '600' },

  // Cards
  card: {
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
  cardInfo:       { flex: 1 },
  cardTitle:      { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  cardCount:      { fontSize: 12, color: '#b0c4d8' },
  cardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2c4563',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  cardDots: { padding: 4, marginLeft: 8 },

  // Bottom nav
  bottomNav: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: 74,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d8e0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  navIconWrap:   { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  navIconActive: { backgroundColor: 'rgba(15, 39, 71, 0.08)' },
})
