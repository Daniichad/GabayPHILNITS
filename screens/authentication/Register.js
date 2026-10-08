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
  Animated,
  Image,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'
import { sendEmailJsOtp } from '../../utils/emailjs'

export default function Register({ navigation }) {
  // Custom warning popup alert states
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')
  const [onAlertClose, setOnAlertClose] = useState(null)

  const showCustomAlert = (title, message, type = 'error', onClose = null) => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setOnAlertClose(() => onClose)
    setAlertVisible(true)
  }

  const closeAlert = () => {
    setAlertVisible(false)
    if (onAlertClose) {
      onAlertClose()
      setOnAlertClose(null)
    }
  }

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
  const [generatedOtp, setGeneratedOtp] = useState(null)

  // Floating placeholder animations
  const nameAnim = useState(new Animated.Value(fullName ? 1 : 0))[0]
  const emailAnim = useState(new Animated.Value(email ? 1 : 0))[0]
  const passAnim = useState(new Animated.Value(password ? 1 : 0))[0]
  const confirmAnim = useState(new Animated.Value(confirmPassword ? 1 : 0))[0]

  const [nameFocused, setNameFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [confirmFocused, setConfirmFocused] = useState(false)

  const handleFocus = (anim) => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start()
  }

  const handleBlur = (anim, text) => {
    if (!text) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }).start()
    }
  }

  // 4-digit OTP state
  const [otp, setOtp] = useState('')
  const getOtpString = () => otp

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
    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      showCustomAlert('Validation Error', 'Please fill in all fields.')
      return
    }

    if (trimmedName.length < 2) {
      showCustomAlert('Validation Error', 'Full Name must be at least 2 characters.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showCustomAlert('Validation Error', 'Please enter a valid email address.')
      return
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
    if (!passwordRegex.test(password)) {
      showCustomAlert(
        'Weak Password',
        'Password does not meet complexity requirements.'
      )
      return
    }

    if (password !== confirmPassword) {
      showCustomAlert('Validation Error', 'Passwords do not match.')
      return
    }

    if (!agreeTerms) {
      showCustomAlert('Validation Error', 'Please agree to the terms and conditions.')
      return
    }

    setLoading(true)
    try {
      // 1. Check if email is already registered
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('email')
        .eq('email', trimmedEmail)
        .maybeSingle()

      if (checkError) {
        console.warn('Email check error:', checkError.message)
      }

      if (existingUser) {
        showCustomAlert('Registration Error', 'Email already in use. Please log in.')
        setLoading(false)
        return
      }

      // 2. Generate 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedOtp(code)

      // 3. Send 4-digit code using EmailJS
      await sendEmailJsOtp(trimmedEmail, code, trimmedName)

      // 3. Open Verification Modal
      setOtp('')
      setVerifyVisible(true)
      startResendCooldown()
    } catch (err) {
      showCustomAlert('Error', 'Could not send verification email.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Verify OTP ───────────────────────────────────────────────
  const handleVerifyEmail = async () => {
    const code = getOtpString()
    if (code.length < 4) {
      showCustomAlert('Error', 'Please enter the complete 4-digit code')
      return
    }

    if (code !== generatedOtp) {
      showCustomAlert('Verification Failed', 'Invalid verification code. Please try again.')
      return
    }

    setVerifying(true)
    try {
      // Create user account in Supabase since verification is successful
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
        showCustomAlert('Error', 'Could not create account.')
        return
      }

      // Save profile to users table
      const { error: profileError } = await supabase.from('users').upsert(
        [
          {
            fullname: fullName.trim(),
            email: email.trim(),
            role: 'user',
            password: password,
          },
        ],
        { onConflict: 'email' }
      )

      if (profileError) {
        showCustomAlert('Error', 'Could not create profile.')
        return
      }

      // Sign out to clear the auto-login session from signUp
      await supabase.auth.signOut()

      setVerifyVisible(false)
      setOtp('')
      showCustomAlert(
        'Success',
        'Your account has been created successfully! You can now log in.',
        'success',
        () => navigation?.replace('Login')
      )
    } catch (err) {
      showCustomAlert('Error', 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────
  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setResending(true)
    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedOtp(code)

      await sendEmailJsOtp(email.trim(), code, fullName.trim() || 'Student')

      setOtp('')
      startResendCooldown()
      showCustomAlert('Code Sent', 'Verification code has been sent.', 'success')
    } catch (err) {
      showCustomAlert('Error', 'Could not resend verification email.')
    } finally {
      setResending(false)
    }
  }

  const isRegisterFormValid =
    fullName.trim().length >= 2 &&
    email.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    password !== '' && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(password) &&
    password === confirmPassword &&
    agreeTerms;
  const isRegisterDisabled = loading || !isRegisterFormValid;

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
          <Image
            source={require('../../assets/loading.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.heading}>Create your account</Text>

          {/* Full Name */}
          <View style={[styles.inputContainer, nameFocused && styles.inputContainerFocused]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: nameAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26],
                      }),
                    },
                  ],
                  fontSize: nameAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 12],
                  }),
                  color: nameAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#9CA3AF', '#3B82B8'],
                  }),
                  zIndex: 10,
                },
              ]}
              pointerEvents="none"
            >
              Full Name
            </Animated.Text>
            <TextInput
              value={fullName}
              onChangeText={(text) => {
                setFullName(text)
                if (text) handleFocus(nameAnim)
              }}
              onFocus={() => {
                setNameFocused(true)
                handleFocus(nameAnim)
              }}
              onBlur={() => {
                setNameFocused(false)
                handleBlur(nameAnim, fullName)
              }}
              style={styles.floatingInput}
            />
          </View>

          {/* Email */}
          <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused, { marginTop: 14 }]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: emailAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26],
                      }),
                    },
                  ],
                  fontSize: emailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 12],
                  }),
                  color: emailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#9CA3AF', '#3B82B8'],
                  }),
                  zIndex: 10,
                },
              ]}
              pointerEvents="none"
            >
              Email
            </Animated.Text>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text)
                if (text) handleFocus(emailAnim)
              }}
              onFocus={() => {
                setEmailFocused(true)
                handleFocus(emailAnim)
              }}
              onBlur={() => {
                setEmailFocused(false)
                handleBlur(emailAnim, email)
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.floatingInput}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputContainer, passFocused && styles.inputContainerFocused, { marginTop: 14 }]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: passAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26],
                      }),
                    },
                  ],
                  fontSize: passAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 12],
                  }),
                  color: passAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#9CA3AF', '#3B82B8'],
                  }),
                  zIndex: 10,
                },
              ]}
              pointerEvents="none"
            >
              Password
            </Animated.Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  if (text) handleFocus(passAnim)
                }}
                onFocus={() => {
                  setPassFocused(true)
                  handleFocus(passAnim)
                }}
                onBlur={() => {
                  setPassFocused(false)
                  handleBlur(passAnim, password)
                }}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={[styles.inputContainer, confirmFocused && styles.inputContainerFocused, { marginTop: 14 }]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: confirmAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26],
                      }),
                    },
                  ],
                  fontSize: confirmAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 12],
                  }),
                  color: confirmAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#9CA3AF', '#3B82B8'],
                  }),
                  zIndex: 10,
                },
              ]}
              pointerEvents="none"
            >
              Confirm Password
            </Animated.Text>
            <View style={styles.passwordRow}>
              <TextInput
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text)
                  if (text) handleFocus(confirmAnim)
                }}
                onFocus={() => {
                  setConfirmFocused(true)
                  handleFocus(confirmAnim)
                }}
                onBlur={() => {
                  setConfirmFocused(false)
                  handleBlur(confirmAnim, confirmPassword)
                }}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
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
            style={[styles.createButton, { backgroundColor: isRegisterDisabled ? '#f1999d' : '#c14954' }]}
            onPress={handleRegister}
            disabled={isRegisterDisabled}
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
            <TouchableOpacity
              style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
              onPress={() => setTermsVisible(false)}
            >
              <Feather name="chevron-left" size={28} color="#4B5563" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <Text style={styles.modalText}>
                {"1. Acceptance of Terms\nBy accessing and using GABAY CSE, you agree to comply with and be bound by these Terms and Conditions. If you do not agree, you must not use the application.\n\n" +
                  "2. Purpose of the Application\nGABAY PhilCSE is a mobile-based reviewer designed to assist users in preparing for the Civil Service Examination. The application provides learning materials, quizzes, analytics, and study recommendations for educational purposes only.\n\n" +
                  "3. User Responsibilities\nUsers agree to:\n• Provide accurate and complete information upon registration\n• Maintain the confidentiality of their account credentials\n• Use the application for lawful and educational purposes only\n• Avoid sharing, copying, or distributing content without permission\n\n" +
                  "4. Account Management\nThe system allows users to create and manage accounts. The developers reserve the right to suspend or terminate accounts that violate these terms or engage in unauthorized activities.\n\n" +
                  "5. Content and Intellectual Property\nAll content within the application, including questions, materials, and features, is the intellectual property of the developers unless otherwise stated. Unauthorized reproduction or distribution is strictly prohibited.\n\n" +
                  "6. Data Privacy\nUser data such as personal information and performance data will be collected and used solely for system functionality, analytics, and improving user experience. The system ensures reasonable protection of user data but does not guarantee absolute security.\n\n" +
                  "7. System Limitations\n• The application does not guarantee passing the Civil Service Examination.\n• Results from analytics and predictions are estimates based on user performance.\n• The system is not affiliated with or officially connected to the Civil Service Commission (CSC).\n\n" +
                  "8. Availability of Service\nThe developers aim to provide continuous access to the application; however, interruptions may occur due to maintenance, updates, or technical issues.\n\n" +
                  "9. Updates and Modifications\nThe developers reserve the right to modify, update, or discontinue features of the application at any time without prior notice.\n\n" +
                  "10. Limitation of Liability\nThe developers shall not be held liable for any damages, losses, or consequences resulting from the use or inability to use the application.\n\n" +
                  "11. Termination of Use\nUsers may stop using the application at any time. The developers may terminate access if the user violates any terms stated above.\n\n" +
                  "12. Governing Law\nThese Terms and Conditions shall be governed by the laws of the Republic of the Philippines."}
              </Text>
            </ScrollView>
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
              <TouchableOpacity
                style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
                onPress={() => setVerifyVisible(false)}
              >
                <Feather name="chevron-left" size={28} color="#4B5563" />
              </TouchableOpacity>
              {/* Header */}
              <View style={styles.verifyIconContainer}>
                <Text style={styles.verifyIcon}>✉️</Text>
              </View>
              <Text style={styles.verifyTitle}>Verify your email</Text>
              <Text style={styles.verifySubtitle}>
                We sent a 4-digit code to
              </Text>
              <Text style={styles.verifyEmail}>{email}</Text>

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                <TextInput
                  style={[styles.modalInput, { textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
                  value={otp.split('').join(' ')}
                  onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  keyboardType="number-pad"
                  maxLength={7}
                  placeholder="- - - -"
                  placeholderTextColor="#D1D5DB"
                />
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  (verifying || getOtpString().length < 4) && styles.verifyButtonDisabled,
                ]}
                onPress={handleVerifyEmail}
                disabled={verifying || getOtpString().length < 4}
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

            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={closeAlert}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', padding: 24 }]}>
            {alertType === 'success' ? (
              <View style={{ backgroundColor: '#D1FAE5', padding: 12, borderRadius: 32, marginBottom: 16 }}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
            ) : (
              <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 32, marginBottom: 16 }}>
                <Ionicons name="warning" size={32} color="#EF4444" />
              </View>
            )}
            <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 8 }]}>{alertTitle}</Text>
            <Text style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {alertMessage}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { width: '100%', backgroundColor: alertType === 'success' ? '#10B981' : '#EF4444' }
              ]}
              onPress={closeAlert}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    width: 90,
    height: 90,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
  inputContainer: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    height: 52,
    position: 'relative',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  inputContainerFocused: {
    borderColor: '#3B82B8',
  },
  floatingLabel: {
    position: 'absolute',
    left: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  floatingInput: {
    width: '100%',
    fontSize: 15,
    color: '#1a1a1a',
    height: '100%',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    width: '100%',
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#1a1a1a',
  },
  eyeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 16,
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
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    maxWidth: 420,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalBody: {
    maxHeight: 420,
    marginBottom: 18,
  },
  modalText: {
    fontSize: 13,
    lineHeight: 20,
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
