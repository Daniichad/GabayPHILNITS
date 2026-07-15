import React, { useState } from 'react'
import {
  Alert, Image, Modal, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { supabase } from '../../../utils/supabase'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

const GENDER_OPTIONS = ['Male', 'Female', 'Prefer not to say']
const EXAM_LEVEL_OPTIONS = ['Professional', 'Sub-professional']
const EDUCATION_OPTIONS = [
  'Elementary Graduate',
  'High School Graduate',
  'Vocational / Technical',
  'College Undergraduate',
  'College Graduate',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctoral Degree',
]

// ── Reusable dropdown picker ──────────────────────────────────────
function DropdownField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dropdown}
        activeOpacity={0.75}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || label}
        </Text>
        <Feather name="chevron-down" size={18} color="#64748b" />
      </TouchableOpacity>

      {/* Picker Modal */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Feather name="x" size={22} color={NAVY} />
            </TouchableOpacity>
          </View>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.pickerOption, value === opt && styles.pickerOptionActive]}
              onPress={() => { onChange(opt); setOpen(false) }}
            >
              <Text style={[styles.pickerOptionText, value === opt && styles.pickerOptionTextActive]}>
                {opt}
              </Text>
              {value === opt && <Feather name="check" size={16} color={NAVY} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────
export default function AccountInformation({ session, navigation }) {
  const user = session?.user
  const meta = user?.user_metadata ?? {}

  const [fullName, setFullName] = useState(meta.full_name || meta.fullName || '')
  const [email] = useState(user?.email || '')
  const [age, setAge] = useState(meta.age ? String(meta.age) : '')
  const [birthdate, setBirthdate] = useState(meta.birthdate || '')
  const [gender, setGender] = useState(meta.gender || '')
  const [examLevel, setExamLevel] = useState(meta.exam_level || '')
  const [education, setEducation] = useState(meta.education || '')
  const [saving, setSaving] = useState(false)

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      Alert.alert('Validation', 'Full name is required.')
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        age: age.replace(/\D/g, '') || null,
        birthdate,
        gender,
        exam_level: examLevel,
        education,
      },
    })
    setSaving(false)
    if (error) {
      Alert.alert('Error', error.message)
    } else {
      Alert.alert('Success', 'Profile updated successfully!')
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={26} color={NAVY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Information</Text>
          <View style={styles.backBtn} />
        </View>

        {/* ── Full Name ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Full Name Here"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* ── Email Address ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={email}
            editable={false}
            placeholder="name@gmail.com"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* ── Age ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={(v) => setAge(v.replace(/\D/g, ''))}
            placeholder="23"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={3}
          />
        </View>

        {/* ── Birthdate ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Birthdate</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={birthdate}
              onChangeText={setBirthdate}
              placeholder="January 1, 2002"
              placeholderTextColor="#94a3b8"
            />
            <Feather name="calendar" size={20} color="#64748b" style={styles.calIcon} />
          </View>
        </View>

        {/* ── Gender ── */}
        <DropdownField
          label="Gender"
          value={gender}
          options={GENDER_OPTIONS}
          onChange={setGender}
        />

        {/* ── Target Exam Level ── */}
        <DropdownField
          label="Target Exam Level"
          value={examLevel}
          options={EXAM_LEVEL_OPTIONS}
          onChange={setExamLevel}
        />

        {/* ── Highest Educational Attainment ── */}
        <DropdownField
          label="Highest Educational Attainment"
          value={education}
          options={EDUCATION_OPTIONS}
          onChange={setEducation}
        />

        {/* ── Buttons ── */}
        <TouchableOpacity
          style={[styles.updateBtn, saving && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleUpdate}
          disabled={saving}
        >
          <Text style={styles.updateBtnText}>
            {saving ? 'Saving…' : 'Update Profile'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.goBackBtn}
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>

        {/* ── Branding ── */}
        <View style={styles.brandingWrap}>
          <Image
            source={require('../../../assets/loading.png')}
            style={styles.brandingLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.brandingText}>
              <Text style={styles.brandingAccent}>G</Text>ABAY
            </Text>
            <Text style={styles.brandingSub}>Phil. Civil Service Exam</Text>
          </View>
        </View>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingBottom: 120,
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
    textAlign: 'center',
  },

  // ── Fields ──
  fieldWrap: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
  },
  inputDisabled: {
    color: '#94a3b8',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingRight: 14,
    overflow: 'hidden',
  },
  calIcon: {
    marginLeft: 8,
  },

  // ── Dropdown ──
  dropdown: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#94a3b8',
    fontWeight: '400',
  },

  // ── Picker Modal ──
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pickerSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  pickerOptionActive: {
    backgroundColor: 'rgba(15,39,71,0.05)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#475569',
  },
  pickerOptionTextActive: {
    color: NAVY,
    fontWeight: '700',
  },

  // ── Buttons ──
  updateBtn: {
    backgroundColor: NAVY,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  updateBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  goBackBtn: {
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d8e0f0',
    marginBottom: 32,
  },
  goBackBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: NAVY,
  },

  // ── Branding ──
  brandingWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
  },
  brandingLogo: {
    width: 36,
    height: 36,
  },
  brandingText: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    letterSpacing: 2,
  },
  brandingAccent: {
    color: ACCENT,
    fontWeight: '900',
  },
  brandingSub: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
})
