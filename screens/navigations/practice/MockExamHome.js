import React, { useState, useEffect } from 'react';
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
import { supabase } from '../../../supabase';

// ---------------------------------------------------------------------------
// PHILNITS STATIC METADATA & CONFIG
// ---------------------------------------------------------------------------
const SCREEN_TITLE = 'Mock Exam';

const UPCOMING_EXAM = {
  label: 'Upcoming PhilNITS Exam Cycle',
  daysLeft: '-',
};

const LEVELS = [
  {
    id: 'ip',
    title: 'Information Technology Passport (IP)',
    levelBadge: 'Level 1',
    questions: 100,
    duration: '2 hours (120 minutes)',
    coverage: 'Technology: 40% | Strategy: 35% | Management: 25%',
  },
  {
    id: 'fe_a',
    title: 'FE Subject A: IT Fundamentals & Theory',
    levelBadge: 'Level 2',
    questions: 60,
    duration: '1 hour, 30 minutes (90 minutes)',
    coverage: 'Computer architecture, networks, data structures, & security',
  },
  {
    id: 'fe_b',
    title: 'FE Subject B: Algorithms & Logic',
    levelBadge: 'Level 2',
    questions: 20,
    duration: '1 hour, 40 minutes (100 minutes)',
    coverage: 'Program tracing, algorithmic reasoning, & security scenarios',
  },
];

// Simple score gauge built with plain Views only
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

// Dynamic computation of next PhilNITS exam cycle (April / October semi-annual cycles)
function getNextPhilnitsExamDate() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const candidateYears = [currentYear, currentYear + 1];
  const candidates = [];

  candidateYears.forEach((y) => {
    // April cycle: 4th Sunday of April
    candidates.push({ date: new Date(y, 3, 26), label: `April ${y} Cycle` });
    // October cycle: 4th Sunday of October
    candidates.push({ date: new Date(y, 9, 25), label: `October ${y} Cycle` });
  });

  const future = candidates.filter((c) => c.date > now).sort((a, b) => a.date - b.date);
  return future[0] || candidates[0];
}

export default function MockExamHome({ navigation, route }) {
  const from = route?.params?.from;
  const [daysLeft, setDaysLeft] = useState('-');
  const [examCycleLabel, setExamCycleLabel] = useState(UPCOMING_EXAM.label);
  const [latestResult, setLatestResult] = useState(null);

  useEffect(() => {
    let active = true;

    const computeSchedule = async () => {
      try {
        const nextCycle = getNextPhilnitsExamDate();
        const now = new Date();
        const diffDays = Math.ceil((nextCycle.date - now) / (1000 * 60 * 60 * 24));
        if (active) {
          setDaysLeft(diffDays > 0 ? diffDays : 0);
          setExamCycleLabel(`Upcoming PhilNITS Exam (${nextCycle.label})`);
        }
      } catch (e) {
        console.warn('Schedule calculation error:', e);
      }
    };

    computeSchedule();
    return () => {
      active = false;
    };
  }, []);

  // Fetch live latest mock exam result
  useEffect(() => {
    const fetchLatestAttempt = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;

        const { data } = await supabase
          .from('mock_exam_attempts')
          .select('score, total_questions, correct_count, incorrect_count, mock_exam_configs(title, level_key)')
          .eq('user_id', session.user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setLatestResult({
            examName: data.mock_exam_configs?.title || 'PhilNITS Mock Exam',
            correct: data.correct_count ?? 0,
            incorrect: data.incorrect_count ?? 0,
            totalScore: data.score ?? 0,
          });
        }
      } catch (err) {
        console.warn('Error loading latest attempt:', err);
      }
    };

    fetchLatestAttempt();
  }, []);

  const handleBack = () => {
    if (from === 'Home') navigation.navigate('Home');
    else navigation.navigate('PracticeLibrary');
  };

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
          <Text style={styles.bannerLabel}>{examCycleLabel}</Text>
          <Text style={styles.bannerDays}>{daysLeft} days left</Text>
        </View>

        {/* Level cards */}
        {LEVELS.map((level) => (
          <View key={level.id} style={styles.levelCard}>
            <View style={styles.levelBadgeContainer}>
              <Text style={styles.levelBadgeText}>{level.levelBadge}</Text>
            </View>
            <Text style={styles.levelTitle}>{level.title}</Text>
            <Text style={styles.levelMeta}>
              {level.questions} Questions · {level.duration}
            </Text>
            <Text style={styles.levelCoverage}>{level.coverage}</Text>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.navigate('MockExamTake', { level: level.id })}
            >
              <Text style={styles.startButtonText}>Start Mock Exam</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Latest exam result */}
        {latestResult && (
          <View>
            <Text style={styles.sectionTitle}>Latest exam result</Text>
            <View style={styles.resultCard}>
              <View style={styles.resultLeft}>
                <Text style={styles.resultExamName}>{latestResult.examName}</Text>

                <View style={styles.statPill}>
                  <Text style={[styles.statPillValue, styles.statPillValueNavy]}>
                    {latestResult.correct}
                  </Text>
                  <Text style={styles.statPillLabel}>Correct</Text>
                </View>

                <View style={styles.statPill}>
                  <Text style={[styles.statPillValue, styles.statPillValueRed]}>
                    {latestResult.incorrect}
                  </Text>
                  <Text style={styles.statPillLabel}>Incorrect</Text>
                </View>
              </View>

              <View style={styles.resultRight}>
                <ScoreGauge
                  correct={latestResult.correct}
                  incorrect={latestResult.incorrect}
                  score={latestResult.totalScore}
                />
              </View>
            </View>
          </View>
        )}
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
  levelBadgeContainer: {
    backgroundColor: '#EBF3FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
    textTransform: 'uppercase',
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
    textAlign: 'center',
  },
  levelMeta: {
    fontSize: 13,
    color: '#6B7684',
    marginBottom: 4,
  },
  levelCoverage: {
    fontSize: 12,
    color: '#9AA5B1',
    textAlign: 'center',
    marginBottom: 6,
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