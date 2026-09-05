import React, { useRef, useState, useEffect } from 'react'
import {
  Animated,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'

const NAVY = '#0f2747'
const PIN_LENGTH = 4

// Very lightweight deterministic hash (not cryptographic, good enough for a UX pin lock)
function simpleHash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(16)
}

// ── Dot indicators ─────────────────────────────────────────────────
function PinDots({ pin, shakeAnim }) {
  return (
    <Animated.View
      style={[
        styles.dotsRow,
        { transform: [{ translateX: shakeAnim }] },
      ]}
    >
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            pin.length > i ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </Animated.View>
  )
}

// ── Numpad ─────────────────────────────────────────────────────────
function Numpad({ onPress, onDelete }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <View style={styles.numpad}>
      {keys.map((key, idx) => {
        if (key === '') return <View key={idx} style={styles.numKey} />
        if (key === 'del') {
          return (
            <TouchableOpacity
              key={idx}
              style={styles.numKey}
              onPress={onDelete}
              activeOpacity={0.6}
            >
              <Feather name="delete" size={22} color={NAVY} />
            </TouchableOpacity>
          )
        }
        return (
          <TouchableOpacity
            key={idx}
            style={styles.numKey}
            onPress={() => onPress(key)}
            activeOpacity={0.6}
          >
            <Text style={styles.numKeyText}>{key}</Text>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// ── Main Screen ────────────────────────────────────────────────────
export default function SetPin({ navigation, route }) {
  // mode: 'prompt' = new user setup (can skip, goes to Home after)
  // mode: 'edit'   = from Settings after OTP auth (goes back after)
  const mode = route?.params?.mode || 'edit'
  const [step, setStep] = useState('set')       // 'set' | 'confirm'
  const [pin, setPin] = useState('')
  const [firstPin, setFirstPin] = useState('')
  const [saving, setSaving] = useState(false)
  const shakeAnim = useRef(new Animated.Value(0)).current

  // Auto-advance when PIN is complete
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return

    if (step === 'set') {
      // Slight delay so user sees the last dot fill
      const t = setTimeout(() => {
        setFirstPin(pin)
        setPin('')
        setStep('confirm')
      }, 200)
      return () => clearTimeout(t)
    }

    if (step === 'confirm') {
      if (pin === firstPin) {
        savePin(pin)
      } else {
        shake()
        const t = setTimeout(() => setPin(''), 600)
        return () => clearTimeout(t)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start()
  }

  const savePin = async (rawPin) => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No authenticated user')

      const hash = simpleHash(rawPin)
      const { error } = await supabase
        .from('users')
        .update({ pin_hash: hash })
        .eq('email', user.email)

      if (error) throw error

      if (mode === 'prompt') {
        navigation.replace('Home')
      } else {
        navigation.goBack()
      }
    } catch (err) {
      console.warn('SetPin error:', err.message)
      shake()
      setPin('')
      setStep('set')
      setFirstPin('')
    } finally {
      setSaving(false)
    }
  }

  const handlePress = (key) => {
    if (pin.length < PIN_LENGTH) setPin((p) => p + key)
  }

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1))
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('set')
      setPin('')
      setFirstPin('')
    } else if (mode !== 'prompt') {
      navigation.goBack()
    }
    // In 'prompt' mode, back on step 'set' does nothing (user must set or skip)
  }

  const subtitle =
    step === 'set'
      ? 'Choose a 4-digit PIN to secure your account.'
      : 'Re-enter your PIN to confirm.'

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header — hide back button in prompt mode on step 'set' */}
      <View style={styles.header}>
        {(step === 'confirm' || mode !== 'prompt') ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.6}>
            <Feather name="chevron-left" size={26} color={NAVY} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>
          {step === 'set' ? 'Set PIN' : 'Confirm PIN'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Body */}
      <View style={styles.body}>
        {/* Icon */}
        <View style={styles.iconWrap}>
          <Feather name="lock" size={32} color="#fff" />
        </View>

        <Text style={styles.title}>
          {step === 'set' ? 'Create your PIN' : 'Confirm your PIN'}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Dots */}
        <PinDots pin={pin} shakeAnim={shakeAnim} />

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepDot, step === 'confirm' && styles.stepDotActive]} />
        </View>

        {saving && (
          <ActivityIndicator size="small" color={NAVY} style={{ marginTop: 12 }} />
        )}
      </View>

      {/* Numpad */}
      {!saving && <Numpad onPress={handlePress} onDelete={handleDelete} />}

      {/* Skip option — only in prompt mode */}
      {mode === 'prompt' && !saving && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.replace('Home')}
          activeOpacity={0.6}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}

      {/* Spacer */}
      <View style={{ height: Platform.OS === 'ios' ? 34 : 20 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 54,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },

  // Body
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 20,
    maxWidth: 260,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  dotEmpty: {
    backgroundColor: '#e2e8f0',
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },
  dotFilled: {
    backgroundColor: NAVY,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e2e8f0',
  },
  stepDotActive: {
    backgroundColor: NAVY,
  },

  // Numpad
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 0,
    rowGap: 4,
  },
  numKey: {
    width: '33.33%',
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  numKeyText: {
    fontSize: 26,
    fontWeight: '600',
    color: NAVY,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 4,
  },
  skipText: {
    fontSize: 14,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
})
