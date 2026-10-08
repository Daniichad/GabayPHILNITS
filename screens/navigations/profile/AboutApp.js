import React from 'react'
import {
  Image, Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function AboutApp({ navigation }) {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About GABAY PHILCSE</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── About Scroll Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Branding Logo */}
        <View style={styles.brandingHeader}>
          <Image
            source={require('../../../assets/img_onboarding.png')}
            style={styles.logoImageFull}
            resizeMode="contain"
          />
        </View>

        {/* Content Paragraphs */}
        <Text style={styles.bodyText}>
          <Text style={styles.boldWord}>GABAY PhilCSE</Text> is a mobile-based intelligent reviewer designed to help individuals prepare effectively for the Civil Service Examination. The application provides a structured and interactive learning experience through categorized review materials, practice quizzes, mock examinations, and personalized study tools.
        </Text>

        <Text style={styles.bodyText}>
          <Text style={styles.boldWord}>GABAY PhilCSE</Text> utilizes adaptive learning and performance analytics to assess the user’s knowledge level and recommend targeted study strategies. By identifying strengths and weaknesses, the system helps users focus on areas that need improvement, making review sessions more efficient and goal-oriented.
        </Text>

        <Text style={styles.bodyText}>
          The application also offers features such as diagnostic assessments, real-time feedback, progress tracking, and study reminders to support consistent learning. In addition, it provides essential information about the Civil Service Examination, including coverage, requirements, and eligibility guidelines.
        </Text>

        <Text style={styles.bodyText}>
          <Text style={styles.boldWord}>GABAY CSE</Text> aims to promote accessible, flexible, and data-driven learning, empowering aspiring government employees to enhance their readiness and improve their chances of passing the Civil Service Examination.
        </Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 54,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
  },

  // ── Scroll Content ──
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 110,
  },

  // ── Branding Header ──
  brandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 12,
  },
  logoImageFull: {
    width: 260,
    height: 75,
  },

  // ── Body Text ──
  bodyText: {
    fontSize: 14.5,
    color: '#334155',
    lineHeight: 22,
    textAlign: 'justify',
    marginBottom: 20,
  },
  boldWord: {
    fontWeight: '700',
    color: NAVY,
  },
})
