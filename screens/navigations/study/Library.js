import React, { useState, useEffect } from 'react'
import {
  Image, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, TextInput, SafeAreaView, Platform,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'

const NAVY = '#13294b'

const CSE_SUBJECTS = [
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
  'Logical Reasoning',
  'General Information',
  'Clerical Operations',
]

// ─── Bottom nav ──────────────────────────────────────────────
function NavButton({ icon, onPress, active }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8} onPress={onPress}
      style={[styles.navIconWrap, active && styles.navIconActive]}
    >
      {icon}
    </TouchableOpacity>
  )
}

// ─── Material card ───────────────────────────────────────────
function MaterialCard({ item, onPress }) {
  const progress = item.pages_read > 0 && item.total_pages > 0
    ? Math.round((item.pages_read / item.total_pages) * 100)
    : 0
  return (
    <TouchableOpacity style={styles.materialCard} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.materialImagePlaceholder}>
        <Feather name="book-open" size={32} color="#4d72c7" />
      </View>
      <View style={styles.materialBody}>
        <Text style={styles.materialTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.materialSubtitle} numberOfLines={2}>{item.subtitle}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main component ──────────────────────────────────────────
export default function Library({ navigation }) {
  const [materials, setMaterials]   = useState([])
  const [loading,   setLoading]     = useState(true)
  const [error,     setError]       = useState(null)
  const [search,    setSearch]      = useState('')
  const [activeChip, setActiveChip] = useState(null)

  useEffect(() => { loadMaterials() }, [])

  const loadMaterials = async () => {
    try {
      setLoading(true); setError(null)
      const { data, error: err } = await supabase
        .from('reading_materials')
        .select('*')
        .eq('is_published', true)
        .order('subject')
        .order('sort_order')
      if (err) throw err
      setMaterials(data ?? [])
    } catch (e) {
      console.error('Library load error:', e)
      setError('Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }

  // Filter
  const filtered = materials.filter(m => {
    const matchChip   = !activeChip || m.subject === activeChip
    const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase())
    return matchChip && matchSearch
  })

  // Group by subject
  const grouped = CSE_SUBJECTS.reduce((acc, sub) => {
    const items = filtered.filter(m => m.subject === sub)
    if (items.length > 0) acc[sub] = items
    return acc
  }, {})

  return (
    <SafeAreaView style={styles.screen}>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="chevron-back" size={28} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.title}>Library</Text>
          <View style={styles.rightSpacer} />
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Feather name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search materials..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Subject chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          <TouchableOpacity
            style={[styles.chip, !activeChip && styles.chipActive]}
            onPress={() => setActiveChip(null)}
          >
            <Text style={[styles.chipText, !activeChip && styles.chipTextActive]}>All</Text>
          </TouchableOpacity>
          {CSE_SUBJECTS.map(label => (
            <TouchableOpacity
              key={label}
              style={[styles.chip, activeChip === label && styles.chipActive]}
              onPress={() => setActiveChip(activeChip === label ? null : label)}
            >
              <Text style={[styles.chipText, activeChip === label && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Section header */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Feather name="book-open" size={20} color={NAVY} />
            <Text style={styles.sectionHeaderText}>Reading Materials</Text>
          </View>
          <TouchableOpacity onPress={loadMaterials}>
            <Feather name="refresh-cw" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={NAVY} />
            <Text style={styles.loadingText}>Loading materials…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && error && (
          <View style={styles.centered}>
            <Feather name="alert-circle" size={40} color="#94a3b8" />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={loadMaterials}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Content grouped by subject */}
        {!loading && !error && Object.keys(grouped).length === 0 && (
          <View style={styles.centered}>
            <Feather name="inbox" size={40} color="#94a3b8" />
            <Text style={styles.emptyText}>No materials found.</Text>
          </View>
        )}

        {!loading && !error && Object.entries(grouped).map(([subject, items]) => (
          <View key={subject} style={styles.subjectSection}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryTitle}>{subject}</Text>
              <Text style={styles.categoryCount}>{items.length} items</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
              {items.map(item => (
                <MaterialCard
                  key={item.id}
                  item={item}
                  onPress={() => navigation?.navigate('ReadingMaterial', { materialId: item.id, title: item.title })}
                />
              ))}
            </ScrollView>
          </View>
        ))}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="settings" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <NavButton icon={<Ionicons name="home-outline" size={26} color="#64748b" />} onPress={() => navigation?.navigate('Home')} />
        <NavButton active icon={<Ionicons name="document-text" size={26} color={NAVY} />} onPress={() => navigation?.navigate('Library')} />
        <NavButton icon={<Feather name="clipboard" size={24} color="#64748b" />} onPress={() => navigation?.navigate('PracticeLibrary')} />
        <NavButton icon={<Feather name="bar-chart-2" size={24} color="#64748b" />} onPress={() => navigation?.navigate('Performance')} />
        <NavButton icon={<Feather name="user" size={24} color="#64748b" />} onPress={() => navigation?.navigate('PersonalInfo')} />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? 30 : 0 },
  scrollContent: { paddingTop: 18, paddingHorizontal: 18, paddingBottom: 100 },

  // Top
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title:        { fontSize: 28, fontWeight: '800', color: NAVY },
  rightSpacer:  { width: 28 },

  // Search
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eef1f5', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 14 },
  searchInput:  { flex: 1, fontSize: 14, color: NAVY },

  // Chips
  chipScroll:    { gap: 8, paddingBottom: 14 },
  chip:          { borderWidth: 1.2, borderColor: '#4d72c7', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  chipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  chipText:      { color: NAVY, fontSize: 12, fontWeight: '600' },
  chipTextActive:{ color: '#fff' },

  // Section header
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHeaderText:{ fontSize: 17, fontWeight: '700', color: NAVY },

  // Loading / empty
  centered:    { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  emptyText:   { marginTop: 10, fontSize: 14, color: '#94a3b8', textAlign: 'center' },
  retryBtn:    { marginTop: 14, paddingHorizontal: 22, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 20 },
  retryText:   { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Subject groups
  subjectSection: { marginBottom: 20 },
  categoryRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryTitle:  { fontSize: 15, fontWeight: '700', color: NAVY },
  categoryCount:  { fontSize: 12, color: '#64748b' },
  horizontalCards:{ gap: 12, paddingBottom: 6 },

  // Cards
  materialCard:            { width: 160, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
  materialImagePlaceholder:{ height: 80, backgroundColor: '#dbe8fb', alignItems: 'center', justifyContent: 'center' },
  materialBody:            { padding: 10 },
  materialTitle:           { fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 3 },
  materialSubtitle:        { fontSize: 11, color: '#374151', minHeight: 28, marginBottom: 8 },
  progressRow:             { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack:           { flex: 1, height: 5, borderRadius: 999, backgroundColor: '#e5e7eb', overflow: 'hidden' },
  progressFill:            { height: '100%', borderRadius: 999, backgroundColor: NAVY },
  progressText:            { fontSize: 10, color: '#6b7280', fontWeight: '600' },

  // FAB
  fab: { position: 'absolute', right: 18, bottom: 82, width: 56, height: 56, borderRadius: 28, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

  // Bottom nav
  bottomNav:    { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d8e0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 8 },
  navIconWrap:  { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  navIconActive:{ backgroundColor: 'rgba(15, 39, 71, 0.08)' },
})
