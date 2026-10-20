import React, { useState, useRef, useEffect } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { supabase } from '../utils/supabase'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const NAVY = '#0f2747'
const ACCENT = '#d85e67'
const HANDLE_SIZE = 54
const EDGE_MARGIN = 6

const QUICK_PROMPTS = [
  '💡 What should I study today?',
  '📊 How is my exam readiness?',
  '📝 Explain IP vs FE Certifications',
  '⏱️ FE Subject B exam strategy',
]

export default function EdgeHandleAI({ side = 'right' }) {
  const insets = useSafeAreaInsets()

  // Min and Max bounds
  const minX = EDGE_MARGIN
  const maxX = SCREEN_WIDTH - HANDLE_SIZE - EDGE_MARGIN
  const minY = Math.max(insets.top + 40, 60)
  const maxY = SCREEN_HEIGHT - Math.max(insets.bottom + 60, 80) - HANDLE_SIZE
  const defaultY = Math.round(SCREEN_HEIGHT * 0.45)
  const initialX = side === 'left' ? minX : maxX

  const panX = useRef(new Animated.Value(initialX)).current
  const panY = useRef(new Animated.Value(defaultY)).current
  const currentX = useRef(initialX)
  const currentY = useRef(defaultY)
  const currentSide = useRef(side)

  const opacityAnim = useRef(new Animated.Value(1)).current
  const inactivityTimer = useRef(null)

  const [panelOpen, setPanelOpen] = useState(false)
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current

  // Chat State
  const [messages, setMessages] = useState([
    {
      id: '1',
      sender: 'ai',
      text: 'Hello! I am your GABAY AI Study Assistant. Ask me anything about PhilNITS IP and FE exam topics, study plans, or test strategies!',
      time: 'Just now',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatScrollRef = useRef(null)

  // ── Restore saved position ──────────────────────────────────
  useEffect(() => {
    const restorePos = async () => {
      try {
        const savedSide = await AsyncStorage.getItem('edgeHandleSide')
        const savedY = await AsyncStorage.getItem('edgeHandleY')

        let targetX = maxX
        if (savedSide === 'left') {
          targetX = minX
          currentSide.current = 'left'
        } else {
          targetX = maxX
          currentSide.current = 'right'
        }

        currentX.current = targetX
        panX.setValue(targetX)

        if (savedY !== null) {
          const parsedY = parseFloat(savedY)
          const clamped = Math.min(Math.max(parsedY, minY), maxY)
          currentY.current = clamped
          panY.setValue(clamped)
        }
      } catch (e) {
        /* fallback to defaults */
      }
    }
    restorePos()
    resetInactivityTimer()

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [])

  // ── Inactivity Opacity Fade (4s) ───────────────────────────
  const resetInactivityTimer = () => {
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }).start()

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)

    inactivityTimer.current = setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0.65,
        duration: 500,
        useNativeDriver: false,
      }).start()
    }, 4000)
  }

  // ── PanResponder for 2D Dragging & Snapping to Side ──────────
  const dragStartOffset = useRef({ x: initialX, y: defaultY })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 3 || Math.abs(gestureState.dx) > 3
      },

      onPanResponderGrant: () => {
        resetInactivityTimer()
        dragStartOffset.current = { x: currentX.current, y: currentY.current }
      },

      onPanResponderMove: (_, gestureState) => {
        resetInactivityTimer()
        const newX = dragStartOffset.current.x + gestureState.dx
        const newY = dragStartOffset.current.y + gestureState.dy

        const clampedX = Math.min(Math.max(newX, minX), maxX)
        const clampedY = Math.min(Math.max(newY, minY), maxY)

        currentX.current = clampedX
        currentY.current = clampedY
        panX.setValue(clampedX)
        panY.setValue(clampedY)
      },

      onPanResponderRelease: (_, gestureState) => {
        resetInactivityTimer()
        const totalDist = Math.hypot(gestureState.dx, gestureState.dy)

        if (totalDist < 6) {
          // Tap detected — open AI panel
          openPanel()
          return
        }

        // Drag finished — decide which side to stick to
        const middleX = (minX + maxX) / 2
        const shouldSnapLeft = gestureState.vx < -0.3 || (gestureState.vx <= 0.3 && currentX.current < middleX)

        const finalX = shouldSnapLeft ? minX : maxX
        const finalSide = shouldSnapLeft ? 'left' : 'right'

        currentSide.current = finalSide
        currentX.current = finalX

        // Spring snap to the edge
        Animated.spring(panX, {
          toValue: finalX,
          useNativeDriver: false,
          tension: 75,
          friction: 9,
        }).start()

        // Persist side & vertical coordinate
        AsyncStorage.setItem('edgeHandleSide', finalSide).catch(() => {})
        AsyncStorage.setItem('edgeHandleY', currentY.current.toString()).catch(() => {})
      },
    })
  ).current

  // ── Panel Open / Close ─────────────────────────────────────
  const openPanel = () => {
    resetInactivityTimer()
    setPanelOpen(true)
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start()
  }

  const closePanel = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setPanelOpen(false)
      resetInactivityTimer()
    })
  }

  // ── AI Chat Assistant Logic ────────────────────────────────
  const handleSendMessage = (textToSend = inputText) => {
    const query = textToSend.trim()
    if (!query) return

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    if (textToSend === inputText) setInputText('')
    setIsTyping(true)

    setTimeout(() => {
      const replyText = generateAiReply(query)
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
      setMessages((prev) => [...prev, aiMsg])
      setIsTyping(false)
    }, 1000)
  }

  const generateAiReply = (q) => {
    const query = q.toLowerCase()
    if (query.includes('study') || query.includes('today') || query.includes('review')) {
      return 'Based on your diagnostic profile, I recommend dedicating 25 minutes to Algorithms & Data Structures and 20 minutes to Network Protocols & Information Security today.'
    }
    if (query.includes('readiness') || query.includes('performance') || query.includes('score')) {
      return 'Remember: Official PhilNITS grading uses an Item Response Theory (IRT) scaled score (passing: 600/1000 for FE, 550/1000 for IP). Aim for at least 60% on raw practice questions to be well-prepared!'
    }
    if (query.includes('ip') || query.includes('fe') || query.includes('difference') || query.includes('cert')) {
      return 'Information Technology Passport (IP) tests baseline IT knowledge for all business/IT professionals. Fundamental IT Engineer (FE) is for software engineers and covers deep technical topics, including pseudo-code algorithms and security in Subject B.'
    }
    if (query.includes('tip') || query.includes('strategy') || query.includes('time') || query.includes('subject b')) {
      return 'FE Subject B Strategy: Dedicate ample time to trace pseudo-code line-by-line using memory trace tables. Security and Algorithms comprise the core of Subject B!'
    }
    return `Great question regarding "${q}"! To master this topic for the PhilNITS exam, try our practice sets in the Practice tab or review the key concepts in your Study Guide.`
  }

  return (
    <>
      {/* ── Draggable Edge Handle ── */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.handleContainer,
          {
            left: panX,
            top: panY,
            opacity: opacityAnim,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openPanel}
          style={styles.handleCircle}
        >
          {/* Glowing App / G Logo */}
          <View style={styles.iconInner}>
            <Image
              source={require('../assets/loading.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── AI Assistant Drawer Panel (Non-fullscreen Slide) ── */}
      <Modal
        visible={panelOpen}
        transparent
        animationType="none"
        onRequestClose={closePanel}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Closes */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closePanel}
          />

          {/* Sliding Panel */}
          <Animated.View
            style={[
              styles.panelContainer,
              {
                transform: [{ translateX: slideAnim }],
                paddingBottom: Math.max(insets.bottom, 16),
              },
            ]}
          >
            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              {/* Header */}
              <View style={styles.panelHeader}>
                <View style={styles.headerTitleRow}>
                  <View style={styles.headerLogoCircle}>
                    <Image
                      source={require('../assets/loading.png')}
                      style={styles.headerLogoImg}
                      resizeMode="contain"
                    />
                  </View>
                  <View>
                    <Text style={styles.headerTitleText}>GABAY AI Assistant</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.statusText}>Online • PhilNITS Study Tutor</Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={closePanel}>
                  <Feather name="x" size={20} color={NAVY} />
                </TouchableOpacity>
              </View>

              {/* Quick Prompt Chips */}
              <View style={styles.chipsWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                  {QUICK_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.chipButton}
                      activeOpacity={0.75}
                      onPress={() => handleSendMessage(prompt)}
                    >
                      <Text style={styles.chipText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Chat Conversation */}
              <ScrollView
                ref={chatScrollRef}
                style={styles.chatScroll}
                contentContainerStyle={styles.chatScrollContent}
                onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isAi = msg.sender === 'ai'
                  return (
                    <View
                      key={msg.id}
                      style={[styles.msgRow, isAi ? styles.msgRowAi : styles.msgRowUser]}
                    >
                      {isAi && (
                        <View style={styles.msgAvatar}>
                          <Ionicons name="sparkles" size={16} color="#fff" />
                        </View>
                      )}
                      <View style={[styles.msgBubble, isAi ? styles.msgBubbleAi : styles.msgBubbleUser]}>
                        <Text style={[styles.msgText, isAi ? styles.msgTextAi : styles.msgTextUser]}>
                          {msg.text}
                        </Text>
                        <Text style={[styles.msgTime, isAi ? styles.msgTimeAi : styles.msgTimeUser]}>
                          {msg.time}
                        </Text>
                      </View>
                    </View>
                  )
                })}

                {isTyping && (
                  <View style={[styles.msgRow, styles.msgRowAi]}>
                    <View style={styles.msgAvatar}>
                      <Ionicons name="sparkles" size={16} color="#fff" />
                    </View>
                    <View style={[styles.msgBubble, styles.msgBubbleAi, { paddingVertical: 10 }]}>
                      <Text style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                        GABAY AI is thinking…
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Input Area */}
              <View style={styles.inputBar}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ask GABAY AI a question…"
                  placeholderTextColor="#94a3b8"
                  value={inputText}
                  onChangeText={setInputText}
                  onSubmitEditing={() => handleSendMessage()}
                  returnKeyType="send"
                />
                <TouchableOpacity
                  style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                  activeOpacity={0.8}
                  onPress={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  // Handle styling
  handleContainer: {
    position: 'absolute',
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    zIndex: 9999,
    elevation: 20,
  },
  handleCircle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#38bdf8',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    // Elevation for Android
    elevation: 12,
  },
  iconInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: 22,
    height: 22,
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 30, 53, 0.45)',
  },
  backdrop: {
    flex: 1,
  },
  panelContainer: {
    width: SCREEN_WIDTH * 0.86,
    maxWidth: 400,
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: -6, height: 0 },
    elevation: 24,
  },

  // Panel Header
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLogoImg: {
    width: 26,
    height: 26,
  },
  headerTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: NAVY,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chips
  chipsWrap: {
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  chipsScroll: {
    paddingHorizontal: 14,
    gap: 8,
  },
  chipButton: {
    backgroundColor: '#e0efff',
    borderColor: '#bed6ff',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
  },

  // Chat Area
  chatScroll: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  chatScrollContent: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  msgBubbleAi: {
    backgroundColor: '#f1f5f9',
    borderBottomLeftRadius: 4,
  },
  msgBubbleUser: {
    backgroundColor: NAVY,
    borderBottomRightRadius: 4,
  },
  msgText: {
    fontSize: 13,
    lineHeight: 19,
  },
  msgTextAi: {
    color: '#1e293b',
  },
  msgTextUser: {
    color: '#ffffff',
  },
  msgTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeAi: {
    color: '#94a3b8',
  },
  msgTimeUser: {
    color: 'rgba(255,255,255,0.7)',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    fontSize: 14,
    color: NAVY,
    maxHeight: 90,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
})
