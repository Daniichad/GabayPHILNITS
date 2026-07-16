import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../utils/supabase'

function Field({ label, placeholder, value, onChangeText, keyboardType = 'default' }) {
  const [isFocused, setIsFocused] = React.useState(false)

  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.input, isFocused && styles.inputFocused]}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  )
}

function SelectField({ label, value, placeholder, onPress }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity 
        style={styles.selectInput} 
        activeOpacity={0.85} 
        onPress={onPress}
      >
        <Text style={[styles.selectText, !value && styles.placeholderText]}>{value || placeholder}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function PersonalInfo({ navigation }) {
  const [age, setAge] = React.useState('')
  const [birthdate, setBirthdate] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')
  const [gender, setGender] = React.useState('')
  const [targetExamLevel, setTargetExamLevel] = React.useState('')
  const [education, setEducation] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [loadingProfile, setLoadingProfile] = React.useState(true)

  // Custom warning popup alert states
  const [alertVisible, setAlertVisible] = React.useState(false)
  const [alertTitle, setAlertTitle] = React.useState('')
  const [alertMessage, setAlertMessage] = React.useState('')

  // Custom options modal states
  const [pickerVisible, setPickerVisible] = React.useState(false)
  const [pickerTitle, setPickerTitle] = React.useState('')
  const [pickerOptions, setPickerOptions] = React.useState([])
  const [pickerSetter, setPickerSetter] = React.useState(null)

  // Date Picker States
  const [datePickerVisible, setDatePickerVisible] = React.useState(false)
  const [selectedMonth, setSelectedMonth] = React.useState('January')
  const [selectedDay, setSelectedDay] = React.useState(1)
  const [selectedYear, setSelectedYear] = React.useState(2000)

  const showCustomAlert = (title, message) => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }

  const getDaysInMonth = (month, year) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthIndex = months.indexOf(month)
    if (monthIndex === -1) return 31
    // passing day = 0 returns the last day of the previous month (which is monthIndex + 1)
    return new Date(year, monthIndex + 1, 0).getDate()
  }

  // Adjust selected day if it exceeds the maximum days of the new month/year
  React.useEffect(() => {
    const maxDays = getDaysInMonth(selectedMonth, selectedYear)
    if (selectedDay > maxDays) {
      setSelectedDay(maxDays)
    }
  }, [selectedMonth, selectedYear])

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          showCustomAlert('Session error', userError.message || 'Could not load user session')
          return
        }

        const userId = userData.user?.id

        if (!userId) {
          showCustomAlert('Session error', 'No logged-in user found')
          navigation?.replace('Login')
          return
        }

        const { data, error } = await supabase
          .from('personal_info')
          .select('age, birthdate, contact_number, gender, target_exam_level, highest_educational_attainment')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          showCustomAlert('Profile error', error.message || 'Could not load personal information')
          return
        }

        if (data) {
          setAge(data.age?.toString?.() ?? '')
          setContactNumber(data.contact_number ?? '')
          setGender(data.gender ?? '')
          setTargetExamLevel(data.target_exam_level ?? '')
          setEducation(data.highest_educational_attainment ?? '')
          
          if (data.birthdate) {
            setBirthdate(data.birthdate)
            const parts = data.birthdate.split('-')
            if (parts.length === 3) {
              const yr = parseInt(parts[0], 10)
              const moIdx = parseInt(parts[1], 10) - 1
              const dy = parseInt(parts[2], 10)
              if (!isNaN(yr)) setSelectedYear(yr)
              if (!isNaN(moIdx) && moIdx >= 0 && moIdx < 12) {
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                setSelectedMonth(months[moIdx])
              }
              if (!isNaN(dy)) setSelectedDay(dy)
            }
          }
        }
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [navigation])

  const pickOption = (title, options, setter) => {
    setPickerTitle(title)
    setPickerOptions(options)
    setPickerSetter(() => setter)
    setPickerVisible(true)
  }

  const handleConfirmDate = () => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const monthIndex = months.indexOf(selectedMonth) + 1
    const formattedMonth = monthIndex < 10 ? `0${monthIndex}` : `${monthIndex}`
    const formattedDay = selectedDay < 10 ? `0${selectedDay}` : `${selectedDay}`
    const dateStr = `${selectedYear}-${formattedMonth}-${formattedDay}`
    setBirthdate(dateStr)
    setDatePickerVisible(false)
  }

  const handleNext = async () => {
    if (!age || !birthdate || !contactNumber || !gender || !targetExamLevel || !education) {
      showCustomAlert('Missing information', 'Please complete all personal information fields')
      return
    }

    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        showCustomAlert('Session error', userError.message || 'Could not load user session')
        return
      }

      const userId = userData.user?.id

      if (!userId) {
        showCustomAlert('Session error', 'No logged-in user found')
        return
      }

      const { error } = await supabase.from('personal_info').upsert(
        {
          user_id: userId,
          age: Number(age),
          birthdate,
          contact_number: contactNumber,
          gender,
          target_exam_level: targetExamLevel,
          highest_educational_attainment: education,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )

      if (error) {
        showCustomAlert('Save error', error.message || 'Could not save personal information')
        return
      }

      navigation?.replace('DiagnosticAssessment')
    } catch (error) {
      showCustomAlert('Save error', error.message || String(error))
    } finally {
      setSaving(false)
    }
  }

  if (loadingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D9989E" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/loading.png')} 
            style={styles.logoImage} 
            resizeMode="contain"
          />
        </View>

        {/* Form Card */}
        <View style={styles.formContainer}>
          <Text style={styles.heading}>Personal Information</Text>
          <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

          <Field label="Age" placeholder="Enter age" value={age} onChangeText={setAge} keyboardType="number-pad" />
          <SelectField
            label="Birthdate"
            value={birthdate}
            placeholder="Select birthdate"
            onPress={() => setDatePickerVisible(true)}
          />
          <Field
            label="Contact Number"
            placeholder="e.g. 09123456789"
            value={contactNumber}
            onChangeText={setContactNumber}
            keyboardType="phone-pad"
          />
          <SelectField
            label="Gender"
            value={gender}
            placeholder="Select gender"
            onPress={() => pickOption('Gender', ['Male', 'Female', 'Prefer not to say'], setGender)}
          />
          <SelectField
            label="Target Exam Level"
            value={targetExamLevel}
            placeholder="Select target exam level"
            onPress={() => pickOption('Target Exam Level', ['Professional', 'Sub-Professional'], setTargetExamLevel)}
          />
          <SelectField
            label="Highest Educational Attainment"
            value={education}
            placeholder="Select education level"
            onPress={() =>
              pickOption(
                'Highest Educational Attainment',
                ['Elementary', 'High School', 'Senior High School', 'College Graduate', 'Postgraduate'],
                setEducation
              )
            }
          />

          <TouchableOpacity 
            style={[styles.nextButton, saving && styles.nextButtonDisabled]} 
            activeOpacity={0.85} 
            onPress={handleNext} 
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Custom Option Picker Modal */}
      <Modal
        transparent
        visible={pickerVisible}
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{pickerTitle}</Text>
            <Text style={styles.modalSubtitle}>Choose one option</Text>

            <ScrollView style={styles.optionsList} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
              {pickerOptions.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={styles.optionButton}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (pickerSetter) pickerSetter(option)
                    setPickerVisible(false)
                  }}
                >
                  <Text style={styles.optionButtonText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCancelButton}
              activeOpacity={0.8}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal
        transparent
        visible={datePickerVisible}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '90%', maxWidth: 450 }]}>
            <Text style={styles.modalTitle}>Select Birthdate</Text>
            <Text style={styles.modalSubtitle}>Choose month, day, and year</Text>

            <View style={styles.datePickerWrapper}>
              <View style={styles.datePickerRow}>
                {/* Month Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.columnHeader}>Month</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m) => {
                      const isSel = selectedMonth === m
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.dateItemButton, isSel && styles.dateItemButtonActive]}
                          onPress={() => setSelectedMonth(m)}
                        >
                          <Text style={[styles.dateItemText, isSel && styles.dateItemTextActive]}>{m.slice(0, 3)}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>

                {/* Day Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.columnHeader}>Day</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }, (_, i) => i + 1).map((d) => {
                      const isSel = selectedDay === d
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[styles.dateItemButton, isSel && styles.dateItemButtonActive]}
                          onPress={() => setSelectedDay(d)}
                        >
                          <Text style={[styles.dateItemText, isSel && styles.dateItemTextActive]}>{d}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>

                {/* Year Column */}
                <View style={styles.dateColumn}>
                  <Text style={styles.columnHeader}>Year</Text>
                  <ScrollView style={styles.columnScroll} showsVerticalScrollIndicator={false}>
                    {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - i).map((y) => {
                      const isSel = selectedYear === y
                      return (
                        <TouchableOpacity
                          key={y}
                          style={[styles.dateItemButton, isSel && styles.dateItemButtonActive]}
                          onPress={() => setSelectedYear(y)}
                        >
                          <Text style={[styles.dateItemText, isSel && styles.dateItemTextActive]}>{y}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                </View>
              </View>
            </View>

            <View style={styles.dateConfirmRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { flex: 1, marginRight: 8, marginTop: 0 }]}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, { flex: 1, marginLeft: 8 }]}
                onPress={handleConfirmDate}
              >
                <Text style={styles.alertButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
              style={[styles.alertButton, { width: '100%', backgroundColor: '#EF4444' }]}
              onPress={() => setAlertVisible(false)}
            >
              <Text style={styles.alertButtonText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1e35',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f1e35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: 90,
    height: 90,
    marginBottom: 24,
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
    marginBottom: 32,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FFFFFF',
  },
  inputFocused: {
    borderColor: '#3B82B8',
  },
  selectInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    fontSize: 15,
    color: '#1a1a1a',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  chevron: {
    color: '#9CA3AF',
    fontSize: 18,
    fontWeight: '600',
  },
  nextButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 16,
  },
  optionsList: {
    width: '100%',
  },
  optionButton: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
  },
  optionButtonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  modalCancelButton: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  modalCancelButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  alertButton: {
    backgroundColor: '#D9989E',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerWrapper: {
    position: 'relative',
    width: '100%',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 240,
    marginBottom: 24,
  },
  dateColumn: {
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  columnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  columnScroll: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 4,
  },
  dateItemButton: {
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
    marginVertical: 3,
    borderRadius: 10,
  },
  dateItemButtonActive: {
    backgroundColor: '#D9989E',
    shadowColor: '#D9989E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  dateItemText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
  },
  dateItemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dateConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
})
