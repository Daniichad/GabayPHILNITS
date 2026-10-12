import React from 'react'
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  Linking, StatusBar, Platform, Dimensions
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, Feather } from '@expo/vector-icons'
import { WebView } from 'react-native-webview'

const NAVY = '#13294b'
const LIGHT_BG = '#f8fafc'
const CARD_BG = '#ffffff'
const BORDER_COLOR = '#e2e8f0'

// Helper function to extract YouTube Video ID
function extractYouTubeId(url) {
  if (!url) return 'sI9pP3s63c8'
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : url
}

export default function VideoLectureDetail({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const video = route?.params?.video || {}

  const title = video.title || 'Video Lecture'
  const url = video.url || 'https://www.youtube.com/watch?v=sI9pP3s63c8'
  const authorName = video.author || video.author_name || video.channel_title || 'Team Lyqa'
  const authorUrl = video.authorUrl || video.author_url || video.channel_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(authorName)}`
  const description = video.description || 'Access video lectures and study guides prepared for Civil Service Examination review.'
  const durationMins = video.duration_minutes || video.durationMinutes || 10
  const subject = video.subject || 'Civil Service Exam Review'

  const youtubeId = extractYouTubeId(url)

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #000000; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .iframe-container { position: relative; width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; }
        .iframe-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
      </style>
    </head>
    <body>
      <div class="iframe-container">
        <iframe 
          src="https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&playsinline=1&modestbranding=1&controls=1" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen>
        </iframe>
      </div>
    </body>
    </html>
  `

  const handleOpenAuthorLink = () => {
    if (authorUrl) {
      Linking.openURL(authorUrl).catch(err => console.error("Couldn't load page", err))
    }
  }

  const handleOpenOriginalVideo = () => {
    if (url) {
      Linking.openURL(url).catch(err => console.error("Couldn't open URL", err))
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top Navigation Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          activeOpacity={0.7} 
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Video Lecture</Text>
        <TouchableOpacity 
          style={styles.externalHeaderBtn} 
          activeOpacity={0.7}
          onPress={handleOpenOriginalVideo}
        >
          <Feather name="external-link" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Embedded YouTube Player Container */}
        <View style={styles.playerContainer}>
          <WebView
            style={styles.webview}
            originWhitelist={['*']}
            source={{ html: htmlContent }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            scrollEnabled={false}
          />
        </View>

        {/* Main Content Area */}
        <View style={styles.contentContainer}>
          {/* Tags / Meta row */}
          <View style={styles.metaRow}>
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectBadgeText}>{subject}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Feather name="clock" size={12} color="#64748b" style={{ marginRight: 4 }} />
              <Text style={styles.durationBadgeText}>{durationMins} mins</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.videoTitle}>{title}</Text>

          {/* Description */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeading}>Overview</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>

          {/* Author Reference Card (Copyright & Credit) */}
          <View style={styles.authorCard}>
            <View style={styles.authorHeaderRow}>
              <View style={styles.authorAvatarWrap}>
                <Feather name="video" size={20} color="#fff" />
              </View>
              <View style={styles.authorMeta}>
                <Text style={styles.authorSubtitle}>Content Creator / Author</Text>
                <Text style={styles.authorName}>{authorName}</Text>
              </View>
              <TouchableOpacity 
                style={styles.visitChannelBtn}
                activeOpacity={0.8}
                onPress={handleOpenAuthorLink}
              >
                <Text style={styles.visitChannelText}>Visit Channel</Text>
                <Feather name="arrow-up-right" size={14} color="#1d4ed8" />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Copyright & Fair Use Statement */}
            <View style={styles.disclaimerBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#0369a1" style={{ marginTop: 2, marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.disclaimerTitle}>Author Reference & Copyright Notice</Text>
                <Text style={styles.disclaimerText}>
                  This video lecture was authored and published by <Text style={{ fontWeight: '700' }}>{authorName}</Text>. 
                  Gabay PHILCSE embeds this content for educational reference under YouTube's Terms of Service and Fair Use. All intellectual property and rights belong entirely to the creator.
                </Text>
              </View>
            </View>
          </View>

          {/* Watch directly on YouTube Action Button */}
          <TouchableOpacity 
            style={styles.watchOnYoutubeBtn}
            activeOpacity={0.85}
            onPress={handleOpenOriginalVideo}
          >
            <Ionicons name="logo-youtube" size={20} color="#ff0000" style={{ marginRight: 8 }} />
            <Text style={styles.watchOnYoutubeText}>Watch Directly on YouTube</Text>
            <Feather name="external-link" size={14} color="#334155" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const screenWidth = Dimensions.get('window').width

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
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: NAVY,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
  },
  externalHeaderBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  playerContainer: {
    width: screenWidth,
    height: (screenWidth * 9) / 16,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  subjectBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectBadgeText: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: '700',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
    lineHeight: 26,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  authorCard: {
    backgroundColor: CARD_BG,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  authorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  authorMeta: {
    flex: 1,
  },
  authorSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  visitChannelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  visitChannelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 14,
  },
  disclaimerBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#0c4a6e',
    lineHeight: 18,
  },
  watchOnYoutubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  watchOnYoutubeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
})
