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

const { width } = Dimensions.get('window')

export default function PracticeScreen() {
  const [activeTab, setActiveTab] = useState('practice')
  const [selectedActivity, setSelectedActivity] = useState('vocabulary')

  const practiceTypes = [
    { id: 'practice', label: 'PRACTICE', color: '#3B82B8', icon: 'play-circle' },
    { id: 'watching', label: 'WATCHING', color: '#8B5CF6', icon: 'eye' },
    { id: 'truefalse', label: 'TRUE OR FALSE', color: '#EF4444', icon: 'check-circle' },
    { id: 'multiple', label: 'MULTIPLE CHOICE', color: '#60A5FA', icon: 'checkbox-marked-circle' },
    { id: 'mock', label: 'MOCK EXAMINATION', color: '#E5E7EB', textColor: '#111827', icon: 'file-document' },
  ]

  const recentActivities = [
    { id: 1, name: 'Vocabulary', icon: 'book', color: '#3B82B8' },
    { id: 2, name: 'Algebra Basics', icon: 'calculator', color: '#8B5CF6' },
    { id: 3, name: 'Sentence Completion', icon: 'pencil', color: '#06B6D4' },
  ]

  const libraryItems = [
    {
      id: 1,
      title: 'Vocabulary',
      category: 'Language Skills',
      date: '14 January 2026',
      progress: 75,
      icon: 'book-open',
    },
    {
      id: 2,
      title: 'Algebra Basics',
      category: 'Mathematics',
      date: '12 January 2026',
      progress: 60,
      icon: 'calculator',
    },
    {
      id: 3,
      title: 'Sentence Completion',
      category: 'Reading Comprehension',
      date: '10 January 2026',
      progress: 85,
      icon: 'format-quote-close',
    },
    {
      id: 4,
      title: 'Stress and Anxiety',
      category: 'General Knowledge',
      date: '8 January 2026',
      progress: 45,
      icon: 'brain',
    },
    {
      id: 5,
      title: 'Acronym',
      category: 'Vocabulary',
      date: '5 January 2026',
      progress: 90,
      icon: 'format-letter-case',
    },
    {
      id: 6,
      title: 'Basic Arithmetic',
      category: 'Mathematics',
      date: '3 January 2026',
      progress: 70,
      icon: 'plus',
    },
  ]

  const categories = [
    { id: 1, name: 'Fractions & Decimals', icon: 'percent', color: '#3B82B8' },
    { id: 2, name: 'Data Interpretation', icon: 'chart-bar', color: '#8B5CF6' },
  ]

  const renderPracticeType = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.practiceButton,
        {
          backgroundColor: activeTab === item.id ? item.color : 'white',
        },
      ]}
      onPress={() => setActiveTab(item.id)}
      activeOpacity={0.8}
    >
      <Text
        style={[
          styles.practiceButtonText,
          {
            color: activeTab === item.id ? 'white' : item.textColor || '#111827',
            fontWeight: activeTab === item.id ? '700' : '600',
          },
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  )

  const renderActivityItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.activityItem,
        { borderLeftColor: item.color },
        selectedActivity === item.name && styles.activityItemActive,
      ]}
      onPress={() => setSelectedActivity(item.name)}
    >
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: `${item.color}15` },
        ]}
      >
        <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
      </View>
      <Text
        style={[
          styles.activityName,
          selectedActivity === item.name && styles.activityNameActive,
        ]}
      >
        {item.name}
      </Text>
      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color={selectedActivity === item.name ? '#3B82B8' : '#D1D5DB'}
      />
    </TouchableOpacity>
  )

  const renderLibraryItem = ({ item }) => (
    <View style={styles.libraryCard}>
      <View style={styles.libraryHeader}>
        <View
          style={[
            styles.libraryIconContainer,
            { backgroundColor: '#E5E7EB' },
          ]}
        >
          <MaterialCommunityIcons name={item.icon} size={28} color="#3B82B8" />
        </View>
        <View style={styles.libraryInfo}>
          <Text style={styles.libraryTitle}>{item.title}</Text>
          <Text style={styles.libraryCategory}>{item.category}</Text>
        </View>
      </View>

      <Text style={styles.libraryDate}>{item.date}</Text>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${item.progress}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{item.progress}%</Text>
      </View>

      <TouchableOpacity style={styles.startButton}>
        <MaterialCommunityIcons name="play" size={16} color="#fff" />
        <Text style={styles.startButtonText}>Start Practice</Text>
      </TouchableOpacity>
    </View>
  )

  const renderCategoryItem = ({ item }) => (
    <View style={styles.categoryCard}>
      <View
        style={[
          styles.categoryIcon,
          { backgroundColor: `${item.color}20` },
        ]}
      >
        <MaterialCommunityIcons name={item.icon} size={24} color={item.color} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Practice</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell" size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Practice Type Tabs */}
        <View style={styles.practiceSection}>
          <FlatList
            data={practiceTypes}
            renderItem={renderPracticeType}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={styles.practiceGrid}
            contentContainerStyle={styles.practiceGrid}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.activitySection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <FlatList
            data={recentActivities}
            renderItem={renderActivityItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>

        {/* Library Section */}
        <View style={styles.librarySection}>
          <View style={styles.libraryHeader2}>
            <Text style={styles.sectionTitle}>Library</Text>
            <TouchableOpacity>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={libraryItems.slice(0, 3)}
            renderItem={renderLibraryItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Explore Topics</Text>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            numColumns={2}
            columnWrapperStyle={styles.categoryGrid}
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="home" size={24} color="#3B82B8" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="book" size={24} color="#D1D5DB" />
          <Text style={[styles.navLabel, { color: '#D1D5DB' }]}>Study</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="play-circle" size={24} color="#D1D5DB" />
          <Text style={[styles.navLabel, { color: '#D1D5DB' }]}>Practice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="chart-line" size={24} color="#D1D5DB" />
          <Text style={[styles.navLabel, { color: '#D1D5DB' }]}>Stats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <MaterialCommunityIcons name="account" size={24} color="#D1D5DB" />
          <Text style={[styles.navLabel, { color: '#D1D5DB' }]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  practiceSection: {
    paddingHorizontal: 12,
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  practiceGrid: {
    gap: 12,
  },
  practiceButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  activitySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  activityItemActive: {
    backgroundColor: '#E5E7EB',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activityNameActive: {
    color: '#111827',
    fontWeight: '700',
  },
  librarySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  libraryHeader2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82B8',
  },
  libraryCard: {
    paddingVertical: 16,
  },
  libraryHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  libraryIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  libraryInfo: {
    flex: 1,
  },
  libraryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  libraryCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  libraryDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82B8',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82B8',
    minWidth: 40,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82B8',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  separator: {
    height: 12,
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    marginVertical: 8,
  },
  categoryGrid: {
    gap: 12,
  },
  categoryCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  navLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#3B82B8',
    fontWeight: '600',
  },
})