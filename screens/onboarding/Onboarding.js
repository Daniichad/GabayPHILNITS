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
import { Asset } from 'expo-asset'

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
                size={30}
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
        <View style={styles.slideCard}>
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
                size={42}
                color={item.iconColor || item.buttonColor}
              />
            </View>
          )}

          <Text style={[styles.title, { color: item.textColor }]}>
            {item.title}
          </Text>
          {!!item.subtitle && (
            <Text style={[styles.subtitle, { color: item.subtitleColor || '#4B5563' }]}>
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
      )}
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
    let isMounted = true
    async function loadAsset() {
      try {
        const [asset] = await Asset.loadAsync(videoSource)
        if (isMounted && asset?.localUri && player) {
          player.replace({ uri: asset.localUri })
          player.play()
        }
      } catch (err) {
        console.log('Onboarding video asset cache notice:', err)
      }
    }
    loadAsset()
    return () => { isMounted = false }
  }, [player])

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
        surfaceType="textureView"
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
          <TouchableOpacity onPress={handleSkip} activeOpacity={0.8}>
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
                        : 'rgba(9, 32, 60, 0.25)',
                  },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: currentItem?.buttonColor || '#09203c' },
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
    backgroundColor: '#f8fafc',
  },
  bgVideo: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240, 244, 250, 0.35)',
  },
  container: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
    backgroundColor: 'transparent',
    paddingBottom: 90,
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#09203c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  recapContainer: {
    justifyContent: 'center',
    paddingTop: 45,
    paddingBottom: 90,
  },
  recapWrap: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    shadowColor: '#09203c',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  recapLogo: {
    width: 190,
    height: 55,
    marginBottom: 8,
  },
  recapSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: '#4B5563',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  recapHeading: {
    fontSize: 17,
    fontWeight: '800',
    color: '#09203c',
    marginBottom: 12,
    alignSelf: 'flex-start',
    marginLeft: 4,
  },
  recapCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  recapCardIcon: {
    marginRight: 10,
  },
  recapCardText: {
    flex: 1,
  },
  recapCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#09203c',
    marginBottom: 2,
  },
  recapCardDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: '#4B5563',
  },
  topLogoImage: {
    width: 96,
    height: 96,
    borderRadius: 22,
    marginBottom: 16,
  },
  slideIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: 'rgba(241, 245, 249, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoImage: {
    width: 200,
    height: 100,
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  bulletsContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: 12,
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
    marginTop: 7,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skipText: {
    fontSize: 13,
    color: '#09203c',
    fontWeight: '700',
  },
  stickyButton: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 10,
  },
  stickyDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 6,
    gap: 8,
    zIndex: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})