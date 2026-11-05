import { supabase } from './supabase'
import { getActiveUserSession } from './database'

/**
 * Extracts and cleans user's first name for greeting and notification targeting
 */
export function extractFirstName(rawName, email = '') {
  if (rawName && typeof rawName === 'string') {
    const cleaned = rawName.trim()
    if (
      cleaned &&
      cleaned.toLowerCase() !== 'learner' &&
      cleaned.toLowerCase() !== 'student' &&
      cleaned.toLowerCase() !== 'user'
    ) {
      const parts = cleaned.split(/\s+/)
      if (parts.length > 1 && ['engr.', 'engr', 'dr.', 'dr', 'mr.', 'ms.', 'atty.'].includes(parts[0].toLowerCase())) {
        return `${parts[0]} ${parts[1]}`
      }
      const first = parts[0]
      if (first) {
        return first.charAt(0).toUpperCase() + first.slice(1)
      }
    }
  }

  if (email && typeof email === 'string') {
    const username = email.split('@')[0]
    const cleaned = username.replace(/[0-9._-]+/g, ' ').trim()
    if (cleaned) {
      const first = cleaned.split(/\s+/)[0]
      if (first && first.length >= 2) {
        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
      }
    }
    const lettersOnly = username.replace(/[^a-zA-Z]/g, '')
    if (lettersOnly && lettersOnly.length >= 2) {
      return lettersOnly.charAt(0).toUpperCase() + lettersOnly.slice(1).toLowerCase()
    }
  }

  return 'Student'
}

/**
 * Formats relative timestamp for notifications
 */
export function formatNotificationTime(timestamp) {
  if (!timestamp) return 'Just now'
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return 'Recently'
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 0) return 'Just now'
  if (diffSec < 60) return 'Just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 86400 * 2) return 'Yesterday'
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Resolves notification icon and accent color based on category/title
 */
export function getNotificationIcon(type, title = '') {
  const t = `${type || ''} ${title || ''}`.toLowerCase()
  if (t.includes('weak') || t.includes('alert') || t.includes('warning') || t.includes('danger')) {
    return { name: 'alert-circle-outline', color: '#e11d48' }
  }
  if (t.includes('study') || t.includes('reminder') || t.includes('review') || t.includes('module')) {
    return { name: 'book-clock-outline', color: '#0284c7' }
  }
  if (t.includes('motivat') || t.includes('streak') || t.includes('fire') || t.includes('readiness')) {
    return { name: 'fire', color: '#f59e0b' }
  }
  if (t.includes('progress') || t.includes('digest') || t.includes('score') || t.includes('metric')) {
    return { name: 'chart-line', color: '#10b981' }
  }
  if (t.includes('exam') || t.includes('schedule') || t.includes('calendar')) {
    return { name: 'calendar-clock', color: '#6366f1' }
  }
  return { name: 'bell-outline', color: '#4f46e5' }
}

// Global subscribers for incoming real-time notifications
const listeners = new Set()
let realtimeChannel = null
const shownNotificationIds = new Set()

/**
 * Strips out target/admin metadata so notifications stay clean and user-friendly
 */
export function cleanNotificationText(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/\s*\(Target:[\s\S]*\)\s*$/i, '')
    .replace(/\s*\[Target:[\s\S]*\]\s*$/i, '')
    .replace(/\s*\(Target:[^)]*\)/gi, '')
    .replace(/\s*\[Target:[^\]]*\]/gi, '')
    .replace(/\s*\(Direct:[\s\S]*\)\s*$/i, '')
    .replace(/\s*Direct:\s*[^\n,.]+/gi, '')
    .trim()
}

/**
 * Register a listener for real-time notifications (used by App-level toaster and Home screen)
 * @param {Function} callback - called with formatted notification object
 * @returns {Function} unsubscribe function
 */
export function addNotificationListener(callback) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

/**
 * Emit a notification to all registered listeners (triggers toaster and updates unread count)
 */
export function notifyListeners(notification) {
  listeners.forEach((callback) => {
    try {
      callback(notification)
    } catch (err) {
      console.warn('Error in notification listener:', err)
    }
  })
}

/**
 * Programmatically trigger a notification toaster popup across any screen
 */
