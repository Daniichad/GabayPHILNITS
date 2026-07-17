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
  const { score, total, level, timeSpent, correct, incorrect, skipped } = route?.params || {
    score: 0,
    total: 170,
    level: 'professional',
    timeSpent: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0
  };

  const percentage = total > 0 ? (score / total) * 100 : 0;
  const levelTitle = level === 'professional' ? 'Professional Mock Exam' : 'Sub-Professional Mock Exam';

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

      <View style={styles.body}>
        <Text style={styles.levelText}>{levelTitle}</Text>

        {/* Score Circle */}
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreCircleLabel}>YOUR SCORE</Text>
          <Text style={styles.scoreCircleValue}>{score}/{total}</Text>
          <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
        </View>

        <Text style={styles.congratsTitle}>
          {percentage >= 80 ? 'Excellent!' : percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}
        </Text>

        <Text style={styles.congratsSubtitle}>
          {correct} correct · {incorrect} incorrect · {skipped} skipped
        </Text>

        {/* Time spent metrics card */}
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Time Spent:</Text>
            <Text style={styles.statValue}>{formatTimeSpent(timeSpent)}</Text>
          </View>
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
  statsCard: {
    width: '100%',
    maxWidth: 240,
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
