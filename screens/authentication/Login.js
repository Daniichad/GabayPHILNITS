import React, { useEffect, useState, useRef } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Animated, Image, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as QueryParams from 'expo-auth-session'
import { supabase } from '../../supabase'
import { sendEmailJsOtp } from '../../utils/emailjs'

WebBrowser.maybeCompleteAuthSession()

export default function Login({ navigation }) {
  // Custom warning popup alert states
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error')

  const showCustomAlert = (title, message, type = 'error') => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setAlertVisible(true)
  }
  const checkUserRedirects = async (userId) => {
    // Ensure user profile exists in public.users
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .eq('email', authUser.email)
          .maybeSingle()

        if (!existingUser) {
          await supabase.from('users').upsert({
            fullname: authUser.user_metadata?.full_name || authUser.user_metadata?.fullName || 'Student',
            email: authUser.email,
            role: 'user',
          }, { onConflict: 'email' })
        }
      }
    } catch (profileErr) {
      console.warn('Error checking/creating public profile:', profileErr)
    }

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

    // Both done — check if user has a PIN lock
    const { data: pinData } = await supabase
      .from('users')
      .select('pin_hash')
      .eq('email', (await supabase.auth.getUser()).data.user?.email)
      .maybeSingle()

    if (pinData?.pin_hash) {
      navigation?.replace('PinAuth')
    } else {
      navigation?.replace('Home')
    }
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
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('')
  const [passwordUpdatedVisible, setPasswordUpdatedVisible] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const [generatedForgotOtp, setGeneratedForgotOtp] = useState(null)
  
  const getForgotOtpString = () => forgotOtp

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
        scheme: 'gabay-philcse',
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

            const activeUser = sessionData?.user || sessionData?.session?.user
            if (activeUser) {
              await checkUserRedirects(activeUser.id)
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

      if (error || !data.session) {
        showCustomAlert('Login Error', 'Invalid credentials. Please try again.')
        return
      }

      await checkUserRedirects(data.session.user.id)
    } catch (err) {
      showCustomAlert('Login Error', 'An unexpected error occurred. Please try again.')
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
      // 1. Verify email exists in the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('email')
        .eq('email', forgotEmail.trim())
        .maybeSingle()

      if (userError || !userData) {
        showCustomAlert('Reset Error', 'No account found with this email address.')
        return
      }

      // 2. Generate 4-digit code
      const code = Math.floor(1000 + Math.random() * 9000).toString()
      setGeneratedForgotOtp(code)

      // 3. Send via EmailJS
      await sendEmailJsOtp(forgotEmail.trim(), code, 'Student')

      setForgotStep('verify')
      setForgotOtp('')
      setResetCooldown(60)
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetCode = async () => {
    const code = getForgotOtpString()
    if (code.length < 4) {
      showCustomAlert('Error', 'Please enter the complete 4-digit code')
      return
    }

    if (code !== generatedForgotOtp) {
      showCustomAlert('Verification Error', 'Invalid verification code. Please try again.')
      return
    }

    setForgotStep('reset')
  }

  const handleResetPassword = async () => {
    if (!forgotNewPassword.trim()) {
      showCustomAlert('Error', 'Please enter a new password')
      return
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      showCustomAlert('Error', 'Passwords do not match')
      return
    }

    // Password strength check (8+ characters, 1 upper, 1 lower, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
    if (!passwordRegex.test(forgotNewPassword)) {
      showCustomAlert(
        'Weak Password',
        'Password does not meet complexity requirements.'
      )
      return
    }

    setForgotLoading(true)
    try {
      // Update password in the public users profile table
      const { error } = await supabase
        .from('users')
        .update({ password: forgotNewPassword.trim() })
        .eq('email', forgotEmail.trim())

      if (error) {
        showCustomAlert('Error', 'Could not update password.')
        return
      }

      setForgotVisible(false)
      setPasswordUpdatedVisible(true)
      
      setForgotStep('request')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPassword('')
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred.')
    } finally {
      setForgotLoading(false)
    }
  }
  const isLoginFormValid = email.trim() !== '' && password.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isLoginDisabled = loading || !isLoginFormValid;

  const isForgotEmailValid = forgotEmail.trim() !== '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim());
  const isSendOtpDisabled = forgotLoading || resetCooldown > 0 || !isForgotEmailValid;

  const isVerifyOtpDisabled = forgotLoading || getForgotOtpString().length < 4;

  const isResetPasswordValid = forgotNewPassword !== '' && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/.test(forgotNewPassword) && forgotNewPassword === forgotConfirmPassword;
  const isResetPasswordDisabled = forgotLoading || !isResetPasswordValid;

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
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity activeOpacity={0.8} onPress={() => setForgotVisible(true)}>
            <Text style={styles.forgotPassword}>Forgot the password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={[styles.loginButton, { backgroundColor: isLoginDisabled ? '#f1999d' : '#c14954' }]}
            onPress={handleLogin}
            disabled={isLoginDisabled}
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

      <Modal
        transparent
        visible={forgotVisible}
        animationType="slide"
        onRequestClose={() => {
          setForgotVisible(false)
          setForgotStep('request')
        }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={forgotStep === 'verify' ? styles.verifyCard : styles.modalCard}>
              <TouchableOpacity
                style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}
                onPress={() => {
                  if (forgotStep === 'verify') {
                    setForgotStep('request')
                  } else {
                    setForgotVisible(false)
                    setForgotStep('request')
                    setForgotNewPassword('')
                    setForgotConfirmPassword('')
                    setShowResetPassword(false)
                  }
                }}
              >
                <Feather name="chevron-left" size={28} color="#4B5563" />
              </TouchableOpacity>

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
                    style={[styles.modalButton, { backgroundColor: isSendOtpDisabled ? '#f1999d' : '#c14954' }]}
                    onPress={handleSendResetCode}
                    disabled={isSendOtpDisabled}
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
                  <View style={styles.verifyIconContainer}>
                    <Text style={styles.verifyIcon}>✉️</Text>
                  </View>
                  <Text style={styles.verifyTitle}>Verify OTP</Text>
                  <Text style={styles.verifySubtitle}>
                    We sent a 4-digit code to
                  </Text>
                  <Text style={styles.verifyEmail}>{forgotEmail}</Text>

                  {/* OTP Input */}
                  <View style={styles.otpContainer}>
                    <TextInput
                      style={[styles.modalInput, { textAlign: 'center', letterSpacing: 8, fontSize: 24 }]}
                      value={forgotOtp.split('').join(' ')}
                      onChangeText={(text) => setForgotOtp(text.replace(/[^0-9]/g, '').slice(0, 4))}
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
                      { backgroundColor: isVerifyOtpDisabled ? '#f1999d' : '#c14954' }
                    ]}
                    onPress={handleVerifyResetCode}
                    disabled={isVerifyOtpDisabled}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend */}
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <TouchableOpacity
                      onPress={handleSendResetCode}
                      disabled={resetCooldown > 0 || forgotLoading}
                    >
                      <Text
                        style={[
                          styles.resendLink,
                          resetCooldown > 0 && styles.resendLinkDisabled,
                        ]}
                      >
                        {resetCooldown > 0 ? `Resend in ${resetCooldown}s` : 'Resend'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {forgotStep === 'reset' && (
                <>
                  <Text style={styles.modalTitle}>Reset Password</Text>
                  <Text style={styles.modalSubtitle}>Set a new password for your account.</Text>

                  {/* New Password */}
                  <View style={styles.modalPasswordRow}>
                    <TextInput
                      placeholder="New password"
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      secureTextEntry={!showResetPassword}
                      style={styles.modalPasswordInput}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity style={styles.modalEyeButton} onPress={() => setShowResetPassword(prev => !prev)}>
                      <Feather name={showResetPassword ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.modalPasswordRow}>
                    <TextInput
                      placeholder="Confirm password"
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      secureTextEntry={!showResetPassword}
                      style={styles.modalPasswordInput}
                      placeholderTextColor="#9CA3AF"
                    />
                    <TouchableOpacity style={styles.modalEyeButton} onPress={() => setShowResetPassword(prev => !prev)}>
                      <Feather name={showResetPassword ? 'eye-off' : 'eye'} size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity style={[styles.modalButton, { backgroundColor: isResetPasswordDisabled ? '#f1999d' : '#c14954' }]} onPress={handleResetPassword} disabled={isResetPasswordDisabled}>
                    <Text style={styles.modalButtonText}>{forgotLoading ? 'Saving...' : 'Save Password'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
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
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.modalButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Password Updated Modal */}
      <Modal
        transparent
        visible={passwordUpdatedVisible}
        animationType="fade"
        onRequestClose={() => setPasswordUpdatedVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { alignItems: 'center', padding: 32 }]}>
            {/* Icon Graphic */}
            <View style={{ marginBottom: 24, position: 'relative', width: 100, height: 100, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#0f1e35', alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="key" size={28} color="#fff" />
                </View>
              </View>
              {/* Decorative dots */}
              <View style={{ position: 'absolute', top: 10, left: 10, width: 6, height: 6, borderRadius: 3, backgroundColor: '#94A3B8' }} />
              <View style={{ position: 'absolute', top: 20, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#94A3B8' }} />
              <View style={{ position: 'absolute', bottom: 10, left: 20, width: 8, height: 8, borderRadius: 4, backgroundColor: '#94A3B8' }} />
            </View>

            <Text style={{ fontSize: 20, fontWeight: '700', color: '#0f1e35', marginBottom: 12 }}>
              Password Updated
            </Text>
            
            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 }}>
              Your password has been changed successfully. {'\n'}
              Please use your new password the next time you log in
            </Text>

            <TouchableOpacity
              style={{
                width: '100%',
                height: 48,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: '#0f1e35',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => setPasswordUpdatedVisible(false)}
            >
              <Text style={{ color: '#0f1e35', fontSize: 16, fontWeight: '600' }}>Close</Text>
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
  cancelButton: {
    marginTop: 4,
  },
  cancelText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
  modalPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  modalPasswordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalEyeButton: {
    padding: 4,
  },
})
