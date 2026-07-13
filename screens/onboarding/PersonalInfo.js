import React from 'react'
import { Alert, ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { supabase } from '../../utils/supabase'

function Field({ label, placeholder, value, onChangeText, keyboardType = 'default' }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  )
}

function SelectField({ label, value, placeholder, onPress }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.selectInput} activeOpacity={0.85} onPress={onPress}>
        <Text style={[styles.selectText, !value && styles.placeholderText]}>{value || placeholder}</Text>
        <Text style={styles.chevron}>⌄</Text>
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

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser()

        if (userError) {
          Alert.alert('Session error', userError.message || 'Could not load user session')
          return
        }

        const userId = userData.user?.id

        if (!userId) {
          Alert.alert('Session error', 'No logged-in user found')
          navigation?.replace('Login')
          return
        }

        const { data, error } = await supabase
          .from('personal_info')
          .select('age, birthdate, contact_number, gender, target_exam_level, highest_educational_attainment')
          .eq('user_id', userId)
          .maybeSingle()

        if (error) {
          Alert.alert('Profile error', error.message || 'Could not load personal information')
          return
        }

        if (data) {
          setAge(data.age?.toString?.() ?? '')
          setBirthdate(data.birthdate ?? '')
          setContactNumber(data.contact_number ?? '')
          setGender(data.gender ?? '')
          setTargetExamLevel(data.target_exam_level ?? '')
          setEducation(data.highest_educational_attainment ?? '')
        }
      } finally {
        setLoadingProfile(false)
      }
    }

    loadProfile()
  }, [navigation])

  const pickOption = (title, options, setter) => {
    Alert.alert(title, 'Choose one option', [
      ...options.map((option) => ({ text: option, onPress: () => setter(option) })),
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  const handleNext = async () => {
    if (!age || !birthdate || !contactNumber || !gender || !targetExamLevel || !education) {
      Alert.alert('Missing information', 'Please complete all personal information fields')
      return
    }

    setSaving(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()

      if (userError) {
        Alert.alert('Session error', userError.message || 'Could not load user session')
        return
      }

      const userId = userData.user?.id

      if (!userId) {
        Alert.alert('Session error', 'No logged-in user found')
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
        Alert.alert('Save error', error.message || 'Could not save personal information')
        return
      }

      navigation?.replace('DiagnosticAssessment')
    } catch (error) {
      Alert.alert('Save error', error.message || String(error))
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
    <View style={styles.container}>
      <View style={styles.statusBarMock}>
        
      </View>

      <View style={styles.logoWrap}>
        <Text style={styles.logo}>G</Text>
      </View>

      <Text style={styles.title}>Personal Information</Text>
      <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

      <View style={styles.card}>
        <Field label="Age" placeholder="Age" value={age} onChangeText={setAge} keyboardType="number-pad" />
        <Field label="Birthdate" placeholder="Birthdate" value={birthdate} onChangeText={setBirthdate} />
        <Field
          label="Contact Number"
          placeholder="Contact Number"
          value={contactNumber}
          onChangeText={setContactNumber}
          keyboardType="phone-pad"
        />
        <SelectField
          label="Gender"
          value={gender}
          placeholder="Gender"
          onPress={() => pickOption('Gender', ['Male', 'Female', 'Prefer not to say'], setGender)}
        />
        <SelectField
          label="Target Exam Level"
          value={targetExamLevel}
          placeholder="Target Exam Level"
          onPress={() => pickOption('Target Exam Level', ['Professional', 'Sub-Professional'], setTargetExamLevel)}
        />
        <SelectField
          label="Highest Educational Attainment"
          value={education}
          placeholder="Highest Educational Attainment"
          onPress={() =>
            pickOption(
              'Highest Educational Attainment',
              ['Elementary', 'High School', 'Senior High School', 'College Graduate', 'Postgraduate'],
              setEducation
            )
          }
        />

        <TouchableOpacity style={styles.nextButton} activeOpacity={0.85} onPress={handleNext} disabled={saving}>
          <Text style={styles.nextButtonText}>{saving ? 'SAVING...' : 'NEXT'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBarMock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTime: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  statusIcons: {
    fontSize: 12,
    color: '#111827',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#D9989E',
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 18,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 12,
    marginBottom: 4,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#A5B4FC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  selectInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#A5B4FC',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  selectText: {
    fontSize: 15,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  chevron: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  nextButton: {
    marginTop: 8,
    backgroundColor: '#0F2747',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 34,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 120,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
})
