import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#0B2540';
const ACCENT = '#D9989E';

function formatTimeSpent(totalSeconds) {
  const hrs  = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function MockExamResult({ route, navigation }) {
  const {
    score = 0,
    total = 100,
    level = 'ip',
    timeSpent = 0,
    correct = 0,
    incorrect = 0,
    skipped = 0,
    questions = [],
    answers = [],
    sections = []
  } = route?.params || {};

  const percentage = total > 0 ? (score / total) * 100 : 0;

  const levelTitle = route?.params?.levelTitle || (
    level === 'ip' ? 'Information Technology Passport (IP)' :
    level === 'fe_a' ? 'FE Subject A: IT Fundamentals' :
    level === 'fe_b' ? 'FE Subject B: Algorithms & Logic' :
    'PhilNITS Mock Exam'
  );

  const isIp = level === 'ip';
  const isFe = level === 'fe_a' || level === 'fe_b';

  // Compute readiness indicator according to PhilNITS benchmark criteria
  let readinessStatus = 'Insufficient data to estimate readiness';
  let readinessColor = '#6B7684';

  if (total > 0) {
    if (isIp) {
      if (percentage >= 65) {
        readinessStatus = 'Above configured practice benchmark';
        readinessColor = '#16A34A';
      } else if (percentage >= 55) {
        readinessStatus = 'Near configured practice benchmark';
        readinessColor = '#D97706';
      } else {
        readinessStatus = 'Below configured practice benchmark';
        readinessColor = '#DC2626';
      }
    } else {
      if (percentage >= 70) {
        readinessStatus = 'Above configured practice benchmark';
        readinessColor = '#16A34A';
      } else if (percentage >= 60) {
        readinessStatus = 'Near configured practice benchmark';
        readinessColor = '#D97706';
      } else {
        readinessStatus = 'Below configured practice benchmark';
        readinessColor = '#DC2626';
      }
    }
  }

  // Calculate field/section breakdown if questions available
  const sectionBreakdown = {};
  if (Array.isArray(questions) && questions.length > 0) {
    questions.forEach((q, idx) => {
      const sec = q.section_name || 'General';
      if (!sectionBreakdown[sec]) {
        sectionBreakdown[sec] = { correct: 0, total: 0 };
      }
      sectionBreakdown[sec].total += 1;
      if (answers[idx] !== null && answers[idx] === q.correct_index) {
        sectionBreakdown[sec].correct += 1;
      }
    });
  }

  const handleRetake = () => {
    navigation.replace('MockExamTake', { level });
  };

  const handleBackToHome = () => {
    navigation.navigate('MockExamHome');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBackToHome}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exam Results</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.body}>
          <Text style={styles.levelText}>{levelTitle}</Text>

          {/* Score Circle */}
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreCircleLabel}>RAW PRACTICE SCORE</Text>
            <Text style={styles.scoreCircleValue}>{score}/{total}</Text>
            <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
          </View>

          {/* Readiness Status Banner */}
          <View style={[styles.readinessBanner, { borderColor: readinessColor }]}>
            <Ionicons name="stats-chart" size={16} color={readinessColor} style={{ marginRight: 6 }} />
            <Text style={[styles.readinessText, { color: readinessColor }]}>{readinessStatus}</Text>
          </View>

          <Text style={styles.congratsSubtitle}>
            {correct} correct · {incorrect} incorrect · {skipped} skipped
          </Text>

          {/* Field/Section Breakdown for IP & FE */}
          {Object.keys(sectionBreakdown).length > 0 && (
            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Performance by Field / Section</Text>
              {Object.entries(sectionBreakdown).map(([secName, data]) => {
                const secPct = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                return (
                  <View key={secName} style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>{secName}</Text>
                    <View style={styles.breakdownStats}>
                      <Text style={styles.breakdownValue}>{data.correct}/{data.total} ({secPct}%)</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Time spent metrics card */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Time Spent:</Text>
              <Text style={styles.statValue}>{formatTimeSpent(timeSpent)}</Text>
            </View>
          </View>

          {/* Official Certification Scoring Notice */}
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={18} color="#4A5568" style={{ marginRight: 6 }} />
            <Text style={styles.noticeText}>
              {isIp
                ? 'Practice percentage represents raw item accuracy. Official PhilNITS IP certification eligibility requires minimum thresholds across Technology, Strategy, and Management fields.'
                : 'This score is a Raw Practice Score. Official PhilNITS FE certification uses an official scaled score (passing mark: 60/100 points) and cannot be calculated directly from raw percentage alone.'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleRetake}>
            <Text style={styles.primaryButtonText}>Take Again</Text>
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToHome}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  levelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E0475A',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 24,
  },
  scoreCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  scoreCircleLabel: {
    color: '#B9C3D1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreCircleValue: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
  },
  percentageText: {
    color: '#D9989E',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  congratsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  congratsSubtitle: {
    fontSize: 14,
    color: '#6B7684',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  readinessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  readinessText: {
    fontSize: 13,
    fontWeight: '700',
  },
  breakdownCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '600',
  },
  breakdownStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    width: '100%',
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  statsCard: {
    width: '100%',
    backgroundColor: '#F5F7FA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7684',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: NAVY,
    borderRadius: 24,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D7DEE8',
    paddingVertical: 15,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: NAVY,
    fontWeight: '700',
    fontSize: 14,
  },
});
