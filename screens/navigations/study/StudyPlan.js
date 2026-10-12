import React, { useState, useEffect } from 'react'
import {
  Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View, ActivityIndicator
} from 'react-native'
import { supabase } from '../../../utils/supabase'
import { getCache } from '../../../utils/cache'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { SkeletonItem } from '../../../components/Skeleton'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const REVIEW_SPEEDS = ['Slow', 'Normal', 'Fast']

const SUBJECT_METADATA = {
  'Numerical Ability': {
    icon: 'bar-chart-2',
    color: '#3b82f6',
    detail: 'Word Problems, Percentages & Math Shortcuts',
  },
  'Verbal Ability': {
    icon: 'edit-3',
    color: '#f59e0b',
    detail: 'Grammar, Vocabulary & Reading Comprehension',
  },
  'Analytical Ability': {
    icon: 'pie-chart',
    color: '#8b5cf6',
    detail: 'Data Interpretation, Logic & Pattern Recognition',
  },
  'General Information': {
    icon: 'globe',
    color: '#10b981',
    detail: '1987 Constitution, RA 6713 & Civil Service Laws',
  },
  'Clerical Operations': {
    icon: 'folder',
    color: '#06b6d4',
    detail: 'Alphabetizing, Office Procedures & Filing',
  },
  'Logical Reasoning': {
    icon: 'compass',
    color: '#ec4899',
    detail: 'Syllogisms, Assumptions & Deduction',
  },
}

const DEFAULT_CATEGORIES = ['Numerical Ability', 'Verbal Ability', 'General Information']

export default function StudyPlan({ navigation }) {
  const [reviewSpeed, setReviewSpeed] = useState('Normal')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [diagnosticAttempt, setDiagnosticAttempt] = useState(null)
  const [focusList, setFocusList] = useState([])
  const [primaryFocus, setPrimaryFocus] = useState(null)
  
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')

  useEffect(() => {
    loadStudyPlanData()
  }, [])

  const loadStudyPlanData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // 1. Fetch user review speed
      const { data: userData } = await supabase
        .from('users')
        .select('review_speed')
        .eq('email', user.email)
        .maybeSingle()
      
      if (userData?.review_speed) {
        const speed = userData.review_speed.charAt(0).toUpperCase() + userData.review_speed.slice(1).toLowerCase()
        setReviewSpeed(speed)
      }

      // 2. Fetch latest diagnostic assessment attempt from Supabase
      const { data: attempt } = await supabase
        .from('diagnostic_assessment_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // 3. Fetch practice quiz results (MCQ + TF) to combine performance data
      const { data: mcqRaw } = await supabase
        .from('multiple_choice_results')
        .select('is_correct, multiple_choice_questions(practice_categories(name))')
        .eq('user_id', user.id)

      const { data: tfRaw } = await supabase
        .from('true_false_results')
        .select('is_correct, true_false_questions(practice_categories(name))')
        .eq('user_id', user.id)

      // 4. Combine score metrics per subject
      const subjectMap = {}

      DEFAULT_CATEGORIES.forEach(cat => {
        subjectMap[cat] = { correct: 0, total: 0 }
      })

      if (attempt?.category_scores) {
        setDiagnosticAttempt(attempt)
        Object.entries(attempt.category_scores).forEach(([cat, scores]) => {
          if (!subjectMap[cat]) subjectMap[cat] = { correct: 0, total: 0 }
          subjectMap[cat].correct += (scores.correct || 0)
          subjectMap[cat].total += (scores.total || 0)
        })
      }

      (mcqRaw || []).forEach(r => {
        const catName = r.multiple_choice_questions?.practice_categories?.name
        if (catName) {
          if (!subjectMap[catName]) subjectMap[catName] = { correct: 0, total: 0 }
          subjectMap[catName].total += 1
          if (r.is_correct) subjectMap[catName].correct += 1
        }
      })

      (tfRaw || []).forEach(r => {
        const catName = r.true_false_questions?.practice_categories?.name
        if (catName) {
          if (!subjectMap[catName]) subjectMap[catName] = { correct: 0, total: 0 }
          subjectMap[catName].total += 1
          if (r.is_correct) subjectMap[catName].correct += 1
        }
      })

      // Rank categories by accuracy % (lowest score first -> primary focus)
      const rankedSubjects = Object.keys(subjectMap).map(catName => {
        const data = subjectMap[catName]
        const pct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0
        return {
          subject: catName,
          accuracy: pct,
          correct: data.correct,
          total: data.total,
        }
      }).sort((a, b) => a.accuracy - b.accuracy)

      // Format weekly study focus based on performance rank
      const formattedList = rankedSubjects.map((item, index) => {
        let role = 'Maintenance'
        let timePerDay = '15 mins/day'
        let badgeColor = '#10b981'
        let tagText = 'Skill Maintenance'

        if (index === 0) {
          role = 'Primary Focus'
          timePerDay = '35 mins/day'
          badgeColor = '#ef4444'
          tagText = '🔥 Priority Focus'
        } else if (index === 1) {
          role = 'Secondary Focus'
          timePerDay = '25 mins/day'
          badgeColor = '#f59e0b'
          tagText = '⚡ Target Practice'
        } else {
          role = 'Maintenance'
          timePerDay = '15 mins/day'
          badgeColor = '#3b82f6'
          tagText = '📘 Skill Maintenance'
        }

        const meta = SUBJECT_METADATA[item.subject] || {
          icon: 'book-open',
          color: '#3b82f6',
          detail: 'Review core concepts and practice questions',
        }

        return {
          ...item,
          role,
          timePerDay,
          badgeColor,
          tagText,
          meta,
        }
      })

      setFocusList(formattedList)
      setPrimaryFocus(formattedList[0] || null)

    } catch (err) {
      console.warn('Error loading study plan data:', err)
    } finally {
      setLoading(false)
    }
  }

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

      // Navigate to Practice or Library focusing on primary focus area
      navigation?.navigate('PracticeLibrary')
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
        <Text style={styles.headerTitle}>Adaptive Study Plan</Text>
        <TouchableOpacity style={styles.backBtn} onPress={loadStudyPlanData}>
          <Feather name="refresh-cw" size={18} color={NAVY} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Loading Skeleton */}
        {loading ? (
          <View style={{ gap: 16 }}>
            <SkeletonItem width="100%" height={120} borderRadius={16} />
            <SkeletonItem width={160} height={20} style={{ marginTop: 8 }} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
            <SkeletonItem width="100%" height={74} borderRadius={16} />
          </View>
        ) : (
          <>
            {/* Performance Diagnostic Insight Banner */}
            <View style={styles.insightBanner}>
              <View style={styles.insightHeaderRow}>
                <View style={styles.insightIconWrap}>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.insightSubtitle}>DIAGNOSTIC & PERFORMANCE INSIGHT</Text>
                  <Text style={styles.insightTitle}>
                    {primaryFocus ? `This Week's Focus: ${primaryFocus.subject}` : 'Personalized Study Focus'}
                  </Text>
                </View>
              </View>
              
              <Text style={styles.insightBody}>
                {diagnosticAttempt ? (
                  `Based on your Diagnostic Assessment (${diagnosticAttempt.score_percent}% total score), your lowest accuracy is in ${primaryFocus?.subject || 'this area'} (${primaryFocus?.accuracy}% accuracy). We have prioritized this in your study schedule.`
                ) : (
                  `Complete your Diagnostic Assessment to automatically tailor your weekly study plan to your weakest subjects.`
                )}
              </Text>

              <View style={styles.insightActionsRow}>
                <TouchableOpacity 
                  style={styles.retakeBtn} 
                  activeOpacity={0.8}
                  onPress={() => navigation?.navigate('DiagnosticAssessment', { from: 'StudyPlan' })}
                >
                  <Feather name="rotate-ccw" size={13} color="#1d4ed8" style={{ marginRight: 4 }} />
                  <Text style={styles.retakeBtnText}>
                    {diagnosticAttempt ? 'Retake Diagnostic' : 'Take Diagnostic Test'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Weekly Focus Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>This Week's Focus</Text>
              <Text style={styles.sectionBadge}>Performance-Based</Text>
            </View>

            <View style={styles.cardsContainer}>
              {focusList.map((item) => (
                <FocusCard 
                  key={item.subject}
                  title={item.subject}
                  subtitle={item.timePerDay}
                  detail={item.meta.detail}
                  icon={item.meta.icon}
                  color={item.meta.color}
                  tagText={item.tagText}
                  accuracy={item.accuracy}
                  isPrimary={item.role === 'Primary Focus'}
                />
              ))}
            </View>

            {/* Review Speed Selector */}
            <Text style={styles.sectionTitle}>Review Speed</Text>
            <Text style={styles.sectionSubtitle}>
              Adjust how quickly practice questions and study modules are recommended
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.startButtonText}>
                    START STUDYING FOCUS AREA
                  </Text>
                  <Feather name="arrow-right" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </>
        )}
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

