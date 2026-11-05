import React from 'react'
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, LayoutAnimation, UIManager, Modal, Linking
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
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
  const incomingPdfUrl = route?.params?.pdfUrl
  const [pdfUrl, setPdfUrl] = React.useState(incomingPdfUrl || null)
  const [materialMeta, setMaterialMeta] = React.useState(null)

  const [showTocModal, setShowTocModal] = React.useState(false)
  const [chapters, setChapters] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [selectedChapter, setSelectedChapterState] = React.useState('Chapter 1')
  const [hasRead, setHasRead] = React.useState(false)

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
        // 1. Fetch material record strictly from Supabase
        let fetchedMat = null
        try {
          const { data: matData, error: matErr } = await supabase
            .from('reading_materials')
            .select('*')
            .eq('id', materialId)
            .maybeSingle()
          if (!matErr && matData) {
            fetchedMat = matData
            setMaterialMeta(matData)
            if (matData.review_speed) setReviewSpeed(matData.review_speed)
            if (matData.learning_objective) setLearningObjective(matData.learning_objective)
            if (matData.pdf_url) setPdfUrl(matData.pdf_url)
          } else if (matErr) {
            console.warn('Note on reading_materials query:', matErr.message)
          }
        } catch (mErr) {
          console.warn('Error fetching material meta:', mErr)
        }

        // 2. Fetch chapters if table exists (backward compatibility fallback)
        let chapData = null
        try {
          const { data: cData, error: chapErr } = await supabase
            .from('reading_material_chapters')
            .select('*')
            .eq('reading_material_id', materialId)
            .order('chapter_number', { ascending: true })

          if (!chapErr && cData && cData.length > 0) {
            chapData = cData
          }
        } catch (_) {
          // Table dropped in favor of standalone PDF documents
        }

        const rawContent = (fetchedMat?.description || fetchedMat?.subtitle || '').trim()

        if (chapData && chapData.length > 0) {
          setChapters(chapData)
          setSelectedChapter(`Chapter ${chapData[0].chapter_number}`)
        } else if (rawContent) {
          // Parse multi-page text if formatted with "--- Page X ---"
          const pageChunks = rawContent.split(/---\s*Page\s*\d+\s*---/i).filter(p => p.trim().length > 0)
          if (pageChunks.length > 1) {
            const chapList = pageChunks.map((chunk, idx) => ({
              id: `Page ${idx + 1}`,
              chapter_number: idx + 1,
              title: `${fetchedMat?.title || selectedTitle} — Page ${idx + 1}`,
              content: chunk.trim(),
            }))
            setChapters(chapList)
            setSelectedChapter('Page 1')
          } else {
            const directChap = [{
              id: 'Chapter 1',
              chapter_number: 1,
              title: fetchedMat?.title || selectedTitle,
              content: rawContent,
            }]
            setChapters(directChap)
            setSelectedChapter('Chapter 1')
          }
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

        <View style={{ flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#13294b" />
          <Text style={{ marginTop: 14, fontSize: 13, fontWeight: '600', color: '#64748b' }}>
            Opening Document…
          </Text>
        </View>
      </View>
    )
  }

  const parsedObjectives = parseLearningObjectives(learningObjective)
  const currentChapterIndex = chaptersList.findIndex(chap => chap.id === selectedChapter)

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Top Bar ── */}
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
          <Text style={styles.title} numberOfLines={1}>{selectedTitle}</Text>
          {reviewSpeed ? (
            <View style={styles.pdfTopPill}>
              <Text style={styles.pdfTopPillText}>{reviewSpeed} Mode</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.topBarActions}>
          {pdfUrl ? (
            <TouchableOpacity
              style={styles.topBarIconBtn}
              activeOpacity={0.7}
              onPress={() => Linking.openURL(pdfUrl)}
            >
              <Feather name="external-link" size={17} color="#13294b" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.topBarIconBtn}
            activeOpacity={0.7}
            onPress={() => setShowTocModal(true)}
          >
            <Feather name="list" size={18} color="#13294b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Direct PDF Display ── */}
      {pdfUrl ? (
        <View style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
          <WebView
            source={{
              uri: (Platform.OS === 'android' && typeof pdfUrl === 'string' && !pdfUrl.startsWith('data:'))
                ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
                : pdfUrl
            }}
            style={{ flex: 1 }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.pdfLoadingContainer}>
                <ActivityIndicator size="large" color="#13294b" />
                <Text style={styles.pdfLoadingText}>Loading PDF Document…</Text>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <ScrollView
            contentContainerStyle={styles.pdfDocumentScroll}
            showsVerticalScrollIndicator={true}
          >
            {/* High-fidelity PDF Document Sheet */}
            <View style={styles.pdfPaperSheet}>
              <View style={styles.pdfSheetHeader}>
                <Text style={styles.pdfSheetHeaderExam}>{materialMeta?.subject || route?.params?.subject || 'READING MATERIAL'}</Text>
                {reviewSpeed ? <Text style={styles.pdfSheetHeaderPace}>{reviewSpeed} Mode</Text> : null}
              </View>
              <View style={styles.pdfSheetDivider} />

              <Text style={styles.pdfChapterTitle}>
                {activeChapterData?.title || materialMeta?.title || selectedTitle}
              </Text>

              <Text style={styles.pdfChapterContent}>
                {activeChapterData?.body || materialMeta?.description || materialMeta?.subtitle || 'No document content found.'}
              </Text>

              <View style={styles.pdfSheetFooter}>
                <Text style={styles.pdfSheetFooterText}>
                  {selectedChapter} • {materialMeta?.title || selectedTitle}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* PDF Page Navigation Toolbar at Bottom */}
          <View style={[styles.pdfBottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 14 }]}>
            <TouchableOpacity
              style={[styles.pdfNavBtn, currentChapterIndex <= 0 && styles.pdfNavBtnDisabled]}
              disabled={currentChapterIndex <= 0}
              onPress={() => {
                if (currentChapterIndex > 0) setSelectedChapter(chaptersList[currentChapterIndex - 1].id)
              }}
            >
              <Feather name="chevron-left" size={18} color="#13294b" />
              <Text style={styles.pdfNavBtnText}>Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pdfChapterPill}
              activeOpacity={0.8}
              onPress={() => setShowTocModal(true)}
            >
              <Feather name="book-open" size={13} color="#2563eb" style={{ marginRight: 5 }} />
              <Text style={styles.pdfChapterPillText}>
                {selectedChapter} of {chaptersList.length || 1}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pdfNavBtnPrimary}
              onPress={handleNextChapter}
            >
              <Text style={styles.pdfNavBtnPrimaryText}>
                {currentChapterIndex === chaptersList.length - 1 ? 'Finish' : 'Next'}
              </Text>
              <Feather name="chevron-right" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Table of Contents & Learning Objectives Modal ── */}
      <Modal
        visible={showTocModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTocModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="bookmark" size={18} color="#13294b" />
                <Text style={styles.modalTitle}>Document Contents</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTocModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Learning Objectives if available */}
              {learningObjective && (parsedObjectives.items.length > 0 || parsedObjectives.intro) ? (
                <View style={styles.objectiveCard}>
                  <View style={styles.objectiveCardHeader}>
                    <View style={styles.objectiveHeaderLeft}>
                      <View style={styles.objectiveIconContainer}>
                        <Feather name="target" size={14} color="#1d4ed8" />
                      </View>
                      <Text style={styles.objectiveCardTitle}>Objectives</Text>
                    </View>
                  </View>
                  {parsedObjectives.intro ? (
                    <Text style={styles.objectiveIntroText}>{parsedObjectives.intro}</Text>
                  ) : null}
                  <View style={styles.objectiveItemsList}>
                    {parsedObjectives.items.map((item, idx) => (
                      <View key={idx} style={styles.objectiveItemRow}>
                        <View style={styles.objectiveItemBullet}>
                          <Ionicons name="checkmark" size={12} color="#2563eb" />
                        </View>
                        <Text style={styles.objectiveItemText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Chapters list to jump between pages */}
              <Text style={styles.chaptersSectionTitle}>Chapters</Text>
              <View style={styles.timelineContainer}>
                {chaptersList.map((chap, index) => {
                  const isSelected = selectedChapter === chap.id
                  return (
                    <TouchableOpacity
                      key={chap.id}
                      style={styles.chapterItemRow}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedChapter(chap.id)
                        setShowTocModal(false)
                      }}
                    >
                      <View style={styles.timelineLeftCol}>
                        <View style={[styles.timelineNode, isSelected && styles.timelineNodeActive]} />
                        {index < chaptersList.length - 1 && <View style={styles.timelineLine} />}
                      </View>
                      <View style={styles.chapterTextCol}>
                        <Text style={[styles.chapterLabelText, isSelected && styles.chapterLabelActive]}>
                          {chap.id}
                        </Text>
                        <Text style={styles.chapterTitleText} numberOfLines={2}>{chap.title}</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    fontSize: 16,
    fontWeight: '800',
    color: '#13294b',
    textAlign: 'center',
    lineHeight: 22,
  },
  pdfTopPill: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  pdfTopPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  pdfLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  pdfLoadingText: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  // ── PDF Document View (Paper Canvas) ──
  pdfDocumentScroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 110,
  },
  pdfPaperSheet: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 22,
    minHeight: 520,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  pdfSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pdfSheetHeaderExam: {
    fontSize: 10,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
  },
  pdfSheetHeaderPace: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
  },
  pdfSheetDivider: {
    height: 1.5,
    backgroundColor: '#cbd5e1',
    marginBottom: 18,
  },
  pdfChapterTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#13294b',
    marginBottom: 14,
    lineHeight: 26,
  },
  pdfChapterContent: {
    fontSize: 15,
    lineHeight: 25,
    color: '#1e293b',
  },
  pdfSheetFooter: {
    marginTop: 32,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    alignItems: 'center',
  },
  pdfSheetFooterText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },

  // ── PDF Bottom Toolbar ──
  pdfBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 18,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  pdfNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  pdfNavBtnDisabled: {
    opacity: 0.35,
  },
  pdfNavBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#13294b',
    marginLeft: 2,
  },
  pdfChapterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pdfChapterPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563eb',
  },
  pdfNavBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#13294b',
  },
  pdfNavBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginRight: 2,
  },

  // ── Modal Styles ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#13294b',
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
