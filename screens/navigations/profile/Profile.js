import React from 'react'
import {
  Alert, Image, Linking, Modal, Platform, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native'
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../../../utils/supabase'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function Profile({ session, navigation }) {
  const user = session?.user
  const fullName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.fullName ||
    'Full Name'
  const email = user?.email || 'name@gmail.com'

  const [logoutVisible, setLogoutVisible] = React.useState(false)

  const handleLogout = async () => {
    setLogoutVisible(false)
    const { error } = await supabase.auth.signOut()
    if (error) Alert.alert('Error', error.message)
  }

  // ── Menu row helper ──────────────────────────────────────────
  const MenuRow = ({ icon, iconFamily, label, onPress }) => {
    const IconComp =
      iconFamily === 'Ionicons' ? Ionicons
      : iconFamily === 'MaterialCommunityIcons' ? MaterialCommunityIcons
      : Feather

    return (
      <TouchableOpacity style={styles.menuRow} activeOpacity={0.6} onPress={onPress}>
        <IconComp
          name={icon}
          size={20}
          color={NAVY}
          style={styles.menuIcon}
        />
        <Text style={styles.menuLabel}>{label}</Text>
        <Feather name="chevron-right" size={18} color="#94a3b8" />
      </TouchableOpacity>
    )
  }

  // ── Pill button helper ───────────────────────────────────────
  const PillButton = ({ label, onPress }) => (
    <TouchableOpacity style={styles.pill} activeOpacity={0.7} onPress={onPress}>
      <Text style={styles.pillText}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fb" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Text style={styles.headerTitle}>PROFILE</Text>

        {/* ── User Card ── */}
        <View style={styles.userCard}>
          <View style={styles.avatarWrap}>
            <Feather name="user" size={28} color="#fff" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </View>

        {/* ── Account Section ── */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <MenuRow
            icon="user"
            iconFamily="Feather"
            label="Account Information"
            onPress={() => navigation.navigate('AccountInformation')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="settings"
            iconFamily="Feather"
            label="Setting"
            onPress={() => navigation.navigate('Settings')}  
          />
        </View>

        {/* ── Info Pills ── */}
        <View style={styles.pillGroup}>
          <PillButton
            label="CoE Process & Coverage"
            onPress={() => Linking.openURL('https://www.csc.gov.ph/')}
          />
          <PillButton
            label="Application Requirements"
            onPress={() => Linking.openURL('https://www.csc.gov.ph/')}
          />
          <PillButton
            label="Prof vs Sub-prof explanation"
            onPress={() => Linking.openURL('https://www.csc.gov.ph/')}
          />
        </View>

        {/* ── Support Section ── */}
        <Text style={styles.sectionLabel}>Support</Text>
        <View style={styles.card}>
          <MenuRow
            icon="help-circle"
            iconFamily="Feather"
            label="Help Center"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="file-text"
            iconFamily="Feather"
            label="Terms & Conditions"
            onPress={() => navigation.navigate('TermsConditions')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="star"
            iconFamily="Feather"
            label="Rate the App"
            onPress={() => navigation.navigate('RateApp')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="info"
            iconFamily="Feather"
            label="About Gabay CSE"
            onPress={() => navigation.navigate('AboutApp')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon="log-out"
            iconFamily="Feather"
            label="Logout"
            onPress={() => setLogoutVisible(true)}
          />
        </View>

        {/* ── Bottom Branding ── */}
        <View style={styles.brandingWrap}>
          <Image
            source={require('../../../assets/loading.png')}
            style={styles.brandingLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandingText}>
            <Text style={styles.brandingAccent}>G</Text>ABAY
          </Text>
        </View>
      </ScrollView>

      {/* ── Logout Bottom Sheet Modal ── */}
      <Modal
        visible={logoutVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLogoutVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setLogoutVisible(false)}
        />
        <View style={styles.logoutSheet}>
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => setLogoutVisible(false)} style={styles.closeBtn}>
              <Feather name="x" size={24} color="#64748b" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Logout</Text>
            <View style={styles.closeBtn} />
          </View>

          <Text style={styles.logoutText}>
            Are you sure you want to Logout?
          </Text>
          <Text style={styles.logoutSubtext}>
            You can always log back in at any time.
          </Text>

          <View style={styles.modalBtnRow}>
            <TouchableOpacity
              style={styles.modalBtnSecondary}
              onPress={() => setLogoutVisible(false)}
            >
              <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtnPrimary}
              onPress={handleLogout}
            >
              <Text style={styles.modalBtnPrimaryText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  scrollContent: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 12 : 56,
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  // ── Header ──
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: NAVY,
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 24,
  },

  // ── User Card ──
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#64748b',
  },

  // ── Sections ──
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
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuIcon: {
    width: 28,
    marginRight: 12,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: NAVY,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 40,
  },

  // ── Info Pills ──
  pillGroup: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  pill: {
    backgroundColor: '#e8edf5',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    minWidth: '80%',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
  },

  // ── Bottom Branding ──
  brandingWrap: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  brandingLogo: {
    width: 32,
    height: 32,
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

  // ── Logout Bottom Sheet Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  logoutSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d85e67', // Red tone matching mockup title
    textAlign: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: NAVY,
    textAlign: 'center',
    marginBottom: 6,
  },
  logoutSubtext: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 28,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalBtnSecondary: {
    flex: 1,
    borderRadius: 30,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#d8e0f0',
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: NAVY,
  },
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 30,
    paddingVertical: 14,
    backgroundColor: NAVY,
    alignItems: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
