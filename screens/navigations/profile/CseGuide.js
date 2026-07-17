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
        <Text style={styles.headerTitle}>CSE Guide</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'process' && styles.tabButtonActive, { backgroundColor: '#e0efff' }]}
          onPress={() => setActiveTab('process')}
        >
          <Text style={[styles.tabText, activeTab === 'process' && styles.tabTextActive, { color: activeTab === 'process' ? NAVY : '#3b587a' }]}>
            Process & Scope
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
            Prof vs Sub-prof
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* TAB 1: PROCESS & SCOPE */}
        {activeTab === 'process' && (
          <View style={styles.tabContent}>
            {/* Banner info */}
            <View style={[styles.infoBanner, { backgroundColor: '#e0efff', borderColor: '#bed6ff' }]}>
              <Text style={[styles.bannerTitle, { color: NAVY }]}>CSE-PPT Conduct Announcement</Text>
              <Text style={styles.bannerDesc}>
                The Civil Service Commission (CSC) administers the Career Service Examination, Pen and Paper Test (CSE-PPT) for both Professional and Subprofessional levels.
              </Text>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={16} color={NAVY} />
                <Text style={styles.metaText}>Exam Date: August 9, 2026</Text>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="ribbon-outline" size={16} color={NAVY} />
                <Text style={styles.metaText}>Passing Score: 80.00% minimum</Text>
              </View>
            </View>

            {/* Scope details */}
            <Text style={styles.sectionTitle}>Scope of Examination</Text>
            
            {/* Accordion Item: General Information */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('gen_info')}>
              <Text style={styles.accordionTitle}>1. General Information (English)</Text>
              <Ionicons name={expandedSection === 'gen_info' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'gen_info' && (
              <View style={styles.accordionBody}>
                <Text style={styles.bodyBullet}>• Philippine Constitution</Text>
                <Text style={styles.bodyBullet}>• Code of Conduct and Ethical Standards for Public Officials and Employees (R.A. 6713)</Text>
                <Text style={styles.bodyBullet}>• Peace and Human Rights Issues and Concepts</Text>
                <Text style={styles.bodyBullet}>• Environment Management and Protection</Text>
              </View>
            )}

            {/* Accordion Item: Verbal Ability */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('verbal')}>
              <Text style={styles.accordionTitle}>2. Verbal Ability (English & Filipino)</Text>
              <Ionicons name={expandedSection === 'verbal' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'verbal' && (
              <View style={styles.accordionBody}>
                <Text style={styles.bodyBullet}>• Word meaning</Text>
                <Text style={styles.bodyBullet}>• Sentence completion</Text>
                <Text style={styles.bodyBullet}>• Error recognition</Text>
                <Text style={styles.bodyBullet}>• Sentence structure</Text>
                <Text style={styles.bodyBullet}>• Paragraph organization</Text>
                <Text style={styles.bodyBullet}>• Reading comprehension</Text>
              </View>
            )}

            {/* Accordion Item: Numerical Ability */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('numerical')}>
              <Text style={styles.accordionTitle}>3. Numerical Ability (English)</Text>
              <Ionicons name={expandedSection === 'numerical' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'numerical' && (
              <View style={styles.accordionBody}>
                <Text style={styles.bodyBullet}>• Basic mathematical operations</Text>
                <Text style={styles.bodyBullet}>• Number sequences</Text>
                <Text style={styles.bodyBullet}>• Word problems</Text>
              </View>
            )}

            {/* Accordion Item: Analytical vs Clerical */}
            <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('level_specific')}>
              <Text style={styles.accordionTitle}>4. Level-Specific Modules</Text>
              <Ionicons name={expandedSection === 'level_specific' ? 'chevron-up' : 'chevron-down'} size={18} color={NAVY} />
            </TouchableOpacity>
            {expandedSection === 'level_specific' && (
              <View style={styles.accordionBody}>
                <Text style={[styles.accordionSubtitle, { color: ACCENT }]}>Professional Level: Analytical Ability</Text>
                <Text style={styles.bodyBullet}>• Word analogy</Text>
                <Text style={styles.bodyBullet}>• Symbolic logic / abstract reasoning</Text>
                <Text style={styles.bodyBullet}>• Identifying assumptions & drawing conclusions</Text>
                <Text style={styles.bodyBullet}>• Data interpretation</Text>

                <Text style={[styles.accordionSubtitle, { color: ACCENT, marginTop: 14 }]}>Subprofessional Level: Clerical Ability</Text>
                <Text style={styles.bodyBullet}>• Filing systems</Text>
                <Text style={styles.bodyBullet}>• Spelling checks</Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: APPLICATION REQUIREMENTS */}
        {activeTab === 'requirements' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoBanner, { backgroundColor: '#fff0ec', borderColor: '#ffd2c9' }]}>
              <Text style={[styles.bannerTitle, { color: '#a04838' }]}>Filing & Application Checklist</Text>
              <Text style={styles.bannerDesc}>
                Applications are processed on a first-come, first-served basis. File early via official online modes:
              </Text>
              <Text style={styles.filingLink}>• CSC eServe: services.csc.gov.ph</Text>
              <Text style={styles.filingLink}>• CSC OCSEAS: ocseas.csc.gov.ph</Text>
            </View>

            <Text style={styles.sectionTitle}>Documentary Requirements</Text>
            <View style={styles.requirementsList}>
              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Application Form</Text>
                  <Text style={styles.reqDesc}>Fully accomplished CS Form No. 100, Revised 2023.</Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Four (4) ID Pictures</Text>
                  <Text style={styles.reqDesc}>
                    Philippine passport size (4.5 cm x 3.5 cm), white background, taken within 3 months prior to filing. Standard close-up, showing both left & right ears, bare face (no eyeglasses/colored contacts). Name tag must show handwritten signature over printed full name.
                  </Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Valid ID Card</Text>
                  <Text style={styles.reqDesc}>
                    Original & photocopy of accepted ID (e.g. Driver's License, Passport, PRC, SSS, GSIS, Voter ID, PhilHealth, PhilID, or NBI Clearance). ID must include date of birth.
                  </Text>
                </View>
              </View>

              <View style={styles.reqItem}>
                <Ionicons name="checkbox-outline" size={20} color={NAVY} style={{ marginTop: 2 }} />
                <View style={styles.reqTextWrap}>
                  <Text style={styles.reqTitle}>Examination Fee</Text>
                  <Text style={styles.reqDesc}>Standard fee of Five Hundred Pesos (PhP 500.00).</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: PROF VS SUB-PROF COMPARISON */}
        {activeTab === 'comparison' && (
          <View style={styles.tabContent}>
            <View style={[styles.infoBanner, { backgroundColor: '#ffeef1', borderColor: '#ffd5db' }]}>
              <Text style={[styles.bannerTitle, { color: '#ab3742' }]}>Resulting Eligibility & Positions</Text>
              <Text style={styles.bannerDesc}>
                Understanding the two levels of eligibility granted by the Civil Service Commission:
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Level Comparison</Text>

            {/* Professional Card */}
            <View style={[styles.compareCard, { borderLeftColor: ACCENT, borderLeftWidth: 5 }]}>
              <Text style={styles.compareTitle}>Professional Eligibility</Text>
              <Text style={styles.compareTier}>Second-Level Positions</Text>
              <Text style={styles.compareDesc}>
                Appropriate for both first-level (clerical) and second-level (technical, professional, scientific, executive, and managerial) positions in the government.
              </Text>
              <Text style={styles.compareScopeText}>
                <Text style={{ fontWeight: '700' }}>Includes: </Text>
                Analytical Ability questions (Word Analogy, Logic, Data Interpretation).
              </Text>
            </View>

            {/* Sub-Professional Card */}
            <View style={[styles.compareCard, { borderLeftColor: NAVY, borderLeftWidth: 5 }]}>
              <Text style={styles.compareTitle}>Sub-Professional Eligibility</Text>
              <Text style={styles.compareTier}>First-Level Positions Only</Text>
              <Text style={styles.compareDesc}>
                Appropriate only for first-level (clerical, trades, crafts, and custodial) positions in the government.
              </Text>
              <Text style={styles.compareScopeText}>
                <Text style={{ fontWeight: '700' }}>Includes: </Text>
                Clerical Ability questions (Filing systems, spelling checks).
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
