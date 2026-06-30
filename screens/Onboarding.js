/*
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.card}>
        <Image source={require('../assets/loading.png')} style={styles.illustration} resizeMode="contain" />

        <Text style={styles.title}>Welcome to Gabay PhilCSE</Text>
        <Text style={styles.subtitle}>
          Review lessons, practice smarter, and prepare for your Civil Service Exam with guided learning tools.
        </Text>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Start your Civil Service Exam preparation journey today</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1e35',
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
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#D9989E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82B8',
  },
  secondaryButtonText: {
    color: '#3B82B8',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 18,
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.9,
  },
})
*/
// ============================================
// COMPLETE INTEGRATION EXAMPLE
// ============================================

// ============================================
// 1. Navigation Structure Setup
// ============================================



// ============================================
// 2. Enhanced Onboarding Component
// ============================================

// screens/Onboarding.js
import React, { useState, useRef } from 'react'
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
  AsyncStorage,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'

const { width } = Dimensions.get('window')

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
      subtitleColor: '#4B5563',
      features: ['Organized by topics', 'Study guides for all exam categories'],
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

  const handleNext = async () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      })
    } else {
      // Mark onboarding as complete
      await completeOnboarding()
    }
  }

  const handleSkip = async () => {
    await completeOnboarding()
  }

  const completeOnboarding = async () => {
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

      <View style={styles.header}>
        <Text style={styles.progressText}>
          {currentIndex} {item.id === 1 ? 'Onboarding' : 'What you\'ll...'}
        </Text>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: item.backgroundColor }]}>
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

        <View style={styles.dotsContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? item.buttonColor : '#e0e0e0',
                },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: item.buttonColor }]}
          activeOpacity={0.85}
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )

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
  header: {
    position: 'absolute',
    top: 50,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  skipText: {
    fontSize: 14,
    color: '#3B82B8',
    fontWeight: '600',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    fontSize: 32,
    fontWeight: '800',
    color: '#D9989E',
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
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
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
})

// ============================================
// 3. Usage Instructions
// ============================================

/*
INSTALLATION STEPS:
===================

1. Copy Onboarding.jsx to: src/screens/Onboarding.js

2. Install dependencies:
   npm install @react-navigation/native @react-navigation/native-stack
   npm install react-native-screens react-native-safe-area-context
   npm install expo-vector-icons
   npm install @react-native-async-storage/async-storage

3. Set up your navigation stack as shown above

4. Run your app:
   npx expo start

CUSTOMIZATION:
==============

- Edit onboardingData array to add/remove/modify screens
- Change colors in each screen object
- Add new icons from MaterialCommunityIcons
- Adjust layout in styles object

NAVIGATION FLOW:
================

Splash Screen
    ↓
Check AsyncStorage for 'onboardingComplete'
    ↓
    ├─ true + userToken → Home
    ├─ true → Login
    └─ false → Onboarding
         ↓
      Complete Onboarding
         ↓
    Save to AsyncStorage
         ↓
      Navigate to Register/Login
         ↓
      Home Screen
*/