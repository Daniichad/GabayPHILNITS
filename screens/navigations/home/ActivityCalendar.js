import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Calendar } from 'react-native-calendars'
import { supabase } from '../../../utils/supabase'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function ActivityCalendar({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { streakDays = 0, cseSchedule, profileName = 'Student' } = route.params || {}

  const [loading, setLoading] = useState(true)
  const [markedDates, setMarkedDates] = useState({})
  const [activityEvents, setActivityEvents] = useState({})
  const [totalStudyDuration, setTotalStudyDuration] = useState(0) // in minutes

  // Modal states
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    fetchActivity()
  }, [])

  const fetchActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) return

      // Fetch activity from different tables
      const { data: sessions } = await supabase
        .from('flashcard_sessions')
        .select('created_at, duration')
        .eq('user_id', uid)

      const { data: mcqRaw } = await supabase
        .from('multiple_choice_results')
        .select('answered_at, duration')
        .eq('user_id', uid)

      const { data: tfRaw } = await supabase
        .from('true_false_results')
        .select('answered_at, duration')
        .eq('user_id', uid)

      const ses = sessions ?? []
      const mcq = mcqRaw ?? []
      const tf = tfRaw ?? []

      const eventsMap = {}
      let totalMinutes = 0

      const processItems = (items, type, dateKey) => {
        items.forEach(item => {
          const dateStr = item[dateKey]
          if (!dateStr) return
          const day = dateStr.slice(0, 10)
          
          let dur = 5
          if (item.duration) dur = item.duration / 60
          totalMinutes += dur

          if (!eventsMap[day]) eventsMap[day] = []
          eventsMap[day].push({
            type,
            time: new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: Math.ceil(dur)
          })
        })
      }

      processItems(ses, 'Flashcards', 'created_at')
      processItems(mcq, 'Multiple Choice Quiz', 'answered_at')
      processItems(tf, 'True or False Quiz', 'answered_at')

      const marked = {}
      Object.keys(eventsMap).forEach(day => {
         marked[day] = { marked: true, dotColor: '#10b981' }
      })

      setActivityEvents(eventsMap)
      setMarkedDates(marked)
      setTotalStudyDuration(Math.floor(totalMinutes))
    } catch (error) {
      console.warn('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderCalendar = () => {
    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>Activity Calendar</Text>
        <Calendar
          markedDates={{
            ...markedDates,
            [selectedDate]: {
              ...markedDates[selectedDate],
              selected: true,
              selectedColor: NAVY
            }
          }}
          onDayPress={(day) => {
            setSelectedDate(day.dateString)
            setModalVisible(true)
          }}
          theme={{
            selectedDayBackgroundColor: NAVY,
            todayTextColor: ACCENT,
            arrowColor: NAVY,
            dotColor: '#10b981',
            textDayFontWeight: '500',
            textMonthFontWeight: 'bold',
            textDayHeaderFontWeight: '600',
          }}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Activity</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Streak & Duration */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#ffe9ea' }]}>
              <Feather name="zap" size={24} color={ACCENT} />
            </View>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.iconWrap, { backgroundColor: '#e9f0ff' }]}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#3b82f6" />
            </View>
            <Text style={styles.statValue}>
              {loading ? '-' : `${Math.floor(totalStudyDuration / 60)}h ${totalStudyDuration % 60}m`}
            </Text>
            <Text style={styles.statLabel}>Total Study Time</Text>
          </View>
        </View>

        {/* PhilNITS Exam Schedule */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Upcoming Examination</Text>
          {cseSchedule ? (
            <View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={20} color={NAVY} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Date of Examination</Text>
                  <Text style={styles.infoValue}>{cseSchedule.label}</Text>
                </View>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="file-document-edit-outline" size={20} color={NAVY} />
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Period of Application</Text>
                  <Text style={styles.infoValue}>{cseSchedule.appPeriod || 'To be announced'}</Text>
                </View>
              </View>
              
              {cseSchedule.daysLeft !== null && cseSchedule.daysLeft >= 0 && (
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownText}>{cseSchedule.daysLeft} days left to prepare!</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyText}>No upcoming exam schedule found.</Text>
          )}
        </View>

        {/* Real Calendar Component */}
        {loading ? (
          <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 40 }} />
        ) : (
          renderCalendar()
        )}

      </ScrollView>

      {/* Events Popup Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity on {selectedDate}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDate && activityEvents[selectedDate] ? (
                activityEvents[selectedDate].map((ev, i) => (
                  <View key={i} style={styles.eventItem}>
                    <View style={styles.eventDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.eventName}>{ev.type}</Text>
                      <Text style={styles.eventTime}>{ev.time} • {ev.duration} mins</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyEventContainer}>
                  <MaterialCommunityIcons name="calendar-blank" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyEventText}>No activity recorded on this date.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: NAVY,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 15,
    color: NAVY,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e8edf5',
    marginVertical: 12,
    marginLeft: 32,
  },
  countdownBadge: {
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  countdownText: {
    color: ACCENT,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
  },
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 71, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '100%',
    maxHeight: '60%',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: NAVY,
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 300,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    marginTop: 5,
    marginRight: 12,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
    marginBottom: 4,
  },
  eventTime: {
    fontSize: 12,
    color: '#64748b',
  },
  emptyEventContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 12,
  },
  emptyEventText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
  }
})
