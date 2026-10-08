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

const COUNTRIES = [
  { name: 'Philippines', code: '+63', flag: '🇵🇭' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
  { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Japan', code: '+81', flag: '🇯🇵' },
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'Singapore', code: '+65', flag: '🇸🇬' },
  { name: 'Qatar', code: '+974', flag: '🇶🇦' },
  { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
  { name: 'Italy', code: '+39', flag: '🇮🇹' },
  { name: 'Hong Kong', code: '+852', flag: '🇭🇰' },
  { name: 'Taiwan', code: '+886', flag: '🇹🇼' },
  { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
  { name: 'Brunei', code: '+673', flag: '🇧🇳' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'South Korea', code: '+82', flag: '🇰🇷' },
  { name: 'Spain', code: '+34', flag: '🇪🇸' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Oman', code: '+968', flag: '🇴🇲' },
  { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
  { name: 'Israel', code: '+972', flag: '🇮🇱' },
  { name: 'Lebanon', code: '+961', flag: '🇱🇧' },
  { name: 'Macau', code: '+853', flag: '🇲🇴' },
  { name: 'Thailand', code: '+66', flag: '🇹🇭' },
  { name: 'Vietnam', code: '+84', flag: '🇻🇳' },
  { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
  { name: 'China', code: '+86', flag: '🇨🇳' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
]

// ── Main Screen ───────────────────────────────────────────────────
export default function AccountInformation({ session: initialSession, navigation }) {
  const [user, setUser] = useState(initialSession?.user || null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState(initialSession?.user?.email || '')
  const [contactNumber, setContactNumber] = useState('')
  const [countryCode, setCountryCode] = useState('+63')
  const [isPhoneFocused, setIsPhoneFocused] = useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = useState(false)
  const [age, setAge] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [gender, setGender] = useState('')
  const [examLevel, setExamLevel] = useState('')
  const [education, setEducation] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [alertVisible, setAlertVisible] = useState(false)
  const [alertTitle, setAlertTitle] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertType, setAlertType] = useState('error') // 'error' or 'success'
  const [initialData, setInitialData] = useState({
    fullName: '',
    contactNumber: '',
    countryCode: '+63',
    age: '',
    birthdate: '',
    gender: '',
    examLevel: '',
    education: '',
  })

  const hasChanges = 
    fullName.trim() !== initialData.fullName.trim() ||
    contactNumber.trim() !== initialData.contactNumber.trim() ||
    countryCode !== initialData.countryCode ||
    age !== initialData.age ||
    birthdate !== initialData.birthdate ||
    gender !== initialData.gender ||
    examLevel !== initialData.examLevel ||
    education !== initialData.education;

  const showCustomAlert = (title, message, type = 'error') => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertType(type)
    setAlertVisible(true)
  }

  const loadData = async () => {
    try {
      let currentUser = user
      if (!currentUser) {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        currentUser = currentSession?.user
        if (currentUser) {
          setUser(currentUser)
          setEmail(currentUser.email || '')
        }
      }

      if (currentUser) {
        // 1. Fetch from public.users
        const { data: uData } = await supabase
          .from('users')
          .select('fullname')
          .eq('email', currentUser.email)
          .maybeSingle()

        let dbName = ''
        if (uData) {
          dbName = uData.fullname || ''
          setFullName(dbName)
        }

        // 2. Fetch from personal_info
        const { data: pData } = await supabase
          .from('personal_info')
          .select('age, birthdate, contact_number, gender, target_exam_level, highest_educational_attainment')
          .eq('user_id', currentUser.id)
          .maybeSingle()

        let dbAge = ''
        let dbBirthdate = ''
        let dbGender = ''
        let dbExamLevel = ''
        let dbEducation = ''
        let dbPhone = ''
        let dbCountry = '+63'

        if (pData) {
          dbAge = pData.age ? String(pData.age) : ''
          dbBirthdate = pData.birthdate || ''
          dbGender = pData.gender || ''
          dbExamLevel = pData.target_exam_level || ''
          dbEducation = pData.highest_educational_attainment || ''

          setAge(dbAge)
          setBirthdate(dbBirthdate)
          setGender(dbGender)
          setExamLevel(dbExamLevel)
          setEducation(dbEducation)
          
          const rawNum = pData.contact_number ?? ''
          const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)
          let matched = false
          for (const country of sortedCountries) {
            if (rawNum.startsWith(country.code)) {
              dbCountry = country.code
              dbPhone = rawNum.slice(country.code.length)
              setCountryCode(dbCountry)
              setContactNumber(dbPhone)
              matched = true
              break
            }
          }
          if (!matched) {
            dbPhone = rawNum
            setCountryCode(dbCountry)
            setContactNumber(dbPhone)
          }
        }

        // Save baseline loaded values
        setInitialData({
          fullName: dbName,
          contactNumber: dbPhone,
          countryCode: dbCountry,
          age: dbAge,
          birthdate: dbBirthdate,
          gender: dbGender,
          examLevel: dbExamLevel,
          education: dbEducation,
        })
      }
    } catch (err) {
      console.warn('Error loading account information:', err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [initialSession])

  const handleUpdate = async () => {
    if (!fullName.trim()) {
      showCustomAlert('Validation', 'Full name is required.')
      return
    }

    const cleanNum = contactNumber.replace(/\D/g, '')
    if (!cleanNum) {
      showCustomAlert('Validation', 'Contact number is required.')
      return
    }

    if (countryCode === '+63' && cleanNum.length !== 10) {
      showCustomAlert('Validation Error', 'Philippine mobile numbers must be exactly 10 digits (e.g., 9123456789)')
      return
    }

    if (!user) {
      showCustomAlert('Session Error', 'No active user session found.')
      return
    }

    const fullContactNumber = `${countryCode}${cleanNum}`

    setSaving(true)
    try {
      // 1. Update public.users
      const { error: userError } = await supabase
        .from('users')
        .update({ fullname: fullName.trim() })
        .eq('email', user.email)

      if (userError) {
        showCustomAlert('Update Error', 'Could not update your profile name. Please try again.')
        setSaving(false)
        return
      }

      // 2. Update personal_info
      const { error: infoError } = await supabase
        .from('personal_info')
        .upsert(
          {
            user_id: user.id,
            age: age ? Number(age) : null,
            birthdate: birthdate || null,
            contact_number: fullContactNumber,
            gender: gender || null,
            target_exam_level: examLevel || null,
            highest_educational_attainment: education || null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        )

      if (infoError) {
        showCustomAlert('Update Error', 'Could not update your account details. Please try again.')
        setSaving(false)
        return
      }

      // 3. Keep Auth Metadata synced (optional helper)
      await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
        },
      })

      // Update baseline initial data
      setInitialData({
        fullName: fullName.trim(),
        contactNumber: contactNumber.trim(),
        countryCode,
        age,
        birthdate,
        gender,
        examLevel,
        education,
      })

      showCustomAlert('Success', 'Profile updated successfully!', 'success')
    } catch (err) {
      showCustomAlert('Error', 'An unexpected error occurred. Please try again.')
    } finally {
      setSaving(false)
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

        {/* ── Contact Number ── */}
        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Contact Number</Text>
          <View style={styles.phoneInputRow}>
            <TouchableOpacity
              style={styles.countryCodeButton}
              activeOpacity={0.8}
              onPress={() => setCountryPickerOpen(true)}
            >
              <Text style={styles.countryCodeText}>{countryCode}</Text>
              <Text style={styles.countryCodeChevron}> ▾</Text>
            </TouchableOpacity>
            <TextInput
              placeholder="9123456789"
              value={contactNumber}
              onChangeText={setContactNumber}
              keyboardType="phone-pad"
              maxLength={countryCode === '+63' ? 10 : 15}
              style={[styles.phoneInputText, isPhoneFocused && styles.phoneInputTextFocused]}
              onFocus={() => setIsPhoneFocused(true)}
              onBlur={() => setIsPhoneFocused(false)}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Country Code Picker Modal */}
        <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
          <TouchableOpacity style={styles.pickerBackdrop} activeOpacity={1} onPress={() => setCountryPickerOpen(false)} />
          <View style={[styles.pickerSheet, { maxHeight: '60%' }]}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Country Code</Text>
              <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
                <Feather name="x" size={22} color={NAVY} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country.name}
                  style={[styles.pickerOption, countryCode === country.code && styles.pickerOptionActive]}
                  onPress={() => { setCountryCode(country.code); setCountryPickerOpen(false) }}
                >
                  <Text style={[styles.pickerOptionText, countryCode === country.code && styles.pickerOptionTextActive]}>
                    {country.flag} {country.name} ({country.code})
                  </Text>
                  {countryCode === country.code && <Feather name="check" size={16} color={NAVY} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>

      {/* Custom Alert Modal */}
      <Modal
        transparent
        visible={alertVisible}
        animationType="fade"
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(15, 30, 53, 0.65)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            width: '90%',
            maxWidth: 340,
            backgroundColor: '#fff',
            borderRadius: 24,
            padding: 24,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 5,
          }}>
            <View style={{ 
              backgroundColor: alertType === 'success' ? '#ECFDF5' : '#FEE2E2', 
              padding: 12, 
              borderRadius: 32, 
              marginBottom: 16 
            }}>
              <Feather 
                name={alertType === 'success' ? 'check-circle' : 'alert-circle'} 
                size={32} 
                color={alertType === 'success' ? '#10B981' : '#EF4444'} 
              />
            </View>
            <Text style={[styles.pickerTitle, { fontSize: 18, marginBottom: 8, textAlign: 'center' }]}>{alertTitle}</Text>
            <Text style={{ color: '#4B5563', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
              {alertMessage}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: alertType === 'success' ? '#10B981' : '#EF4444',
                borderRadius: 12,
                paddingVertical: 13,
                alignItems: 'center',
                width: '100%'
              }}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          style={[styles.updateBtn, (!hasChanges || saving) && { opacity: 0.45 }]}
          activeOpacity={0.85}
          onPress={handleUpdate}
          disabled={!hasChanges || saving}
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
            source={require('../../../assets/img_onboarding.png')}
            style={styles.brandingLogoFull}
            resizeMode="contain"
          />
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
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
  },
  countryCodeChevron: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '700',
  },
  phoneInputText: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
  },
  phoneInputTextFocused: {
    borderColor: '#3B82B8',
    borderWidth: 1.5,
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
  brandingLogoFull: {
    width: 220,
    height: 60,
  },
})
