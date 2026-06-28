import React from 'react'
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'

const readingCards = [
  {
    title: 'Vocabulary',
    subtitle: 'Learn the fundamentals of Vocabulary',
    image: require('../assets/loading.png'),
    route: 'ReadingMaterial',
  },
  {
    title: 'Reading Comprehension',
    subtitle: 'Master the Reading Comprehension',
    image: require('../assets/loading.png'),
    route: 'ReadingMaterial',
  },
  {
    title: 'Basic Arithmetic',
    subtitle: 'Learn the fundamentals of Arithmetic',
    image: require('../assets/loading.png'),
    route: 'ReadingMaterial',
  },
]

const videoCards = [
  { title: 'Basic Arithmetic', duration: '12 minutes', image: require('../assets/loading.png') },
  { title: 'Basic Percentages', duration: '5 minutes', image: require('../assets/loading.png') },
]

const chipLabels = [
  'Verbal Ability',
  'Numerical Ability',
  'Analytical Ability',
  'Logical Reasoning',
  'General Information',
  'Clerical Operations',
]

export default function Library({ navigation }) {
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Ionicons name="chevron-back" size={28} color="#13294b" />
          </TouchableOpacity>
          <Text style={styles.title}>Library</Text>
          <View style={styles.rightSpacer} />
        </View>

        <View style={styles.searchBar}>
          <Feather name="search" size={22} color="#94a3b8" />
          <Text style={styles.searchText}>Search</Text>
        </View>

        <View style={styles.chipWrap}>
          {chipLabels.map((label) => (
            <TouchableOpacity key={label} style={styles.chip} activeOpacity={0.85}>
              <Text style={styles.chipText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.recentTitle}>Recents</Text>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Feather name="book-open" size={20} color="#13294b" />
            <Text style={styles.sectionHeaderText}>Reading Materials</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.categoryRow}>
          <Text style={styles.categoryTitle}>Verbal Ability</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
          {readingCards.map((card) => (
            <TouchableOpacity key={card.title} style={styles.materialCard} activeOpacity={0.85} onPress={() => navigation?.navigate('ReadingMaterial', { title: card.title })}>
              <Image source={card.image} style={styles.materialImage} resizeMode="cover" />
              <View style={styles.materialBody}>
                <Text style={styles.materialTitle}>{card.title}</Text>
                <Text style={styles.materialSubtitle}>{card.subtitle}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '42%' }]} />
                  </View>
                  <Text style={styles.progressText}>5/10</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.categoryRow}>
          <Text style={styles.categoryTitle}>Numerical Ability</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
          {readingCards.slice(2).map((card) => (
            <TouchableOpacity key={card.title} style={styles.materialCard} activeOpacity={0.85} onPress={() => navigation?.navigate('ReadingMaterial', { title: card.title })}>
              <Image source={card.image} style={styles.materialImage} resizeMode="cover" />
              <View style={styles.materialBody}>
                <Text style={styles.materialTitle}>{card.title}</Text>
                <Text style={styles.materialSubtitle}>{card.subtitle}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '42%' }]} />
                  </View>
                  <Text style={styles.progressText}>5/10</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleRow}>
            <Feather name="video" size={20} color="#13294b" />
            <Text style={styles.sectionHeaderText}>Video Lectures</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
          {videoCards.map((card) => (
            <TouchableOpacity key={card.title} style={styles.videoCard} activeOpacity={0.85} onPress={() => navigation?.navigate('ReadingMaterial', { title: card.title })}>
              <Image source={card.image} style={styles.videoImage} resizeMode="cover" />
              <View style={styles.materialBody}>
                <Text style={styles.materialTitle}>{card.title}</Text>
                <Text style={styles.materialSubtitle}>{card.duration}</Text>
                <View style={styles.progressRow}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: '35%' }]} />
                  </View>
                  <Text style={styles.progressText}>5min</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="settings" size={24} color="#fff" />
      </TouchableOpacity>

      <BottomBar navigation={navigation} active="library" />
    </View>
  )
}

function BottomBar({ navigation, active }) {
  return (
    <View style={styles.bottomNav}>
      <NavButton active={active === 'home'} icon={<Ionicons name="home" size={26} color={active === 'home' ? '#13294b' : '#64748b'} />} onPress={() => navigation?.navigate('Home')} />
      <NavButton active={active === 'study'} icon={<Ionicons name="document-text" size={26} color={active === 'study' ? '#13294b' : '#64748b'} />} onPress={() => navigation?.navigate('StudyPlan')} />
      <NavButton active={active === 'library'} icon={<Feather name="clipboard" size={24} color={active === 'library' ? '#13294b' : '#64748b'} />} onPress={() => navigation?.navigate('Library')} />
      <NavButton icon={<Feather name="bar-chart-2" size={24} color="#64748b" />} onPress={() => navigation?.navigate('DiagnosticAssessment')} />
      <NavButton icon={<Feather name="user" size={24} color="#64748b" />} onPress={() => navigation?.navigate('Home')} />
    </View>
  )
}

function NavButton({ icon, onPress, active = false }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={[styles.navIconWrap, active && styles.navIconActive]}>
      {icon}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 124,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#13294b',
  },
  rightSpacer: {
    width: 28,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eef1f5',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 16,
  },
  searchText: {
    color: '#94a3b8',
    fontSize: 15,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  chip: {
    borderWidth: 1.2,
    borderColor: '#4d72c7',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
    shadowColor: '#4d72c7',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipText: {
    color: '#13294b',
    fontSize: 13,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#13294b',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#13294b',
  },
  viewAllText: {
    fontSize: 14,
    color: '#13294b',
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#13294b',
  },
  horizontalCards: {
    gap: 12,
    paddingBottom: 16,
  },
  materialCard: {
    width: 160,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  materialImage: {
    width: '100%',
    height: 96,
    backgroundColor: '#dbe8fb',
  },
  videoCard: {
    width: 160,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  videoImage: {
    width: '100%',
    height: 96,
    backgroundColor: '#dbe8fb',
  },
  materialBody: {
    padding: 10,
  },
  materialTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#13294b',
    marginBottom: 4,
  },
  materialSubtitle: {
    fontSize: 12,
    color: '#374151',
    minHeight: 32,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#13294b',
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
  },
  fab: {
    position: 'absolute',
    right: 18,
    bottom: 82,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0f2747',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
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
