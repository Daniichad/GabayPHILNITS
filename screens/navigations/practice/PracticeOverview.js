import React, { useState, useEffect, useRef } from 'react'
import {
  ActivityIndicator, Animated, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text,
  TouchableOpacity, View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../../supabase'
import { getCache, setCache } from '../../../utils/cache'
import { resolveUserTargetExam } from '../../../utils/targetExam'
import { getModalBottomPadding } from '../../../utils/responsiveLayout'

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

const IP_SUBJECTS = [
  'All',
  'Technology',
  'Management',
  'Strategy',
]

const IP_HIERARCHY = {
  Technology: {
    'Basic Theory': ['Basic Theory', 'Algorithms and Programming'],
    'Computer Systems': ['Computer Components', 'Hardware', 'Software', 'System Components'],
    'Technical Elements': ['Databases', 'Information Design', 'Information Media', 'Network', 'Security'],
  },
  Management: {
    'Development Technology': ['Software Development Management Techniques', 'System Development Technology'],
    'Project Management': ['Project Management'],
    'Service Management': ['Service Management', 'System Audit'],
  },
  Strategy: {
    'Business Strategy': ['Business Industry', 'Business Strategy Management', 'Technology Strategy Management'],
    'Companies and Legal Affairs': ['Corporate Activities', 'Legal Affairs'],
    'System Strategy': ['System Planning', 'System Strategy'],
  },
}

const FE_MORNING_SUBJECTS = [
  'All',
  'Technology',
  'Management',
  'Strategy',
]

const FE_AFTERNOON_SUBJECTS = [
  'All',
  'General Aspects of Programming',
  'Fundamental Elements for Programming Processes',
  'Data Structures and Algorithms',
  'Application of Programming to Various Fields',
  'Ensuring Information Security',
]

const ITEM_COUNTS = [10, 20, 30, 40, 50]
const SET_COUNTS = [1, 2, 3, 4, 5] // 1 set = 12 cards (6 pairs)

export default function PracticeOverview({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const typeId = route?.params?.typeId || 'Flashcards'
  const info = OVERVIEWS[typeId] || OVERVIEWS.Flashcards

  const routeTargetExam = route?.params?.targetExam
  const routeSubject = route?.params?.subject
  const routeMajorCategory = route?.params?.majorCategory
  const routeMinorCategory = route?.params?.minorCategory
  const routeReviewSpeed = route?.params?.reviewSpeed

  const [userTargetExam, setUserTargetExam] = useState(routeTargetExam || null)
  const [loading, setLoading] = useState(true)
  const [feSection, setFeSection] = useState('Subject A') // 'Subject A' | 'Subject B'
  const [selectedSubject, setSelectedSubject] = useState(routeSubject || 'All')
  const [selectedMajorCategory, setSelectedMajorCategory] = useState(routeMajorCategory || 'All')
  const [selectedMinorCategory, setSelectedMinorCategory] = useState(routeMinorCategory || 'All')
  const [selectedLimit, setSelectedLimit] = useState(10)
  const [selectedSets, setSelectedSets] = useState(1)
  const [userReviewSpeed, setUserReviewSpeed] = useState('Standard')
  const [selectedSpeed, setSelectedSpeed] = useState(routeReviewSpeed || 'Standard')

  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false)
  const [majorPickerOpen, setMajorPickerOpen] = useState(false)
  const [minorPickerOpen, setMinorPickerOpen] = useState(false)
  const [limitPickerOpen, setLimitPickerOpen] = useState(false)

  // Bottom sheet slide animations (same as logout transition: bottom to top)
  const subjectSlideAnim = useRef(new Animated.Value(400)).current
  const majorSlideAnim = useRef(new Animated.Value(400)).current
  const minorSlideAnim = useRef(new Animated.Value(400)).current
  const limitSlideAnim = useRef(new Animated.Value(400)).current

  useEffect(() => {
    if (subjectPickerOpen) {
      Animated.timing(subjectSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    } else {
      subjectSlideAnim.setValue(400)
    }
  }, [subjectPickerOpen])

  useEffect(() => {
    if (majorPickerOpen) {
      Animated.timing(majorSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    } else {
      majorSlideAnim.setValue(400)
    }
  }, [majorPickerOpen])

  useEffect(() => {
    if (minorPickerOpen) {
      Animated.timing(minorSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    } else {
      minorSlideAnim.setValue(400)
    }
  }, [minorPickerOpen])

  useEffect(() => {
    if (limitPickerOpen) {
      Animated.timing(limitSlideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start()
    } else {
      limitSlideAnim.setValue(400)
    }
  }, [limitPickerOpen])

  const closeSubjectPicker = () => {
    Animated.timing(subjectSlideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSubjectPickerOpen(false)
    })
  }

  const closeMajorPicker = () => {
    Animated.timing(majorSlideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMajorPickerOpen(false)
    })
  }

  const closeMinorPicker = () => {
    Animated.timing(minorSlideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMinorPickerOpen(false)
    })
  }

  const closeLimitPicker = () => {
    Animated.timing(limitSlideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setLimitPickerOpen(false)
    })
  }

  const isMatching = typeId === 'Matching'
  const normExam = String(userTargetExam || 'IP').toUpperCase()
  const isFE = normExam.includes('FE')
  const isIP = !isFE

  const subjectsList = userTargetExam === 'FE'
    ? (feSection === 'Subject B' ? FE_AFTERNOON_SUBJECTS : FE_MORNING_SUBJECTS)
    : IP_SUBJECTS

  // Calculate available Major Categories based on selected Subject Area
  const availableMajorCategories = ['All']
  if (isIP) {
    if (selectedSubject && selectedSubject !== 'All' && IP_HIERARCHY[selectedSubject]) {
      availableMajorCategories.push(...Object.keys(IP_HIERARCHY[selectedSubject]))
    } else {
      // If "All", show all unique major categories across all subjects
      Object.keys(IP_HIERARCHY).forEach(sub => {
        Object.keys(IP_HIERARCHY[sub]).forEach(m => {
          if (!availableMajorCategories.includes(m)) availableMajorCategories.push(m)
        })
      })
    }
  }

  // Calculate available Minor Categories based on selected Subject and Major
  const availableMinorCategories = ['All']
  if (isIP) {
    if (selectedSubject !== 'All' && IP_HIERARCHY[selectedSubject]) {
      if (selectedMajorCategory !== 'All' && IP_HIERARCHY[selectedSubject][selectedMajorCategory]) {
        availableMinorCategories.push(...IP_HIERARCHY[selectedSubject][selectedMajorCategory])
      } else {
        Object.values(IP_HIERARCHY[selectedSubject]).forEach(topicList => {
          topicList.forEach(t => {
            if (!availableMinorCategories.includes(t)) availableMinorCategories.push(t)
          })
        })
      }
    } else {
      // All subjects
      if (selectedMajorCategory !== 'All') {
        Object.keys(IP_HIERARCHY).forEach(sub => {
          if (IP_HIERARCHY[sub][selectedMajorCategory]) {
            IP_HIERARCHY[sub][selectedMajorCategory].forEach(t => {
              if (!availableMinorCategories.includes(t)) availableMinorCategories.push(t)
            })
          }
        })
      } else {
        Object.keys(IP_HIERARCHY).forEach(sub => {
          Object.values(IP_HIERARCHY[sub]).forEach(topicList => {
            topicList.forEach(t => {
              if (!availableMinorCategories.includes(t)) availableMinorCategories.push(t)
            })
          })
        })
      }
    }
  }

  useEffect(() => {
    let isMounted = true
    const initOverview = async () => {
      try {
        // 1. Instant cache read: unlocks UI immediately with zero spinner wait
        const [cachedSpeed, cachedTrack] = await Promise.all([
          getCache('user_review_speed'),
          getCache('user_target_exam')
        ])

        if (isMounted) {
          if (cachedSpeed) {
            setUserReviewSpeed(cachedSpeed)
            if (!routeReviewSpeed) setSelectedSpeed(cachedSpeed)
          }
          if (cachedTrack) {
            setUserTargetExam(cachedTrack)
          }
          // Immediately unblock spinner if we already have the track or route target
          if (cachedTrack || routeTargetExam) {
            setLoading(false)
          }
        }

        // 2. Fast non-blocking background verification via session (avoids network getUser roundtrip)
        const { data: { session } } = await supabase.auth.getSession()
        const currentUser = session?.user

        const [track, uRes] = await Promise.all([
          resolveUserTargetExam(currentUser?.id, routeTargetExam || cachedTrack || userTargetExam || 'IP'),
          currentUser?.email
            ? supabase.from('users').select('review_speed').ilike('email', currentUser.email).maybeSingle()
            : Promise.resolve({ data: null })
        ])

        if (isMounted) {
          setUserTargetExam(track)
          if (uRes?.data?.review_speed) {
            const rawSpeed = String(uRes.data.review_speed).trim()
            setUserReviewSpeed(rawSpeed)
            if (!routeReviewSpeed) setSelectedSpeed(rawSpeed)
            setCache('user_review_speed', rawSpeed).catch(() => { })
          }
          const validSubs = track === 'FE'
            ? (feSection === 'Subject B' ? FE_AFTERNOON_SUBJECTS : FE_MORNING_SUBJECTS)
            : IP_SUBJECTS
          setSelectedSubject((curr) => (validSubs.includes(curr) ? curr : 'All'))
          setLoading(false)
        }
      } catch (err) {
        console.warn('Error fetching target exam in PracticeOverview:', err)
        if (isMounted) setLoading(false)
      }
    }

    initOverview()
    const unsubscribe = navigation?.addListener?.('focus', initOverview)
    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [navigation, feSection])

  const handleStart = () => {
    const activePace = selectedSpeed || userReviewSpeed || 'Standard'
    setCache('user_review_speed', activePace).catch(() => { })

    navigation.replace(typeId, {
      subject: selectedSubject === 'All' ? null : selectedSubject,
      majorCategory: selectedMajorCategory === 'All' ? null : selectedMajorCategory,
      minorCategory: selectedMinorCategory === 'All' ? null : selectedMinorCategory,
      limit: isMatching ? selectedSets * 6 : selectedLimit, // for Matching, 1 set = 6 pairs (12 cards)
      sets: selectedSets,
      targetExam: userTargetExam || 'IP',
      feSection: userTargetExam === 'FE' ? feSection : null,
      reviewSpeed: activePace,
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Preparing practice settings...</Text>
        </View>
      ) : (
        <>
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

            {/* Morning / Afternoon Exam Session for FE */}
            {userTargetExam === 'FE' && (
              <View style={styles.flatSection}>
                <Text style={styles.sectionHeader}>Exam Session</Text>
                <View style={styles.feTrackSegment}>
                  <TouchableOpacity
                    style={[styles.feTrackBtn, feSection === 'Subject A' && styles.feTrackBtnActive]}
                    onPress={() => {
                      setFeSection('Subject A')
                      setSelectedSubject('All')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.feTrackBtnText, feSection === 'Subject A' && styles.feTrackBtnTextActive]}>
                      Subject A (Morning)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.feTrackBtn, feSection === 'Subject B' && styles.feTrackBtnActive]}
                    onPress={() => {
                      setFeSection('Subject B')
                      setSelectedSubject('All')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.feTrackBtnText, feSection === 'Subject B' && styles.feTrackBtnTextActive]}>
                      Subject B (Afternoon)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Review Pace / Speed Selection */}
            <View style={styles.flatSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.sectionHeader}>Review Pace</Text>
                {userReviewSpeed && (
                  <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#10b981' }}>
                    Profile Pace: {userReviewSpeed}
                  </Text>
                )}
              </View>
              <View style={styles.feTrackSegment}>
                {[
                  { id: 'Quick', label: 'Quick' },
                  { id: 'Standard', label: 'Standard' },
                  { id: 'Detailed', label: 'Detailed' },
                ].map((pace) => {
                  const isActive = selectedSpeed === pace.id
                  return (
                    <TouchableOpacity
                      key={pace.id}
                      style={[styles.feTrackBtn, isActive && styles.feTrackBtnActive]}
                      onPress={() => setSelectedSpeed(pace.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.feTrackBtnText, isActive && styles.feTrackBtnTextActive]}>
                        {pace.label}
                      </Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>

            {/* Subject Area Dropdown selection card */}
            <View style={styles.flatSection}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={styles.sectionHeader}>Subject Area</Text>
                <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#2563eb' }}>
                  {isFE ? 'Fundamental IT Engineer (FE)' : 'IT Passport (IP)'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pickerTrigger}
                activeOpacity={0.7}
                onPress={() => setSubjectPickerOpen(true)}
              >
                <Text style={styles.pickerTriggerText}>
                  {selectedSubject}
                </Text>
                <Feather name="chevron-down" size={16} color={NAVY} />
              </TouchableOpacity>
            </View>

            {/* Major Category Dropdown selection card */}
            <View style={styles.flatSection}>
              <Text style={styles.sectionHeader}>Major Category</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                activeOpacity={0.7}
                onPress={() => setMajorPickerOpen(true)}
              >
                <Text style={styles.pickerTriggerText}>
                  {selectedMajorCategory}
                </Text>
                <Feather name="chevron-down" size={16} color={NAVY} />
              </TouchableOpacity>
            </View>

            {/* Minor Category Dropdown selection card */}
            <View style={styles.flatSection}>
              <Text style={styles.sectionHeader}>Minor Category</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                activeOpacity={0.7}
                onPress={() => setMinorPickerOpen(true)}
              >
                <Text style={styles.pickerTriggerText}>
                  {selectedMinorCategory}
                </Text>
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
            onRequestClose={closeSubjectPicker}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={closeSubjectPicker}
              />
              <Animated.View style={[styles.pickerSheet, { paddingBottom: getModalBottomPadding(insets, 16), transform: [{ translateY: subjectSlideAnim }] }]}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Choose Subject Area</Text>
                  <TouchableOpacity onPress={closeSubjectPicker}>
                    <Feather name="x" size={22} color={NAVY} />
                  </TouchableOpacity>
                </View>
                {subjectsList.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.sheetOption,
                      selectedSubject === sub && styles.sheetOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedSubject(sub)
                      setSelectedMajorCategory('All')
                      setSelectedMinorCategory('All')
                      closeSubjectPicker()
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
              </Animated.View>
            </View>
          </Modal>

          {/* ── Major Category Picker Modal Bottom Sheet ── */}
          <Modal
            visible={majorPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={closeMajorPicker}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={closeMajorPicker}
              />
              <Animated.View style={[styles.pickerSheet, { paddingBottom: getModalBottomPadding(insets, 16), transform: [{ translateY: majorSlideAnim }] }]}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Choose Major Category</Text>
                  <TouchableOpacity onPress={closeMajorPicker}>
                    <Feather name="x" size={22} color={NAVY} />
                  </TouchableOpacity>
                </View>
                {availableMajorCategories.map((major) => (
                  <TouchableOpacity
                    key={major}
                    style={[
                      styles.sheetOption,
                      selectedMajorCategory === major && styles.sheetOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedMajorCategory(major)
                      setSelectedMinorCategory('All')
                      closeMajorPicker()
                    }}
                  >
                    <Text
                      style={[
                        styles.sheetOptionText,
                        selectedMajorCategory === major && styles.sheetOptionTextActive,
                      ]}
                    >
                      {major}
                    </Text>
                    {selectedMajorCategory === major && <Feather name="check" size={16} color={NAVY} />}
                  </TouchableOpacity>
                ))}
              </Animated.View>
            </View>
          </Modal>

          {/* ── Minor Category Picker Modal Bottom Sheet ── */}
          <Modal
            visible={minorPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={closeMinorPicker}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={closeMinorPicker}
              />
              <Animated.View style={[styles.pickerSheet, { paddingBottom: getModalBottomPadding(insets, 16), transform: [{ translateY: minorSlideAnim }] }]}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Choose Minor Category</Text>
                  <TouchableOpacity onPress={closeMinorPicker}>
                    <Feather name="x" size={22} color={NAVY} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {availableMinorCategories.map((minor) => (
                    <TouchableOpacity
                      key={minor}
                      style={[
                        styles.sheetOption,
                        selectedMinorCategory === minor && styles.sheetOptionActive,
                      ]}
                      onPress={() => {
                        setSelectedMinorCategory(minor)
                        closeMinorPicker()
                      }}
                    >
                      <Text
                        style={[
                          styles.sheetOptionText,
                          selectedMinorCategory === minor && styles.sheetOptionTextActive,
                        ]}
                      >
                        {minor}
                      </Text>
                      {selectedMinorCategory === minor && <Feather name="check" size={16} color={NAVY} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>

          {/* ── Limit Picker Modal Bottom Sheet ── */}
          <Modal
            visible={limitPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={closeLimitPicker}
          >
            <View style={styles.modalContainer}>
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={closeLimitPicker}
              />
              <Animated.View style={[styles.pickerSheet, { paddingBottom: getModalBottomPadding(insets, 16), transform: [{ translateY: limitSlideAnim }] }]}>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>
                    {isMatching ? 'Choose Sets Count' : 'Choose Items Limit'}
                  </Text>
                  <TouchableOpacity onPress={closeLimitPicker}>
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
                        closeLimitPicker()
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
              </Animated.View>
            </View>
          </Modal>

          {/* Start button pinned at bottom */}
          <TouchableOpacity
            style={[styles.startBtn, { marginBottom: Math.max(insets.bottom, 16) }]}
            activeOpacity={0.85}
            onPress={handleStart}
          >
            <Text style={styles.startBtnText}>Start</Text>
          </TouchableOpacity>
        </>
      )}
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
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  feTrackSegment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginTop: 2,
  },
  feTrackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 9,
    gap: 6,
  },
  feTrackBtnActive: {
    backgroundColor: NAVY,
  },
  feTrackBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#64748b',
  },
  feTrackBtnTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
})
