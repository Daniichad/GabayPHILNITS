import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { addNotificationListener, cleanNotificationText } from '../utils/notificationManager'

const NAVY = '#0B2540'
const ACCENT = '#d85e67'

export default function NotificationToast({ navigationRef }) {
  const insets = useSafeAreaInsets()
  const [currentNotif, setCurrentNotif] = useState(null)
  const [visible, setVisible] = useState(false)

  // Animation values
  const translateY = useRef(new Animated.Value(-120)).current
  const opacity = useRef(new Animated.Value(0)).current
  const hideTimeoutRef = useRef(null)

  // Dismiss animation
  const dismissToast = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false)
      setCurrentNotif(null)
    })
  }, [translateY, opacity])

  // Present animation
  const showToast = useCallback(
    (notif) => {
      if (!notif) return

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }

      // Ensure no target mentions in title or message
      const cleanedTitle = cleanNotificationText(notif.title) || 'Notification'
      const cleanedMessage = cleanNotificationText(notif.message || notif.body || '')

      setCurrentNotif({
        ...notif,
        title: cleanedTitle,
        message: cleanedMessage,
      })
      setVisible(true)

      // Start from above screen
      translateY.setValue(-120)
      opacity.setValue(0)

      // Slide down smoothly
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 48,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      // Auto dismiss after 4.5s
      hideTimeoutRef.current = setTimeout(() => {
        dismissToast()
      }, 4500)
    },
    [translateY, opacity, dismissToast]
  )

  useEffect(() => {
    const unsubscribe = addNotificationListener((notif) => {
      showToast(notif)
    })

    return () => {
      unsubscribe()
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [showToast])

  const handlePress = () => {
    dismissToast()
    if (navigationRef && navigationRef.isReady()) {
      navigationRef.navigate('Home', { openNotifs: true })
    }
  }

  // Swipe up to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy < -6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          translateY.setValue(gestureState.dy)
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -15 || gestureState.vy < -0.5) {
          dismissToast()
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            useNativeDriver: true,
          }).start()
        }
      },
    })
  ).current

  if (!visible || !currentNotif) return null

  const topOffset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 26) + 8

  return (
    <View style={[styles.container, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.card,
          {
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handlePress}
          style={styles.touchableArea}
        >
          {/* Simple Icon Badge */}
          <View style={[styles.iconWrap, { backgroundColor: (currentNotif.iconColor || ACCENT) + '22' }]}>
            <MaterialCommunityIcons
              name={currentNotif.icon || 'bell-outline'}
              size={20}
              color={currentNotif.iconColor || ACCENT}
            />
          </View>

          {/* Clean Content (No target mentions) */}
          <View style={styles.contentWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {currentNotif.title}
            </Text>
            {Boolean(currentNotif.message) && (
              <Text style={styles.message} numberOfLines={2}>
                {currentNotif.message}
              </Text>
            )}
          </View>

          {/* Subtle Dismiss Button */}
          <TouchableOpacity
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={dismissToast}
          >
            <Ionicons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 999999,
    elevation: 999,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0B2540',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e3a64',
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  touchableArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  contentWrap: {
    flex: 1,
    paddingRight: 6,
  },
  title: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    color: '#cbd5e1',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginLeft: 4,
    alignSelf: 'center',
  },
})
