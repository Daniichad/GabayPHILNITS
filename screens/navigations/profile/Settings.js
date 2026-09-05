import React, { useState, useEffect, useRef } from 'react'
import {
  ActivityIndicator, Alert, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../utils/supabase'
import { sendEmailJsOtp } from '../../../utils/emailjs'

const NAVY = '#0f2747'
const LANGUAGES = ['English', 'Filipino (Tagalog)']

// ── Toggle Row ────────────────────────────────────────────────────
function ToggleRow({ label, value, onValueChange }) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d5db', true: '#0f2747' }}
        thumbColor="#fff"
        ios_backgroundColor="#d1d5db"
      />
    </View>
  )
}

// ── Arrow Row ─────────────────────────────────────────────────────
function ArrowRow({ label, subtitle, onPress, badge }) {
  return (
    <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Feather name="chevron-right" size={18} color="#94a3b8" style={badge ? { marginLeft: 8 } : undefined} />
    </TouchableOpacity>
  )
}

// ── OTP Boxes ─────────────────────────────────────────────────────
function OtpInput({ value, onChange }) {
  const refs = useRef([])
  const digits = value.split('')

  const handleChange = (text, idx) => {
    const clean = text.replace(/\D/g, '').slice(-1)
    const next = digits.slice()
    next[idx] = clean
    // Fill array to 4 length
    while (next.length < 4) next.push('')
    onChange(next.join(''))
    if (clean && idx < 3) refs.current[idx + 1]?.focus()
  }

  const handleKeyPress = (e, idx) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus()
    }
  }

  return (
    <View style={styles.otpRow}>
      {[0, 1, 2, 3].map((i) => (
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r }}
          style={styles.otpBox}
          value={digits[i] || ''}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
        />
      ))}
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────
export default function Settings({ navigation }) {
  const [notifications, setNotifications] = useState(true)
  const [lightMode, setLightMode] = useState(true)
  const [language, setLanguage] = useState('English')
  const [offlineMode, setOfflineMode] = useState(false)
  const [langModalOpen, setLangModalOpen] = useState(false)
  const [pwModalOpen, setPwModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  // PIN state
  const [hasPin, setHasPin] = useState(false)
  const [pinLoading, setPinLoading] = useState(true)
  const [pinAuthModalOpen, setPinAuthModalOpen] = useState(false)
  const [pinAuthStep, setPinAuthStep] = useState('send')  // 'send' | 'verify'
  const [pinAuthEmail, setPinAuthEmail] = useState('')
  const [pinAuthOtp, setPinAuthOtp] = useState('')
  const [pinAuthGeneratedOtp, setPinAuthGeneratedOtp] = useState(null)
  const [pinAuthLoading, setPinAuthLoading] = useState(false)
  const [pinAuthCooldown, setPinAuthCooldown] = useState(0)

  // Load whether user already has a PIN
  useEffect(() => {
    const loadPinStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('email', user.email)
          .maybeSingle()
        setHasPin(!!data?.pin_hash)
        // Pre-fill the email for OTP
        setPinAuthEmail(user.email || '')
      } catch (e) {
        console.warn('Error loading pin status:', e)
      } finally {
        setPinLoading(false)
      }
    }
    loadPinStatus()
  }, [])

  // Re-check PIN status when returning from SetPin screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase
          .from('users')
          .select('pin_hash')
          .eq('email', user.email)
          .maybeSingle()
        setHasPin(!!data?.pin_hash)
      } catch (e) { /* silent */ }
    })
    return unsubscribe
  }, [navigation])

  // Cooldown countdown for OTP resend
  useEffect(() => {
    if (pinAuthCooldown <= 0) return
    const t = setTimeout(() => setPinAuthCooldown((v) => Math.max(0, v - 1)), 1000)
    return () => clearTimeout(t)
  }, [pinAuthCooldown])

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'Passwords do not match.')
      return
    }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwLoading(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
      setPwModalOpen(false)
    }
  }

  // ── PIN handlers ──────────────────────────────────────────────
  const handlePinPress = () => {
    if (!hasPin) {
      // No PIN yet — go straight to SetPin
      navigation.navigate('SetPin')
    } else {
      // Has PIN — verify email OTP first
      setPinAuthStep('send')
      setPinAuthOtp('')
      setPinAuthGeneratedOtp(null)
      setPinAuthCooldown(0)
      setPinAuthModalOpen(true)
    }
  }

  const closePinAuthModal = () => {
    setPinAuthModalOpen(false)
    setPinAuthStep('send')
    setPinAuthOtp('')
    setPinAuthGeneratedOtp(null)
  }

  const handleSendPinOtp = async () => {
    if (pinAuthCooldown > 0) {
      Alert.alert('Please wait', `You can resend in ${pinAuthCooldown}s`)
      return
    }
    setPinAuthLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setPinAuthGeneratedOtp(code)
      await sendEmailJsOtp(user.email, code, 'Student')
      setPinAuthStep('verify')
      setPinAuthOtp('')
      setPinAuthCooldown(60)
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send verification code')
    } finally {
      setPinAuthLoading(false)
    }
  }

  const handleVerifyPinOtp = () => {
    if (pinAuthOtp.length < 4) {
      Alert.alert('Error', 'Please enter the complete 4-digit code')
      return
    }
    if (pinAuthOtp !== pinAuthGeneratedOtp) {
      Alert.alert('Incorrect Code', 'The code you entered is wrong. Please try again.')
      return
    }
    // Verified — navigate to SetPin
    closePinAuthModal()
    navigation.navigate('SetPin')
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Setting</Text>
          <View style={styles.backBtn} />
        </View>

        {/* ── App Settings Section ── */}
        <Text style={styles.sectionLabel}>App Settings</Text>
        <View style={styles.card}>
          <ToggleRow
            label="Notification"
            value={notifications}
            onValueChange={setNotifications}
          />
          <View style={styles.divider} />
          <ToggleRow
            label="Light Mode"
            value={lightMode}
            onValueChange={setLightMode}
          />
          <View style={styles.divider} />
          <ArrowRow
            label="Language"
            subtitle={language}
            onPress={() => setLangModalOpen(true)}
          />
          <View style={styles.divider} />
          <ArrowRow
            label="Offline Mode"
            subtitle={offlineMode ? 'Enabled' : 'Disabled'}
            onPress={() => setOfflineMode((v) => !v)}
          />
          <View style={styles.divider} />
          <ArrowRow
            label="Change Password"
            onPress={() => setPwModalOpen(true)}
          />
          <View style={styles.divider} />
          {pinLoading ? (
            <View style={[styles.settingRow, { justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color={NAVY} />
            </View>
          ) : (
            <ArrowRow
              label={hasPin ? 'Edit PIN' : 'Set PIN'}
              subtitle={hasPin ? 'PIN is enabled' : 'Add a PIN to secure your account'}
              badge={hasPin ? 'ON' : undefined}
              onPress={handlePinPress}
            />
          )}
        </View>
      </ScrollView>

      {/* ── Language Picker Modal ── */}
      <Modal
        visible={langModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setLangModalOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Select Language</Text>
            <TouchableOpacity onPress={() => setLangModalOpen(false)}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[styles.sheetOption, language === lang && styles.sheetOptionActive]}
              onPress={() => { setLanguage(lang); setLangModalOpen(false) }}
            >
              <Text style={[styles.sheetOptionText, language === lang && styles.sheetOptionTextActive]}>
                {lang}
              </Text>
              {language === lang && <Feather name="check" size={16} color={NAVY} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Change Password Modal ── */}
      <Modal
        visible={pwModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPwModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setPwModalOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Change Password</Text>
            <TouchableOpacity onPress={() => setPwModalOpen(false)}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          <Text style={styles.pwLabel}>New Password</Text>
          <TextInput
            style={styles.pwInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.pwLabel}>Confirm Password</Text>
          <TextInput
            style={styles.pwInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.pwBtn, pwLoading && { opacity: 0.7 }]}
            onPress={handleChangePassword}
            disabled={pwLoading}
            activeOpacity={0.85}
          >
            <Text style={styles.pwBtnText}>{pwLoading ? 'Saving…' : 'Update Password'}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── PIN Email Verification Modal ── */}
      <Modal
        visible={pinAuthModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closePinAuthModal}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={closePinAuthModal}
        />
        <View style={[styles.sheet, styles.pinAuthSheet]}>
          {/* Sheet header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {pinAuthStep === 'verify' && (
                <TouchableOpacity
                  onPress={() => { setPinAuthStep('send'); setPinAuthOtp('') }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name="arrow-left" size={20} color={NAVY} />
                </TouchableOpacity>
              )}
              <Text style={styles.sheetTitle}>
                {pinAuthStep === 'send' ? 'Verify Your Identity' : 'Enter Verification Code'}
              </Text>
            </View>
            <TouchableOpacity onPress={closePinAuthModal}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>

          {pinAuthStep === 'send' ? (
            /* ── Step 1: send code ── */
            <View style={styles.pinAuthBody}>
              <View style={styles.pinAuthIconWrap}>
                <Feather name="mail" size={28} color={NAVY} />
              </View>
              <Text style={styles.pinAuthDesc}>
                To edit your PIN, we'll send a verification code to your registered email address.
              </Text>
              <View style={styles.pinEmailBox}>
                <Feather name="at-sign" size={15} color="#64748b" />
                <Text style={styles.pinEmailText} numberOfLines={1}>{pinAuthEmail}</Text>
              </View>
              <TouchableOpacity
                style={[styles.pwBtn, pinAuthLoading && { opacity: 0.7 }]}
                onPress={handleSendPinOtp}
                disabled={pinAuthLoading}
                activeOpacity={0.85}
              >
                {pinAuthLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.pwBtnText}>Send Code</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Step 2: enter code ── */
            <View style={styles.pinAuthBody}>
              <View style={styles.pinAuthIconWrap}>
                <Feather name="shield" size={28} color={NAVY} />
              </View>
              <Text style={styles.pinAuthDesc}>
                Enter the 4-digit code sent to{' '}
                <Text style={{ fontWeight: '700', color: NAVY }}>{pinAuthEmail}</Text>
              </Text>

              <OtpInput value={pinAuthOtp} onChange={setPinAuthOtp} />

              <TouchableOpacity
                style={[styles.pwBtn, { marginTop: 20 }]}
                onPress={handleVerifyPinOtp}
                activeOpacity={0.85}
              >
                <Text style={styles.pwBtnText}>Verify & Edit PIN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleSendPinOtp}
                disabled={pinAuthCooldown > 0 || pinAuthLoading}
                activeOpacity={0.6}
              >
                <Text style={[styles.resendText, pinAuthCooldown > 0 && { color: '#94a3b8' }]}>
                  {pinAuthCooldown > 0 ? `Resend code in ${pinAuthCooldown}s` : 'Resend code'}
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
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 54,
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: NAVY,
  },

  // ── Section ──
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#f1f5f9',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 18,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    minHeight: 52,
  },
  settingLabel: {
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
    flex: 1,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
  },

  // ── Badge ──
  badge: {
    backgroundColor: NAVY,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // ── Bottom-sheet modals ──
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  pinAuthSheet: {
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(15,39,71,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  sheetOptionText: {
    fontSize: 15,
    color: '#475569',
  },
  sheetOptionTextActive: {
    color: NAVY,
    fontWeight: '700',
  },

  // ── Change Password fields ──
  pwLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 14,
  },
  pwInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 15,
    color: NAVY,
  },
  pwBtn: {
    backgroundColor: NAVY,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  pwBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── PIN Auth Modal body ──
  pinAuthBody: {
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: 'center',
  },
  pinAuthIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  pinAuthDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 290,
  },
  pinEmailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  pinEmailText: {
    fontSize: 14,
    color: NAVY,
    fontWeight: '500',
    flex: 1,
  },

  // ── OTP boxes ──
  otpRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginTop: 8,
  },
  otpBox: {
    width: 54,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    fontSize: 22,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
  },

  // ── Resend ──
  resendBtn: {
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 13,
    color: NAVY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
})
