import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function Onboarding({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />

      <View style={styles.card}>
        <Image source={require('../assets/loading.png')} style={styles.illustration} resizeMode="contain" />

        <Text style={styles.title}>Welcome to Gabay PhilCSE</Text>
        <Text style={styles.subtitle}>
          Review lessons, practice smarter, and prepare for your Civil Service Exam with guided learning tools.
        </Text>

        <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.primaryButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.secondaryButtonText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Start your Civil Service Exam preparation journey today</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1e35',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  topGlow: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(217, 152, 158, 0.18)',
  },
  bottomGlow: {
    position: 'absolute',
    bottom: -90,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(59, 130, 184, 0.18)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  illustration: {
    width: 180,
    height: 180,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#D9989E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3B82B8',
  },
  secondaryButtonText: {
    color: '#3B82B8',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 18,
    color: '#ffffff',
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.9,
  },
})
