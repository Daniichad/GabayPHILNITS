import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons, Feather } from '@expo/vector-icons'


const CONTENTS = {
  Vocabulary: {
    chapter: 'Chapter 1',
    title: 'Fundamentals of Vocabulary',
    body:
      'Vocabulary questions test your ability to understand word meanings, context clues, antonyms, and synonyms. A strong vocabulary helps you answer verbal items faster and with more accuracy.\n\nReview words in context, look for root words, and practice using new terms in simple sentences. The best way to improve vocabulary is through repeated exposure and active recall.\n\nCommon strategies include reading passages, making flashcards, and learning words by theme. Always read the sentence before choosing the best answer because context can change the meaning of a word.',
  },
  'Reading Comprehension': {
    chapter: 'Chapter 2',
    title: 'Introduction to Reading Comprehension',
    body:
      'Reading comprehension measures how well you understand a passage, identify the main idea, and infer meaning from details. Focus on the author’s purpose, tone, and supporting evidence.\n\nWhen answering comprehension items, read the questions first if needed, then scan the passage for key details. Avoid guessing from memory alone.\n\nPractice summarizing paragraphs in one sentence, because this improves your ability to identify the central idea quickly during exams.',
  },
  'Basic Arithmetic': {
    chapter: 'Chapter 1',
    title: 'Fundamentals of Basic Arithmetic',
    body:
      'Basic arithmetic covers addition, subtraction, multiplication, division, fractions, decimals, percentages, and ratios. Many Civil Service questions are solved faster when you know simple shortcuts.\n\nAlways identify what the question asks before solving. Write down key numbers clearly and check units.\n\nFor word problems, turn the sentence into a math expression. Practice mental math for common percentage and ratio questions to build speed and accuracy.',
  },
}

export default function ReadingMaterial({ navigation, route }) {
  const selectedTitle = route?.params?.title || 'Vocabulary'
  const content = CONTENTS[selectedTitle] || CONTENTS.Vocabulary

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="chevron-back" size={28} color="#13294b" />
        </TouchableOpacity>
        <Text style={styles.title}>{content.chapter}</Text>
        <View style={styles.rightSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>{content.title}</Text>

        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{content.body}</Text>
        </View>

        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => navigation?.goBack()}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={() => navigation?.navigate('Library')}>
            <Text style={styles.primaryButtonText}>Next Chapter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Feather name="settings" size={24} color="#fff" />
      </TouchableOpacity>


    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#13294b',
  },
  rightSpacer: {
    width: 28,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 124,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#13294b',
    marginTop: 8,
    marginBottom: 14,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#dbe3f2',
    padding: 16,
    minHeight: 500,
  },
  contentText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#1f2937',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#0f2747',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#eef1f5',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#13294b',
    fontWeight: '800',
    fontSize: 14,
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
