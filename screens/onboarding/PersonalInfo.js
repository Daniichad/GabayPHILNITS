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
  StatusBar,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Calendar } from 'react-native-calendars'
import { supabase } from '../../utils/supabase'
import { saveUserCache, saveUserSession } from '../../utils/database'

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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function PersonalInfo({ navigation }) {
  const [birthdate, setBirthdate] = React.useState('')
  const [contactNumber, setContactNumber] = React.useState('')
  const [countryCode, setCountryCode] = React.useState('+63')
  const [isPhoneFocused, setIsPhoneFocused] = React.useState(false)
  const [countryPickerOpen, setCountryPickerOpen] = React.useState(false)
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

  // Calendar Date Picker States
  const [datePickerVisible, setDatePickerVisible] = React.useState(false)
  const [tempBirthdate, setTempBirthdate] = React.useState('2000-01-01')
  const [calendarViewMode, setCalendarViewMode] = React.useState('calendar') // 'calendar' | 'year' | 'month'

  const currentYearNow = new Date().getFullYear()
  const YEARS = React.useMemo(() => {
    const list = []
    for (let y = currentYearNow - 10; y >= 1950; y--) {
      list.push(y)
    }
    return list
  }, [currentYearNow])

  const [curYear, curMonth, curDay] = React.useMemo(() => {
    const parts = (tempBirthdate || '2000-01-01').split('-').map(Number)
    return [parts[0] || 2000, parts[1] || 1, parts[2] || 1]
  }, [tempBirthdate])

  const displayDateText = React.useMemo(() => {
    if (!tempBirthdate) return 'No date selected'
    const parts = tempBirthdate.split('-').map(Number)
    if (parts.length === 3 && parts[1] >= 1 && parts[1] <= 12) {
      return `${MONTH_NAMES[parts[1] - 1]} ${parts[2]}, ${parts[0]}`
    }
    return tempBirthdate
  }, [tempBirthdate])

  const handleOpenDatePicker = () => {
    if (birthdate) {
      setTempBirthdate(birthdate)
    } else {
      setTempBirthdate('2000-01-01')
    }
    setCalendarViewMode('calendar')
    setDatePickerVisible(true)
  }

  const changeYear = (newYear) => {
    const yr = String(newYear)
    const mo = String(curMonth).padStart(2, '0')
    const dy = String(Math.min(curDay, 28)).padStart(2, '0')
    setTempBirthdate(`${yr}-${mo}-${dy}`)
    setCalendarViewMode('calendar')
  }

  const changeMonth = (monthIndex) => {
    const yr = String(curYear)
    const mo = String(monthIndex + 1).padStart(2, '0')
    const dy = String(Math.min(curDay, 28)).padStart(2, '0')
    setTempBirthdate(`${yr}-${mo}-${dy}`)
    setCalendarViewMode('calendar')
  }

  const showCustomAlert = (title, message) => {
    setAlertTitle(title)
    setAlertMessage(message)
    setAlertVisible(true)
  }

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
          .select('birthdate, contact_number, gender, target_exam_level, highest_educational_attainment')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          showCustomAlert('Profile error', error.message || 'Could not load personal information')
          return
        }

        if (data) {
          
          const rawNum = data.contact_number ?? ''
          const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length)
          let matched = false
          for (const country of sortedCountries) {
            if (rawNum.startsWith(country.code)) {
              setCountryCode(country.code)
              setContactNumber(rawNum.slice(country.code.length))
              matched = true
              break
            }
          }
          if (!matched) {
            setCountryCode('+63')
            setContactNumber(rawNum)
          }

          setGender(data.gender ?? '')
          const rawLevel = (data.target_exam_level ?? '').trim()
          if (
            rawLevel === 'Fundamental IT Engineer (FE)' ||
            rawLevel === 'Professional' ||
            rawLevel === 'FE' ||
            rawLevel.toLowerCase().includes('fundamental') ||
            rawLevel.toLowerCase().includes('(fe)')
          ) {
            setTargetExamLevel('Fundamental IT Engineer (FE)')
          } else if (
            rawLevel === 'Information Technology Passport (IP)' ||
            rawLevel === 'Sub-Professional' ||
            rawLevel === 'Sub-professional' ||
            rawLevel === 'IP' ||
            rawLevel.toLowerCase().includes('passport') ||
            rawLevel.toLowerCase().includes('(ip)')
          ) {
            setTargetExamLevel('Information Technology Passport (IP)')
          } else if (rawLevel) {
            setTargetExamLevel('Information Technology Passport (IP)')
          }
          setEducation(data.highest_educational_attainment ?? '')
          
          if (data.birthdate) {
            setBirthdate(data.birthdate)
            setTempBirthdate(data.birthdate)
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

  const handleNext = async () => {
    const cleanNum = contactNumber.replace(/\D/g, '')

    if (!birthdate || !cleanNum || !gender || !targetExamLevel || !education) {
      showCustomAlert('Missing information', 'Please complete all personal information fields')
      return
    }

    if (countryCode === '+63' && cleanNum.length !== 10) {
      showCustomAlert('Validation Error', 'Philippine mobile numbers must be exactly 10 digits (e.g., 9123456789)')
      return
    }

    const fullContactNumber = `${countryCode}${cleanNum}`

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

      // Compute age automatically from birthdate
      let calculatedAge = null
      if (birthdate) {
        const parts = birthdate.split('-')
        if (parts.length === 3) {
          const yr = parseInt(parts[0], 10)
          const mo = parseInt(parts[1], 10) - 1
          const dy = parseInt(parts[2], 10)
          if (!isNaN(yr) && !isNaN(mo) && !isNaN(dy)) {
            const birthDateObj = new Date(yr, mo, dy)
            const today = new Date()
            let a = today.getFullYear() - birthDateObj.getFullYear()
            const m = today.getMonth() - birthDateObj.getMonth()
            if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) a--
            calculatedAge = a >= 0 ? a : 0
          }
        }
      }

      const basePayload = {
        user_id: userId,
        birthdate,
        contact_number: fullContactNumber,
        gender,
        target_exam_level: targetExamLevel,
        highest_educational_attainment: education,
        updated_at: new Date().toISOString(),
      }

      // Try saving without age first (recommended schema where age is dropped)
      let { error } = await supabase.from('personal_info').upsert(
        basePayload,
        { onConflict: 'user_id' }
      )

      // If database still requires 'age' (NOT NULL constraint or column exists), retry with calculated age
      if (error) {
        const errDetail = String(error.message || '') + ' ' + String(error.details || '')
        if (errDetail.toLowerCase().includes('age') || error.code === '23502') {
          console.log('Database has age constraint, retrying with calculated age:', calculatedAge)
          const retryResult = await supabase.from('personal_info').upsert(
            {
              ...basePayload,
              ...(calculatedAge !== null ? { age: calculatedAge } : {}),
            },
            { onConflict: 'user_id' }
          )
          error = retryResult.error
        }
      }

      if (error) {
        showCustomAlert('Save error', error.message || 'Could not save personal information')
        return
      }

      try {
        await saveUserCache(userId, null, true, false)
        if (userData?.user) {
          await saveUserSession(userData.user, {
            target_exam_level: targetExamLevel,
          })
        }
      } catch (cacheErr) {
        console.warn('Local cache save warning in PersonalInfo:', cacheErr)
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
        <ActivityIndicator size="large" color="#3c64b4" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
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

          <SelectField
            label="Birthdate"
            value={birthdate}
            placeholder="Select birthdate"
            onPress={handleOpenDatePicker}
          />
          <View style={styles.fieldContainer}>
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
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
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
            onPress={() =>
              pickOption(
                'Target Exam Level',
                ['Information Technology Passport (IP)', 'Fundamental IT Engineer (FE)'],
                setTargetExamLevel
              )
            }
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

      {/* Custom Date Picker Modal (Calendar UI) */}
      <Modal
        transparent
        visible={datePickerVisible}
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: '92%', maxWidth: 400, borderRadius: 24, padding: 20, maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Select Birthdate</Text>
            <Text style={styles.modalSubtitle}>Pick your date of birth</Text>

            {/* Selected Date Badge */}
            <View style={styles.dateDisplayBadge}>
              <Ionicons name="calendar" size={18} color="#3c64b4" style={{ marginRight: 8 }} />
              <Text style={styles.dateDisplayText}>{displayDateText}</Text>
            </View>

            {/* Quick Month & Year Switchers */}
            <View style={styles.quickNavRow}>
              <TouchableOpacity
                style={[
                  styles.quickNavBtn,
                  calendarViewMode === 'month' && styles.quickNavBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setCalendarViewMode(calendarViewMode === 'month' ? 'calendar' : 'month')}
              >
                <Text style={[
                  styles.quickNavBtnText,
                  calendarViewMode === 'month' && styles.quickNavBtnTextActive,
                ]}>
                  {MONTH_NAMES[curMonth - 1] || 'Month'} ▾
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickNavBtn,
                  calendarViewMode === 'year' && styles.quickNavBtnActive,
                ]}
                activeOpacity={0.8}
                onPress={() => setCalendarViewMode(calendarViewMode === 'year' ? 'calendar' : 'year')}
              >
                <Text style={[
                  styles.quickNavBtnText,
                  calendarViewMode === 'year' && styles.quickNavBtnTextActive,
                ]}>
                  {curYear} ▾
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector View */}
            <View style={styles.calendarContainer}>
              {calendarViewMode === 'month' && (
                <View style={styles.monthGrid}>
                  {MONTH_NAMES.map((m, idx) => {
                    const isSelected = curMonth === (idx + 1)
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.gridCell, isSelected && styles.gridCellSelected]}
                        activeOpacity={0.75}
                        onPress={() => changeMonth(idx)}
                      >
                        <Text style={[styles.gridCellText, isSelected && styles.gridCellTextSelected]}>
                          {m.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              )}

              {calendarViewMode === 'year' && (
                <ScrollView
                  style={styles.yearScrollView}
                  contentContainerStyle={styles.yearGrid}
                  showsVerticalScrollIndicator={true}
                >
                  {YEARS.map((yr) => {
                    const isSelected = curYear === yr
                    return (
                      <TouchableOpacity
                        key={yr}
                        style={[styles.yearGridCell, isSelected && styles.gridCellSelected]}
                        activeOpacity={0.75}
                        onPress={() => changeYear(yr)}
                      >
                        <Text style={[styles.gridCellText, isSelected && styles.gridCellTextSelected]}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              )}

              {calendarViewMode === 'calendar' && (
                <Calendar
                  key={tempBirthdate.slice(0, 7)}
                  current={tempBirthdate}
                  maxDate={new Date().toISOString().split('T')[0]}
                  minDate="1950-01-01"
                  onDayPress={(day) => {
                    setTempBirthdate(day.dateString)
                  }}
                  onMonthChange={(month) => {
                    const yr = String(month.year)
                    const mo = String(month.month).padStart(2, '0')
                    const dy = String(Math.min(curDay, 28)).padStart(2, '0')
                    setTempBirthdate(`${yr}-${mo}-${dy}`)
                  }}
                  markedDates={{
                    [tempBirthdate]: {
                      selected: true,
                      selectedColor: '#3c64b4',
                      selectedTextColor: '#FFFFFF',
                    },
                  }}
                  theme={{
                    backgroundColor: '#FFFFFF',
                    calendarBackground: '#FFFFFF',
                    textSectionTitleColor: '#6B7280',
                    selectedDayBackgroundColor: '#3c64b4',
                    selectedDayTextColor: '#FFFFFF',
                    todayTextColor: '#3c64b4',
                    dayTextColor: '#111827',
                    textDisabledColor: '#D1D5DB',
                    arrowColor: '#3c64b4',
                    monthTextColor: '#0F2747',
                    indicatorColor: '#3c64b4',
                    textDayFontWeight: '600',
                    textMonthFontWeight: '700',
                    textDayHeaderFontWeight: '600',
                    textDayFontSize: 13,
                    textMonthFontSize: 15,
                    textDayHeaderFontSize: 12,
                  }}
                  enableSwipeMonths={true}
                />
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.dateConfirmRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { flex: 1, marginRight: 8, marginTop: 0 }]}
                activeOpacity={0.8}
                onPress={() => setDatePickerVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, { flex: 1, marginLeft: 8, backgroundColor: '#3c64b4' }]}
                activeOpacity={0.8}
                onPress={() => {
                  setBirthdate(tempBirthdate)
                  setDatePickerVisible(false)
                }}
              >
                <Text style={styles.alertButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Country Code Picker Modal */}
      <Modal visible={countryPickerOpen} transparent animationType="fade" onRequestClose={() => setCountryPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCountryPickerOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Country Code</Text>
          <Text style={styles.modalSubtitle}>Select your country dial code</Text>
          <ScrollView style={styles.optionsList} contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
            {COUNTRIES.map((country) => (
              <TouchableOpacity
                key={country.name}
                style={[styles.optionButton, countryCode === country.code && { backgroundColor: '#F3F4F6' }]}
                activeOpacity={0.7}
                onPress={() => {
                  setCountryCode(country.code)
                  setCountryPickerOpen(false)
                }}
              >
                <Text style={styles.optionButtonText}>{country.flag} {country.name} ({country.code})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.modalCancelButton}
            activeOpacity={0.8}
            onPress={() => setCountryPickerOpen(false)}
          >
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    // Shadow for iOS (same as Login & Register)
    shadowColor: '#0F2747',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    // Elevation for Android
    elevation: 8,
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
    borderColor: '#3c64b4',
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
    borderColor: '#D1D5DB',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    marginRight: 8,
  },
  countryCodeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  countryCodeChevron: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
  },
  phoneInputText: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#FFFFFF',
  },
  phoneInputTextFocused: {
    borderColor: '#3c64b4',
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
    backgroundColor: '#3c64b4',
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
    backgroundColor: '#3c64b4',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateDisplayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  dateDisplayText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2747',
  },
  quickNavRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickNavBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickNavBtnActive: {
    borderColor: '#3c64b4',
    backgroundColor: '#EEF2F6',
  },
  quickNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  quickNavBtnTextActive: {
    color: '#3c64b4',
  },
  calendarContainer: {
    minHeight: 310,
    justifyContent: 'center',
    marginBottom: 16,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  yearScrollView: {
    maxHeight: 280,
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  gridCell: {
    width: '31%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  yearGridCell: {
    width: '23%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridCellSelected: {
    backgroundColor: '#3c64b4',
    borderColor: '#3c64b4',
  },
  gridCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  gridCellTextSelected: {
    color: '#FFFFFF',
  },
  dateConfirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
});
