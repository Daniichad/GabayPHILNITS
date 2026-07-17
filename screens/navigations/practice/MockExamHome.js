import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// STATIC DATA
// ---------------------------------------------------------------------------
const SCREEN_TITLE = 'Mock Exam';
const SCREEN_SUBTITLE = '1 HP - P Mock Exam';

const UPCOMING_EXAM = {
  label: 'Upcoming CSE Exam',
  daysLeft: "-",
};

const LATEST_RESULT = {
  examName: 'Subprofessional Exam',
  correct: 23,
  incorrect: 27,
  totalScore: 150,
};

const LEVELS = [
  {
    id: 'professional',
    title: 'Professional Level',
    questions: 170,
    duration: '3 hours, 10 minutes',
  },
  {
    id: 'sub-professional',
    title: 'Sub-Professional Level',
    questions: 165,
    duration: '2 hours, 40 minutes',
  },
];

// ---------------------------------------------------------------------------
// Simple score gauge built with plain Views only — no extra native
// dependency required. Shows the total score with a two-color bar beneath
// it (navy = correct share, coral = incorrect share).
// ---------------------------------------------------------------------------
function ScoreGauge({ correct, incorrect, score, width = 120 }) {
  const total = correct + incorrect;
  const correctFraction = total > 0 ? correct / total : 0;
  const correctWidth = Math.round(width * correctFraction);
  const incorrectWidth = width - correctWidth;

  return (
    <View style={[styles.gaugeWrap, { width }]}>
      <Text style={styles.gaugeScore}>{score}</Text>
      <Text style={styles.gaugeLabel}>Total score</Text>
      <View style={[styles.gaugeBarTrack, { width }]}>
        <View style={[styles.gaugeBarSegment, styles.gaugeBarCorrect, { width: correctWidth }]} />
        <View style={[styles.gaugeBarSegment, styles.gaugeBarIncorrect, { width: incorrectWidth }]} />
      </View>
    </View>
  );
}

// ─── Known official 2026 CSE dates (verified from csc.gov.ph) ──
const KNOWN_CSE_DATES_2026 = [
  { date: new Date('2026-03-08'), label: 'March 8, 2026', appPeriod: 'Nov 3 – Dec 28, 2025', cycle: '1st Cycle' },
  { date: new Date('2026-08-09'), label: 'August 9, 2026', appPeriod: 'May 14 – Jun 10, 2026', cycle: '2nd Cycle' },
]

// Returns the nearest upcoming date from a list
const getNextDate = (dates) => {
  const now = new Date()
  const future = dates.filter((d) => d.date > now).sort((a, b) => a.date - b.date)
  return future[0] || dates[dates.length - 1]
}

// Tries to parse CSE exam dates from the CSC RSS feed XML text
const parseCseDatesFromRSS = (xml) => {
  const datePattern = /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(2026|2027)/gi
  const cseKeywords = /career service exam|cse-ppt|cse ppt|civil service exam/i
  const items = xml.split(/<item>|<\/item>/i)
  const found = []

  for (const item of items) {
    if (!cseKeywords.test(item)) continue
    let m
    while ((m = datePattern.exec(item)) !== null) {
      const parsed = new Date(`${m[1]} ${m[2]}, ${m[3]}`)
      if (!isNaN(parsed.getTime())) found.push(parsed)
    }
    datePattern.lastIndex = 0
  }

  const now = new Date()
  const unique = [...new Set(found.map((d) => d.toDateString()))]
    .map((s) => new Date(s))
    .filter((d) => d > now)
    .sort((a, b) => a - b)

  return unique
}

