import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'
import { StackActions } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Route name → which nav tab index is "active"
const ROUTE_TAB_MAP = {
  Home: 0,
  StudyPlan: 1,
  Library: 1,
  ReadingMaterial: 1,
  PracticeLibrary: 2,
  PracticeScreen: 2,
  Flashcards: 2,
  Matching: 2,
  TrueFalse: 2,
  MultipleChoice: 2,
  MockExamHome: 2,
  MockExamTake: 2,
  PracticeOverview: 2,
  Performance: 3,
  PersonalInfo: 4,
  Profile: 4,
  AccountInformation: 4,
  Settings: 4,
  HelpCenter: 4,
  Report: 4,
  TermsConditions: 4,
  RateApp: 4,
  AboutApp: 4,
}

const NAVY = '#0f2747'
const GRAY = '#64748b'

const TABS = [
  {
    label: 'Home',
    route: 'Home',
    icon: (active) => (
      <Ionicons
        name={active ? 'home' : 'home-outline'}
        size={26}
        color={active ? NAVY : GRAY}
      />
    ),
  },
  {
    label: 'Library',
    route: 'Library',
    icon: (active) => (
      <Ionicons
        name={active ? 'document-text' : 'document-text-outline'}
        size={26}
        color={active ? NAVY : GRAY}
      />
    ),
  },
  {
    label: 'Practice',
    route: 'PracticeLibrary',
    icon: (active) => (
      <Feather name="clipboard" size={24} color={active ? NAVY : GRAY} />
    ),
  },
  {
    label: 'Progress',
    route: 'Performance',
    icon: (active) => (
      <Feather name="bar-chart-2" size={24} color={active ? NAVY : GRAY} />
    ),
  },
  {
    label: 'Profile',
    route: 'Profile',
    icon: (active) => (
      <Feather name="user" size={24} color={active ? NAVY : GRAY} />
    ),
  },
]

export default function BottomNav({ navigation, activeRoute }) {
  const activeIndex = ROUTE_TAB_MAP[activeRoute] ?? -1
  const insets = useSafeAreaInsets()

  const handlePress = (tab, index) => {
    if (index === activeIndex) return
    navigation?.dispatch(StackActions.replace(tab.route))
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8), height: 60 + insets.bottom }]}>
      {TABS.map((tab, index) => {
        const active = index === activeIndex
        return (
          <TouchableOpacity
            key={tab.route}
            style={[styles.tabBtn, active && styles.tabBtnActive]}
            onPress={() => handlePress(tab, index)}
            activeOpacity={0.75}
          >
            {tab.icon(active)}
            {active && <View style={styles.activeDot} />}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d8e0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
    zIndex: 99,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    // Elevation for Android
    elevation: 10,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(15, 39, 71, 0.08)',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: NAVY,
    marginTop: 3,
  },
})
