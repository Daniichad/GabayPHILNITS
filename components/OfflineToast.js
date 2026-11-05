import React, { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { Feather, Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/**
 * Modern floating toaster UI for Offline status and Cloud Synchronization
 */
export default function OfflineToast({ isOffline, syncNotice }) {
  const insets = useSafeAreaInsets()
  const [dismissedOffline, setDismissedOffline] = useState(false)
  const [visible, setVisible] = useState(false)

  // Animation values
  const translateY = useRef(new Animated.Value(-100)).current
  const opacity = useRef(new Animated.Value(0)).current
  const autoHideTimer = useRef(null)
  const prevOfflineRef = useRef(isOffline)

  // Reset dismissed state whenever offline status changes
  useEffect(() => {
    if (prevOfflineRef.current !== isOffline) {
      if (isOffline) {
        setDismissedOffline(false)
      }
      prevOfflineRef.current = isOffline
    }
  }, [isOffline])

  // Determine current toast configuration
  let config = null

  if (syncNotice === 'syncing') {
    config = {
      type: 'syncing',
      title: 'Syncing Offline Changes',
      subtitle: 'Uploading progress & attempts to cloud...',
      icon: <ActivityIndicator size="small" color="#60a5fa" style={{ transform: [{ scale: 0.8 }] }} />,
      bgColor: '#0f2747',
      borderColor: '#2563eb',
      iconBg: 'rgba(37, 99, 235, 0.2)',
      titleColor: '#ffffff',
      subtitleColor: '#93c5fd',
      autoHide: false,
    }
  } else if (syncNotice === 'synced') {
    config = {
      type: 'synced',
      title: 'Back Online • Synced!',
      subtitle: 'Offline activity committed to your account',
      icon: <Feather name="check-circle" size={16} color="#34d399" />,
      bgColor: '#064e3b',
      borderColor: '#10b981',
      iconBg: 'rgba(16, 185, 129, 0.2)',
      titleColor: '#ffffff',
      subtitleColor: '#a7f3d0',
      autoHide: true,
      autoHideDuration: 3500,
    }
  } else if (isOffline && !dismissedOffline) {
    config = {
      type: 'offline',
      title: 'Offline Mode Active',
      subtitle: 'Practice questions & study library ready offline',
      icon: <Feather name="cloud-off" size={15} color="#fbbf24" />,
      bgColor: '#0f172a',
      borderColor: '#334155',
      iconBg: 'rgba(245, 158, 11, 0.15)',
      titleColor: '#ffffff',
      subtitleColor: '#cbd5e1',
      canDismiss: true,
      autoHide: false,
    }
  }

  // Handle animate in and animate out
  useEffect(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
      autoHideTimer.current = null
    }

    if (config) {
      setVisible(true)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 45,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start()

      if (config.autoHide) {
        autoHideTimer.current = setTimeout(() => {
          hideToast()
        }, config.autoHideDuration || 3000)
      }
    } else {
      hideToast()
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    }
  }, [isOffline, syncNotice, dismissedOffline])

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false)
    })
  }

  if (!visible && !config) return null

  const topOffset = Math.max(insets.top, Platform.OS === 'ios' ? 44 : 26) + 8

  return (
    <View style={[styles.toastWrapper, { top: topOffset }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toastCard,
          {
            backgroundColor: config?.bgColor || '#0f172a',
            borderColor: config?.borderColor || '#334155',
            transform: [{ translateY }],
            opacity,
          },
        ]}
      >
        <View style={[styles.iconWrapper, { backgroundColor: config?.iconBg || 'rgba(255,255,255,0.1)' }]}>
          {config?.icon}
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.toastTitle, { color: config?.titleColor || '#fff' }]} numberOfLines={1}>
            {config?.title}
          </Text>
          <Text style={[styles.toastSubtitle, { color: config?.subtitleColor || '#94a3b8' }]} numberOfLines={1}>
            {config?.subtitle}
          </Text>
        </View>

        {config?.canDismiss && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setDismissedOffline(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Feather name="x" size={14} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 14,
    right: 14,
    alignItems: 'center',
    zIndex: 99999,
  },
  toastCard: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  toastSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
})
