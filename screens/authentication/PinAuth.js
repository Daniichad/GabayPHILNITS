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
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'

const NAVY = '#0f1e35'
const BLUE = '#3B82B8'
const PIN_LENGTH = 4
const MAX_ATTEMPTS = 5

function simpleHash(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return hash.toString(16)
}

// ── Dot indicators ─────────────────────────────────────────────────
function PinDots({ pin, shakeAnim }) {
  return (
    <Animated.View
      style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}
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
export default function PinAuth({ navigation }) {
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pinHash, setPinHash] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current

  const locked = attempts >= MAX_ATTEMPTS

  useEffect(() => {
    const loadPin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { navigation.replace('Login'); return }
        setUserEmail(user.email || '')
        const { data } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('email', user.email)
          .maybeSingle()
        if (!data?.pin_hash) {
          // No PIN set — skip straight to Home
          navigation.replace('Home')
          return
        }
        setPinHash(data.pin_hash)
      } catch (e) {
        console.warn('PinAuth load error:', e)
        navigation.replace('Home')
      } finally {
        setLoading(false)
      }
    }
    loadPin()
  }, [])

  // Auto-check when 4 digits entered
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return
    const t = setTimeout(() => checkPin(pin), 150)
    return () => clearTimeout(t)
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

  const checkPin = (entered) => {
    if (simpleHash(entered) === pinHash) {
      navigation.replace('Home')
    } else {
      shake()
      const next = attempts + 1
      setAttempts(next)
      const remaining = MAX_ATTEMPTS - next
      setError(
        remaining > 0
          ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many failed attempts.'
      )
      setTimeout(() => setPin(''), 600)
    }
  }

  const handlePress = (key) => {
    if (locked) return
    if (pin.length < PIN_LENGTH) {
      setError('')
      setPin((p) => p + key)
    }
  }

  const handleDelete = () => {
    setError('')
    setPin((p) => p.slice(0, -1))
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <View style={styles.topSection}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/loading.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>
        <Text style={styles.appName}>Gabay PHILCSE</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>
          {locked ? 'Account Locked' : 'Enter your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {locked
            ? 'You have exceeded the maximum attempts.\nPlease sign in again.'
            : 'Welcome back!'}
        </Text>

        {!locked && <PinDots pin={pin} shakeAnim={shakeAnim} />}

        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.numpadContainer}>
          {locked ? (
            <View style={styles.lockedActions}>
              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.85}
              >
                <Text style={styles.signOutBtnText}>Sign Out & Re-login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Numpad onPress={handlePress} onDelete={handleDelete} />
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
    justifyContent: 'flex-end',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NAVY,
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
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
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

  // Error
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
    minHeight: 20,
  },

  // Locked state
  lockedActions: {
    width: '100%',
    marginTop: 20,
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
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
})
