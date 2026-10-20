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
        <Text style={styles.headerTitle}>About GABAY PHILNITS</Text>
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
          <Text style={styles.boldWord}>GABAY PhilNITS</Text> is a mobile-based intelligent reviewer designed to help examinees prepare effectively for the Philippine National Information Technology Standards (PhilNITS) Information Technology Passport (IP) and Fundamental IT Engineer (FE) Certification Examinations.
        </Text>

        <Text style={styles.bodyText}>
          <Text style={styles.boldWord}>GABAY PhilNITS</Text> utilizes adaptive learning and domain performance analytics across Technology, Management, Strategy, Computer Architecture, Algorithms, and Cybersecurity. By identifying knowledge gaps, the system helps learners focus on high-yield domains to maximize their exam readiness.
        </Text>

        <Text style={styles.bodyText}>
          The application features ITPEC-aligned diagnostic assessments, realistic timed mock examinations, interactive flashcard drills, progress analytics, and dynamic semi-annual exam cycle countdowns.
        </Text>

        <Text style={styles.bodyText}>
          <Text style={styles.boldWord}>GABAY PhilNITS</Text> aims to promote accessible, flexible, and standards-compliant preparation, empowering aspiring IT professionals and engineers to achieve international certification recognized across Asian ITPEC partner nations.
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
