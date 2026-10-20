import React, { useState } from 'react'
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform, StatusBar
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons, Feather } from '@expo/vector-icons'

const NAVY = '#0f2747'
const ACCENT = '#d85e67'

export default function CseGuide({ route, navigation }) {
  const initialTab = route?.params?.initialTab || 'process'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [expandedSection, setExpandedSection] = useState(null)

  const toggleSection = (sec) => {
    setExpandedSection(expandedSection === sec ? null : sec)
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f7fb" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>PhilNITS Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'process' && styles.tabButtonActive, { backgroundColor: '#e0efff' }]}
          onPress={() => setActiveTab('process')}
        >
          <Text style={[styles.tabText, activeTab === 'process' && styles.tabTextActive, { color: activeTab === 'process' ? NAVY : '#3b587a' }]}>
            Scope & Tracks
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'requirements' && styles.tabButtonActive, { backgroundColor: '#fff0ec' }]}
          onPress={() => setActiveTab('requirements')}
        >
          <Text style={[styles.tabText, activeTab === 'requirements' && styles.tabTextActive, { color: activeTab === 'requirements' ? NAVY : '#8c4e40' }]}>
            Requirements
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'comparison' && styles.tabButtonActive, { backgroundColor: '#ffeef1' }]}
          onPress={() => setActiveTab('comparison')}
        >
          <Text style={[styles.tabText, activeTab === 'comparison' && styles.tabTextActive, { color: activeTab === 'comparison' ? NAVY : '#8c3d42' }]}>
            IP vs FE & ITPEC
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 1: PROCESS & SCOPE */}
        {activeTab === 'process' && (
          <View style={styles.tabContent}>
            {/* Banner info */}
            <View style={[styles.infoBanner, { backgroundColor: '#e0efff', borderColor: '#bed6ff' }]}>
              <Text style={[styles.bannerTitle, { color: NAVY }]}>PhilNITS / ITPEC Certification</Text>
              <Text style={styles.bannerDesc}>
                Administered by the PhilNITS Foundation under the DTI in partnership with Japan's IPA and ITPEC. Standardized benchmark for IT competence in Asia.
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={NAVY} />
                <Text style={styles.metaText}>Cycle: Semi-annual (April & October)</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="ribbon-outline" size={16} color={NAVY} />
                <Text style={styles.metaText}>Passing Score: 600 / 1000 scaled score (~55–60% raw)</Text>
              </View>
            </View>

            {/* Scope details */}
            <Text style={styles.sectionTitle}>Examination Scopes</Text>
            
            {/* Accordion Item: IP Scope */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('ip_scope')}>
              <Text style={styles.accordionTitle}>1. IT Passport (IP) Examination</Text>
              <Ionicons name={expandedSection === 'ip_scope' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'ip_scope' && (
              <View style={styles.accordionBody}>
                <Text style={[styles.accordionSubtitle, { color: ACCENT }]}>100 Questions • 120 Minutes</Text>
                <Text style={styles.bodyBullet}>• Technology Domain (40%): Computer hardware, system software, database schemas, networking protocols, security fundamentals.</Text>
                <Text style={styles.bodyBullet}>• Strategy Domain (35%): Corporate governance, business analysis, digital transformation, intellectual property, IT legal compliance.</Text>
                <Text style={styles.bodyBullet}>• Management Domain (25%): Software development lifecycles, project management, IT service management (ITIL), security auditing.</Text>
              </View>
            )}

            {/* Accordion Item: FE Subject A */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('fe_a')}>
              <Text style={styles.accordionTitle}>2. FE Subject A (Morning Session)</Text>
              <Ionicons name={expandedSection === 'fe_a' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'fe_a' && (
              <View style={styles.accordionBody}>
                <Text style={[styles.accordionSubtitle, { color: ACCENT }]}>60 Questions • 90 Minutes (Multiple Choice)</Text>
                <Text style={styles.bodyBullet}>• Computer Systems & Architecture: CPU architecture, logic gates, cache memory, operating systems, compiler theory.</Text>
                <Text style={styles.bodyBullet}>• Algorithms & Programming: Binary representation, data structures, recursion, time/space complexity.</Text>
                <Text style={styles.bodyBullet}>• Networks & Security: OSI model, TCP/IP, cryptographic algorithms, vulnerability defense, authentication.</Text>
                <Text style={styles.bodyBullet}>• IT Management & Enterprise Architecture: Systems analysis, database design, ER diagrams, project metrics.</Text>
              </View>
            )}

            {/* Accordion Item: FE Subject B */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('fe_b')}>
              <Text style={styles.accordionTitle}>3. FE Subject B (Afternoon Session)</Text>
              <Ionicons name={expandedSection === 'fe_b' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'fe_b' && (
              <View style={styles.accordionBody}>
                <Text style={[styles.accordionSubtitle, { color: ACCENT }]}>20 Questions • 100 Minutes (Case & Scenario Based)</Text>
                <Text style={styles.bodyBullet}>• Algorithms & Data Structures (16 Questions): Tracing complex pseudocode routines, dynamic arrays, binary trees, graph traversals.</Text>
                <Text style={styles.bodyBullet}>• Information Security (4 Questions): Enterprise security incidents, threat modeling, access control, and defense-in-depth architecture.</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: APPLICATION REQUIREMENTS */}
        {activeTab === 'requirements' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoBanner, { backgroundColor: '#fff0ec', borderColor: '#ffd2c9' }]}>
              <Text style={[styles.bannerTitle, { color: '#a04838' }]}>Registration & Filing Checklist</Text>
              <Text style={styles.bannerDesc}>
                Examinees can register online or through accredited partner universities and regional testing centers.
              </Text>
              <Text style={styles.filingLink}>• Official Website: www.philnits.org</Text>
              <Text style={styles.filingLink}>• ITPEC Consortium: itpec.org</Text>
            </View>

            <Text style={styles.sectionTitle}>Registration Requirements</Text>
            <View style={styles.requirementsList}>
              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Online Application</Text>
                  <Text style={styles.reqDesc}>Completed PhilNITS registration form submitted before the deadline (typically 3 weeks before exam date).</Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Valid Identification</Text>
                  <Text style={styles.reqDesc}>
                    Government-issued ID or valid School/Student ID (Passport, Driver's License, UMID, PRC ID, or School Registration).
                  </Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>ID Photograph</Text>
                  <Text style={styles.reqDesc}>
                    2x2 colored photograph with white background, taken within the last 6 months.
                  </Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Examination Fee</Text>
                  <Text style={styles.reqDesc}>
                    Information Technology Passport: ~₱1,000{'\n'}Fundamental IT Engineer: ~₱1,500{'\n'}(Discounted rates available for accredited partner academic institutions).
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: IP VS FE COMPARISON */}
        {activeTab === 'comparison' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoBanner, { backgroundColor: '#ffeef1', borderColor: '#ffd5db' }]}>
              <Text style={[styles.bannerTitle, { color: '#ab3742' }]}>Certification Levels & Asian Mutual Recognition</Text>
              <Text style={styles.bannerDesc}>
                PhilNITS certifications are internationally recognized under the Information Technology Professionals Examination Council (ITPEC):
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Level Comparison</Text>

            {/* IP Card */}
            <View style={[styles.compareCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 5 }]}>
              <Text style={styles.compareTitle}>Information Technology Passport (IP)</Text>
              <Text style={styles.compareTier}>Foundational IT Certification</Text>
              <Text style={styles.compareDesc}>
                Validates broad, fundamental knowledge of IT and business systems. Ideal for entry-level IT practitioners, students, and business professionals who interact with technology solutions.
              </Text>
              <Text style={styles.compareScopeText}>
                <Text style={{ fontWeight: '700' }}>Scope: </Text>
                Technology (40%), Strategy (35%), Management (25%). 100 multiple choice questions.
              </Text>
            </View>

            {/* FE Card */}
            <View style={[styles.compareCard, { borderLeftColor: NAVY, borderLeftWidth: 5 }]}>
              <Text style={styles.compareTitle}>Fundamental IT Engineer (FE)</Text>
              <Text style={styles.compareTier}>Engineering Level Certification</Text>
              <Text style={styles.compareDesc}>
                Validates in-depth technical competency in software engineering, algorithms, networks, and cybersecurity. Meets standards for expedited Japanese work visa processing and global technical roles.
              </Text>
              <Text style={styles.compareScopeText}>
                <Text style={{ fontWeight: '700' }}>Scope: </Text>
                Subject A (60 MCQs on architecture, algorithms, security) + Subject B (20 scenario questions on pseudocode and cybersecurity).
              </Text>
            </View>

            {/* ITPEC Member Countries */}
            <View style={[styles.compareCard, { borderLeftColor: '#10b981', borderLeftWidth: 5 }]}>
              <Text style={styles.compareTitle}>Mutual Recognition in Asia</Text>
              <Text style={styles.compareTier}>7 Partner Countries</Text>
              <Text style={styles.compareDesc}>
                Passing PhilNITS grants certification equivalent to Japan's Information Technology Engineers Examination (ITEE), recognized in Japan, Philippines, Vietnam, Myanmar, Mongolia, Thailand, and Bangladesh.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: NAVY,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    borderColor: NAVY,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  tabContent: {
    width: '100%',
  },
  infoBanner: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 12,
    marginTop: 8,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  accordionBody: {
    backgroundColor: '#edf2f7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    marginTop: -8,
  },
  accordionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  bodyBullet: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 4,
  },
  filingLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f1e35',
    marginTop: 4,
  },
  requirementsList: {
    gap: 12,
  },
  reqItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  reqTextWrap: {
    flex: 1,
  },
  reqTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 4,
  },
  reqDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  compareCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  compareTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: NAVY,
    marginBottom: 2,
  },
  compareTier: {
    fontSize: 12,
    fontWeight: '700',
    color: ACCENT,
    marginBottom: 8,
  },
  compareDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  compareScopeText: {
    fontSize: 12,
    color: NAVY,
  },
})
