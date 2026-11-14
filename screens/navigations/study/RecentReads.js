import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../supabase'

const NAVY = '#13294b'
const LIGHT_BG = '#f8fafc'
const CARD_BG = '#ffffff'
const BORDER_COLOR = '#e2e8f0'

const FILTER_TABS = [
  { key: 'ALL', label: 'All', icon: 'layers' },
  { key: 'Strategy', label: 'Strategy (S)', icon: 'briefcase' },
  { key: 'Management', label: 'Management (M)', icon: 'trello' },
  { key: 'Technology', label: 'Technology (T)', icon: 'cpu' },
]

export default function RecentReads({ navigation }) {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recentItems, setRecentItems] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('ALL')

  const fetchRecentReads = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id

      if (!uid) {
        setRecentItems([])
        setLoading(false)
        return
      }

      // Fetch user's reading progress joined with reading materials
      const { data, error } = await supabase
        .from('user_reading_progress')
        .select(`
          id,
          user_id,
          reading_material_id,
          current_chapter_number,
          is_completed,
          updated_at,
          reading_materials (
            id,
            title,
            subtitle,
            subject,
            total_pages,
            review_speed,
            learning_objective
          )
        `)
        .eq('user_id', uid)
        .order('updated_at', { ascending: false })

      if (error) {
        console.warn('Error fetching recent reads:', error.message)
      } else {
        const mapped = (data || [])
          .filter(row => row.reading_materials)
          .map(row => {
            const mat = row.reading_materials
            const total = mat.total_pages || 1
            const current = row.current_chapter_number || 1
            const progress = row.is_completed ? 100 : Math.min(Math.round(((current - 1) / total) * 100), 100)
            return {
              progressId: row.id,
              materialId: mat.id,
              title: mat.title,
              subtitle: mat.subtitle,
              subject: mat.subject || 'Strategy',
              reviewSpeed: mat.review_speed,
              learningObjective: mat.learning_objective,
              pdfUrl: mat.pdf_url || mat.file_url,
              fileName: mat.file_name,
              currentChapter: current,
              totalPages: total,
              isCompleted: row.is_completed,
              progress,
              updatedAt: row.updated_at,
            }
          })
        setRecentItems(mapped)
      }
    } catch (err) {
      console.warn('Recent reads fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecentReads()
  }, [])

  const onRefresh = () => {
    setRefreshing(true)
    fetchRecentReads()
  }

  const formatLastRead = (isoString) => {
    if (!isoString) return 'Recently'
    try {
      const date = new Date(isoString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays} days ago`
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    } catch {
      return 'Recently'
    }
  }

  const filteredItems = recentItems.filter(item => {
    if (selectedFilter === 'ALL') return true
    return (item.subject || '').toLowerCase().includes(selectedFilter.toLowerCase())
  })

  const getSubjectColor = (subject) => {
    const s = (subject || '').toLowerCase()
    if (s.includes('strat')) return { bg: '#e0f2fe', text: '#0369a1', badge: '#38bdf8' }
    if (s.includes('manage')) return { bg: '#fef3c7', text: '#b45309', badge: '#f59e0b' }
    if (s.includes('tech') || s.includes('arch') || s.includes('alg')) return { bg: '#ede9fe', text: '#6d28d9', badge: '#a855f7' }
    return { bg: '#f1f5f9', text: '#475569', badge: '#94a3b8' }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 24) + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recent Library Reads</Text>
        <TouchableOpacity style={styles.refreshBtn} activeOpacity={0.7} onPress={onRefresh}>
          <Feather name="refresh-cw" size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* S, M, T Filter Tabs (Matching 2nd UI reference) */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_TABS.map(tab => {
            const active = selectedFilter === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                activeOpacity={0.8}
                onPress={() => setSelectedFilter(tab.key)}
              >
                <Feather
                  name={tab.icon}
                  size={14}
                  color={active ? '#ffffff' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Fetching recent reads...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.emptyIconWrap}>
            <MaterialCommunityIcons name="book-open-page-variant-outline" size={56} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>No Recent Reads Found</Text>
          <Text style={styles.emptySubtitle}>
            {selectedFilter === 'ALL'
              ? 'Books and learning materials you start reading in the Library will appear here for easy continuation.'
              : `You haven't read any ${selectedFilter} materials yet.`}
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('Library')}
          >
            <Feather name="compass" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.exploreBtnText}>Browse Library</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              Showing <Text style={{ fontWeight: '800', color: NAVY }}>{filteredItems.length}</Text> recently read item{filteredItems.length === 1 ? '' : 's'}
            </Text>
          </View>

          {filteredItems.map(item => {
            const colors = getSubjectColor(item.subject)
            return (
              <View key={item.progressId || item.materialId} style={styles.recentCard}>
                {/* Top card row */}
                <View style={styles.cardHeaderRow}>
                  {/* Book cover visual block */}
                  <View style={[styles.bookCover, { backgroundColor: colors.bg }]}>
                    <Ionicons name="book" size={26} color={colors.text} />
                    <View style={[styles.spineBand, { backgroundColor: colors.badge }]} />
                  </View>

                  {/* Material details */}
                  <View style={styles.bookInfo}>
                    <View style={styles.tagRow}>
                      <View style={[styles.subjectPill, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.subjectPillText, { color: colors.text }]}>{item.subject}</Text>
                      </View>
                      <Text style={styles.timeText}>{formatLastRead(item.updatedAt)}</Text>
                    </View>

                    <Text style={styles.bookTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    {item.subtitle ? (
                      <Text style={styles.bookSubtitle} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {/* Progress bar and Chapter status */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.chapterStatusText}>
                      {item.isCompleted
                        ? 'Completed'
                        : `Chapter ${item.currentChapter} of ${item.totalPages}`}
                    </Text>
                    <Text style={[styles.progressPercentText, item.isCompleted && { color: '#16a34a' }]}>
                      {item.progress}%
                    </Text>
                  </View>

                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${item.progress}%`,
                          backgroundColor: item.isCompleted ? '#16a34a' : NAVY,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Card Action Button */}
                <TouchableOpacity
                  style={[styles.continueBtn, item.isCompleted && styles.completedBtn]}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation?.navigate('ReadingMaterial', {
                      materialId: item.materialId,
                      title: item.title,
                      reviewSpeed: item.reviewSpeed,
                      learningObjective: item.learningObjective,
                      pdfUrl: item.pdfUrl,
                      fileName: item.fileName,
                    })
                  }
                >
                  <Ionicons
                    name={item.isCompleted ? 'checkmark-circle-outline' : 'play-outline'}
                    size={16}
                    color={item.isCompleted ? '#059669' : '#ffffff'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.continueBtnText, item.isCompleted && styles.completedBtnText]}>
                    {item.isCompleted ? 'Review Again' : 'Continue Reading'}
                  </Text>
                  <Feather
                    name="arrow-right"
                    size={14}
                    color={item.isCompleted ? '#059669' : '#ffffff'}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: LIGHT_BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backBtn: {
    padding: 6,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 0.5,
  },
  refreshBtn: {
    padding: 6,
  },
  filterBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  countRow: {
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  countText: {
    fontSize: 13,
    color: '#64748b',
  },
  recentCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookCover: {
    width: 62,
    height: 82,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 14,
    overflow: 'hidden',
  },
  spineBand: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  subjectPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  subjectPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    lineHeight: 20,
    marginBottom: 3,
  },
  bookSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  progressContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  chapterStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '700',
    color: NAVY,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAVY,
    paddingVertical: 10,
    borderRadius: 10,
  },
  continueBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  completedBtn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  completedBtnText: {
    color: '#059669',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  exploreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NAVY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
})

