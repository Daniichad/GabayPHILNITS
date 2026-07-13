import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  SafeAreaView,
} from 'react-native'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { Ionicons, Feather } from '@expo/vector-icons'

const { width } = Dimensions.get('window')

export default function PracticeLibraryScreen({ navigation }) {
  const [selectedActivity, setSelectedActivity] = useState('vocabulary')

  const practiceTypes = [
    { id: 1, label: 'FLASHCARDS', color: '#2563eb' },
    { id: 2, label: 'MATCHING', color: '#f97316' },
    { id: 3, label: 'TRUE OR FALSE', color: '#dc2626' },
    { id: 4, label: 'MULTIPLE CHOICE', color: '#dbeafe', textColor: '#1e40af' },
    { id: 5, label: 'MODE EXAMINATION', color: '#f5f5f5', textColor: '#1f2937' },
  ]

  const libraries = [
    {
      id: 1,
      title: 'Vocabulary',
      category: 'Language & Communication',
      time: '2 hours',
      progress: 75,
      icon: 'book-open',
    },
    {
      id: 2,
      title: 'Fractions & Decimals',
      category: 'Mathematics',
      time: '5 hours',
      progress: 60,
      icon: 'percent',
    },
    {
      id: 3,
      title: 'Sentence Completion',
      category: 'Reading Comprehension',
      time: '3 hours',
      progress: 85,
      icon: 'format-quote-close',
    },
  ]

  const renderPracticeButton = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.practiceButton,
        { 
          backgroundColor: item.color,
          borderWidth: item.id === 5 ? 1 : 0,
          borderColor: '#e5e7eb',
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.practiceButtonText,
          {
            color: item.textColor || '#fff',
          },
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  )

  const renderActivityItem = ({ item, index }) => (
    <View style={styles.activityCard}>
      <View style={styles.activityContent}>
        <View style={styles.activityMain}>
          <Text style={styles.activityTitle}>{item.title}</Text>
          <Text style={styles.activityCategory}>{item.category}</Text>
          <Text style={styles.activityTime}>{item.time}</Text>
        </View>
        {index === 0 && (
          <TouchableOpacity style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )

  const renderLibraryItem = ({ item }) => (
    <TouchableOpacity style={styles.libraryCard} activeOpacity={0.8}>
      <View style={styles.libraryContent}>
        <View style={styles.libraryIcon}>
          <MaterialCommunityIcons name={item.icon} size={24} color="#fff" />
        </View>
        <View style={styles.libraryInfo}>
          <Text style={styles.libraryTitle}>{item.title}</Text>
          <Text style={styles.libraryCategory}>{item.category}</Text>
        </View>
      </View>
      <Text style={styles.libraryTime}>{item.time}</Text>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>PRACTICE</Text>
        <TouchableOpacity style={styles.shareBtn}>
          <MaterialCommunityIcons name="share-variant" size={20} color="#0f2747" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Practice Type Buttons - Vertical Stack */}
        <View style={styles.practiceSection}>
          <FlatList
            data={practiceTypes}
            renderItem={renderPracticeButton}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        {/* Recent Activity Section */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[libraries[0]]}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Library Section */}
        <View style={styles.librarySection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Library</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={libraries.slice(1)}
            renderItem={renderLibraryItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation - From Home.js */}
      <View style={styles.bottomNav}>
        <NavIcon icon={<Ionicons name="home" size={26} color="#64748b" />} onPress={() => navigation?.navigate('Home')}  />
        <NavIcon icon={<Ionicons name="document-text-outline" size={26} color="#64748b" />} onPress={() => navigation?.navigate('Library')} />
        <NavIcon icon={<Feather name="clipboard" size={24} color="#0f2747" />} onPress={() => navigation?.navigate('PracticeLibrary')} active/>
        <NavIcon icon={<Feather name="bar-chart-2" size={24} color="#64748b" />} onPress={() => navigation?.navigate('DiagnosticAssessment')} />
        <NavIcon icon={<Feather name="user" size={24} color="#64748b" />} onPress={() => navigation?.navigate('PersonalInfo')} />
      </View>
    </SafeAreaView>
  )
}

function NavIcon({ icon, onPress, active = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.navIconWrap, active && styles.navIconActive]}>
      {icon}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#d8e0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f2747',
    letterSpacing: 1,
  },
  shareBtn: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingBottom: 124,
  },
  practiceSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  practiceButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  practiceButtonText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  activitySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f2747',
  },
  viewAllText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#3d5a80',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  activityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activityMain: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  activityCategory: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 10,
    color: '#94a3b8',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2c4563',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  librarySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    marginTop: 8,
  },
  libraryCard: {
    backgroundColor: '#3d5a80',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  libraryContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  libraryIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#2c4563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryInfo: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 3,
  },
  libraryCategory: {
    fontSize: 11,
    color: '#cbd5e1',
  },
  libraryTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginLeft: 10,
  },
  // Bottom Navigation - From Home.js
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#d8e0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  navIconWrap: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  navIconActive: {
    backgroundColor: 'rgba(15, 39, 71, 0.08)',
  },
})
