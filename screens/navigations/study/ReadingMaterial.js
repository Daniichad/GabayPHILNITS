import React from 'react'
import {
  Platform, StatusBar, StyleSheet, Text, TouchableOpacity,
  View, ActivityIndicator, Linking
} from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { supabase } from '../../../supabase'
import { SkeletonItem } from '../../../components/Skeleton'
import { calculateReadingPoints, recordPointsEntry } from '../../../utils/pointsEngine'

/**
 * Transforms standard cloud or public PDF links into embeddable viewer URIs.
 * @param {string | null | undefined} rawUrl
 */
function getEmbeddablePdfUri(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return ''
  const trimmed = rawUrl.trim()

  // Handle Google Drive links
  if (trimmed.includes('drive.google.com')) {
    return trimmed.replace(/\/view(\?.*)?$/, '/preview')
  }

  // Android Google Docs PDF Viewer for direct remote PDFs
  if (Platform.OS === 'android' && !trimmed.startsWith('data:') && !trimmed.includes('google.com/gview')) {
    return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(trimmed)}`
  }

  return trimmed
}

export default function ReadingMaterial({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const selectedTitle = route?.params?.title || 'Reading Material'
  const materialId = route?.params?.materialId
  const incomingSpeed = route?.params?.reviewSpeed
  const incomingPdfUrl = route?.params?.pdfUrl

  const [reviewSpeed, setReviewSpeed] = React.useState(incomingSpeed || null)
  const [pdfUrl, setPdfUrl] = React.useState(incomingPdfUrl || null)
  const [materialMeta, setMaterialMeta] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [hasRead, setHasRead] = React.useState(false)

  React.useEffect(() => {
    navigation.setParams({ hideNav: true })

    async function loadMaterialData() {
      if (!materialId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        const uid = session?.user?.id

        // Fetch material record strictly from Supabase
        const { data: matData, error: matErr } = await supabase
          .from('reading_materials')
          .select('*')
          .eq('id', materialId)
          .maybeSingle()

        if (!matErr && matData) {
          setMaterialMeta(matData)
          if (matData.review_speed) setReviewSpeed(matData.review_speed)
          const targetPdf = matData.pdf_url || matData.file_url || matData.url || incomingPdfUrl
          if (targetPdf) setPdfUrl(targetPdf)
        }

        // Fetch read progress
        if (uid) {
          const { data: progData } = await supabase
            .from('user_reading_progress')
            .select('*')
            .eq('user_id', uid)
            .eq('reading_material_id', materialId)
            .maybeSingle()

          if (progData) {
            setHasRead(Boolean(progData.is_completed))
          }

          // Register initial progress
          await supabase.from('user_reading_progress').upsert({
            user_id: uid,
            reading_material_id: materialId,
            current_chapter_number: 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,reading_material_id' })
        }
      } catch (err) {
        console.warn('Error loading reading material:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMaterialData()
  }, [materialId])

  const toggleComplete = async () => {
    if (!materialId) return
    const nextCompleted = !hasRead
    setHasRead(nextCompleted)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        const { error } = await supabase.from('user_reading_progress').upsert({
          user_id: uid,
          reading_material_id: materialId,
          current_chapter_number: 1,
          is_completed: nextCompleted,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,reading_material_id' })

        if (error) {
          console.error('Error saving read status:', error.message)
        }

        if (nextCompleted) {
          const ptsObj = calculateReadingPoints({
            isStart: false,
            isFirstTime: !hasRead,
            sessionData: { dwellTimeSeconds: 30, scrolledToBottom: true },
            materialId: materialId,
          })
          await recordPointsEntry(ptsObj)
        }
      }
    } catch (err) {
      console.warn('Error toggling reading progress:', err)
    }
  }

  // Loading skeleton state
  if (loading) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, (StatusBar.currentHeight || 0), 28) + 8 }]}>
          <SkeletonItem width={28} height={28} borderRadius={14} />
          <SkeletonItem width={160} height={24} style={{ marginLeft: 16 }} />
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.loadingBody}>
          <ActivityIndicator size="large" color="#13294b" />
          <Text style={styles.loadingText}>Opening Document…</Text>
        </View>
      </View>
    )
  }

  const embedUrl = getEmbeddablePdfUri(pdfUrl)
  const displayTitle = materialMeta?.title || selectedTitle

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
          <Text style={styles.title} numberOfLines={1}>{displayTitle}</Text>
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="external-link" size={18} color="#13294b" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[styles.completeTopBtn, hasRead && styles.completeTopBtnDone]}
            activeOpacity={0.8}
            onPress={toggleComplete}
          >
            <Ionicons
              name={hasRead ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={hasRead ? '#16a34a' : '#13294b'}
            />
            <Text style={[styles.completeTopBtnText, hasRead && styles.completeTopBtnTextDone]}>
              {hasRead ? 'Done' : 'Mark Read'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Direct PDF Document File View (Single Focus Option) ── */}
      {pdfUrl ? (
        <View style={styles.pdfViewerContainer}>
          <WebView
            source={{ uri: embedUrl }}
            style={styles.webView}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.pdfLoadingContainer}>
                <ActivityIndicator size="large" color="#13294b" />
                <Text style={styles.pdfLoadingText}>Loading PDF Document…</Text>
              </View>
            )}
            renderError={() => (
              <View style={styles.errorContainer}>
                <Feather name="alert-circle" size={44} color="#dc2626" style={{ marginBottom: 12 }} />
                <Text style={styles.errorTitle}>Unable to display preview</Text>
                <Text style={styles.errorSubtitle}>Tap below to open or download the PDF file directly.</Text>
                <TouchableOpacity
                  style={styles.openExternalBtn}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(pdfUrl)}
                >
                  <Feather name="external-link" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.openExternalBtnText}>Open in Browser / Viewer</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Feather name="file-text" size={54} color="#94a3b8" style={{ marginBottom: 16 }} />
          <Text style={styles.emptyTitle}>No PDF Document Attached</Text>
          <Text style={styles.emptySubtitle}>
            This reading material does not have a PDF or document file URL configured in the database yet.
          </Text>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backBtnText}>Back to Library</Text>
          </TouchableOpacity>
        </View>
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#13294b',
    textAlign: 'center',
  },
  pdfTopPill: {
    backgroundColor: '#e0edfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 2,
  },
  pdfTopPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
  },
  completeTopBtnDone: {
    backgroundColor: '#dcfce7',
  },
  completeTopBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#13294b',
  },
  completeTopBtnTextDone: {
    color: '#16a34a',
  },
  rightSpacer: {
    width: 36,
  },
  loadingBody: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },

  // PDF Viewer
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  pdfLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  pdfLoadingText: {
    marginTop: 14,
    fontSize: 13,
    fontWeight: '700',
    color: '#13294b',
  },

  // Error & Empty States
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 10,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13294b',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  openExternalBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: '#13294b',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
})
