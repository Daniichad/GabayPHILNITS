import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Animated, Image } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as QueryParams from 'expo-auth-session'
import { supabase } from '../../supabase'

WebBrowser.maybeCompleteAuthSession()

export default function Login({ navigation }) {
  // Custom warning popup alert states
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')

  const showCustomAlert = (title, message) => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }
  const checkUserRedirects = async (userId) => {
    // Check if personal info has been completed
    const { data: personalInfoData, error: personalInfoError } = await supabase
      .from('personal_info')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (personalInfoError || !personalInfoData) {
      navigation?.replace('PersonalInfo')
      return
    }

    // Check if diagnostic assessment has been completed
    const { data: diagnosticData, error: diagnosticError } = await supabase
      .from('diagnostic_assessment_attempts')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (diagnosticError || !diagnosticData) {
      navigation?.replace('DiagnosticAssessment')
      return
    }

    // Both done — go straight to Home
    navigation?.replace('Home')
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [forgotVisible, setForgotVisible] = useState(false)
  const [forgotStep, setForgotStep] = useState('request')
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotNewPassword, setForgotNewPassword] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)

  // Floating placeholder animations
  const emailAnim = useState(new Animated.Value(email ? 1 : 0))[0]
  const passAnim = useState(new Animated.Value(password ? 1 : 0))[0]

  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)

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

  useEffect(() => {
    if (resetCooldown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setResetCooldown((value) => Math.max(0, value - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [resetCooldown])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      const redirectUrl = QueryParams.makeRedirectUri({
        scheme: 'gabay_philcse',
      })
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        showCustomAlert('Google Sign-in Error', error.message)
        return
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)
        
        if (result.type === 'success' && result.url) {
          // Parse dynamic hash parameters from return URI
          const parsed = QueryParams.parseQueryParams(result.url)
          const accessToken = parsed.access_token || result.url.match(/access_token=([^&]+)/)?.[1]
          const refreshToken = parsed.refresh_token || result.url.match(/refresh_token=([^&]+)/)?.[1]

          if (accessToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            })

            if (sessionError) {
              showCustomAlert('Session Error', sessionError.message)
              return
            }

            if (sessionData?.user) {
              await checkUserRedirects(sessionData.user.id)
            }
          }
        }
      }
    } catch (err) {
      showCustomAlert('Google Sign-in Error', err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      showCustomAlert('Validation Error', 'Please fill in both email and password.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      showCustomAlert('Validation Error', 'Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (error) {
        showCustomAlert('Login Error', error.message || 'Invalid credentials')
        return
      }

      if (!data.session) {
        showCustomAlert('Login Error', 'Invalid credentials')
        return
      }

      await checkUserRedirects(data.session.user.id)
    } catch (err) {
      showCustomAlert('Login Error', err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetCode = async () => {
    if (!forgotEmail.trim()) {
      showCustomAlert('Error', 'Please enter your email address')
      return
    }

    if (resetCooldown > 0) {
      showCustomAlert('Please wait', `You can request another code in ${resetCooldown} seconds.`)
      return
    }

    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotEmail.trim(),
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        showCustomAlert('Reset Error', error.message || 'Could not send the code')
        return
      }

      setForgotStep('verify')
      setResetCooldown(60)
      showCustomAlert('Code Sent', 'Check your email for the one-time code.')
    } catch (err) {
      showCustomAlert('Reset Error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetCode = async () => {
    if (!forgotOtp.trim()) {
      showCustomAlert('Error', 'Please enter the code from your email')
      return
    }

    setForgotLoading(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: forgotOtp.trim(),
        type: 'email',
      })

      if (error) {
        showCustomAlert('Verification Error', error.message || 'Invalid code')
        return
      }

      if (data.session) {
        setForgotStep('reset')
      }
    } catch (err) {
      showCustomAlert('Verification Error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!forgotNewPassword.trim()) {
      showCustomAlert('Error', 'Please enter a new password')
      return
    }

    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: forgotNewPassword.trim(),
      })

      if (error) {
        showCustomAlert('Reset Error', error.message || 'Could not update password')
        return
      }

      showCustomAlert('Success', 'Your password has been updated')
      setForgotVisible(false)
      setForgotStep('request')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPassword('')
    } catch (err) {
      showCustomAlert('Reset Error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
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
          <Text style={styles.heading}>Enter to your account</Text>

          {/* Google Button */}
          <TouchableOpacity 
            style={styles.googleButton} 
            activeOpacity={0.85}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Image 
              source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }} 
              style={{ width: 18, height: 18, marginRight: 10 }} 
            />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Email Input */}
          <View style={[styles.inputContainer, emailFocused && styles.inputContainerFocused]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: emailAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26], // Slides up along the top border line
                      }),
                    },
                  ],
                  fontSize: emailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 12], // Scales down
                  }),
                  color: emailAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['#9CA3AF', '#3B82B8'], // Colors match active inputs
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

          {/* Password Input */}
          <View style={[styles.inputContainer, passFocused && styles.inputContainerFocused, { marginTop: 14 }]}>
            <Animated.Text
              style={[
                styles.floatingLabel,
                {
                  transform: [
                    {
                      translateY: passAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -26], // Adjusted relative to inputContainer center line
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
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)}>
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setForgotVisible(true)}>
            <Text style={styles.forgotPassword}>Forgot the password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>{loading ? 'Signing in...' : 'Login'}</Text>
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation && navigation.navigate('Register')}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Text */}
      <Text style={styles.bottomText}>Log In to continue your CSE preparation</Text>

      <Modal transparent visible={forgotVisible} animationType="fade" onRequestClose={() => setForgotVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {forgotStep === 'request' && (
              <>
                <Text style={styles.modalTitle}>Reset Your Password</Text>
                <Text style={styles.modalSubtitle}>Enter your email address and we’ll send a one-time code.</Text>
                <TextInput
                  placeholder="Email"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.modalInput}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  style={[styles.modalButton, (forgotLoading || resetCooldown > 0) && styles.modalButtonDisabled]}
                  onPress={handleSendResetCode}
                  disabled={forgotLoading || resetCooldown > 0}
                >
                  <Text style={styles.modalButtonText}>
                    {forgotLoading
                      ? 'Sending...'
                      : resetCooldown > 0
                        ? `Wait ${resetCooldown}s`
                        : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 'verify' && (
              <>
                <Text style={styles.modalTitle}>Verify OTP</Text>
                <Text style={styles.modalSubtitle}>Type the code we sent to {forgotEmail}</Text>
                <TextInput
                  placeholder="One-time code"
                  value={forgotOtp}
                  onChangeText={setForgotOtp}
                  keyboardType="number-pad"
                  style={styles.modalInput}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleVerifyResetCode} disabled={forgotLoading}>
                  <Text style={styles.modalButtonText}>{forgotLoading ? 'Verifying...' : 'Verify'}</Text>
                </TouchableOpacity>
              </>
            )}

            {forgotStep === 'reset' && (
              <>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>Set a new password for your account.</Text>
                <TextInput
                  placeholder="New password"
                  value={forgotNewPassword}
                  onChangeText={setForgotNewPassword}
                  secureTextEntry
                  style={styles.modalInput}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity style={styles.modalButton} onPress={handleResetPassword} disabled={forgotLoading}>
                  <Text style={styles.modalButtonText}>{forgotLoading ? 'Saving...' : 'Save Password'}</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              onPress={() => {
                setForgotVisible(false)
                setForgotStep('request')
              }}
            >
              <Text style={styles.modalLink}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Warning Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', padding: 24 }]}>
            <View style={{ backgroundColor: '#FEE2E2', padding: 12, borderRadius: 32, marginBottom: 16 }}>
              <Ionicons name="warning" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalTitle, { fontSize: 18, marginBottom: 8 }]}>{alertTitle}</Text>
            <Text style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {alertMessage}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { width: '100%', backgroundColor: '#EF4444' }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1e35',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    width: 90,
    height: 90,
    marginBottom: 28,
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
    marginBottom: 40,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  googleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 50,
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
    marginBottom: 16,
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
  forgotPassword: {
    color: '#3B82B8',
    fontSize: 14,
    textAlign: 'right',
    marginTop: 8,
    marginBottom: 20,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: '#1a1a1a',
    fontSize: 14,
  },
  signupLink: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 30, 53, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 16,
    color: '#111827',
  },
  modalButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalButtonDisabled: {
    opacity: 0.7,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalLink: {
    color: '#3B82B8',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
})