function FocusCard({ title, subtitle, detail, icon, color, tagText, accuracy, isPrimary }) {
  return (
    <View style={[styles.card, isPrimary && styles.primaryCard]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardTitle}>{title}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isPrimary ? '#fee2e2' : `${color}14` }]}>
            <Text style={[styles.badgeText, { color: isPrimary ? '#dc2626' : color }]}>{subtitle}</Text>
          </View>
        </View>

        <Text style={styles.cardDetail}>{detail}</Text>

        <View style={styles.cardFooterRow}>
          <View style={[styles.tagBadge, { backgroundColor: isPrimary ? '#fef2f2' : '#f1f5f9' }]}>
            <Text style={[styles.tagBadgeText, { color: isPrimary ? '#b91c1c' : '#475569' }]}>
              {tagText}
            </Text>
          </View>
          <View style={styles.accuracyWrap}>
            <Text style={styles.accuracyLabel}>Accuracy: </Text>
            <Text style={[styles.accuracyValue, { color: accuracy < 50 ? '#dc2626' : accuracy < 75 ? '#d97706' : '#16a34a' }]}>
              {accuracy}%
            </Text>
          </View>
        </View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },

  // ── Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 48,
  },
  insightBanner: {
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#bfdbfe',
    marginBottom: 20,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  insightIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.8,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
  },
  insightBody: {
    fontSize: 13,
    color: '#1e3a8a',
    lineHeight: 19,
    marginBottom: 12,
  },
  insightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },

  // ── Cards ──
  cardsContainer: {
    marginBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  primaryCard: {
    borderColor: '#fca5a5',
    backgroundColor: '#fffdfd',
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
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
    fontWeight: '800',
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
    color: '#475569',
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  accuracyWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accuracyLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  accuracyValue: {
    fontSize: 12,
    fontWeight: '800',
  },

  // ── Speed Tab Bar ──
  speedTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    padding: 4,
    marginBottom: 28,
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
    fontSize: 14,
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
