import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { supabase } from '../utils/supabase'

export default function Login({ navigation }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .limit(1)
        .single()

      if (error) {
        Alert.alert('Login error', error.message || 'Invalid credentials')
        return
      }

      if (!data) {
        Alert.alert('Login error', 'Invalid credentials')
        return
      }

      Alert.alert('Success', `Logged in as ${data.full_name || data.email}`)
      if (navigation) navigation.navigate('Home')
    } catch (err) {
      Alert.alert('Login error', err.message || String(err))
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
          <Text style={styles.heading}>Enter to your account</Text>

          {/* Google Button */}
          <TouchableOpacity style={styles.googleButton}>
            <Text style={styles.googleButtonText}>Continue with Google </Text>
            <Text style={styles.googleLogo}>🔍</Text>
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
          <Text style={styles.label}>Password 🔒</Text>
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#999"
          />

          {/* Forgot Password */}
          <TouchableOpacity>
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
})
