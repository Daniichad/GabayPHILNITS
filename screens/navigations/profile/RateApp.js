import React, { useState } from 'react'
import {
  Image, Modal, Platform, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function RateApp({ navigation }) {
  const [ratingModalOpen, setRatingModalOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  const handleStarPress = (val) => {
    setRating(val)
  }

  const handleSubmit = () => {
    if (rating === 0) {
      alert('Please select a star rating first.')
      return
    }
    setRatingModalOpen(false)
    // Small delay to let the rating modal slide down before showing success
    setTimeout(() => {
      setSuccessModalOpen(true)
    }, 400)
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

      {/* ── Main View ── */}
      <View style={styles.mainContainer}>
        {/* Placeholder review graphic */}
        <View style={styles.graphicWrap}>
          {/* We use a simplified Vector/Image representation of the review dashboard in the mockup */}
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
          {/* Avatar holding/pointing to tablet */}
          <View style={styles.avatarGraphic}>
            <Feather name="user" size={32} color={NAVY} />
          </View>
        </View>

        <Text style={styles.titleText}>No reviews yet</Text>
        <Text style={styles.subText}>How was your experience?</Text>

        <TouchableOpacity
          style={styles.rateBtn}
          activeOpacity={0.85}
          onPress={() => setRatingModalOpen(true)}
        >
          <Text style={styles.rateBtnText}>Rate GABAY CSE</Text>
        </TouchableOpacity>
      </View>

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
              <Text style={styles.sheetAppTitle}>GABAY CSE</Text>
              <Text style={styles.sheetAppSub}>
                Your review is public and includes your Account profile name and photo
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
              style={styles.btnPrimary}
              onPress={handleSubmit}
            >
              <Text style={styles.btnPrimaryText}>Submit</Text>
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
            Thanks for submitting private feedback!
          </Text>

          {/* Big Star and Character Illustrator Representation */}
          <View style={styles.successGraphicWrap}>
            <View style={styles.starWrap}>
              <FontAwesome name="star" size={100} color="#fbbf24" />
            </View>
            <View style={styles.characterWrap}>
              <Feather name="smile" size={32} color="#000" />
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

  // ── Main Container ──
  mainContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 120, // push up to stay clear of bottom navigation
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
  rateBtn: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  rateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
    height: 48,
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
