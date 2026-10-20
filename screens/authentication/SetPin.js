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
  Image,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'
import { saveUserCache } from '../../utils/database'

const NAVY = '#0f1e35'
const BLUE = '#3B82B8'
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
              <Feather name="delete" size={24} color={NAVY} />
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
      const emailToMatch = (user.email || '').trim()

      // 1. Update in public.users table using case-insensitive email match
      const { data: updatedRows, error: updateError } = await supabase
        .from('users')
        .update({ pin_hash: hash })
        .ilike('email', emailToMatch)
        .select('pin_hash')

      if (updateError) throw updateError

      // 2. If no rows were updated (e.g. user row didn't exist yet in public.users), upsert it
      if (!updatedRows || updatedRows.length === 0) {
        const { error: upsertErr } = await supabase
          .from('users')
          .upsert({
            email: emailToMatch,
            pin_hash: hash,
            fullname: user.user_metadata?.full_name || user.user_metadata?.fullName || 'Student',
            role: 'user',
          }, { onConflict: 'email' })
        if (upsertErr) throw upsertErr
      }

      // 3. Sync to local SQLite cache for offline availability
      await saveUserCache(user.id, hash, true, true)

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
      Alert.alert('Error', err.message || 'Failed to save PIN. Please try again.')
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
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header — hide back button in prompt mode on step 'set' */}
      <View style={styles.header}>
        {(step === 'confirm' || mode !== 'prompt') ? (
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.6}>
            <Feather name="chevron-left" size={26} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>
          {step === 'set' ? 'Set PIN' : 'Confirm PIN'}
        </Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/loading.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Gabay PhilNITS</Text>
      </View>

      {/* Body */}
      <View style={styles.formContainer}>
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

        <View style={styles.numpadContainer}>
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
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NAVY,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 54,
    justifyContent: 'flex-end',
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
    color: '#fff',
  },

  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logoContainer: {
    width: 80,
    height: 80,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },

  // Form Container
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    alignItems: 'center',
    minHeight: '60%',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 260,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotEmpty: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
  },
  dotFilled: {
    backgroundColor: BLUE,
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
  numpadContainer: {
    width: '100%',
    marginTop: 16,
    flex: 1,
    justifyContent: 'flex-end',
  },
  numpad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 0,
    rowGap: 8,
  },
  numKey: {
    width: '33.33%',
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
  },
  numKeyText: {
    fontSize: 28,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipText: {
    fontSize: 15,
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
})
