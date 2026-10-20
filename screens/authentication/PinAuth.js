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
  Modal,
  TextInput,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'
import { getUserCache, saveUserCache } from '../../utils/database'
import { sendEmailJsOtp } from '../../utils/emailjs'

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
  const [userId, setUserId] = useState(null)
  const [error, setError] = useState('')
  const shakeAnim = useRef(new Animated.Value(0)).current

  // Forgot PIN state
  const [forgotModalVisible, setForgotModalVisible] = useState(false)
  const [forgotStep, setForgotStep] = useState('send') // 'send' | 'verify'
  const [forgotOtp, setForgotOtp] = useState('')
  const [generatedForgotOtp, setGeneratedForgotOtp] = useState(null)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotCooldown, setForgotCooldown] = useState(0)

  const locked = attempts >= MAX_ATTEMPTS

  useEffect(() => {
    let isMounted = true

    const loadPin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user || (await supabase.auth.getUser()).data?.user
        if (!user) {
          if (isMounted) navigation.replace('Login')
          return
        }

        const effectiveEmail = (user.email || '').trim()
        if (isMounted) {
          setUserEmail(effectiveEmail)
          setUserId(user.id)
        }

        let targetPinHash = null

        // 1. Try querying Supabase public.users table using case-insensitive match
        try {
          const { data, error: qErr } = await supabase
            .from('users')
            .select('pin_hash')
            .ilike('email', effectiveEmail)
            .maybeSingle()

          if (!qErr && data?.pin_hash && String(data.pin_hash).trim().length > 0) {
            targetPinHash = String(data.pin_hash).trim()
            // Sync to local SQLite cache
            await saveUserCache(user.id, targetPinHash, true, true)
          }
        } catch (netErr) {
          console.warn('Network issue fetching pin_hash from Supabase:', netErr)
        }

        // 2. If online fetch didn't yield a PIN or network was offline, check SQLite cache
        if (!targetPinHash) {
          try {
            const cached = await getUserCache(user.id)
            if (cached?.pin_hash && String(cached.pin_hash).trim().length > 0) {
              targetPinHash = String(cached.pin_hash).trim()
            }
          } catch (cacheErr) {
            console.warn('Error reading cached pin:', cacheErr)
          }
        }

        // 3. If user really has no PIN configured anywhere, skip straight to Home
        if (!targetPinHash) {
          if (isMounted) navigation.replace('Home')
          return
        }

        if (isMounted) {
          setPinHash(targetPinHash)
          setLoading(false)
        }
      } catch (e) {
        console.warn('PinAuth load error:', e)
        // If an unexpected error happened, check cache once more before routing to Home
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const cached = await getUserCache(session.user.id)
            if (cached?.pin_hash && String(cached.pin_hash).trim().length > 0) {
              if (isMounted) {
                setPinHash(String(cached.pin_hash).trim())
                setLoading(false)
                return
              }
            }
          }
        } catch (_) {}

        if (isMounted) navigation.replace('Home')
      }
    }

    loadPin()
    return () => { isMounted = false }
  }, [navigation])

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (forgotCooldown <= 0) return
    const t = setTimeout(() => setForgotCooldown((v) => Math.max(0, v - 1)), 1000)
    return () => clearTimeout(t)
  }, [forgotCooldown])

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

  const checkPin = async (entered) => {
    if (!pinHash) return
    const strPinHash = String(pinHash).trim()
    const enteredHash = simpleHash(entered)

    const rawMatch = entered === strPinHash
    const hashMatch = enteredHash === strPinHash

    if (hashMatch || rawMatch) {
      // If entered matched raw value directly, upgrade it to hash in the database
      if (rawMatch && !hashMatch && userEmail) {
        try {
          await supabase
            .from('users')
            .update({ pin_hash: enteredHash })
            .ilike('email', userEmail)
          if (userId) {
            await saveUserCache(userId, enteredHash, true, true)
          }
        } catch (_) {}
      }
      navigation.replace('Home')
    } else {
      shake()
      const next = attempts + 1
      setAttempts(next)
      const remaining = MAX_ATTEMPTS - next
      setError(
        remaining > 0
          ? `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
          : 'Too many failed attempts. Account locked.'
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
    try {
      await supabase.auth.signOut()
    } finally {
      navigation.replace('Login')
    }
  }

  // ── Forgot PIN handlers ──────────────────────────────────────────
  const openForgotModal = () => {
    setForgotStep('send')
    setForgotOtp('')
    setGeneratedForgotOtp(null)
    setForgotCooldown(0)
    setForgotModalVisible(true)
  }

  const closeForgotModal = () => {
    setForgotModalVisible(false)
    setForgotStep('send')
    setForgotOtp('')
    setGeneratedForgotOtp(null)
  }

  const handleSendForgotOtp = async () => {
    if (forgotCooldown > 0) {
      Alert.alert('Please wait', `You can resend code in ${forgotCooldown}s`)
      return
    }
    setForgotLoading(true)
    try {
      if (!userEmail) throw new Error('No registered email found for this account')
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedForgotOtp(code)
      await sendEmailJsOtp(userEmail, code, 'Student')
      setForgotStep('verify')
      setForgotOtp('')
      setForgotCooldown(60)
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send verification code')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyForgotOtp = () => {
    if (forgotOtp.length < 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit code')
      return
    }
    if (forgotOtp !== generatedForgotOtp) {
      Alert.alert('Incorrect Code', 'The code you entered is wrong. Please try again.')
      return
    }

    closeForgotModal()
    Alert.alert(
      'Identity Verified',
      'You can now create a new 4-digit PIN for your account.',
      [
        {
          text: 'Set New PIN',
          onPress: () => navigation.replace('SetPin', { mode: 'prompt' }),
        },
      ]
    )
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
        <Text style={styles.appName}>Gabay PhilNITS</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.title}>
          {locked ? 'Account Locked' : 'Enter your PIN'}
        </Text>
        <Text style={styles.subtitle}>
          {locked
            ? 'You have exceeded the maximum attempts.\nPlease reset your PIN or sign in again.'
            : 'Welcome back! Enter your 4-digit PIN.'}
        </Text>

        {!locked && <PinDots pin={pin} shakeAnim={shakeAnim} />}

        {error !== '' && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.numpadContainer}>
          {locked ? (
            <View style={styles.lockedActions}>
              <TouchableOpacity
                style={styles.resetViaEmailBtn}
                onPress={openForgotModal}
                activeOpacity={0.85}
              >
                <Feather name="mail" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.resetViaEmailBtnText}>Reset PIN via Email</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signOutBtn}
                onPress={handleSignOut}
                activeOpacity={0.85}
              >
                <Text style={styles.signOutBtnText}>Sign Out & Re-login</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Numpad onPress={handlePress} onDelete={handleDelete} />

              <View style={styles.footerLinksRow}>
                <TouchableOpacity onPress={openForgotModal} activeOpacity={0.6}>
                  <Text style={styles.footerLinkText}>Forgot PIN?</Text>
                </TouchableOpacity>
                <Text style={styles.footerDot}>•</Text>
                <TouchableOpacity onPress={handleSignOut} activeOpacity={0.6}>
                  <Text style={styles.footerLinkText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* ── Forgot PIN Modal ── */}
      <Modal
        visible={forgotModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeForgotModal}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closeForgotModal}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {forgotStep === 'verify' && (
                <TouchableOpacity
                  onPress={() => { setForgotStep('send'); setForgotOtp('') }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="arrow-left" size={20} color={NAVY} />
                </TouchableOpacity>
              )}
              <Text style={styles.sheetTitle}>
                {forgotStep === 'send' ? 'Reset PIN' : 'Enter Verification Code'}
              </Text>
            </View>
            <TouchableOpacity onPress={closeForgotModal}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          {forgotStep === 'send' ? (
            <View style={styles.sheetBody}>
              <View style={styles.sheetIconWrap}>
                <Feather name="mail" size={28} color={NAVY} />
              </View>
              <Text style={styles.sheetDesc}>
                To reset your PIN, we will send a 4-digit verification code to your registered email address.
              </Text>
              <View style={styles.emailBox}>
                <Feather name="at-sign" size={15} color="#64748b" />
                <Text style={styles.emailText} numberOfLines={1}>{userEmail}</Text>
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, forgotLoading && { opacity: 0.7 }]}
                onPress={handleSendForgotOtp}
                disabled={forgotLoading}
                activeOpacity={0.85}
              >
                {forgotLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.primaryBtnText}>Send Verification Code</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.sheetBody}>
              <View style={styles.sheetIconWrap}>
                <Feather name="shield" size={28} color={NAVY} />
              </View>
              <Text style={styles.sheetDesc}>
                Enter the 4-digit code sent to{' '}
                <Text style={{ fontWeight: '700', color: NAVY }}>{userEmail}</Text>
              </Text>

              <View style={styles.otpInputWrap}>
                <TextInput
                  style={styles.otpInput}
                  value={forgotOtp.split('').join(' ')}
                  onChangeText={(text) => setForgotOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={7}
                  placeholder="- - - -"
                  placeholderTextColor="#cbd5e1"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 16 }]}
                onPress={handleVerifyForgotOtp}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryBtnText}>Verify & Reset PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendForgotOtp}
                disabled={forgotCooldown > 0 || forgotLoading}
                activeOpacity={0.6}
              >
                <Text style={[styles.resendText, forgotCooldown > 0 && { color: '#94a3b8' }]}>
                  {forgotCooldown > 0 ? `Resend code in ${forgotCooldown}s` : 'Resend code'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
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
    marginBottom: 28,
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
    marginTop: 8,
    textAlign: 'center',
    minHeight: 20,
  },

  // Locked state
  lockedActions: {
    width: '100%',
    marginTop: 20,
    gap: 12,
  },
  resetViaEmailBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetViaEmailBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  signOutBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 15,
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
    marginTop: 12,
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

  // Footer links
  footerLinksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 12,
  },
  footerLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: BLUE,
  },
  footerDot: {
    fontSize: 14,
    color: '#94a3b8',
  },

  // ── Bottom Sheet Modal ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
  },
  sheetBody: {
    alignItems: 'center',
  },
  sheetIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  sheetDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 20,
  },
  emailText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '600',
    flex: 1,
  },
  primaryBtn: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  otpInputWrap: {
    width: '100%',
    marginBottom: 12,
  },
  otpInput: {
    textAlign: 'center',
    letterSpacing: 10,
    fontSize: 26,
    width: '100%',
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
    borderRadius: 12,
    height: 52,
    color: NAVY,
    fontWeight: '700',
    backgroundColor: '#f8fafc',
  },
  resendBtn: {
    marginTop: 16,
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 14,
    color: BLUE,
    fontWeight: '600',
  },
})
