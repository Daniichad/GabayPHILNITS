import { Platform } from 'react-native'

/**
 * Responsive Bottom Layout Utilities for Android (3-Button Navigation vs. Gesture Navigation) & iOS
 */

/**
 * Returns true if the device has a 3-button navigation bar (typical on Android ~48dp).
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 */
export function isThreeButtonNavigation(insets) {
  const bottom = insets?.bottom ?? 0
  return Platform.OS === 'android' && bottom >= 36
}

/**
 * Calculates responsive padding for bottom-anchored bars, floating buttons, and tabs.
 * - On 3-button nav devices: provides the exact bottom bar inset so content never overlaps system buttons.
 * - On gesture nav devices: provides comfortable breathing room (default 12-16dp).
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 * @param {number} [extraPadding=0]
 * @param {number} [minPadding=12]
 */
export function getResponsiveBottomInset(insets, extraPadding = 0, minPadding = 12) {
  const bottom = insets?.bottom ?? 0
  if (bottom >= 36) {
    // 3-button Android navigation bar detected
    return bottom + extraPadding
  }
  return Math.max(bottom, minPadding) + extraPadding
}

/**
 * Calculates bottom padding for bottom sheet modals, popups, and dialogs.
 * Ensures buttons like "Confirm", "Cancel", and text inputs are never covered by the system navigation bar.
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 * @param {number} [basePadding=16]
 */
export function getModalBottomPadding(insets, basePadding = 16) {
  const bottom = insets?.bottom ?? 0
  if (bottom >= 36) {
    return bottom + basePadding
  }
  return Math.max(bottom, 16) + basePadding
}

/**
 * Calculates bottom content padding for ScrollViews and FlatLists so the last items are always scrollable
 * above any fixed BottomNav or floating action buttons.
 * @param {import('react-native-safe-area-context').EdgeInsets} insets
 * @param {boolean} [hasBottomNav=true]
 * @param {number} [extraSpace=24]
 */
export function getScrollBottomPadding(insets, hasBottomNav = true, extraSpace = 24) {
  const bottom = insets?.bottom ?? 0
  const navHeight = hasBottomNav ? (bottom >= 36 ? 56 + bottom : 64) : 0
  return navHeight + Math.max(bottom, 12) + extraSpace
}

