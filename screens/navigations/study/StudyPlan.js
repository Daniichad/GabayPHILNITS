import React from 'react'
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../../utils/supabase'
import { Feather, Ionicons } from '@expo/vector-icons'


const REVIEW_SPEEDS = ['Slow', 'Normal', 'Fast']

export default function StudyPlan({ navigation }) {
  const [reviewSpeed, setReviewSpeed] = React.useState('Normal')
  const [saving, setSaving] = React.useState(false)

  const handleSaveAndStart = async () => {
    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        Alert.alert('Session error', userError.message || 'Could not load user session')
        return
      }

      const userEmail = userData.user?.email

      if (!userEmail) {
        Alert.alert('Session error', 'No logged-in user found')
        return
      }

      const { error } = await supabase.from('users').update({ review_speed: reviewSpeed }).eq('email', userEmail)

      if (error) {
        Alert.alert('Save error', error.message || 'Could not save review speed')
        return
      }

      navigation?.navigate('Library')
    } catch (error) {
      Alert.alert('Save error', error.message || String(error))
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#13294b" />
          </TouchableOpacity>
          <Text style={styles.title}>Study Plan</Text>
          <View style={styles.rightSpacer} />
        </View>

        <Text style={styles.sectionHeader}>This Week Focus</Text>

        <View style={styles.focusCard}>
          <FocusRow title="Numerical Ability" subtitle="30 mins/day- Word Problems" />
          <View style={styles.divider} />
          <FocusRow title="General Information" subtitle="20 mins/day- PH Governance" />
          <View style={styles.divider} />
          <FocusRow title="Verbal Ability" subtitle="15 mins/day- Maintenance" />
        </View>

        <Text style={styles.reviewHeader}>Review Speed</Text>

        <View style={styles.dropdown}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const nextIndex = (REVIEW_SPEEDS.indexOf(reviewSpeed) + 1) % REVIEW_SPEEDS.length
              setReviewSpeed(REVIEW_SPEEDS[nextIndex])
            }}
            style={styles.dropdownButton}
          >
            <Text style={styles.dropdownText}>{reviewSpeed}</Text>
            <Feather name="chevron-down" size={22} color="#13294b" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.startButton} activeOpacity={0.85} onPress={handleSaveAndStart} disabled={saving}>
          <Text style={styles.startButtonText}>{saving ? 'SAVING...' : "LET'S START STUDYING!"}</Text>
        </TouchableOpacity>
      </ScrollView>


    </View>
  )
}

function FocusRow({ title, subtitle }) {
  return (
    <View style={styles.focusRow}>
      <Text style={styles.focusTitle}>{title}</Text>
      <Text style={styles.focusSubtitle}>{subtitle}</Text>
    </View>
  )
}


const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 22,
    paddingBottom: 100,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#13294b',
  },
  rightSpacer: {
    width: 28,
  },
  sectionHeader: {
    fontSize: 22,
    textAlign: 'center',
    color: '#13294b',
    marginBottom: 22,
  },
  focusCard: {
    backgroundColor: '#d9dee5',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
  },
  focusRow: {
    paddingVertical: 10,
  },
  focusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#13294b',
    marginBottom: 4,
  },
  focusSubtitle: {
    fontSize: 15,
    color: '#13294b',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(19, 41, 75, 0.2)',
  },
  reviewHeader: {
    textAlign: 'center',
    fontSize: 20,
    color: '#13294b',
    marginBottom: 10,
  },
  dropdown: {
    marginBottom: 24,
  },
  dropdownButton: {
    backgroundColor: '#eef1f5',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 18,
    color: '#13294b',
    fontWeight: '600',
  },
  startButton: {
    alignSelf: 'center',
    backgroundColor: '#0f2747',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
})
