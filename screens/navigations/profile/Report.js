import React, { useState, useEffect } from 'react'
import {
  ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../../supabase'

const NAVY = '#0f2747'
const BLUE = '#2563eb'
const GRAY = '#64748b'

const CATEGORIES = [
  { id: 'Bug', label: 'Technical Bug', icon: 'alert-circle' },
  { id: 'Content Error', label: 'Question/Content Issue', icon: 'book-open' },
  { id: 'Feature Request', label: 'Feature Suggestion', icon: 'zap' },
  { id: 'Account Issue', label: 'Account / Progress', icon: 'user' },
  { id: 'Other', label: 'Other Inquiries', icon: 'help-circle' },
]

export default function Report({ navigation }) {
  const insets = useSafeAreaInsets()
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [myReports, setMyReports] = useState([])

  // Form State
  const [category, setCategory] = useState('Bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachmentImage, setAttachmentImage] = useState(null)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  // Keyboard bottom clearance tracking
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        if (e?.endCoordinates?.height) {
          setKeyboardHeight(e.endCoordinates.height)
        }
      }
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0)
      }
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const fetchReports = async (uid) => {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data)) {
        setMyReports(data)
      }
    } catch (e) {
      console.warn('Error fetching user reports:', e?.message || e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await fetchReports(user.id)
      } else {
        setLoading(false)
      }
    }
    initUser()
  }, [])

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'We need access to your gallery to attach a screenshot.')
      return
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      })

      if (!result.canceled && result.assets?.[0]?.base64) {
        setAttachmentImage(`data:image/jpeg;base64,${result.assets[0].base64}`)
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to pick screenshot.')
    }
  }

  const removeAttachment = () => {
    setAttachmentImage(null)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please provide a short summary of the issue.')
      return
    }
    if (!description.trim()) {
      Alert.alert('Missing Description', 'Please explain the issue or feedback in detail.')
      return
    }
    if (!userId) {
      Alert.alert('Authentication Error', 'Please log in to submit a report.')
      return
    }

    setSubmitting(true)
    Keyboard.dismiss()

    try {
      const newReport = {
        user_id: userId,
        category,
        title: title.trim(),
        description: description.trim(),
        image_url: attachmentImage || null,
        status: 'pending',
      }

      const { data, error } = await supabase
        .from('user_reports')
        .insert(newReport)
        .select()
        .single()

      if (error) {
        throw error
      }

      setTitle('')
      setDescription('')
      setAttachmentImage(null)
      setSubmittedSuccess(true)
      if (data) {
        setMyReports((prev) => [data, ...prev])
      }
      setTimeout(() => setSubmittedSuccess(false), 4000)
    } catch (err) {
      console.error('Submit report error:', err)
      Alert.alert('Submission Error', err.message || 'Unable to submit your report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return { label: 'Resolved', bg: '#dcfce7', text: '#15803d', icon: 'check-circle' }
      case 'in_review':
        return { label: 'In Review', bg: '#e0f2fe', text: '#0369a1', icon: 'clock' }
      case 'dismissed':
        return { label: 'Closed', bg: '#f1f5f9', text: '#64748b', icon: 'slash' }
      default:
        return { label: 'Pending', bg: '#fef3c7', text: '#b45309', icon: 'alert-circle' }
    }
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report to Us</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(keyboardHeight, insets.bottom, 24) + 40 }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Banner */}
          <View style={styles.banner}>
            <View style={styles.bannerIconBox}>
              <Ionicons name="shield-checkmark" size={26} color={BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Submit a Formal Report</Text>
              <Text style={styles.bannerSub}>
                Found a wrong question, a bug, or an app issue? Attach screenshots or details below. Our team directly reviews every ticket.
              </Text>
            </View>
          </View>

          {submittedSuccess && (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.successTitle}>Report Submitted Successfully!</Text>
                <Text style={styles.successSub}>Thank you. Our review team has received your ticket and screenshot.</Text>
              </View>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>1. SELECT REPORT CATEGORY</Text>
            <View style={styles.categoryWrap}>
              {CATEGORIES.map((c) => {
                const active = category === c.id
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.categoryPill, active && styles.categoryPillActive]}
                    onPress={() => setCategory(c.id)}
                    activeOpacity={0.7}
                  >
                    <Feather
                      name={c.icon}
                      size={14}
                      color={active ? '#fff' : NAVY}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>2. ISSUE SUMMARY / TITLE</Text>
            <TextInput
              style={styles.inputTitle}
              placeholder="e.g., Typo in FE Subject A Question #14"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
            />

            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>3. DETAILED DESCRIPTION</Text>
            <TextInput
              style={styles.inputDescription}
              placeholder="Explain the problem clearly (what screen, what went wrong, or what you expected to happen)..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            {/* 4. Screenshot Attachment */}
            <Text style={[styles.sectionHeading, { marginTop: 20 }]}>4. ATTACH SCREENSHOT (OPTIONAL)</Text>
            {attachmentImage ? (
              <View style={styles.attachedPreviewBox}>
                <Image source={{ uri: attachmentImage }} style={styles.attachedThumbnail} resizeMode="cover" />
                <View style={styles.attachedInfoBox}>
                  <Text style={styles.attachedTitle}>Screenshot attached</Text>
                  <Text style={styles.attachedSub}>Ready to submit with your report</Text>
                  <TouchableOpacity style={styles.removeAttachBtn} onPress={removeAttachment}>
                    <Feather name="trash-2" size={13} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.removeAttachText}>Remove Image</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadArea} onPress={pickScreenshot} activeOpacity={0.7}>
                <Feather name="image" size={24} color="#64748b" style={{ marginBottom: 6 }} />
                <Text style={styles.uploadTitle}>Tap to select a screenshot from gallery</Text>
                <Text style={styles.uploadSub}>PNG, JPG up to 5MB</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <View style={styles.submitBtnContent}>
                  <Feather name="send" size={17} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Previous Reports History */}
          <View style={styles.historySection}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historySectionTitle}>Your Submitted Tickets</Text>
              <Text style={styles.historyCount}>{myReports.length} {myReports.length === 1 ? 'ticket' : 'tickets'}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={NAVY} style={{ marginTop: 20 }} />
            ) : myReports.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Feather name="inbox" size={32} color="#cbd5e1" />
                <Text style={styles.emptyHistoryText}>No tickets submitted yet.</Text>
                <Text style={styles.emptyHistorySub}>Any reports you send will appear here with live resolution status.</Text>
              </View>
            ) : (
              myReports.map((item) => {
                const badge = getStatusBadge(item.status)
                const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : ''

                return (
                  <View key={item.id} style={styles.ticketCard}>
                    <View style={styles.ticketHeaderRow}>
                      <View style={styles.ticketCategoryPill}>
                        <Text style={styles.ticketCategoryText}>{item.category || 'General'}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Feather name={badge.icon} size={11} color={badge.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <Text style={styles.ticketTitle}>{item.title}</Text>
                    <Text style={styles.ticketDescription}>{item.description}</Text>

                    {item.image_url ? (
                      <View style={styles.ticketImageContainer}>
                        <Image source={{ uri: item.image_url }} style={styles.ticketImage} resizeMode="cover" />
                      </View>
                    ) : null}

                    {item.admin_response ? (
                      <View style={styles.adminReplyBox}>
                        <View style={styles.adminReplyHeader}>
                          <MaterialCommunityIcons name="shield-account" size={15} color={BLUE} />
                          <Text style={styles.adminReplyLabel}>Admin Response:</Text>
                        </View>
                        <Text style={styles.adminReplyText}>{item.admin_response}</Text>
                      </View>
                    ) : null}

                    <View style={styles.ticketFooter}>
                      <Text style={styles.ticketDate}>Submitted on {dateStr}</Text>
                    </View>
                  </View>
                )
              })
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: NAVY,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  banner: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 4,
  },
  bannerSub: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 17,
  },
  successBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 2,
  },
  successSub: {
    fontSize: 12,
    color: '#166534',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryPillActive: {
    backgroundColor: NAVY,
    borderColor: NAVY,
  },
  categoryText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: NAVY,
  },
  categoryTextActive: {
    color: '#fff',
  },
  inputTitle: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  inputDescription: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 90,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  uploadSub: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
  attachedPreviewBox: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  attachedThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  attachedInfoBox: {
    marginLeft: 12,
    flex: 1,
  },
  attachedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: NAVY,
  },
  attachedSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  removeAttachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  removeAttachText: {
    fontSize: 11.5,
    color: '#ef4444',
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: NAVY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  historySection: {
    marginTop: 26,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  historyCount: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  emptyHistoryBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyHistoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptyHistorySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketCategoryPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ticketCategoryText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 6,
  },
  ticketDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  ticketImageContainer: {
    marginBottom: 10,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f1f5f9',
  },
  adminReplyBox: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  adminReplyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  adminReplyText: {
    fontSize: 12.5,
    color: '#1e293b',
    lineHeight: 17,
  },
  ticketFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  ticketDate: {
    fontSize: 11.5,
    color: '#94a3b8',
  },
})
