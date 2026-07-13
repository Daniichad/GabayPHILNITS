import React, { useState, useRef } from 'react'
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

const { width, height } = Dimensions.get('window')

export default function Onboarding({ navigation }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef(null)

  const onboardingData = [
    {
      id: 1,
      title: 'Welcome to GABAY PHILCSE',
      subtitle: 'Your comprehensive guide to Civil Service Exam success',
      icon: 'shield-check',
      backgroundColor: '#ffffff',
      buttonColor: '#D9989E',
      textColor: '#111827',
      subtitleColor: '#4B5563',
    },
    {
      id: 2,
      title: 'Comprehensive Study Materials',
      subtitle: 'Access thousands of curated study resources',
      icon: 'book-open',
      backgroundColor: '#E3F2FD',
      buttonColor: '#3B82B8',
      textColor: '#111827',
      subtitleColor: '#4B5563'
    },
    {
      id: 3,
      title: 'Adaptive Learning',
      subtitle: 'Personalized learning pace and performance tracking',
      icon: 'chart-line',
      backgroundColor: '#FFF3E0',
      buttonColor: '#F97316',
      textColor: '#111827',
      subtitleColor: '#4B5563',
    },
    {
      id: 4,
      title: 'Personalized Quizzes',
      subtitle: 'Practice with targeted quizzes customized to your needs',
      icon: 'clipboard-check',
      backgroundColor: '#FCE4EC',
      buttonColor: '#EC4899',
      textColor: '#111827',
      subtitleColor: '#4B5563',
    },
    {
      id: 5,
      title: 'Spaced Repetition',
      subtitle: 'Reinforce learning with scientifically-proven techniques',
      icon: 'repeat',
      backgroundColor: '#F3E5F5',
      buttonColor: '#A855F7',
      textColor: '#111827',
      subtitleColor: '#4B5563',
    },
    {
      id: 6,
      title: 'What You\'ll Get',
      subtitle: 'Everything you need to ace your Civil Service Exam',
      icon: 'star',
      backgroundColor: '#ECEFF1',
      buttonColor: '#3B82B8',
      textColor: '#111827',
      subtitleColor: '#4B5563',
      showGabayLogo: true,
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
    <View style={[styles.container, { backgroundColor: item.backgroundColor }]}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.content}>
        {item.showGabayLogo ? (
          <View style={styles.logoContainer}>
            <Text style={styles.gabayLogo}>GABAY</Text>
            <Text style={[styles.logoSubtitle, { color: item.buttonColor }]}>
              PhilCSE
            </Text>
          </View>
        ) : (
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name={item.icon}
              size={80}
              color={item.buttonColor}
            />
          </View>
        )}

        <Text style={[styles.title, { color: item.textColor }]}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, { color: item.subtitleColor }]}>
          {item.subtitle}
        </Text>

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

  return (
    <View style={styles.flex}>
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

      {/* Sticky Header with Skip Button */}
      <View style={styles.stickyHeader}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Sticky Dots Indicator */}
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
                      ? currentItem?.buttonColor || '#3B82B8'
                      : '#e0e0e0',
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Sticky Bottom Button */}
      <View style={styles.stickyButton}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: currentItem?.buttonColor || '#D9989E' },
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
  },
  container: {
    width: width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(217, 152, 158, 0.18)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 184, 0.18)',
  },
  content: {
    alignItems: 'center',
    paddingBottom: 100,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gabayLogo: {
    fontSize: 48,
    fontWeight: '900',
    color: '#D9989E',
    letterSpacing: 3,
  },
  logoSubtitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
    letterSpacing: 1,
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
    color: '#3B82B8',
    fontWeight: '600',
  },
  stickyDotsContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
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