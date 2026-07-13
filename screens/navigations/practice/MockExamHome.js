import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ---------------------------------------------------------------------------
// STATIC DATA
// ---------------------------------------------------------------------------
const SCREEN_TITLE = 'Mock Exam';
const SCREEN_SUBTITLE = '1 HP - P Mock Exam';

const UPCOMING_EXAM = {
  label: 'Upcoming CSE Exam',
  daysLeft: 45,
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
    questions: 180,
    hours: 3,
  },
  {
    id: 'sub-professional',
    title: 'Sub-Professional Level',
    questions: 120,
    hours: 2,
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

export default function MockExamHome({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('PracticeLibrary')}>
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
          <Text style={styles.bannerDays}>{UPCOMING_EXAM.daysLeft} days left</Text>
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
            <Text style={styles.levelMeta}>{level.hours} hours</Text>

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
    paddingTop: Platform.OS === 'android' ? 30 : 0,
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