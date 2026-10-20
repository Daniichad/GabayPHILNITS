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

const parseLearningObjectives = (text) => {
  if (!text || typeof text !== 'string') return { intro: '', items: [] };

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) return { intro: '', items: [] };

  const bulletRegex = /^([•\u2022\u25E6\u2023\u25AA\u25AB\u2043\u2219\u00B7\u25CF\*\-\–\—]|\d+[\.\)]|\(\d+\))\s*/;

  let intro = '';
  const items = [];

  const firstLineHasBullet = bulletRegex.test(lines[0]);
  const hasSubsequentBullets = lines.slice(1).some(l => bulletRegex.test(l));

  if (!firstLineHasBullet && (hasSubsequentBullets || lines[0].endsWith(':'))) {
    intro = lines[0].replace(/<[^>]*>/g, '').trim();
    for (let i = 1; i < lines.length; i++) {
      const cleaned = lines[i].replace(bulletRegex, '').replace(/<[^>]*>/g, '').trim();
      if (cleaned) items.push(cleaned);
    }
  } else {
    for (let i = 0; i < lines.length; i++) {
      const cleaned = lines[i].replace(bulletRegex, '').replace(/<[^>]*>/g, '').trim();
      if (cleaned) items.push(cleaned);
    }
  }

  // If intro just repeats "learning objectives" or similar, omit it to avoid clutter
  if (intro && /^(learning\s+objectives?|objectives?):?$/i.test(intro.trim())) {
    intro = '';
  }

  // Fallback: If no items were parsed but lines exist
  if (items.length === 0 && lines.length > 0) {
    if (intro) {
      items.push(intro);
      intro = '';
    } else {
      for (const l of lines) {
        const c = l.replace(bulletRegex, '').replace(/<[^>]*>/g, '').trim();
        if (c) items.push(c);
      }
    }
  }

  return { intro, items };
};

export default function ReadingMaterial({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const selectedTitle = route?.params?.title || 'Reading Material'
  const materialId = route?.params?.materialId
  const incomingSpeed = route?.params?.reviewSpeed
  const [reviewSpeed, setReviewSpeed] = React.useState(incomingSpeed || null)
  const incomingObjective = route?.params?.learningObjective
  const [learningObjective, setLearningObjective] = React.useState(incomingObjective || null)

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
    navigation.setParams({ hideNav: true })
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
        // Fetch material metadata (learning_objective, review_speed)
        try {
          const matCacheKey = `material_meta_${materialId}`
          const cachedMeta = await getCache(matCacheKey)
          if (cachedMeta) {
            if (cachedMeta.review_speed) setReviewSpeed(cachedMeta.review_speed)
            if (cachedMeta.learning_objective) setLearningObjective(cachedMeta.learning_objective)
          } else {
            const { data: matData } = await supabase
              .from('reading_materials')
              .select('review_speed, learning_objective')
              .eq('id', materialId)
              .maybeSingle()
            if (matData) {
              if (matData.review_speed) setReviewSpeed(matData.review_speed)
              if (matData.learning_objective) setLearningObjective(matData.learning_objective)
              await setCache(matCacheKey, matData)
            }
          }
        } catch (mErr) {
          console.warn('Error fetching material meta:', mErr)
        }

        const cacheKey = `chapters_${materialId}`
        const cached = await getCache(cacheKey)
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
          await setCache(cacheKey, data)
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
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
          <SkeletonItem width={28} height={28} borderRadius={14} />
          <SkeletonItem width={140} height={24} style={{ marginLeft: 16 }} />
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Skeleton for Learning Objectives Card */}
          <View style={styles.skeletonObjectiveCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <SkeletonItem width={28} height={28} borderRadius={8} />
              <SkeletonItem width={130} height={16} style={{ marginLeft: 10 }} />
            </View>
            <SkeletonItem width="80%" height={12} style={{ marginBottom: 12 }} />
            <SkeletonItem width="95%" height={12} style={{ marginBottom: 10 }} />
            <SkeletonItem width="90%" height={12} style={{ marginBottom: 10 }} />
            <SkeletonItem width="85%" height={12} />
          </View>

          {/* Skeleton for chapters header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
            <SkeletonItem width={90} height={18} />
            <SkeletonItem width={70} height={18} borderRadius={9} />
          </View>

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
    const parsedObjectives = parseLearningObjectives(learningObjective)

    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation?.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={28} color="#13294b" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>{selectedTitle}</Text>
          </View>
          <View style={styles.rightSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Learning Objectives Card */}
          {learningObjective && (parsedObjectives.items.length > 0 || parsedObjectives.intro) ? (
            <View style={styles.objectiveCard}>
              <View style={styles.objectiveCardHeader}>
                <View style={styles.objectiveHeaderLeft}>
                  <View style={styles.objectiveIconContainer}>
                    <Feather name="target" size={16} color="#1d4ed8" />
                  </View>
                  <Text style={styles.objectiveCardTitle}>Learning Objectives</Text>
                </View>
                {parsedObjectives.items.length > 0 && (
                  <View style={styles.objectiveCountBadge}>
                    <Text style={styles.objectiveCountText}>
                      {parsedObjectives.items.length} {parsedObjectives.items.length === 1 ? 'Objective' : 'Objectives'}
                    </Text>
                  </View>
                )}
              </View>

              {parsedObjectives.intro ? (
                <Text style={styles.objectiveIntroText}>
                  {parsedObjectives.intro}
                </Text>
              ) : null}

              <View style={styles.objectiveItemsList}>
                {parsedObjectives.items.map((item, index) => (
                  <View key={index} style={styles.objectiveItemRow}>
                    <View style={styles.objectiveItemBullet}>
                      <Ionicons name="checkmark" size={13} color="#2563eb" />
                    </View>
                    <Text style={styles.objectiveItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Chapters Section Heading */}
          <View style={styles.chaptersHeaderRow}>
            <Text style={styles.chaptersSectionTitle}>Chapters</Text>
            {chaptersList.length > 0 && (
              <View style={styles.chaptersCountBadge}>
                <Text style={styles.chaptersCountBadgeText}>
                  {chaptersList.length} {chaptersList.length === 1 ? 'Chapter' : 'Chapters'}
                </Text>
              </View>
            )}
          </View>

          {/* Timeline-style vertical list of chapters */}
          <View style={styles.timelineContainer}>
            {chaptersList.length === 0 ? (
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

        <View style={[styles.continueButtonWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20 }]}>
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
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={() => setShowOverview(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
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

      <View style={[styles.continueButtonWrapper, { paddingBottom: insets.bottom > 0 ? insets.bottom + 12 : 20 }]}>
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
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#13294b',
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 124,
  },

  // ── Learning Objectives Card ──
  objectiveCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 6,
    marginBottom: 20,
    shadowColor: '#0f2747',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  objectiveCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  objectiveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  objectiveIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  objectiveCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f2747',
    letterSpacing: 0.2,
  },
  objectiveCountBadge: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#dbeafe',
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 12,
  },
  objectiveCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  objectiveIntroText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#475569',
    lineHeight: 19,
    marginBottom: 12,
  },
  objectiveItemsList: {
    gap: 10,
  },
  objectiveItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  objectiveItemBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  objectiveItemText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '400',
    color: '#1e293b',
    textAlign: 'left',
  },

  // ── Chapters Section ──
  chaptersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  chaptersSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f2747',
  },
  chaptersCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chaptersCountBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },

  skeletonObjectiveCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginTop: 4,
    marginBottom: 20,
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
    marginTop: 4,
    marginBottom: 18,
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
