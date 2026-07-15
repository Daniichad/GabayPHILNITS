import React, { useState } from 'react'
import {
  Animated, Linking, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather, Ionicons, FontAwesome } from '@expo/vector-icons'

const NAVY = '#0f2747'

// ── FAQ data ──────────────────────────────────────────────────────
const FAQS = [
  {
    id: 1,
    question: 'How do I manage my notifications?',
    answer:
      'To manage notifications, go to "Settings," select "Notification Settings," and customize your preferences.',
  },
  {
    id: 2,
    question: 'How do I join a support group?',
    answer:
      'You can find and join support groups through the Community section in the app. Tap "Browse Groups" to see available groups.',
  },
  {
    id: 3,
    question: 'How do I create a new flashcard set?',
    answer:
      'Go to the Practice tab, tap "Flashcards," then press the "+" button to create a new set. Add your terms and definitions, then save.',
  },
  {
    id: 4,
    question: 'Is my data safe and private?',
    answer:
      'Yes. Your data is stored securely using industry-standard encryption. We do not sell or share your personal information with third parties.',
  },
  {
    id: 5,
    question: 'How do I track my exam readiness?',
    answer:
      'Your exam readiness score is shown on the Home screen. It is calculated based on your mock exam scores, practice activity, and diagnostic results.',
  },
  {
    id: 6,
    question: 'What is the difference between Professional and Sub-professional?',
    answer:
      'The Professional level is for college graduates and covers more advanced topics. The Sub-professional level is for those who completed at least 2 years of college or are high school graduates.',
  },
]

// ── Contact Us data ───────────────────────────────────────────────
const CONTACTS = [
  {
    id: 'report',
    label: 'Report to Us',
    icon: <Ionicons name="headset-outline" size={22} color={NAVY} />,
    route: 'Report',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: <Ionicons name="logo-whatsapp" size={22} color={NAVY} />,
    url: 'https://wa.me/63900000000',
  },
  {
    id: 'website',
    label: 'Website',
    icon: <Feather name="globe" size={22} color={NAVY} />,
    url: 'https://www.csc.gov.ph/',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: <Feather name="facebook" size={22} color={NAVY} />,
    url: 'https://www.facebook.com/',
  },
  {
    id: 'twitter',
    label: 'Twitter',
    icon: <Feather name="twitter" size={22} color={NAVY} />,
    url: 'https://twitter.com/',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    icon: <Feather name="instagram" size={22} color={NAVY} />,
    url: 'https://www.instagram.com/',
  },
]

// ── FAQ Accordion Item ────────────────────────────────────────────
function FAQItem({ item }) {
  const [open, setOpen] = useState(false)

  return (
    <View style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqHeader}
        activeOpacity={0.7}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Feather
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={NAVY}
          style={{ marginLeft: 8, flexShrink: 0 }}
        />
      </TouchableOpacity>
      {open && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </View>
  )
}

// ── Main Screen ───────────────────────────────────────────────────
export default function HelpCenter({ navigation }) {
  const [activeTab, setActiveTab] = useState('faq')
  const [search, setSearch] = useState('')

  const filteredFaqs = FAQS.filter((f) =>
    f.question.toLowerCase().includes(search.toLowerCase()) ||
    f.answer.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Tabs ── */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('faq')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, activeTab === 'faq' && styles.tabLabelActive]}>
            FAQ
          </Text>
          {activeTab === 'faq' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabBtn}
          onPress={() => setActiveTab('contact')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabLabel, activeTab === 'contact' && styles.tabLabelActive]}>
            Contact Us
          </Text>
          {activeTab === 'contact' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
      </View>

      <View style={styles.tabDivider} />

      {/* ── FAQ Tab ── */}
      {activeTab === 'faq' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search */}
          <View style={styles.searchWrap}>
            <Feather name="search" size={17} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="search for help"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {filteredFaqs.length === 0 ? (
            <Text style={styles.emptyText}>No results found for "{search}"</Text>
          ) : (
            filteredFaqs.map((item) => <FAQItem key={item.id} item={item} />)
          )}
        </ScrollView>
      )}

      {/* ── Contact Us Tab ── */}
      {activeTab === 'contact' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {CONTACTS.map((c, i) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.contactRow,
                i < CONTACTS.length - 1 && styles.contactRowBorder,
              ]}
              activeOpacity={0.6}
              onPress={() => {
                if (c.route) {
                  navigation.navigate(c.route)
                } else if (c.url) {
                  Linking.openURL(c.url)
                }
              }}
            >
              <View style={styles.contactIcon}>{c.icon}</View>
              <Text style={styles.contactLabel}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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

  // ── Tabs ──
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    justifyContent: 'space-around',
  },
  tabBtn: {
    flex: 1,
    paddingBottom: 10,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabLabelActive: {
    color: NAVY,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: NAVY,
  },
  tabDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 4,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },

  // ── FAQ Search ──
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: NAVY,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 14,
  },

  // ── FAQ Accordion ──
  faqItem: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: NAVY,
    lineHeight: 20,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
    paddingBottom: 14,
  },

  // ── Contact Rows ──
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  contactRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  contactIcon: {
    width: 36,
    alignItems: 'center',
    marginRight: 14,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: NAVY,
  },
})
