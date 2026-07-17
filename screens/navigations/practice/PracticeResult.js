import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#0B2540';
const ACCENT = '#D9989E';

export default function PracticeResult({ route, navigation }) {
  const { score, total, subject, type } = route?.params || { score: 0, total: 10, subject: 'Practice', type: 'Practice' };
  const percentage = total > 0 ? (score / total) * 100 : 0;

  const handleRetake = () => {
    navigation.goBack();
  };

  const handleBackToLibrary = () => {
    navigation.navigate('PracticeLibrary');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={handleBackToLibrary}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type} Results</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.subjectText}>{subject || 'All Subjects'}</Text>

        {/* Score Gauge */}
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreCircleLabel}>SCORE</Text>
          <Text style={styles.scoreCircleValue}>{score}/{total}</Text>
          <Text style={styles.percentageText}>{percentage.toFixed(0)}% Correct</Text>
        </View>

        <Text style={styles.congratsTitle}>
          {percentage >= 80 ? 'Excellent!' : percentage >= 50 ? 'Good Job!' : 'Keep Practicing!'}
        </Text>
        
        <Text style={styles.congratsSubtitle}>
          You got {score} out of {total} questions correct.
        </Text>

        {/* Progress Bar Visualizer */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleRetake}>
          <Text style={styles.primaryButtonText}>Practice Again</Text>
          <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLibrary}>
          <Text style={styles.secondaryButtonText}>Back to Practice Library</Text>
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
  subjectText: {
    fontSize: 13,
    fontWeight: '800',
    color: NAVY,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 24,
  },
  scoreCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  scoreCircleValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
  },
  percentageText: {
    color: '#D9989E',
    fontSize: 12,
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
    marginBottom: 28,
  },
  progressBarTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EEF1F5',
    overflow: 'hidden',
    maxWidth: 240,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3CB878',
    borderRadius: 4,
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
