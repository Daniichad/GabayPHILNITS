import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ── Configure global notification behavior safely ─────────────
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  })
} catch (e) {
  console.warn('Notification handler setup warning:', e)
}

/**
 * Register notification channels & request permissions
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return false

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('gabay_study_channel', {
        name: 'Study Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0F2747',
        sound: 'default',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }
    return finalStatus === 'granted'
  } catch (error) {
    console.warn('Error requesting notification permissions:', error)
    return false
  }
}

/**
 * Schedule daily study reminder local notification at a specific time (default: 8:00 PM)
 */
export async function scheduleDailyStudyReminder(hour = 20, minute = 0) {
  if (Platform.OS === 'web') return false

  try {
    const granted = await registerForPushNotificationsAsync()
    if (!granted) return false

    // Cancel previous daily reminders first to prevent duplicates
    await cancelDailyStudyReminder()

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📚 Daily CSE Study Time!',
        body: 'Keep your study momentum going! Spend 15 minutes reviewing your weak subject areas today.',
        data: { screen: 'StudyPlan' },
        sound: 'default',
        channelId: 'gabay_study_channel',
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    })
    await AsyncStorage.setItem('dailyNotificationScheduled', 'true')
    return true
  } catch (error) {
    console.warn('Error scheduling daily study reminder:', error)
    return false
  }
}

/**
 * Cancel all daily study reminders
 */
export async function cancelDailyStudyReminder() {
  if (Platform.OS === 'web') return

  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    await AsyncStorage.setItem('dailyNotificationScheduled', 'false')
  } catch (error) {
    console.warn('Error canceling notifications:', error)
  }
}

/**
 * Send an immediate test local notification (for debugging / verification)
 */
export async function sendInstantTestNotification() {
  if (Platform.OS === 'web') return false

  try {
    const granted = await registerForPushNotificationsAsync()
    if (!granted) return false

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Gabay PHILCSE Notification Test',
        body: 'Local notifications are working perfectly! You will receive daily review reminders.',
        data: { screen: 'Home' },
        sound: 'default',
        channelId: 'gabay_study_channel',
      },
      trigger: { seconds: 1 },
    })
    return true
  } catch (error) {
    console.warn('Error sending instant test notification:', error)
    return false
  }
}
