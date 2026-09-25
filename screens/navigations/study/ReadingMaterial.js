import React from 'react'
import { Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, LayoutAnimation, UIManager } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { getCache, setCache } from '../../../utils/cache'
import { calculateReadingPoints, recordPointsEntry } from '../../../utils/pointsEngine'


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental && !global.nativeFabricUIManager) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function ReadingMaterial({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const selectedTitle = route?.params?.title || 'Reading Material'
  const materialId = route?.params?.materialId

  const [showOverview, setShowOverviewState] = React.useState(true)
  const [chapters, setChapters] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [selectedChapter, setSelectedChapterState] = React.useState('Chapter 1')
  const [hasRead, setHasRead] = React.useState(false)

  const setShowOverview = (val) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setShowOverviewState(val)
  }

  const setSelectedChapter = async (val) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setSelectedChapterState(val)
    if (materialId) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id
        if (uid) {
          const chapNum = parseInt(val.replace('Chapter ', ''), 10)
          const { error } = await supabase.from('user_reading_progress').upsert({
            user_id: uid,
            reading_material_id: materialId,
            current_chapter_number: chapNum,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,reading_material_id' })
          if (error) console.error('Error upserting progress:', error.message)
        }
      } catch (err) {
        console.warn('Error saving chapter progress:', err)
      }
    }
  }

  React.useEffect(() => {
    navigation.setParams({ hideNav: false })
    async function checkReadStatus() {
      if (materialId) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const uid = session?.user?.id
          if (uid) {
            const { data } = await supabase
              .from('user_reading_progress')
              .select('*')
              .eq('user_id', uid)
              .eq('reading_material_id', materialId)
              .maybeSingle()

            if (data) {
              setHasRead(data.is_completed)
              setSelectedChapterState(`Chapter ${data.current_chapter_number}`)
            }
          }
        } catch (err) {
          console.warn('Error reading progress:', err)
        }
      }
    }
    checkReadStatus()
  }, [])

  React.useEffect(() => {
    async function fetchChapters() {
      if (!materialId) {
        setLoading(false)
        return
      }
      try {
        const cacheKey = `chapters_${materialId}`
        const cached = getCache(cacheKey)
        if (cached && cached.length > 0) {
          setChapters(cached)
          setSelectedChapter(`Chapter ${cached[0].chapter_number}`)
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('reading_material_chapters')
          .select('*')
          .eq('reading_material_id', materialId)
          .order('chapter_number', { ascending: true })

        if (error) {
          console.error('Error fetching chapters:', error)
        } else if (data && data.length > 0) {
          setChapters(data)
          setSelectedChapter(`Chapter ${data[0].chapter_number}`)
          setCache(cacheKey, data)
        }
      } catch (err) {
        console.error('Error in fetchChapters:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchChapters()
  }, [materialId])

  // Dynamic chapters list from database
  const chaptersList = chapters.map(c => ({
    id: `Chapter ${c.chapter_number}`,
    title: c.title,
    body: c.content
  }))

  const activeChapterData = chaptersList.find(chap => chap.id === selectedChapter) || chaptersList[0]

  const handleNextChapter = async () => {
    const currentIndex = chaptersList.findIndex(chap => chap.id === selectedChapter)
    if (currentIndex >= 0 && currentIndex < chaptersList.length - 1) {
      setSelectedChapter(chaptersList[currentIndex + 1].id)
    } else {
      if (materialId) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const uid = session?.user?.id
          if (uid) {
            const { error } = await supabase.from('user_reading_progress').upsert({
              user_id: uid,
              reading_material_id: materialId,
              is_completed: true,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id,reading_material_id' })
            if (error) console.error('Error saving read status:', error.message)
            setHasRead(true)

            // Record reading points
            const ptsObj = calculateReadingPoints({
              isStart: false,
              isFirstTime: !hasRead,
              sessionData: { dwellTimeSeconds: 20, scrolledToBottom: true },
              materialId: materialId,
            })
            await recordPointsEntry(ptsObj)
          }
        } catch (err) {
          console.warn('Error saving read status:', err)
        }
      }
      navigation?.navigate('Library')
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.topBar}>
          <SkeletonItem width={28} height={28} borderRadius={14} />
          <SkeletonItem width={120} height={24} style={{ marginLeft: 16 }} />
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.timelineContainer}>
            {[1, 2, 3, 4, 5].map((item, index) => (
              <View key={item} style={[styles.chapterItemRow, { alignItems: 'center' }]}>
                <View style={styles.timelineLeftCol}>
                  <SkeletonItem width={14} height={14} borderRadius={7} style={{ marginTop: 0 }} />
                  {index < 4 && <View style={styles.timelineLine} />}
                </View>
                <View style={[styles.chapterTextCol, { gap: 6 }]}>
                  <SkeletonItem width={80} height={14} />
                  <SkeletonItem width={150} height={12} />
                </View>
              </View>
            ))}
          </View>

          <SkeletonItem width="100%" height={48} borderRadius={24} style={{ marginTop: 10, marginBottom: 20 }} />
        </ScrollView>
      </View>
    )
  }

  if (showOverview) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#13294b" />
          </TouchableOpacity>
          <Text style={styles.title}>{selectedTitle}</Text>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Timeline-style vertical list of chapters */}
          <View style={styles.timelineContainer}>
            {loading ? (
              [1, 2, 3, 4, 5].map((item, index) => (
                <View key={item} style={[styles.chapterItemRow, { alignItems: 'center' }]}>
                  <View style={styles.timelineLeftCol}>
                    <SkeletonItem width={14} height={14} borderRadius={7} style={{ marginTop: 0 }} />
                    {index < 4 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={[styles.chapterTextCol, { gap: 6 }]}>
                    <SkeletonItem width={80} height={14} />
                    <SkeletonItem width={150} height={12} />
                  </View>
                </View>
              ))
            ) : chaptersList.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>No chapters found for this reading material.</Text>
              </View>
            ) : (
              chaptersList.map((chap, index) => {
                const isSelected = selectedChapter === chap.id
                return (
                  <TouchableOpacity
                    key={chap.id}
                    style={styles.chapterItemRow}
                    activeOpacity={0.8}
                    onPress={() => setSelectedChapter(chap.id)}
                  >
                    <View style={styles.timelineLeftCol}>
                      <View style={[styles.timelineNode, isSelected && styles.timelineNodeActive]} />
                      {index < chaptersList.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.chapterTextCol}>
                      <Text style={[styles.chapterLabelText, isSelected && styles.chapterLabelActive]}>
                        {chap.id}
                      </Text>
                      <Text style={styles.chapterTitleText}>{chap.title}</Text>
                    </View>
                  </TouchableOpacity>
                )
              })
            )}
          </View>
        </ScrollView>

        <View style={[styles.continueButtonWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }]}>
          <TouchableOpacity
            style={styles.continueButton}
            activeOpacity={0.85}
            onPress={() => setShowOverview(false)}
            disabled={loading || chaptersList.length === 0}
          >
            <Text style={styles.continueButtonText}>
              {hasRead ? 'Continue Reading' : 'Start Reading'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => setShowOverview(true)}>
          <Ionicons name="chevron-back" size={28} color="#13294b" />
        </TouchableOpacity>
        <Text style={styles.title}>{selectedChapter}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>
          {activeChapterData?.title || 'No Title'}
        </Text>

        <View style={styles.contentCard}>
          <Text style={styles.contentText}>
            {activeChapterData?.body || 'No content found.'}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.continueButtonWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom + 24 : 32 }]}>
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => setShowOverview(true)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={handleNextChapter}>
            <Text style={styles.primaryButtonText}>
              {chaptersList.findIndex(chap => chap.id === selectedChapter) === chaptersList.length - 1 ? 'Finish' : 'Next Chapter'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="settings" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 54,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#13294b',
  },
  rightSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 124,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#13294b',
    marginTop: 8,
    marginBottom: 14,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#dbe3f2',
    padding: 16,
    minHeight: 500,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1f2937',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f2747',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#eef1f5',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#13294b',
    fontWeight: '800',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 82,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f2747',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
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

  // ── Timeline & Overview ──
  timelineContainer: {
    marginVertical: 18,
    paddingLeft: 4,
  },
  chapterItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    height: 72,
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
    height: '100%',
  },
  timelineNode: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#64748b',
    backgroundColor: '#fff',
    zIndex: 2,
    marginTop: 4,
  },
  timelineNodeActive: {
    borderColor: '#0f2747',
    backgroundColor: '#0f2747',
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  timelineLine: {
    position: 'absolute',
    top: 14,
    bottom: 0,
    width: 2,
    backgroundColor: '#cbd5e1',
    zIndex: 1,
  },
  chapterTextCol: {
    marginLeft: 14,
    flex: 1,
  },
  chapterLabelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  chapterLabelActive: {
    color: '#0f2747',
  },
  chapterTitleText: {
    fontSize: 13,
    color: '#475569',
  },
  continueButton: {
    backgroundColor: '#0f2747',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  continueButtonWrapper: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
})
