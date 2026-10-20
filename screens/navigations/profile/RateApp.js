import React, { useState, useEffect } from 'react'
import {
  Image, Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View, ActivityIndicator
} from 'react-native'
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons'
import { supabase } from '../../../utils/supabase'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const LIGHT_BG = '#f8fafc'

export default function RateApp({ navigation }) {
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  
  const [ratings, setRatings] = useState([])
  const [loadingRatings, setLoadingRatings] = useState(true)

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_ratings')
        .select('id, rating, comment, created_at, user_id, user_name, user_avatar')
        .order('created_at', { ascending: false })

      if (error) throw error
      setRatings(data || [])
    } catch (err) {
      console.warn('Error fetching ratings:', err)
    } finally {
      setLoadingRatings(false)
    }
  }

  useEffect(() => {
    fetchRatings()
  }, [])

  const handleStarPress = (val) => {
    setRating(val)
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a star rating first.')
      return
    }

    setSubmitting(true)
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData?.user) {
        alert('Session error: No logged-in user found.')
        return
      }

      // Fetch user's profile details from public.users using email
      const { data: profileData } = await supabase
        .from('users')
        .select('fullname, avatar_url')
        .eq('email', userData.user.email)
        .maybeSingle()

      const fullName = profileData?.fullname || userData.user.user_metadata?.full_name || 'Gabay Student'
      const avatarUrl = profileData?.avatar_url || null

      const { error } = await supabase.from('app_ratings').insert({
        user_id: userData.user.id,
        rating,
        comment: comment.trim() || null,
        user_name: fullName,
        user_avatar: avatarUrl,
        created_at: new Date().toISOString(),
      })

      if (error) {
        alert('Submission error: ' + error.message)
        return
      }

      setRatingModalOpen(false)
      // Refresh list
      fetchRatings()
      // Small delay to let the rating modal slide down before showing success
      setTimeout(() => {
        setSuccessModalOpen(true)
      }, 400)
    } catch (err) {
      alert('An unexpected error occurred: ' + (err.message || String(err)))
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate statistics
  const totalReviews = ratings.length
  const averageRating = totalReviews > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : '0.0'

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  const maskName = (fullname) => {
    if (!fullname) return 'Gabay Student'
    const parts = fullname.trim().split(/\s+/)
    const maskedParts = parts.map(part => {
      if (part.length <= 2) {
        return part
      }
      const firstTwo = part.substring(0, 2)
      const lastOne = part.substring(part.length - 1)
      return `${firstTwo}***${lastOne}`
    })
    return maskedParts.join(' ')
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate the App</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Main List / Content ── */}
      {loadingRatings ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={NAVY} />
          <Text style={styles.loadingText}>Loading reviews...</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {totalReviews > 0 ? (
              <>
                {/* ── Overview Score Card ── */}
                <View style={styles.scoreCard}>
                  <View style={styles.scoreLeft}>
                    <Text style={styles.scoreBig}>{averageRating}</Text>
                    <View style={styles.scoreStarsRow}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <FontAwesome
                          key={i}
                          name={i < Math.round(Number(averageRating)) ? 'star' : 'star-o'}
                          size={14}
                          color="#fbbf24"
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                    <Text style={styles.scoreCount}>{totalReviews} reviews</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreRight}>
                    <Text style={styles.scorePromoHeader}>Excellent Job!</Text>
                    <Text style={styles.scorePromoSub}>
                      Students use GABAY to review daily for the PhilNITS Exam.
                    </Text>
                  </View>
                </View>

                {/* ── Reviews Header title ── */}
                <Text style={styles.reviewsTitle}>Reviews ({totalReviews})</Text>

                {/* ── Reviews List ── */}
                <View style={styles.reviewsList}>
                  {ratings.map((item) => {
                    const rawName = item.user_name || 'Gabay Student'
                    const name = maskName(rawName)
                    const avatar = item.user_avatar
                    const firstLetter = rawName.charAt(0).toUpperCase()
                    const avatarUri = avatar && avatar.startsWith('data:image/') ? avatar : (avatar ? `data:image/jpeg;base64,${avatar}` : null)
                    
                    return (
                      <View key={item.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeaderRow}>
                          {avatarUri ? (
                            <Image
                              source={{ uri: avatarUri }}
                              style={styles.reviewerAvatar}
                            />
                          ) : (
                            <View style={styles.reviewerAvatarPlaceholder}>
                              <Text style={styles.avatarLetter}>{firstLetter}</Text>
                            </View>
                          )}
                          <View style={styles.reviewerInfo}>
                            <Text style={styles.reviewerName}>{name}</Text>
                            <View style={styles.starsRow}>
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <FontAwesome
                                  key={idx}
                                  name={idx < item.rating ? 'star' : 'star-o'}
                                  size={12}
                                  color="#fbbf24"
                                  style={{ marginRight: 1 }}
                                />
                              ))}
                              <Text style={styles.reviewDate}>• {formatDate(item.created_at)}</Text>
                            </View>
                          </View>
                        </View>
                        {item.comment ? (
                          <Text style={styles.reviewComment}>{item.comment}</Text>
                        ) : null}
                      </View>
                    )
                  })}
                </View>
              </>
            ) : (
              /* ── No reviews state ── */
              <View style={styles.noReviewsWrap}>
                <View style={styles.graphicWrap}>
                  <View style={styles.tabletMock}>
                    <View style={styles.tabletHeader}>
                      <View style={styles.dot} />
                    </View>
                    <View style={styles.tabletBody}>
                      <View style={styles.avatarRow}>
                        <View style={styles.miniAvatar} />
                        <View style={styles.textLineLong} />
                      </View>
                      <View style={styles.ratingRow}>
                        <View style={[styles.ratingDot, { backgroundColor: '#f87171' }]} />
                        <View style={[styles.ratingDot, { backgroundColor: '#fbbf24' }]} />
                        <View style={[styles.ratingDot, { backgroundColor: '#34d399' }]} />
                      </View>
                      <View style={styles.starsPlaceholder}>
                        <FontAwesome name="star" size={14} color="#fbbf24" style={{ marginHorizontal: 2 }} />
                        <FontAwesome name="star" size={14} color="#fbbf24" style={{ marginHorizontal: 2 }} />
                        <FontAwesome name="star" size={14} color="#fbbf24" style={{ marginHorizontal: 2 }} />
                        <FontAwesome name="star" size={14} color="#fbbf24" style={{ marginHorizontal: 2 }} />
                      </View>
                    </View>
                  </View>
                  <View style={styles.avatarGraphic}>
                    <Feather name="user" size={32} color={NAVY} />
                  </View>
                </View>
                <Text style={styles.titleText}>No reviews yet</Text>
                <Text style={styles.subText}>Be the first to rate your experience!</Text>
              </View>
            )}
          </ScrollView>

          {/* ── Fixed Bottom Button row ── */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.rateBtn}
              activeOpacity={0.85}
              onPress={() => {
                setRating(0)
                setComment('')
                setRatingModalOpen(true)
              }}
            >
              <Text style={styles.rateBtnText}>Write a Review</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Rating Dialog Bottom Sheet ── */}
      <Modal
        visible={ratingModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setRatingModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setRatingModalOpen(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.sheetTop}>
            <Image
              source={require('../../../assets/loading.png')}
              style={styles.sheetLogo}
              resizeMode="contain"
            />
            <View style={styles.sheetTitleCol}>
              <Text style={styles.sheetAppTitle}>GABAY PhilNITS</Text>
              <Text style={styles.sheetAppSub}>
                Your review is public and includes your profile name and photo
              </Text>
            </View>
          </View>

          {/* Stars */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((val) => (
              <TouchableOpacity
                key={val}
                onPress={() => handleStarPress(val)}
                style={{ padding: 6 }}
                activeOpacity={0.7}
              >
                <FontAwesome
                  name={val <= rating ? 'star' : 'star-o'}
                  size={32}
                  color={val <= rating ? '#fbbf24' : '#cbd5e1'}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Comment Input */}
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="(Optional) Tell others what you think"
            placeholderTextColor="#94a3b8"
            multiline
          />
          <Text style={styles.publicNote}>Public Review</Text>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => setRatingModalOpen(false)}
            >
              <Text style={styles.btnSecondaryText}>Not now</Text>
            </TouchableOpacity>

             <TouchableOpacity
              style={[styles.btnPrimary, submitting && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnPrimaryText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Success Dialog Bottom Sheet ── */}
      <Modal
        visible={successModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSuccessModalOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setSuccessModalOpen(false)}
        />
        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setSuccessModalOpen(false)}
          >
            <Feather name="x" size={24} color="#64748b" />
          </TouchableOpacity>

          <Text style={styles.successTitle}>
            Thanks for submitting your feedback!
          </Text>

          <View style={styles.successGraphicWrap}>
            <View style={styles.starWrap}>
              <FontAwesome name="star" size={100} color="#fbbf24" />
            </View>
            <View style={styles.characterWrap}>
              <Feather name="smile" size={32} color={NAVY} />
            </View>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 54,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
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

  // ── Main Content ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // leave space for absolute bottom bar
  },

  // ── Score Overview Card ──
  scoreCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 28,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  scoreLeft: {
    alignItems: 'center',
    paddingRight: 20,
  },
  scoreBig: {
    fontSize: 38,
    fontWeight: '900',
    color: NAVY,
    marginBottom: 4,
  },
  scoreStarsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  scoreCount: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  scoreDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#e2e8f0',
  },
  scoreRight: {
    flex: 1,
    paddingLeft: 20,
  },
  scorePromoHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  scorePromoSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },

  // ── Reviews List ──
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 16,
  },
  reviewsList: {
    gap: 16,
  },
  reviewItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 16,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  reviewerAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 6,
  },
  reviewComment: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    paddingLeft: 48, // align with reviewer details
  },

  // ── No Reviews Wrap ──
  noReviewsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  graphicWrap: {
    width: 220,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  tabletMock: {
    width: 140,
    height: 100,
    borderWidth: 6,
    borderColor: '#1e293b',
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabletHeader: {
    height: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  tabletBody: {
    flex: 1,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '100%',
  },
  miniAvatar: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    marginRight: 6,
  },
  textLineLong: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  ratingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  starsPlaceholder: {
    flexDirection: 'row',
  },
  avatarGraphic: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e2e8f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 6,
  },
  subText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 32,
  },

  // ── Bottom Fixed Bar ──
  bottomBar: {
    position: 'absolute',
    bottom: 74,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: Platform.OS === 'ios' ? 24 : 14,
  },
  rateBtn: {
    backgroundColor: NAVY,
    borderRadius: 16,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: NAVY,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  rateBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // ── Sheet Modal ──
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  sheetTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  sheetLogo: {
    width: 36,
    height: 36,
    marginRight: 12,
  },
  sheetTitleCol: {
    flex: 1,
  },
  sheetAppTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  sheetAppSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: NAVY,
    height: 80, // slightly larger height for detailed comments
    textAlignVertical: 'top',
    marginBottom: 6,
  },
  publicNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 24,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnSecondary: {
    flex: 1,
    borderRadius: 30,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#d8e0f0',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: 30,
    paddingVertical: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Success Dialog ──
  closeBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  successGraphicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  starWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  characterWrap: {
    position: 'absolute',
    bottom: -6,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
