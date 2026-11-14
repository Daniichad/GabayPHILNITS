/**
 * Philippine Standard Time (PST / UTC+8) Date Helper
 * Ensures login streaks, activity logs, and daily resets align strictly to 12:00 AM PH time.
 */

export const PH_OFFSET_MS = 8 * 60 * 60 * 1000 // 8 hours in milliseconds

/**
 * Returns the current date in Philippine Time (UTC+8) formatted as 'YYYY-MM-DD'.
 * Flips to the next day precisely at 12:00 AM PH time.
 */
export const getPHDateKey = (dateInput = new Date()) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput)
  if (isNaN(d.getTime())) return null
  const phTime = new Date(d.getTime() + PH_OFFSET_MS)
  return phTime.toISOString().slice(0, 10)
}

/**
 * Returns the 'YYYY-MM-DD' date string for N days ago in Philippine Time (UTC+8).
 * Useful for checking consecutive streak days.
 */
export const getPHDateKeyOffset = (daysAgo = 0) => {
  const now = new Date()
  const phTime = new Date(now.getTime() + PH_OFFSET_MS - daysAgo * 86400000)
  return phTime.toISOString().slice(0, 10)
}

/**
 * Converts any UTC ISO string (e.g. from Supabase created_at / completed_at)
 * into its corresponding Philippine Time 'YYYY-MM-DD' date string.
 */
export const utcToPHDateKey = (isoString) => {
  if (!isoString) return null
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return null
    const phTime = new Date(d.getTime() + PH_OFFSET_MS)
    return phTime.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/**
 * Single source of truth for PhilNITS semi-annual cycles (Spring: 4th Sunday of April, Autumn: 4th Sunday of October).
 * Accurately calculates exact exam dates and days remaining so Home, MockExamHome, and ActivityCalendar match 100%.
 */
export const getNextPhilNitsExamCycle = () => {
  const now = new Date()
  const year = now.getFullYear()
  const candidates = []

  for (let y = year; y <= year + 2; y++) {
    // April cycle: 4th Sunday of April
    const apr1 = new Date(y, 3, 1)
    const aprFirstSun = ((7 - apr1.getDay()) % 7) + 1
    const aprExamDate = new Date(y, 3, aprFirstSun + 21, 8, 0, 0)
    candidates.push({
      date: aprExamDate,
      label: aprExamDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
      shortLabel: `April ${y} Cycle`,
      appPeriod: `January 15 – March 20, ${y}`,
      cycle: `${y} Spring Cycle (April)`,
    })

    // October cycle: 4th Sunday of October
    const oct1 = new Date(y, 9, 1)
    const octFirstSun = ((7 - oct1.getDay()) % 7) + 1
    const octExamDate = new Date(y, 9, octFirstSun + 21, 8, 0, 0)
    candidates.push({
      date: octExamDate,
      label: octExamDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
      shortLabel: `October ${y} Cycle`,
      appPeriod: `July 15 – September 20, ${y}`,
      cycle: `${y} Autumn Cycle (October)`,
    })
  }

  const future = candidates.filter((c) => c.date.getTime() > now.getTime()).sort((a, b) => a.date.getTime() - b.date.getTime())
  const selected = future[0] || candidates[0]
  const diffDays = Math.max(0, Math.ceil((selected.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

  return {
    ...selected,
    daysLeft: diffDays,
  }
}


