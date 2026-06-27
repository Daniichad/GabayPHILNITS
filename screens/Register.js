import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, CheckBox } from 'react-native'
import { supabase } from '../utils/supabase'

export default function Register({ navigation }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (!agreeTerms) {
      Alert.alert('Error', 'Please agree to the terms and conditions')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user')
        .insert([{ full_name: fullName, email, password, role: 'user' }])

      if (error) {
        Alert.alert('Registration error', error.message || 'Could not create account')
        return
      }

      Alert.alert('Success', 'Account created')
      if (navigation) navigation.navigate('Login')
    } catch (err) {
      Alert.alert('Registration error', err.message || String(err))
    } finally {
      setLoading(false)
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
          <Text style={styles.label}>Password 🔒</Text>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#999"
          />

          {/* Terms Checkbox */}
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}
              onPress={() => setAgreeTerms(!agreeTerms)}
            >
              {agreeTerms && <Text style={styles.checkboxMark}>✓</Text>}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>I agree to the </Text>
            <TouchableOpacity>
              <Text style={styles.termsLink}>terms and conditions</Text>
            </TouchableOpacity>
          </View>

          {/* Send OTP Button */}
          <TouchableOpacity 
            style={styles.sendOtpButton}
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.sendOtpButtonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
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
})
