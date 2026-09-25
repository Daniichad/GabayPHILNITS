/**
 * Configuration for the points engine caps and thresholds.
 */
export const POINTS_CONFIG = {
  DAILY_CAP_READING: 300,
  DAILY_CAP_PRACTICE: 1000,
  DAILY_CAP_EXAM: 2000,
  PRACTICE_SESSIONS_PER_SIGN_PER_DAY: 3,
}

/**
 * Validates if the user engaged with the reading material long enough.
 * @param {Object} sessionData - Data describing the reading session.
 * @param {number} sessionData.dwellTimeSeconds - Time spent on the material.
 * @param {boolean} sessionData.scrolledToBottom - Did they reach the end?
 * @returns {boolean}
 */
export const hasMetEngagementThreshold = (sessionData) => {
  if (!sessionData) return false
  // Require at least 15 seconds of dwell time and scrolling to the bottom.
  return sessionData.dwellTimeSeconds >= 15 && sessionData.scrolledToBottom
}

/**
 * Calculates streak points based on current streak count.
 * @param {number} streakDay - The day of the streak being achieved.
 * @returns {Object} { points, category, metadata }
 */
export const calculateStreakPoints = (streakDay) => {
  let basePoints = 0
  let bonus = 0

  if (streakDay >= 1 && streakDay <= 2) basePoints = 5
  else if (streakDay >= 3 && streakDay <= 6) basePoints = 10
  else if (streakDay >= 7 && streakDay <= 13) basePoints = 15
  else if (streakDay >= 14 && streakDay <= 29) basePoints = 20
  else if (streakDay >= 30) basePoints = 30

  if (streakDay === 30) bonus = 100
  if (streakDay === 100) bonus = 250

  return {
    points: basePoints + bonus,
    category: 'streak',
    metadata: { streakDay, basePoints, bonus }
  }
}

/**
 * Calculates points for a reading session.
 * @param {Object} params
 * @param {boolean} params.isStart - True if this is just starting the session.
 * @param {boolean} params.isFirstTime - True if this is the first time finishing this material.
 * @param {Object} params.sessionData - The session engagement data.
 * @param {string} params.materialId - The ID of the material.
 * @returns {Object} { points, category, metadata }
 */
export const calculateReadingPoints = ({ isStart, isFirstTime, sessionData, materialId }) => {
  let points = 0
  
  if (isStart) {
    points = 5
  } else {
    // Finishing
    if (hasMetEngagementThreshold(sessionData)) {
      points = isFirstTime ? 15 : 5
    } else {
      points = 0 // No points if engagement threshold not met
    }
  }

  return {
    points,
    category: 'reading',
    metadata: { isStart, isFirstTime, materialId, engagementMet: points > 0 && !isStart }
  }
}

/**
 * Calculates points for a practice session.
 * @param {Object} params
 * @param {boolean} params.isStart - True if starting the session.
 * @param {number} params.correctGestures - Number of correctly performed gestures.
 * @param {number} params.totalGestures - Total gestures attempted in the session.
 * @param {string} params.signId - The ID of the sign practiced.
 * @param {number} params.sessionsToday - Number of point-earning practice sessions for this sign today.
 * @returns {Object} { points, category, metadata }
 */
export const calculatePracticePoints = ({ isStart, correctGestures = 0, totalGestures = 0, signId, sessionsToday = 0 }) => {
  if (isStart) {
    return {
      points: 5,
      category: 'practice',
      metadata: { isStart, signId }
    }
  }

  // Cap check for finishing
  if (sessionsToday >= POINTS_CONFIG.PRACTICE_SESSIONS_PER_SIGN_PER_DAY) {
    return {
      points: 0,
      category: 'practice',
      metadata: { isStart: false, signId, capReached: true }
    }
  }

  const baseGesturePoints = correctGestures * 2
  const finishPoints = 10
  const accuracy = totalGestures > 0 ? (correctGestures / totalGestures) * 100 : 0
  
  let multiplier = 1.0
  if (accuracy < 50) multiplier = 0.5
  else if (accuracy >= 50 && accuracy < 75) multiplier = 1.0
  else if (accuracy >= 75 && accuracy < 90) multiplier = 1.25
  else if (accuracy >= 90) multiplier = 1.5

  const gesturePoints = Math.round(baseGesturePoints * multiplier)
  const totalPoints = finishPoints + gesturePoints

  return {
    points: totalPoints,
    category: 'practice',
    metadata: { isStart: false, correctGestures, totalGestures, accuracy, multiplier, signId }
  }
}

/**
 * Calculates points for a mock exam.
 * @param {Object} params
 * @param {string} params.examId - The ID of the mock exam.
 * @param {number} params.score - Percentage score (0-100).
 * @param {boolean} params.isFirstAttempt - True if this is the user's first time taking this exam.
 * @param {number} params.previousBestScore - The user's previous best score (0-100), if retaking.
 * @returns {Object} { points, category, metadata }
 */
export const calculateMockExamPoints = ({ examId, score, isFirstAttempt, previousBestScore = 0 }) => {
  const completionPoints = 20
  const scorePoints = score * 3
  
  let totalPoints = completionPoints + scorePoints
  let firstTimeBonus = 0
  let passingBonus = 0
  let perfectBonus = 0
  let improvementBonus = 0

  if (isFirstAttempt) {
    firstTimeBonus = 30
    if (score >= 75) passingBonus = 50
    if (score === 100) perfectBonus = 150
  } else {
    // Retake logic: no first time or passing/perfect bonuses.
    // Instead, they get 5 points per percentage point of improvement.
    if (score > previousBestScore) {
      const improvement = score - previousBestScore
      improvementBonus = improvement * 5
      // The prompt implies base + scorePoints are still awarded on retake, PLUS the improvement bonus.
    }
  }

  totalPoints += firstTimeBonus + passingBonus + perfectBonus + improvementBonus

  return {
    points: totalPoints,
    category: 'mock_exam',
    metadata: { examId, score, isFirstAttempt, previousBestScore, improvementBonus }
  }
}

/**
 * Checks and awards daily streak points.
 */
export const checkAndAwardStreakPoints = async (streakDays = 1) => {
  try {
    const { addLocalPointEntry } = require('./database')
    const todayKey = new Date().toISOString().slice(0, 10)
    const ptsObj = calculateStreakPoints(streakDays)
    ptsObj.metadata.date = todayKey
    await addLocalPointEntry(ptsObj.category, ptsObj.points, ptsObj.metadata)
    return ptsObj.points
  } catch (err) {
    console.warn('Error awarding streak points:', err)
    return 0
  }
}

/**
 * Records a points entry locally in SQLite points_ledger_local and triggers sync queue.
 * @param {Object} pointsObj - Object returned by calculateReadingPoints, calculatePracticePoints, calculateMockExamPoints, or calculateStreakPoints.
 */
export const recordPointsEntry = async (pointsObj) => {
  if (!pointsObj || typeof pointsObj.points !== 'number' || pointsObj.points <= 0) {
    return 0
  }

  try {
    const { addLocalPointEntry } = require('./database')
    const { processSyncQueue } = require('./syncManager')
    await addLocalPointEntry(pointsObj.category, pointsObj.points, pointsObj.metadata || {})
    // Attempt background sync
    processSyncQueue().catch(() => {})
    return pointsObj.points
  } catch (err) {
    console.error('Error recording points entry:', err)
    return 0
  }
}
