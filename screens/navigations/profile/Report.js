import React, { useState, useRef } from 'react'
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'

const NAVY = '#0f2747'

export default function Report({ navigation }) {
  const [messages, setMessages] = useState([])

  const [input, setInput] = useState('')
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const scrollViewRef = useRef()

  React.useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const handleSend = () => {
    if (!input.trim()) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    })

    const newMsg = {
      id: messages.length + 1,
      sender: 'user',
      text: input.trim(),
      time: timeStr,
    }

    setMessages((prev) => [...prev, newMsg])
    setInput('')

    // Auto scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)

    // Simulate an automatic simple answer back after 1.5 seconds
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'support',
          text: 'Thank you for reaching out! A support representative will review your message shortly.',
          time: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: false,
          }),
        },
      ])
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    }, 1500)
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={26} color={NAVY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ── Chat Content ── */}
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        <Text style={styles.dateSeparator}>Today</Text>

        {messages.map((msg) => {
          const isUser = msg.sender === 'user'
          return (
            <View
              key={msg.id}
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowSupport,
              ]}
            >
              <View
                style={[
                  styles.bubble,
                  isUser ? styles.bubbleUser : styles.bubbleSupport,
                ]}
              >
                <Text style={[styles.messageText, isUser ? styles.textUser : styles.textSupport]}>
                  {msg.text}
                </Text>
                <Text style={[styles.timeText, isUser ? styles.timeUser : styles.timeSupport]}>
                  {msg.time}
                </Text>
              </View>
            </View>
          )
        })}
      </ScrollView>

      {/* ── Chat Input ── */}
      <View style={[styles.inputContainer, keyboardVisible && { marginBottom: 0 }]}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message...."
            placeholderTextColor="#94a3b8"
            multiline
          />
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Feather name="image" size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.sendBtn}
          activeOpacity={0.8}
          onPress={handleSend}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  // ── Scroll Content ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateSeparator: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
    marginTop: 4,
  },

  // ── Messages ──
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
    width: '100%',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowSupport: {
    justifyContent: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: '85%',
  },
  bubbleUser: {
    backgroundColor: NAVY,
    borderBottomRightRadius: 4,
  },
  bubbleSupport: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: '#fff',
  },
  textSupport: {
    color: NAVY,
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  timeUser: {
    color: 'rgba(255,255,255,0.6)',
  },
  timeSupport: {
    color: '#64748b',
  },

  // ── Input Container ──
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#fff',
    marginBottom: Platform.OS === 'ios' ? 74 + 20 : 74,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 24,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: NAVY,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 80,
  },
  iconBtn: {
    marginLeft: 8,
    padding: 4,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty State ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NAVY,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
})
