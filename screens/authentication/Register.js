import React, { useState, useRef } from 'react'
import {
  Modal,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { supabase } from '../../utils/supabase'

export default function Register({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [termsVisible, setTermsVisible] = useState(false)
  const [verifyVisible, setVerifyVisible] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // 6-digit OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const inputRefs = useRef([])

  // ─── OTP helpers ───────────────────────────────────────────────
  const handleOtpChange = (text, index) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    // Auto-advance to next box
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp]
        newOtp[index - 1] = ''
        setOtp(newOtp)
        inputRefs.current[index - 1]?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    }
  }

  const handleOtpPaste = (text, index) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, 6)
    if (digits.length > 0) {
      const newOtp = ['', '', '', '', '', '']
      digits.split('').forEach((d, i) => {
        newOtp[i] = d
      })
      setOtp(newOtp)
      const nextIndex = Math.min(digits.length, 5)
      inputRefs.current[nextIndex]?.focus()
    }
  }

  const getOtpString = () => otp.join('')

  const startResendCooldown = () => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // ─── Register ─────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address')
      return
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (!agreeTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions')
      return
    }

    setLoading(true)
    try {
      // Step 1: Create the Supabase auth account
      // Supabase will send a 6-digit OTP to the email when "Email OTP" is enabled
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (error) {
        Alert.alert('Registration Error', error.message || 'Could not create account')
        return
      }

      // Step 2: Save profile to users table
      const { error: profileError } = await supabase.from('users').upsert(
        [
          {
            fullname: fullName.trim(),
            email: email.trim(),
            role: 'user',
          },
        ],
        { onConflict: 'email' }
      )

      if (profileError) {
        console.warn('Profile save warning:', profileError.message)
      }

      // Step 3: Show OTP verification modal
      // Supabase automatically sends 6-digit OTP to the email on signUp
      setOtp(['', '', '', '', '', ''])
      setVerifyVisible(true)
      startResendCooldown()
    } catch (err) {
      Alert.alert('Registration Error', err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify OTP ───────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    const code = getOtpString()
    if (code.length < 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code')
      return
    }

    setVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code,
        type: 'signup',
      })

      if (error) {
        Alert.alert('Verification Failed', error.message || 'Invalid or expired code. Please try again.')
        return
      }

      setVerifyVisible(false)
      setOtp(['', '', '', '', '', ''])
      Alert.alert('Success! 🎉', 'Your email has been verified. Welcome to Gabay PhilCSE!', [
        {
          text: 'Continue',
          onPress: () => navigation?.replace('PersonalInfo'),
        },
      ])
    } catch (err) {
      Alert.alert('Verification Error', err.message || String(err))
    } finally {
      setVerifying(false)
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────
  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setResending(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })

      if (error) {
        Alert.alert('Error', error.message || 'Could not resend code')
        return
      }

      setOtp(['', '', '', '', '', ''])
      startResendCooldown()
      Alert.alert('Code Sent', `A new verification code has been sent to ${email}`)
    } catch (err) {
      Alert.alert('Error', err.message || String(err))
    } finally {
      setResending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>G</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.heading}>Create your account</Text>

          {/* Full Name */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholderTextColor="#999"
          />

          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor="#999"
          />

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁' : '👁‍🗨'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordRow}>
            <TextInput
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              style={[styles.input, styles.passwordInput]}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
            >
              <Text style={styles.eyeButtonText}>{showPassword ? '👁' : '👁‍🗨'}</Text>
            </TouchableOpacity>
          </View>

          {/* Terms Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              {agreeTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>I agree to the </Text>
            <TouchableOpacity onPress={() => setTermsVisible(true)}>
              <Text style={styles.termsLink}>terms and conditions</Text>
            </TouchableOpacity>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation?.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.bottomIconContainer}>
          <Text style={styles.bottomIcon}>📋</Text>
        </View>
        <Text style={styles.bottomText}>Start your Civil Service Exam Preparation Journey</Text>
      </ScrollView>

      {/* ── Terms Modal ── */}
      <Modal
        transparent
        visible={termsVisible}
        animationType="fade"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <Text style={styles.modalText}>
                By creating an account, you agree to provide accurate information, keep your login
                details secure, and use the app responsibly. Your email may be used for account
                verification, password recovery, and important service updates. Continued use of
                the app means you accept any future updates to these terms.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setTermsVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Verify Email Modal ── */}
      <Modal
        transparent
        visible={verifyVisible}
        animationType="slide"
        onRequestClose={() => setVerifyVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.verifyCard}>
              {/* Header */}
              <View style={styles.verifyIconContainer}>
                <Text style={styles.verifyIcon}>✉️</Text>
              </View>
              <Text style={styles.verifyTitle}>Verify your email</Text>
              <Text style={styles.verifySubtitle}>
                We sent a 6-digit code to
              </Text>
              <Text style={styles.verifyEmail}>{email}</Text>

              {/* 6-Digit OTP Boxes */}
              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpBox,
                      digit !== '' && styles.otpBoxFilled,
                    ]}
                    value={digit}
                    onChangeText={(text) => {
                      // Handle paste (text length > 1)
                      if (text.length > 1) {
                        handleOtpPaste(text, index)
                      } else {
                        handleOtpChange(text, index)
                      }
                    }}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                    selectionColor="#D9989E"
                    placeholderTextColor="#D1D5DB"
                    placeholder="·"
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (verifying || getOtpString().length < 6) && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyEmail}
                disabled={verifying || getOtpString().length < 6}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>

              {/* Resend */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendCode}
                  disabled={resendCooldown > 0 || resending}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color="#3B82B8" />
                  ) : (
                    <Text
                      style={[
                        styles.resendLink,
                        resendCooldown > 0 && styles.resendLinkDisabled,
                      ]}
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Cancel */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setVerifyVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1e35',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#D9989E',
  },
  formContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
    fontSize: 16,
    color: '#1a1a1a',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 4,
  },
  eyeButton: {
    marginLeft: -48,
    marginBottom: 4,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 18,
    color: '#3B82B8',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    flexWrap: 'wrap',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3B82B8',
    borderColor: '#3B82B8',
  },
  checkboxMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    color: '#1a1a1a',
    fontSize: 14,
  },
  termsLink: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  createButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#1a1a1a',
    fontSize: 14,
  },
  loginLink: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomIconContainer: {
    marginBottom: 12,
  },
  bottomIcon: {
    fontSize: 32,
  },
  bottomText: {
    color: '#ffffff99',
    fontSize: 13,
    textAlign: 'center',
  },

  // ── Modals ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 53, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalBody: {
    maxHeight: 220,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  modalButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ── Verify Card ──
  verifyCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    maxWidth: 420,
  },
  verifyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyIcon: {
    fontSize: 36,
  },
  verifyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  verifySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  verifyEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f1e35',
    marginTop: 2,
    marginBottom: 28,
    textAlign: 'center',
  },

  // ── OTP Boxes ──
  otpContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  otpBoxFilled: {
    borderColor: '#D9989E',
    backgroundColor: '#FFF1F2',
    color: '#D9989E',
  },

  // ── Verify Button ──
  verifyButton: {
    width: '100%',
    backgroundColor: '#D9989E',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Resend ──
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    fontSize: 13,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 13,
    color: '#3B82B8',
    fontWeight: '700',
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },

  // ── Cancel ──
  cancelButton: {
    paddingVertical: 8,
  },
  cancelText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
})