export function triggerNotificationToast(notification) {
  if (!notification || !notification.title) return
  const id = notification.id ? String(notification.id) : `toast_${Date.now()}`
  const iconInfo = getNotificationIcon(notification.type, notification.title)
  
  const payload = {
    id,
    title: cleanNotificationText(notification.title),
    message: cleanNotificationText(notification.message || notification.body || ''),
    type: notification.type || 'Notification',
    icon: iconInfo.name,
    iconColor: iconInfo.color,
    timestamp: notification.created_at || new Date().toISOString(),
  }

  notifyListeners(payload)
}

/**
 * Determines whether a Supabase notification record is targeted/relevant to the active user
 */
export async function isNotificationRelevantForUser(notif) {
  if (!notif) return false

  // 1. Status validation: Drafts are never displayed
  const status = (notif.status || '').toLowerCase()
  if (status === 'draft') return false
  if (status === 'scheduled') {
    if (notif.scheduled_at && new Date(notif.scheduled_at) > new Date()) {
      return false
    }
  }

  const aud = (notif.target_audience || '').trim()
  const audLower = aud.toLowerCase()

  // 2. Broadcast / General announcements -> visible to all learners
  if (!aud || audLower.includes('all user') || audLower === 'all' || audLower.includes('broadcast')) {
    return true
  }

  // 3. Resolve active user credentials
  let uid = null
  let userEmail = ''
  let fullName = ''

  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      uid = session.user.id
      userEmail = session.user.email || ''
      fullName = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || ''
    }
  } catch (_) {}

  if (!uid) {
    try {
      const local = await getActiveUserSession()
      uid = local?.user_id
      userEmail = local?.email || ''
    } catch (_) {}
  }

  if (!fullName && userEmail) {
    try {
      const { data: uData } = await supabase
        .from('users')
        .select('fullname')
        .eq('email', userEmail)
        .maybeSingle()
      if (uData?.fullname) {
        fullName = uData.fullname
      }
    } catch (_) {}
  }

  const userFirstName = extractFirstName(fullName, userEmail).toLowerCase()
  const userFullNameLower = fullName.toLowerCase()
  const userEmailPrefix = (userEmail.split('@')[0] || '').toLowerCase()

  // 4. Direct user notification matching (e.g. "Direct: Daniel" or user_id)
  if (audLower.startsWith('direct:') || audLower.includes('specific user')) {
    const directTarget = audLower.replace(/^direct:\s*/i, '').trim()
    const uidMatches = notif.user_id && uid && notif.user_id === uid
    const nameMatches =
      directTarget &&
      (userFirstName.includes(directTarget) ||
        userFullNameLower.includes(directTarget) ||
        userEmailPrefix.includes(directTarget) ||
        directTarget.includes(userFirstName))

    return Boolean(uidMatches || nameMatches)
  }

  // 5. Segment campaigns (e.g. Struggling, Streak, Inactive)
  return true
}

/**
 * Initializes real-time Supabase postgres_changes listener for the `notifications` table
 */
export function startRealtimeNotifications() {
  if (realtimeChannel) {
    return realtimeChannel
  }

  try {
    realtimeChannel = supabase
      .channel('realtime_public_notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'notifications',
        },
        async (payload) => {
          try {
            const record = payload.new
            if (!record || !record.id) return

            // Avoid duplicate toaster popups in quick succession
            const recordKey = `${record.id}_${record.updated_at || record.created_at || ''}`
            if (shownNotificationIds.has(recordKey)) return

            const isRelevant = await isNotificationRelevantForUser(record)
            if (isRelevant) {
              shownNotificationIds.add(recordKey)
              // Limit size of set to prevent memory growth
              if (shownNotificationIds.size > 200) {
                const firstItem = shownNotificationIds.values().next().value
                shownNotificationIds.delete(firstItem)
              }

              const iconInfo = getNotificationIcon(record.type, record.title)
              notifyListeners({
                id: String(record.id),
                title: cleanNotificationText(record.title || 'Notification'),
                message: cleanNotificationText(record.message || ''),
                type: record.type || 'Notification',
                icon: iconInfo.name,
                iconColor: iconInfo.color,
                timestamp: record.created_at || record.scheduled_at || new Date().toISOString(),
                isRealtime: true,
              })
            }
          } catch (err) {
            console.warn('Error processing real-time notification record:', err)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Notifications channel subscribed successfully')
        }
      })

    return realtimeChannel
  } catch (err) {
    console.warn('Failed to start real-time notifications subscription:', err)
    return null
  }
}

/**
 * Tear down the real-time subscription
 */
export function stopRealtimeNotifications() {
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel)
    } catch (_) {}
    realtimeChannel = null
  }
}
