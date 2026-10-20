import React, { useEffect, useState, useRef } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Animated, Image, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import * as QueryParams from 'expo-auth-session'
import { supabase } from '../../supabase'
import { sendEmailJsOtp } from '../../utils/emailjs'
import { saveUserCache } from '../../utils/database'

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
  const checkUserRedirects = async (userId, userEmail) => {
    // Ensure user profile exists in public.users
    const effectiveEmail = userEmail || (await supabase.auth.getUser()).data.user?.email
    try {
      if (effectiveEmail) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('email')
          .ilike('email', effectiveEmail)
          .maybeSingle()

        if (!existingUser) {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          await supabase.from('users').upsert({
            fullname: authUser?.user_metadata?.full_name || authUser?.user_metadata?.fullName || 'Student',
            email: effectiveEmail,
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
      .ilike('email', effectiveEmail)
      .maybeSingle()

    const hasPin = Boolean(pinData?.pin_hash && String(pinData.pin_hash).trim().length > 0)

    // Sync to local cache
    await saveUserCache(userId, hasPin ? pinData.pin_hash : null, true, true)

    if (hasPin) {
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
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [resetCooldown, setResetCooldown] = useState(0)
  const [generatedForgotOtp, setGeneratedForgotOtp] = useState(null)
  const forgotOtpInputRef = useRef(null)
  const [isForgotOtpFocused, setIsForgotOtpFocused] = useState(false)

  useEffect(() => {
    if (forgotVisible && forgotStep === 'verify') {
      const timer = setTimeout(() => {
        forgotOtpInputRef.current?.focus()
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [forgotVisible, forgotStep])

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
        scheme: 'gabay-philnits',
      })

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      })

      if (error) {
        showCustomAlert('Login Error', 'Google sign-in could not be completed. Please try again.')
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
              showCustomAlert('Login Error', 'Failed to authenticate session. Please try again.')
              return
            }

            const activeUser = sessionData?.user || sessionData?.session?.user
            if (activeUser) {
              await checkUserRedirects(activeUser.id, activeUser.email)
            }
          }
        }
      }
    } catch (err) {
      showCustomAlert('Login Error', 'Google sign-in could not be completed. Please try again.')
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
        showCustomAlert('Login Error', 'Invalid login credentials.')
        return
      }

      await checkUserRedirects(data.session.user.id, data.session.user.email)
    } catch (err) {
      showCustomAlert('Login Error', 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetCode = async () => {
    if (!forgotEmail.trim()) {
      showCustomAlert('Validation Error', 'Please enter your email address.')
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
      showCustomAlert('Reset Error', 'Could not send verification code. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetCode = async () => {
    const code = getForgotOtpString()
    if (code.length < 4) {
      showCustomAlert('Validation Error', 'Please enter the complete 4-digit code.')
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
      showCustomAlert('Validation Error', 'Please enter a new password.')
      return
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      showCustomAlert('Validation Error', 'Passwords do not match.')
      return
    }

    // Password strength check (8+ characters, 1 upper, 1 lower, 1 number, 1 special char)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/
    if (!passwordRegex.test(forgotNewPassword)) {
      showCustomAlert(
        'Weak Password',
        'Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character (e.g., @$!%*?&).'
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
        showCustomAlert('Reset Error', 'Could not update password. Please try again.')
        return
      }

      setForgotVisible(false)
      setPasswordUpdatedVisible(true)

      setForgotStep('request')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPassword('')
    } catch (err) {
      showCustomAlert('Reset Error', 'An unexpected error occurred. Please try again.')
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
      <Text style={styles.bottomText}>Log In to continue your PhilNITS preparation</Text>

      {/* ── Forgot Password Modal (Steps 1, 2, 3) ── */}
      <Modal
        transparent
        visible={forgotVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setForgotVisible(false)
          setForgotStep('request')
          setForgotOtp('')
        }}
      >
        <View style={styles.verifyModalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.verifyKeyboardAvoid}
          >
            <ScrollView
              contentContainerStyle={styles.verifyScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* App Logo */}
              <View style={styles.verifyLogoContainer}>
                <Image
                  source={require('../../assets/loading.png')}
                  style={styles.verifyLogoImage}
                  resizeMode="contain"
                />
              </View>

              {/* Step 1: Request OTP */}
              {forgotStep === 'request' && (
                <View style={styles.fpCard}>
                  <View style={styles.fpHeaderRow}>
                    <TouchableOpacity
                      style={styles.fpBackBtn}
                      onPress={() => {
                        setForgotVisible(false)
                        setForgotStep('request')
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="chevron-left" size={26} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.fpHeaderTitle}>Reset Your Password</Text>
                  </View>

                  <Text style={styles.fpSubtitle}>
                    Enter your email address to reset your password
                  </Text>

                  <TextInput
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={styles.fpSingleInput}
                    placeholderTextColor="#94A3B8"
                  />

                  <TouchableOpacity
                    style={[
                      styles.fpPrimaryBtn,
                      isSendOtpDisabled && styles.fpPrimaryBtnDisabled,
                    ]}
                    onPress={handleSendResetCode}
                    disabled={isSendOtpDisabled}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.fpPrimaryBtnText}>
                        {resetCooldown > 0 ? `Wait ${resetCooldown}s` : 'Send OTP'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 2: Verify OTP */}
              {forgotStep === 'verify' && (
                <View style={styles.fpCard}>
                  {/* Lock with Alert Badge */}
                  <View style={styles.fpLockBadgeContainer}>
                    <Ionicons name="lock-closed" size={54} color="#B8464E" />
                    <View style={styles.fpLockAlertBadge}>
                      <Ionicons name="warning" size={22} color="#B8464E" />
                    </View>
                  </View>

                  <Text style={styles.fpVerifyTitle}>Verify your code</Text>
                  <Text style={styles.fpSubtitle}>
                    We sent a 4-digit code to
                  </Text>
                  <Text style={styles.fpVerifyEmail}>{forgotEmail.trim() || 'email@gmail.com'}</Text>

                  {/* 4-Digit OTP Boxes */}
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => forgotOtpInputRef.current?.focus()}
                    style={styles.otpBoxesRow}
                  >
                    {[0, 1, 2, 3].map((index) => {
                      const digit = forgotOtp[index] || ''
                      const isCurrent = forgotOtp.length === index
                      return (
                        <View
                          key={index}
                          style={[
                            styles.otpBox,
                            digit ? styles.otpBoxFilled : null,
                            isCurrent && isForgotOtpFocused ? styles.otpBoxActive : null,
                          ]}
                        >
                          <Text style={styles.otpDigitText}>{digit}</Text>
                        </View>
                      )
                    })}
                    <TextInput
                      ref={forgotOtpInputRef}
                      value={forgotOtp}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4)
                        setForgotOtp(cleaned)
                      }}
                      onFocus={() => setIsForgotOtpFocused(true)}
                      onBlur={() => setIsForgotOtpFocused(false)}
                      keyboardType="number-pad"
                      maxLength={4}
                      style={styles.hiddenOtpInput}
                      caretHidden={true}
                    />
                  </TouchableOpacity>

                  {/* Verify Code Button */}
                  <TouchableOpacity
                    style={[
                      styles.fpPrimaryBtn,
                      isVerifyOtpDisabled && styles.fpPrimaryBtnDisabled,
                    ]}
                    onPress={handleVerifyResetCode}
                    disabled={isVerifyOtpDisabled}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.fpPrimaryBtnText}>Verify Code</Text>
                    )}
                  </TouchableOpacity>

                  {/* Resend */}
                  <View style={styles.resendContainer}>
                    <Text style={styles.resendText}>Didn't receive the code? </Text>
                    <TouchableOpacity
                      onPress={handleSendResetCode}
                      disabled={resetCooldown > 0 || forgotLoading}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.resendLink,
                          resetCooldown > 0 && styles.resendLinkDisabled,
                        ]}
                      >
                        {resetCooldown > 0 ? `Resend (${resetCooldown}s)` : 'Resend'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Cancel Button */}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setForgotStep('request')
                      setForgotOtp('')
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Step 3: Reset Password */}
              {forgotStep === 'reset' && (
                <View style={styles.fpCard}>
                  <View style={styles.fpHeaderRow}>
                    <TouchableOpacity
                      style={styles.fpBackBtn}
                      onPress={() => setForgotStep('verify')}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Feather name="chevron-left" size={26} color="#1E293B" />
                    </TouchableOpacity>
                    <Text style={styles.fpHeaderTitle}>Reset Password</Text>
                  </View>

                  <Text style={styles.fpSubtitle}>
                    Enter your new password to reset your account access
                  </Text>

                  {/* New Password */}
                  <View style={styles.fpInputRow}>
                    <TextInput
                      placeholder="Enter new password"
                      value={forgotNewPassword}
                      onChangeText={setForgotNewPassword}
                      secureTextEntry={!showResetPassword}
                      style={styles.fpInputText}
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowResetPassword((prev) => !prev)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name={showResetPassword ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password */}
                  <View style={styles.fpInputRow}>
                    <TextInput
                      placeholder="Confirm new password"
                      value={forgotConfirmPassword}
                      onChangeText={setForgotConfirmPassword}
                      secureTextEntry={!showResetConfirmPassword}
                      style={styles.fpInputText}
                      placeholderTextColor="#94A3B8"
                    />
                    <TouchableOpacity
                      onPress={() => setShowResetConfirmPassword((prev) => !prev)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name={showResetConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.fpPrimaryBtn,
                      isResetPasswordDisabled && styles.fpPrimaryBtnDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={isResetPasswordDisabled}
                    activeOpacity={0.85}
                  >
                    {forgotLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.fpPrimaryBtnText}>Reset</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertCard}>
            {alertType === 'success' ? (
              <View style={[styles.alertIconCircle, { backgroundColor: '#10B981' }]}>
                <Ionicons name="checkmark" size={38} color="#fff" />
              </View>
            ) : (
              <View style={styles.alertIconCircle}>
                <Text style={styles.alertExclamation}>!</Text>
              </View>
            )}
            <Text style={[styles.alertTitle, alertType === 'success' && { color: '#10B981' }]}>
              {alertTitle}
            </Text>
            <Text style={styles.alertMessage}>
              {alertMessage}
            </Text>
            <TouchableOpacity
              style={[
                styles.alertButton,
                alertType === 'success' && { backgroundColor: '#10B981' },
              ]}
              activeOpacity={0.85}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Password Updated Modal (Step 4: PUS) ── */}
      <Modal
        transparent
        visible={passwordUpdatedVisible}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPasswordUpdatedVisible(false)}
      >
        <View style={styles.verifyModalContainer}>
          <ScrollView
            contentContainerStyle={styles.verifyScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* App Logo */}
            <View style={styles.verifyLogoContainer}>
              <Image
                source={require('../../assets/loading.png')}
                style={styles.verifyLogoImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.pusCard}>
              {/* Icon Graphic */}
              <View style={styles.pusBadgeContainer}>
                <View style={styles.pusOuterRing}>
                  <View style={styles.pusInnerCircle}>
                    <Ionicons
                      name="key"
                      size={28}
                      color="#FFFFFF"
                      style={{ transform: [{ rotate: '-35deg' }] }}
                    />
                  </View>
                </View>
                {/* Decorative accent dots */}
                <View style={styles.pusDot1} />
                <View style={styles.pusDot2} />
                <View style={styles.pusDot3} />
              </View>

              <Text style={styles.pusTitle}>Password Updated</Text>

              <Text style={styles.pusSubtitle}>
                Your password has been changed successfully. Please use your new password the next time you log in
              </Text>

              <TouchableOpacity
                style={styles.pusCloseButton}
                onPress={() => setPasswordUpdatedVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.pusCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  // ── Forgot Password & Reset Modal Styles ──
  verifyModalContainer: {
    flex: 1,
    backgroundColor: '#0F2238',
  },
  verifyKeyboardAvoid: {
    flex: 1,
    width: '100%',
  },
  verifyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  verifyLogoContainer: {
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyLogoImage: {
    width: 60,
    height: 60,
  },
  fpCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  fpHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  fpBackBtn: {
    position: 'absolute',
    left: 0,
    padding: 2,
    zIndex: 10,
  },
  fpHeaderTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F2238',
    textAlign: 'center',
  },
  fpSubtitle: {
    fontSize: 13.5,
    color: '#4B5876',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  fpSingleInput: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#0F2238',
    backgroundColor: '#FFFFFF',
    marginBottom: 22,
  },
  fpPrimaryBtn: {
    width: '100%',
    backgroundColor: '#B8464E',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fpPrimaryBtnDisabled: {
    backgroundColor: '#E79DA2',
    opacity: 0.7,
  },
  fpPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── Step 2: Verify Code Specifics ──
  fpLockBadgeContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fpLockAlertBadge: {
    position: 'absolute',
    bottom: -2,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 1,
  },
  fpVerifyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#B8464E',
    marginBottom: 8,
    textAlign: 'center',
  },
  fpVerifyEmail: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2238',
    marginBottom: 26,
    textAlign: 'center',
  },

  // ── Step 3: Password Inputs ──
  fpInputRow: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 24,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  fpInputText: {
    flex: 1,
    fontSize: 15,
    color: '#0F2238',
  },

  // ── Step 4: Password Updated Success Card ──
  pusCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 36,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  pusBadgeContainer: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  pusOuterRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pusInnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F2238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pusDot1: {
    position: 'absolute',
    top: 6,
    left: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  pusDot2: {
    position: 'absolute',
    top: 14,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94A3B8',
  },
  pusDot3: {
    position: 'absolute',
    bottom: 8,
    left: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#94A3B8',
  },
  pusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F2238',
    marginBottom: 10,
    textAlign: 'center',
  },
  pusSubtitle: {
    fontSize: 13.5,
    color: '#4B5876',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  pusCloseButton: {
    width: '100%',
    backgroundColor: '#0F2238',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pusCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // ── OTP Boxes ──
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 26,
    position: 'relative',
    width: '100%',
  },
  otpBox: {
    width: 58,
    height: 60,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxFilled: {
    borderColor: '#B8464E',
  },
  otpBoxActive: {
    borderColor: '#B8464E',
    backgroundColor: '#FFF7F7',
  },
  otpDigitText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F2238',
  },
  hiddenOtpInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },

  // ── Resend ──
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resendText: {
    fontSize: 13.5,
    color: '#4B5876',
  },
  resendLink: {
    fontSize: 13.5,
    color: '#0F2238',
    fontWeight: '700',
  },
  resendLinkDisabled: {
    color: '#94A3B8',
  },

  // ── Cancel ──
  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  cancelText: {
    color: '#4B5876',
    fontSize: 14,
    fontWeight: '500',
  },
  // ── Alert Popup Styles ──
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  alertIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#B84754',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertExclamation: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
    textAlign: 'center',
    includeFontPadding: false,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B84754',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertMessage: {
    fontSize: 13.5,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  alertButton: {
    width: '100%',
    backgroundColor: '#B84754',
    borderRadius: 24,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
})