export default function MockExamHome({ navigation, route }) {
  const from = route?.params?.from
  const [daysLeft, setDaysLeft] = React.useState('-')

  React.useEffect(() => {
    let active = true

    const fetchCSESchedule = async () => {
      try {
        const res = await fetch('https://www.csc.gov.ph/?format=feed&type=rss', {
          headers: { 'User-Agent': 'GabayPHILCSE/1.0' },
        })
        if (res.ok && active) {
          const xml = await res.text()
          const parsedDates = parseCseDatesFromRSS(xml)
          if (parsedDates.length > 0) {
            const next = parsedDates[0]
            const now = new Date()
            const diffDays = Math.ceil((next - now) / (1000 * 60 * 60 * 24))
            setDaysLeft(diffDays > 0 ? diffDays : 0)
            return
          }
        }
      } catch { /* silently fall through */ }

      // Fallback
      if (active) {
        const next = getNextDate(KNOWN_CSE_DATES_2026)
        const now = new Date()
        const diffDays = Math.ceil((next.date - now) / (1000 * 60 * 60 * 24))
        setDaysLeft(diffDays > 0 ? diffDays : 0)
      }
    }

    fetchCSESchedule()
    return () => {
      active = false
    }
  }, [])

  const handleBack = () => {
    if (from === 'Home') navigation.navigate('Home')
    else navigation.navigate('PracticeLibrary')
  }
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={26} color="#0B2540" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{SCREEN_TITLE}</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={22} color="#0B2540" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upcoming exam banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerLabel}>{UPCOMING_EXAM.label}</Text>
          <Text style={styles.bannerDays}>{daysLeft} days left</Text>
        </View>

        {/* Latest exam result */}
        <Text style={styles.sectionTitle}>Latest exam result</Text>
        <View style={styles.resultCard}>
          <View style={styles.resultLeft}>
            <Text style={styles.resultExamName}>{LATEST_RESULT.examName}</Text>

            <View style={styles.statPill}>
              <Text style={[styles.statPillValue, styles.statPillValueNavy]}>
                {LATEST_RESULT.correct}
              </Text>
              <Text style={styles.statPillLabel}>Correct</Text>
            </View>

            <View style={styles.statPill}>
              <Text style={[styles.statPillValue, styles.statPillValueRed]}>
                {LATEST_RESULT.incorrect}
              </Text>
              <Text style={styles.statPillLabel}>Incorrect</Text>
            </View>
          </View>

          <View style={styles.resultRight}>
            <ScoreGauge
              correct={LATEST_RESULT.correct}
              incorrect={LATEST_RESULT.incorrect}
              score={LATEST_RESULT.totalScore}
            />
          </View>
        </View>

        {/* Level cards */}
        {LEVELS.map((level) => (
          <View key={level.id} style={styles.levelCard}>
            <Text style={styles.levelTitle}>{level.title}</Text>
            <Text style={styles.levelMeta}>
              {level.questions} Questions
            </Text>
            <Text style={styles.levelMeta}>{level.duration}</Text>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('MockExamTake', { level: level.id })}
            >
              <Text style={styles.startButtonText}>Start Mock Exam</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const NAVY = '#0B2540';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  banner: {
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingVertical: 22,
    paddingHorizontal: 22,
    marginTop: 12,
  },
  bannerLabel: {
    color: '#B9C3D1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  bannerDays: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 26,
    marginBottom: 12,
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  resultLeft: {
    flex: 1,
  },
  resultExamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E0475A',
    marginBottom: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statPillValue: {
    minWidth: 26,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  statPillValueNavy: {
    backgroundColor: NAVY,
  },
  statPillValueRed: {
    backgroundColor: '#E0475A',
  },
  statPillLabel: {
    fontSize: 12,
    color: '#6B7684',
    fontWeight: '600',
  },
  resultRight: {
    marginLeft: 10,
  },
  gaugeWrap: {
    alignItems: 'center',
  },
  gaugeScore: {
    fontSize: 26,
    fontWeight: '700',
    color: NAVY,
  },
  gaugeLabel: {
    fontSize: 11,
    color: '#9AA5B1',
    marginTop: 2,
    marginBottom: 10,
  },
  gaugeBarTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#EEF1F5',
  },
  gaugeBarSegment: {
    height: '100%',
  },
  gaugeBarCorrect: {
    backgroundColor: NAVY,
  },
  gaugeBarIncorrect: {
    backgroundColor: '#E98A7A',
  },
  levelCard: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E3E8EF',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  levelMeta: {
    fontSize: 13,
    color: '#6B7684',
    marginBottom: 2,
  },
  startButton: {
    marginTop: 16,
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: NAVY,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
});