import React, { useState, useRef, useEffect } from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useVideoPlayer, VideoView } from 'expo-video'

const { width, height } = Dimensions.get('window')
const screen = Dimensions.get('screen')

export default function Onboarding({ navigation }) {
  const insets = useSafeAreaInsets()
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef(null)

  const onboardingData = [
    {
      id: 1,
      title: 'Welcome to GABAY PhilNITS',
      subtitle: 'A Mobile Learning System for PhilNITS IP and FE Certification Examination Preparation',
      backgroundColor: '#ffffff',
      buttonColor: '#09203c',
      textColor: '#09203c',
      subtitleColor: '#4B5563',
      topImage: require('../../assets/app_logo.png'),
    },
    {
      id: 2,
      title: 'Comprehensive Study Materials',
      subtitle: '',
      backgroundColor: '#ffffff',
      buttonColor: '#3b67b0',
      textColor: '#3b67b0',
      subtitleColor: '#4B5563',
      icon: 'book',
      bullets: [
        'Access Reviewers & Guides',
        'Video lectures for IT domains',
        'Study guides for IP & FE tracks',
      ],
    },
    {
      id: 3,
      title: 'Adaptive Learning',
      subtitle: '',
      backgroundColor: '#ffffff',
      buttonColor: '#c68a5e',
      textColor: '#c68a5e',
      subtitleColor: '#4B5563',
      icon: 'chart-bar',
      iconColor: '#c68a5e',
      bullets: [
        'Personalized quizzes',
        'Study plans based on your performance',
      ],
    },
    {
      id: 4,
      title: 'Mock Examination',
      subtitle: '',
      backgroundColor: '#ffffff',
      buttonColor: '#c14954',
      textColor: '#c14954',
      subtitleColor: '#4B5563',
      icon: 'clipboard-check',
      iconColor: '#c14954',
      bullets: [
        'Practice with full mock exams that simulate real testing conditions',
      ],
    },
    {
      id: 6,
      title: 'What You\'ll Get',
      subtitle: 'Everything you need to ace your\nPhilNITS IP & FE Exams',
      backgroundColor: '#ffffff',
      buttonColor: '#09203c',
      textColor: '#09203c',
      subtitleColor: '#4B5563',
      showGabayLogo: true,
      isRecap: true,
    },
  ]

  const RECAP_CARDS = [
    {
      icon: 'book',
      iconColor: '#3b67b0',
      bg: 'rgba(188, 215, 236, 0.5)',
      title: 'Comprehensive Study Materials',
      desc: 'Access Reviewers, video lectures, and study guides for all exam categories',
    },
    {
      icon: 'chart-bar',
      iconColor: '#c68a5e',
      bg: 'rgba(198, 138, 94, 0.35)',
      title: 'Adaptive Learning',
      desc: 'Personalized quizzes and study plans based on your performance',
    },
    {
      icon: 'clipboard-check',
      iconColor: '#c14954',
      bg: 'rgba(241, 153, 157, 0.35)',
      title: 'Mock Examinations',
      desc: 'Practice with full mock exams that simulate real testing conditions',
    },
  ]

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x
    const index = Math.round(scrollPosition / width)
    setCurrentIndex(index)
  }

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true')
      navigation.navigate('Register')
    } catch (error) {
      console.error('Error saving onboarding status:', error)
      navigation.navigate('Register')
    }
  }

  const renderScreen = ({ item }) => (
    <View style={[styles.container, item.isRecap && styles.recapContainer]}>

      <View style={[styles.content, item.isRecap && styles.recapContent]}>
        {item.isRecap ? (
          <View style={styles.recapWrap}>
            <Image
              source={require('../../assets/logo_text_dark.png')}
              style={styles.recapLogo}
              resizeMode="contain"
            />
            <Text style={styles.recapSubtitle}>
              A Data Analytics-Driven Mobile Learning System for PhilNITS IP & FE Examination Preparation
            </Text>
            <Text style={styles.recapHeading}>What You'll Get:</Text>
            {RECAP_CARDS.map((card, index) => (
              <View key={index} style={[styles.recapCard, { backgroundColor: card.bg }]}>
                <MaterialCommunityIcons
                  name={card.icon}
                  size={34}
                  color={card.iconColor}
                  style={styles.recapCardIcon}
                />
                <View style={styles.recapCardText}>
                  <Text style={styles.recapCardTitle}>{card.title}</Text>
                  <Text style={styles.recapCardDesc}>{card.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <>
            {item.topImage && (
              <Image
                source={item.topImage}
                style={styles.topLogoImage}
                resizeMode="contain"
              />
            )}
            {item.showGabayLogo && (
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/img_onboarding.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            )}

            {item.icon && (
              <View style={styles.slideIconCircle}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={48}
                  color={item.iconColor || item.buttonColor}
                />
              </View>
            )}

            <Text style={[styles.title, { color: item.textColor }]}>
              {item.title}
            </Text>
            {!!item.subtitle && (
              <Text style={[styles.subtitle, { color: item.textColor }]}>
                {item.subtitle}
              </Text>
            )}

            {item.bullets && (
              <View style={styles.bulletsContainer}>
                {item.bullets.map((line, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <View style={[styles.bulletDot, { backgroundColor: item.textColor }]} />
                    <Text style={[styles.bulletText, { color: item.textColor }]}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {item.features && (
          <View style={styles.featuresContainer}>
            {item.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={item.buttonColor}
                  style={styles.featureIcon}
                />
                <Text style={[styles.featureText, { color: item.subtitleColor }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  )

  const currentItem = onboardingData[currentIndex]

  const videoSource = require('../../assets/onboarding_vid.mp4')
  const player = useVideoPlayer(videoSource, p => {
    p.loop = true
    p.muted = true
    p.play()
  })

  useEffect(() => {
    if (player) {
      player.loop = true
      player.muted = true
      try {
        player.play()
      } catch (err) {
        console.log('Onboarding video play error:', err)
      }
    }
  }, [player])

  return (
    <View style={styles.flex}>
      <VideoView
        style={styles.bgVideo}
        player={player}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
        startsPictureInPictureAutomatically={false}
      />
      {/* Dim so text/buttons stay readable over the video */}
      <View style={styles.dim} pointerEvents="none" />

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderScreen}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        scrollIndicatorInsets={{ right: 1 }}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
      />

      {/* Skip, top-right (hidden on last slide) */}
      {currentIndex < onboardingData.length - 1 && (
        <View style={[styles.stickyHeader, { top: Math.max(insets.top + 10, 50) }]}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer: dots directly above Next */}
      <View style={[styles.stickyButton, { bottom: 20 + insets.bottom }]}>
        <View style={styles.stickyDotsContainer}>
          {onboardingData.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => {
                setCurrentIndex(index)
                flatListRef.current?.scrollToIndex({
                  index: index,
                  animated: true,
                })
              }}
            >
              <View
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentIndex
                        ? currentItem?.buttonColor || '#3b67b0'
                        : 'rgba(188, 215, 236, 0.45)',
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: currentItem?.buttonColor || '#c14954' },
          ]}
          activeOpacity={0.85}
          onPress={
            currentIndex === onboardingData.length - 1
              ? handleSkip
              : () => {
                flatListRef.current?.scrollToIndex({
                  index: currentIndex + 1,
                  animated: true,
                })
              }
          }
        >
          <Text style={styles.actionButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 32, 60, 0.45)',
  },
  container: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'transparent',
  },
  recapContainer: {
    justifyContent: 'flex-start',
    paddingTop: 40,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  recapContent: {
    paddingBottom: 0,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 240,
    height: 120,
    marginBottom: 8,
  },
  recapWrap: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  recapLogo: {
    width: 300,
    height: 300,
    marginBottom: -80,
  },
  recapSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: '#09203c',
    paddingHorizontal: 8,
    marginBottom: 28,
  },
  recapHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#09203c',
    marginBottom: 12,
  },
  recapCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  recapCardIcon: {
    marginRight: 12,
  },
  recapCardText: {
    flex: 1,
  },
  recapCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#09203c',
    marginBottom: 2,
  },
  recapCardDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#4B5563',
  },
  topLogoImage: {
    width: 110,
    height: 110,
    borderRadius: 26,
    marginBottom: 20,
  },
  slideIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  bulletsContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 28,
    marginTop: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 12,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  featureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  // Sticky Elements
  stickyHeader: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 14,
    color: '#09203c',
    fontWeight: '600',
  },
  stickyDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stickyButton: {
    position: 'absolute',
    bottom: 20,
    left: 24,
    right: 24,
    zIndex: 10,
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})