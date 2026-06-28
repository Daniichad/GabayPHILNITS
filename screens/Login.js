import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { supabase } from '../utils/supabase'

export default function Login({ navigation }) {
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

  useEffect(() => {
    if (resetCooldown <= 0) {
      return undefined
    }

    const timer = setTimeout(() => {
      setResetCooldown((value) => Math.max(0, value - 1))
    }, 1000)

    return () => clearTimeout(timer)
  }, [resetCooldown])

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        Alert.alert('Login error', error.message || 'Invalid credentials')
        return
      }

      if (!data.session) {
        Alert.alert('Login error', 'Invalid credentials')
        return
      }
    navigation?.replace('PersonalInfo')
    } catch (err) {
      Alert.alert('Login error', err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendResetCode = async () => {
    if (!forgotEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    if (resetCooldown > 0) {
      Alert.alert('Please wait', `You can request another code in ${resetCooldown} seconds.`)
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
        Alert.alert('Reset error', error.message || 'Could not send the code')
        return
      }

      setForgotStep('verify')
      setResetCooldown(60)
      Alert.alert('Code sent', 'Check your email for the one-time code.')
    } catch (err) {
      Alert.alert('Reset error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleVerifyResetCode = async () => {
    if (!forgotOtp.trim()) {
      Alert.alert('Error', 'Please enter the code from your email')
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
        Alert.alert('Verification error', error.message || 'Invalid code')
        return
      }

      if (data.session) {
        setForgotStep('reset')
      }
    } catch (err) {
      Alert.alert('Verification error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!forgotNewPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password')
      return
    }

    setForgotLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: forgotNewPassword.trim(),
      })

      if (error) {
        Alert.alert('Reset error', error.message || 'Could not update password')
        return
      }

      Alert.alert('Success', 'Your password has been updated')
      setForgotVisible(false)
      setForgotStep('request')
      setForgotEmail('')
      setForgotOtp('')
      setForgotNewPassword('')
    } catch (err) {
      Alert.alert('Reset error', err.message || String(err))
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>G</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.heading}>Enter to your account</Text>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleButton} activeOpacity={0.85}>
            <Text style={styles.googleButtonText}>Continue with Google </Text>
            <Text style={styles.googleLogo}></Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Email Input */}
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

          {/* Password Input */}
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
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)}>
              <Text style={styles.eyeButtonText}>{showPassword ? '👁' : '👁‍🗨'}</Text>
            </TouchableOpacity>
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
    marginBottom: 40,
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
    borderWidth: 1.5,
    borderColor: '#3B82B8',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
  },
  googleButtonText: {
    color: '#3B82B8',
    fontSize: 16,
    fontWeight: '500',
  },
  googleLogo: {
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  label: {
    color: '#3B82B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    marginBottom: 12,
  },
  eyeButton: {
    marginLeft: -48,
    marginBottom: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeButtonText: {
    fontSize: 18,
    color: '#3B82B8',
  },
  forgotPassword: {
    color: '#3B82B8',
    fontSize: 14,
    textAlign: 'right',
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
