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
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Top safe area spacer */}
      <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight : 54 }} />

      {/* Body */}
      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Feather name={locked ? 'lock' : 'shield'} size={32} color="#fff" />
        </View>

        <Text style={styles.title}>
          {locked ? 'Account Locked' : 'Enter your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {locked
            ? 'You have exceeded the maximum attempts.\nPlease sign in again.'
            : `Welcome back!\n${userEmail}`}
        </Text>

        {!locked && <PinDots pin={pin} shakeAnim={shakeAnim} />}

        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {/* Numpad or locked actions */}
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

      {/* Bottom spacer */}
      <View style={{ height: Platform.OS === 'ios' ? 34 : 20 }} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 8,
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

  // Error
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    textAlign: 'center',
  },

  // Locked state
  lockedActions: {
    paddingHorizontal: 40,
    paddingBottom: 20,
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  signOutBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
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
})
