import React, { useState } from 'react'
import {
  Alert, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../utils/supabase'

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
function ArrowRow({ label, subtitle, onPress }) {
  return (
    <TouchableOpacity style={styles.settingRow} activeOpacity={0.6} onPress={onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {subtitle ? <Text style={styles.settingSubtitle}>{subtitle}</Text> : null}
      </View>
      <Feather name="chevron-right" size={18} color="#94a3b8" />
    </TouchableOpacity>
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

  // Import TextInput lazily to avoid circular issues
  const { TextInput } = require('react-native')

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
})
