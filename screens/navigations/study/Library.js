import React, { useState, useEffect } from 'react'
import {
  Image, ScrollView, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, TextInput, Platform, Linking, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { getCache, setCache } from '../../../utils/cache'


const NAVY = '#13294b'

const CSE_SUBJECTS = [
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
  'Logical Reasoning',
  'General Information',
  'Clerical Operations',
]

const VIDEO_LECTURES = [
  {
    id: 'vid-1',
    title: 'Basic Arithmetic Review',
    duration: '12 minutes',
    durationMinutes: 12,
    progressMinutes: 5,
    url: 'https://www.youtube.com/watch?v=sI9pP3s63c8',
    thumbnail: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80',
  },
  {
    id: 'vid-2',
    title: 'Percentages & Decimals',
    duration: '5 minutes',
    durationMinutes: 5,
    progressMinutes: 1,
    url: 'https://www.youtube.com/watch?v=FqE2wPif_9E',
    thumbnail: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80',
  },
  {
    id: 'vid-3',
    title: 'Word Analogy reviewer',
    duration: '15 minutes',
    durationMinutes: 15,
    progressMinutes: 8,
    url: 'https://www.youtube.com/watch?v=F388d0xG7m0',
    thumbnail: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&q=80',
  },
]


// ─── Material card ───────────────────────────────────────────
function MaterialCard({ item, onPress }) {
  const progress = item.progress || 0
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
  const insets = useSafeAreaInsets()
  const [materials, setMaterials]   = useState([])
  const [videos,    setVideos]      = useState([])
  const [loading,   setLoading]     = useState(true)
  const [error,     setError]       = useState(null)
  const [search,    setSearch]      = useState('')
  const [activeChip, setActiveChip] = useState(null)

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMaterials(true)
    })
    return unsubscribe
  }, [navigation])

  const loadMaterials = async (forceRefresh = false) => {
    try {
      setError(null)

      if (!forceRefresh) {
        const cachedMaterials = await getCache('library_materials')
        const cachedVideos = await getCache('library_videos')
        if (cachedMaterials && cachedVideos) {
          setMaterials(cachedMaterials)
          setVideos(cachedVideos)
          setLoading(false)
          return
        }
      }

      setLoading(true)
      
      // Fetch video lectures
      const { data: videoData, error: videoErr } = await supabase
        .from('video_lectures')
        .select('*')
        .order('created_at', { ascending: false })
      if (videoErr) throw videoErr
      setVideos(videoData ?? [])

      // Fetch reading materials
      const { data: readData, error: readErr } = await supabase
        .from('reading_materials')
        .select('*')
        .eq('is_published', true)
        .order('subject')
        .order('sort_order')

      if (readErr) throw readErr

      // Fetch user reading progress from Supabase
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id

      let progressList = []
      if (uid) {
        const { data: progData } = await supabase
          .from('user_reading_progress')
          .select('*')
          .eq('user_id', uid)
        progressList = progData ?? []
      }

      const progressMap = {}
      progressList.forEach(p => {
        progressMap[p.reading_material_id] = p
      })

      const materialsWithProgress = (readData ?? []).map(item => {
        const prog = progressMap[item.id]
        if (prog) {
          if (prog.is_completed) {
            return { ...item, progress: 100 }
          }
          if (prog.current_chapter_number && item.total_pages > 0) {
            const computed = Math.round(((prog.current_chapter_number - 1) / item.total_pages) * 100)
            return { ...item, progress: Math.min(Math.max(computed, 0), 100) }
          }
        }
        return { ...item, progress: 0 }
      })

      setMaterials(materialsWithProgress)
      await setCache('library_materials', materialsWithProgress)
      await setCache('library_videos', videoData ?? [])
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
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Sticky top bar without back button */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e8edf5', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '900', color: NAVY, letterSpacing: 2, textTransform: 'uppercase' }}>Library</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: 16 }]}
        showsVerticalScrollIndicator={false}
      >

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
          <TouchableOpacity onPress={() => loadMaterials(true)}>
            <Feather name="refresh-cw" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Loading */}
        {loading && (
          <View style={{ gap: 20 }}>
            {[1, 2].map((group) => (
              <View key={group} style={styles.subjectSection}>
                <View style={styles.categoryRow}>
                  <SkeletonItem width={120} height={18} />
                  <SkeletonItem width={50} height={14} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
                  {[1, 2, 3].map((card) => (
                    <View key={card} style={[styles.materialCard, { overflow: 'hidden' }]}>
                      <SkeletonItem width="100%" height={80} borderRadius={0} />
                      <View style={{ padding: 10, gap: 8 }}>
                        <SkeletonItem width="80%" height={12} />
                        <SkeletonItem width="60%" height={10} />
                        <SkeletonItem width="40%" height={8} />
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ))}
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

        {/* ── Video Lectures Section ── */}
        {!loading && !error && (
          <View style={{ marginTop: 14 }}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="videocam-outline" size={20} color={NAVY} />
                <Text style={styles.sectionHeaderText}>Video Lectures</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.horizontalCards, { marginTop: 10 }]}>
              {videos.map(video => {
                const durationMins = video.duration_minutes || 10
                const progressMins = Math.min(Math.round(durationMins * 0.4), 8)
                const progressPct = (progressMins / durationMins) * 100
                const thumb = video.thumbnail_url || 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80'
                return (
                  <TouchableOpacity
                    key={video.id}
                    style={styles.videoCard}
                    activeOpacity={0.85}
                    onPress={() => Linking.openURL(video.url)}
                  >
                    <Image source={{ uri: thumb }} style={styles.videoThumbnail} />
                    <View style={styles.videoBody}>
                      <Text style={styles.videoTitle} numberOfLines={1}>{video.title}</Text>
                      <Text style={styles.videoDuration}>{durationMins} minutes</Text>
                      <View style={styles.videoProgressRow}>
                        <View style={styles.videoProgressTrack}>
                          <View style={[styles.videoProgressFill, { width: `${progressPct}%` }]} />
                        </View>
                        <Text style={styles.videoProgressText}>{video.progressMinutes} min</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 16 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="settings" size={24} color="#fff" />
      </TouchableOpacity>


    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
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

  // Video Cards
  videoCard: {
    width: 160,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  videoThumbnail: {
    height: 84,
    backgroundColor: '#edf2f7',
    width: '100%',
  },
  videoBody: {
    padding: 10,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 3,
  },
  videoDuration: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 8,
  },
  videoProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoProgressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  videoProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: NAVY,
  },
  videoProgressText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },

  // FAB
  fab: { position: 'absolute', right: 18, bottom: 82, width: 56, height: 56, borderRadius: 28, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },

  // Bottom nav
  bottomNav:    { position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#d8e0f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 8 },
  navIconWrap:  { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  navIconActive:{ backgroundColor: 'rgba(15, 39, 71, 0.08)' },
})
