import React, { useState } from 'react'
import {
  Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator
} from 'react-native'
import { supabase } from '../../../utils/supabase'
import { Feather, Ionicons } from '@expo/vector-icons'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const REVIEW_SPEEDS = ['Slow', 'Normal', 'Fast']

export default function StudyPlan({ navigation }) {
  const [reviewSpeed, setReviewSpeed] = useState('Normal')
  const [saving, setSaving] = useState(false)
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')

  const showCustomAlert = (title, message, type = 'error') => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setAlertVisible(true)
  }

  const handleSaveAndStart = async () => {
    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        showCustomAlert('Session Error', 'Could not load user session. Please log in again.')
        return
      }

      const userEmail = userData.user?.email
      if (!userEmail) {
        showCustomAlert('Session Error', 'No active user session found.')
        return
      }

      const { error } = await supabase
        .from('users')
        .update({ review_speed: reviewSpeed })
        .eq('email', userEmail)

      if (error) {
        showCustomAlert('Save Error', 'Could not save review speed. Please try again.')
        return
      }

      navigation?.navigate('Library')
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Plan</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Weekly Focus Cards */}
        <Text style={styles.sectionTitle}>This Week Focus</Text>
        
        <View style={styles.cardsContainer}>
          <FocusCard 
            title="Numerical Ability" 
            subtitle="30 mins/day" 
            detail="Word Problems & Math shortcuts"
            icon="bar-chart-2"
            color="#3b82f6"
          />
          <FocusCard 
            title="General Information" 
            subtitle="20 mins/day" 
            detail="PH Governance & Civil Service laws"
            icon="globe"
            color="#10b981"
          />
          <FocusCard 
            title="Verbal Ability" 
            subtitle="15 mins/day" 
            detail="Grammar & Reading Comprehension"
            icon="edit-3"
            color="#f59e0b"
          />
        </View>

        {/* Review Speed Selector */}
        <Text style={styles.sectionTitle}>Review Speed</Text>
        <Text style={styles.sectionSubtitle}>
          Adjust how quickly resources and practice quizzes are presented
        </Text>

        <View style={styles.speedTabsContainer}>
          {REVIEW_SPEEDS.map((speed) => {
            const isSelected = reviewSpeed === speed
            return (
              <TouchableOpacity
                key={speed}
                activeOpacity={0.8}
                onPress={() => setReviewSpeed(speed)}
                style={[
                  styles.speedTab,
                  isSelected && styles.speedTabActive
                ]}
              >
                <Text style={[
                  styles.speedTabText,
                  isSelected && styles.speedTabTextActive
                ]}>
                  {speed}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Start Button */}
        <TouchableOpacity 
          style={[styles.startButton, saving && { opacity: 0.7 }]} 
          activeOpacity={0.85} 
          onPress={handleSaveAndStart} 
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.startButtonText}>LET'S START STUDYING!</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={{ 
              backgroundColor: alertType === 'success' ? '#ECFDF5' : '#FEE2E2', 
              padding: 12, 
              borderRadius: 32, 
              marginBottom: 16 
            }}>
              <Feather 
                name={alertType === 'success' ? 'check-circle' : 'alert-circle'} 
                size={32} 
                color={alertType === 'success' ? '#10B981' : '#EF4444'} 
              />
            </View>
            <Text style={styles.alertCardTitle}>{alertTitle}</Text>
            <Text style={styles.alertCardMessage}>{alertMessage}</Text>
            <TouchableOpacity
              style={[styles.alertOkBtn, { backgroundColor: alertType === 'success' ? '#10B981' : '#EF4444' }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function FocusCard({ title, subtitle, detail, icon, color }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          <View style={[styles.badge, { backgroundColor: `${color}12` }]}>
            <Text style={[styles.badgeText, { color: color }]}>{subtitle}</Text>
          </View>
        </View>
        <Text style={styles.cardDetail}>{detail}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
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

  // ── Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },

  // ── Cards ──
  cardsContainer: {
    marginBottom: 28,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDetail: {
    fontSize: 12,
    color: '#64748b',
  },

  // ── Speed Tab Bar ──
  speedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 36,
  },
  speedTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  speedTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  speedTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  speedTabTextActive: {
    color: NAVY,
    fontWeight: '700',
  },

  // ── Buttons ──
  startButton: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: NAVY,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Custom Alert Modal ──
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 53, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '90%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  alertCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertCardMessage: {
    color: '#4B5563',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  alertOkBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    width: '100%',
  },
})
