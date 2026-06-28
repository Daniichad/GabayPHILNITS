import React, { useState } from 'react'
import { Modal, ScrollView, View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { supabase } from '../utils/supabase'

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
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) {
        Alert.alert('Registration error', error.message || 'Could not create account')
        return
      }

      const profileError = await supabase.from('users').upsert(
        [
          {
            fullname: fullName,
            email,
            role: 'user',
          },
        ],
        {
          onConflict: 'email',
        }
      )

      if (profileError.error) {
        Alert.alert(
          'Registration warning',
          `${profileError.error.message || 'Account created, but profile data could not be saved.'}`
        )
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      })

      if (otpError) {
        Alert.alert(
          'Verification warning',
          otpError.message || 'Account created, but the verification code could not be sent.'
        )
      } else {
        setVerifyVisible(true)
      }

      if (data.session) {
        Alert.alert('Success', `Account created for ${data.user?.email || email}`)
        return
      }

      Alert.alert('Success', 'Account created. Enter the code sent to your email to verify it.')
      if (navigation) navigation.navigate('Login')
    } catch (err) {
      Alert.alert('Registration error', err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!otpCode.trim()) {
      Alert.alert('Error', 'Please enter the verification code')
      return
    }

    setVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: 'email',
      })

      if (error) {
        Alert.alert('Verification error', error.message || 'Invalid code')
        return
      }

      if (data.session) {
        setVerifyVisible(false)
        setOtpCode('')
        Alert.alert('Success', 'Email verified successfully')
        navigation?.replace('Home')
      }
    } catch (err) {
      Alert.alert('Verification error', err.message || String(err))
    } finally {
      setVerifying(false)
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
          <Text style={styles.heading}>Create your account</Text>

          {/* Full Name Input */}
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            style={styles.input}
            placeholderTextColor="#999"
          />

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

          {/* Confirm Password Input */}
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
            <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((value) => !value)}>
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

          {/* Send OTP Button */}
          <TouchableOpacity 
            style={styles.sendOtpButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.sendOtpButtonText}>{loading ? 'Creating...' : 'Create Account'}</Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation && navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom Icon */}
      <View style={styles.bottomIconContainer}>
        <Text style={styles.bottomIcon}>📋</Text>
      </View>

      {/* Bottom Text */}
      <Text style={styles.bottomText}>Start your Civil Service Exam Preparation Journey</Text>

      <Modal transparent visible={termsVisible} animationType="fade" onRequestClose={() => setTermsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Terms & Conditions</Text>
            <ScrollView style={styles.modalBody} contentContainerStyle={{ paddingBottom: 12 }}>
              <Text style={styles.modalText}>
                By creating an account, you agree to provide accurate information, keep your login details secure,
                and use the app responsibly. Your email may be used for account verification, password recovery,
                and important service updates. Continued use of the app means you accept any future updates to these
                terms.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={() => setTermsVisible(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={verifyVisible} animationType="fade" onRequestClose={() => setVerifyVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Verify Email</Text>
            <Text style={styles.modalSubtitle}>Enter the one-time code we sent to {email}</Text>
            <TextInput
              placeholder="Enter OTP"
              value={otpCode}
              onChangeText={setOtpCode}
              keyboardType="number-pad"
              style={styles.modalInput}
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity style={styles.modalButton} onPress={handleVerifyEmail} disabled={verifying}>
              <Text style={styles.modalButtonText}>{verifying ? 'Verifying...' : 'Verify OTP'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setVerifyVisible(false)}>
              <Text style={styles.modalLink}>Cancel</Text>
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
  sendOtpButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sendOtpButtonText: {
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
    marginBottom: 16,
  },
  bottomIcon: {
    fontSize: 32,
  },
  bottomText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
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
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 12,
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
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111827',
    marginBottom: 14,
  },
  modalButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
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
