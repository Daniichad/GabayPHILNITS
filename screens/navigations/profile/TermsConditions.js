import React from 'react'
import {
  Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'

const NAVY = '#0f2747'

export default function TermsConditions({ navigation }) {
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Terms Scroll Content ── */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.appTitle}>
          GABAY PhilCSE (Guided Adaptive-Based Application for Your CSE)
        </Text>

        <Text style={styles.sectionHeader}>1. Acceptance of Terms</Text>
        <Text style={styles.bodyText}>
          By accessing and using GABAY CSE, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must not use the application.
        </Text>

        <Text style={styles.sectionHeader}>2. Purpose of the Application</Text>
        <Text style={styles.bodyText}>
          GABAY PhilCSE is a mobile-based reviewer designed to assist users in preparing for the Civil Service Examination. The application provides learning materials, quizzes, analytics, and study recommendations for educational purposes only.
        </Text>

        <Text style={styles.sectionHeader}>3. User Responsibilities</Text>
        <Text style={styles.bodyText}>Users agree to:</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• Provide accurate and complete information upon registration</Text>
          <Text style={styles.bulletItem}>• Maintain the confidentiality of their account credentials</Text>
          <Text style={styles.bulletItem}>• Use the application for lawful and educational purposes only</Text>
          <Text style={styles.bulletItem}>• Avoid sharing, copying, or distributing content without permission</Text>
        </View>

        <Text style={styles.sectionHeader}>4. Account Management</Text>
        <Text style={styles.bodyText}>
          The system allows users to create and manage accounts. The developers reserve the right to suspend or terminate accounts that violate these terms or engage in unauthorized activities.
        </Text>

        <Text style={styles.sectionHeader}>5. Content and Intellectual Property</Text>
        <Text style={styles.bodyText}>
          All content within the application, including questions, materials, and features, is the intellectual property of the developers unless otherwise stated. Unauthorized reproduction or distribution is strictly prohibited.
        </Text>

        <Text style={styles.sectionHeader}>6. Data Privacy</Text>
        <Text style={styles.bodyText}>
          User data such as personal information and performance data will be collected and used solely for system functionality, analytics, and improving user experience. The system ensures reasonable protection of user data but does not guarantee absolute security.
        </Text>

        <Text style={styles.sectionHeader}>7. System Limitations</Text>
        <View style={styles.bulletList}>
          <Text style={styles.bulletItem}>• The application does not guarantee passing the Civil Service Examination.</Text>
          <Text style={styles.bulletItem}>• Results from analytics and predictions are estimates based on user performance.</Text>
          <Text style={styles.bulletItem}>• The system is not affiliated with or officially connected to the Civil Service Commission (CSC).</Text>
        </View>

        <Text style={styles.sectionHeader}>8. Availability of Service</Text>
        <Text style={styles.bodyText}>
          The developers aim to provide continuous access to the application; however, interruptions may occur due to maintenance, updates, or technical issues.
        </Text>

        <Text style={styles.sectionHeader}>9. Updates and Modifications</Text>
        <Text style={styles.bodyText}>
          The developers reserve the right to modify, update, or discontinue features of the application at any time without prior notice.
        </Text>

        <Text style={styles.sectionHeader}>10. Limitation of Liability</Text>
        <Text style={styles.bodyText}>
          The developers shall not be held liable for any damages, losses, or consequences resulting from the use or inability to use the application.
        </Text>

        <Text style={styles.sectionHeader}>11. Termination of Use</Text>
        <Text style={styles.bodyText}>
          Users may stop using the application at any time. The developers may terminate access if the user violates any terms stated above.
        </Text>

        <Text style={styles.sectionHeader}>12. Governing Law</Text>
        <Text style={styles.bodyText}>
          These Terms and Conditions shall be governed by the laws of the Republic of the Philippines.
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 16,
    lineHeight: 22,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginTop: 18,
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    textAlign: 'justify',
  },
  bulletList: {
    marginTop: 4,
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    marginBottom: 6,
    textAlign: 'justify',
  },
})
