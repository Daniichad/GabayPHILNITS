import React, { useState } from 'react'
import {
  Modal, Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

const OVERVIEWS = {
  Flashcards: {
    title: 'Flashcards Review',
    expect: 'You will see doublesided cards with a key term or question on the front side and the corresponding answer or concept definition on the back side.',
    how: 'Read the term on the front, tap the card to flip it over and verify your knowledge. Swipe left or right to proceed to the next card.',
    duration: 'Self-paced review'
  },
  Matching: {
    title: 'Matching Game',
    expect: 'A grid of scrambled terms and definitions. You must pair the correct matching cards together to clear the screen.',
    how: 'Tap a term card to select it, then tap its matching definition. Correct pairs turn green and disappear; incorrect pairs flash red.',
    duration: 'Time-attack challenge'
  },
  TrueFalse: {
    title: 'True or False',
    expect: 'A series of statements about PhilNITS IP & FE subject topics where you must evaluate correctness.',
    how: 'Read each statement carefully. Tap the green "True" button if the statement is correct, or the red "False" button if it contains errors.',
    duration: 'Rapid response quiz'
  },
  MultipleChoice: {
    title: 'Multiple Choice Quiz',
    expect: 'Standard test questions with 4 possible choices, simulating actual PhilNITS examination formats.',
    how: 'Read the question, analyze the options, and select the correct answer. Get instant feedback on your choices as you proceed.',
    duration: 'Practice test simulation'
  },
  MockExamHome: {
    title: 'Mock Examination',
    expect: 'A fully timed comprehensive test simulation covering official PhilNITS IP and FE syllabus criteria.',
    how: 'Find a quiet spot. Complete all sections under strict timing constraints. Your performance is tabulated into readiness metrics.',
    duration: 'Full-length simulation'
  }
}

const SUBJECTS = [
  'All',
  'Technology',
  'Management',
  'Strategy',
  'Computer Systems & Architecture',
  'Algorithms & Programming',
  'Networks & Security',
  'Databases & SQL',
]

const ITEM_COUNTS = [10, 20, 30, 40, 50]
const SET_COUNTS = [1, 2, 3, 4, 5] // 1 set = 12 cards (6 pairs)

export default function PracticeOverview({ navigation, route }) {
  const typeId = route?.params?.typeId || 'Flashcards'
  const info = OVERVIEWS[typeId] || OVERVIEWS.Flashcards

  const [selectedSubject, setSelectedSubject] = useState('All')
  const [selectedLimit, setSelectedLimit] = useState(10)
  const [selectedSets, setSelectedSets] = useState(1)

  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false)
  const [limitPickerOpen, setLimitPickerOpen] = useState(false)

  const isMatching = typeId === 'Matching'

  const handleStart = () => {
    navigation.replace(typeId, {
      subject: selectedSubject === 'All' ? null : selectedSubject,
      limit: isMatching ? selectedSets * 6 : selectedLimit, // for Matching, 1 set = 6 pairs (12 cards)
      sets: selectedSets,
    })
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Practice Overview</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.practiceTitle}>{info.title}</Text>

        {/* Expect block */}
        <View style={styles.flatSection}>
          <Text style={styles.sectionHeader}>What to Expect</Text>
          <Text style={styles.sectionBody}>{info.expect}</Text>
        </View>

        {/* How to block */}
        <View style={styles.flatSection}>
          <Text style={styles.sectionHeader}>How to Practice</Text>
          <Text style={styles.sectionBody}>{info.how}</Text>
        </View>

        {/* Subject Area Dropdown selection card */}
        <View style={styles.flatSection}>
          <Text style={styles.sectionHeader}>Subject Area</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            activeOpacity={0.7}
            onPress={() => setSubjectPickerOpen(true)}
          >
            <Text style={styles.pickerTriggerText}>{selectedSubject}</Text>
            <Feather name="chevron-down" size={16} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Quantity (Items or Sets) selection card */}
        <View style={styles.flatSection}>
          <Text style={styles.sectionHeader}>
            {isMatching ? 'Number of Sets (1 Set = 12 Cards)' : 'Number of Items'}
          </Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            activeOpacity={0.7}
            onPress={() => setLimitPickerOpen(true)}
          >
            <Text style={styles.pickerTriggerText}>
              {isMatching ? `${selectedSets} Set(s)` : `${selectedLimit} Items`}
            </Text>
            <Feather name="chevron-down" size={16} color={NAVY} />
          </TouchableOpacity>
        </View>

        {/* Format parameters block */}
        <View style={styles.formatSection}>
          <View style={styles.formatRow}>
            <Feather name="clock" size={16} color={NAVY} />
            <Text style={styles.formatText}>{info.duration}</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Subject Picker Modal Bottom Sheet ── */}
      <Modal
        visible={subjectPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSubjectPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSubjectPickerOpen(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Choose Subject Area</Text>
            <TouchableOpacity onPress={() => setSubjectPickerOpen(false)}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>
          {SUBJECTS.map((sub) => (
            <TouchableOpacity
              key={sub}
              style={[
                styles.sheetOption,
                selectedSubject === sub && styles.sheetOptionActive,
              ]}
              onPress={() => {
                setSelectedSubject(sub)
                setSubjectPickerOpen(false)
              }}
            >
              <Text
                style={[
                  styles.sheetOptionText,
                  selectedSubject === sub && styles.sheetOptionTextActive,
                ]}
              >
                {sub}
              </Text>
              {selectedSubject === sub && <Feather name="check" size={16} color={NAVY} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Limit Picker Modal Bottom Sheet ── */}
      <Modal
        visible={limitPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLimitPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLimitPickerOpen(false)}
        />
        <View style={styles.pickerSheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {isMatching ? 'Choose Sets Count' : 'Choose Items Limit'}
            </Text>
            <TouchableOpacity onPress={() => setLimitPickerOpen(false)}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>
          {(isMatching ? SET_COUNTS : ITEM_COUNTS).map((count) => {
            const isSel = isMatching ? selectedSets === count : selectedLimit === count
            return (
              <TouchableOpacity
                key={count}
                style={[styles.sheetOption, isSel && styles.sheetOptionActive]}
                onPress={() => {
                  if (isMatching) {
                    setSelectedSets(count)
                  } else {
                    setSelectedLimit(count)
                  }
                  setLimitPickerOpen(false)
                }}
              >
                <Text
                  style={[
                    styles.sheetOptionText,
                    isSel && styles.sheetOptionTextActive,
                  ]}
                >
                  {isMatching ? `${count} Set(s) (${count * 12} cards)` : `${count} Items`}
                </Text>
                {isSel && <Feather name="check" size={16} color={NAVY} />}
              </TouchableOpacity>
            )
          })}
        </View>
      </Modal>

      {/* Start button pinned at bottom */}
      <TouchableOpacity
        style={styles.startBtn}
        activeOpacity={0.85}
        onPress={handleStart}
      >
        <Text style={styles.startBtnText}>Start</Text>
      </TouchableOpacity>
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

  // ── Content ──
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 24,
  },
  practiceTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 20,
    textAlign: 'center',
  },
  flatSection: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  formatSection: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  pickerTriggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(15,39,71,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sheetOptionText: {
    fontSize: 14,
    color: '#475569',
  },
  sheetOptionTextActive: {
    color: NAVY,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 22,
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 74 + 16 : 74 + 8,
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
})
