/**
 * Distributes items in an alternating round-robin sequence across category buckets.
 * 
 * @template T
 * @param {T[]} items - Array of questions/cards to balance
 * @param {number} limit - Target item count
 * @param {string | null | undefined} subject - Active Subject filter (e.g. 'All' or specific subject)
 * @param {string | null | undefined} majorCategory - Active Major Category filter (e.g. 'All' or specific)
 * @param {string | null | undefined} minorCategory - Active Minor Category filter (e.g. 'All' or specific)
 * @returns {T[]} Balanced array of items up to limit
 */
export function balancePracticeDistribution(items, limit, subject, majorCategory, minorCategory) {
  if (!items || !items.length || limit <= 0) return []
  if (items.length <= limit && (!subject || subject === 'All') && (!majorCategory || majorCategory === 'All') && (!minorCategory || minorCategory === 'All')) {
    // If fewer than limit and all filters are 'All', return shuffled items
    return [...items].sort(() => 0.5 - Math.random())
  }

  // Determine which grouping key to partition by based on the lowest tier that is set to "All"
  // Priority:
  // 1. If minorCategory is 'All' (or empty) and majorCategory is specific -> partition by minor_category
  // 2. If majorCategory is 'All' (or empty) and subject is specific -> partition by major_category
  // 3. If subject is 'All' (or empty) -> partition by subject / practice_categories.name
  let partitionFn = null

  const isMinorAll = !minorCategory || minorCategory === 'All'
  const isMajorAll = !majorCategory || majorCategory === 'All'
  const isSubjectAll = !subject || subject === 'All'

  if (!isSubjectAll && !isMajorAll && isMinorAll) {
    // Sub-topics within specific Major Category
    partitionFn = (it) => String(it.minor_category || it.chapter || 'General').trim()
  } else if (!isSubjectAll && isMajorAll) {
    // Chapters within specific Subject Area
    partitionFn = (it) => String(it.major_category || it.chapter || 'General').trim()
  } else if (isSubjectAll) {
    // Across Subject Areas (Technology, Management, Strategy)
    partitionFn = (it) => {
      const catName = it.practice_categories?.name || it.flashcard_decks?.practice_categories?.name || it.subject
      return String(catName || it.major_category || 'General').trim()
    }
  } else {
    // Everything specific or fallback to minor_category
    partitionFn = (it) => String(it.minor_category || it.major_category || 'General').trim()
  }

  // 1. Group items into buckets
  const bucketsMap = new Map()
  for (const item of items) {
    const key = partitionFn(item) || 'General'
    if (!bucketsMap.has(key)) {
      bucketsMap.set(key, [])
    }
    bucketsMap.get(key).push(item)
  }

  // 2. Shuffle each bucket individually so picks within each category are random
  const buckets = Array.from(bucketsMap.values()).map(list => [...list].sort(() => 0.5 - Math.random()))

  if (buckets.length <= 1) {
    // Only 1 category found, return shuffled slice
    return [...items].sort(() => 0.5 - Math.random()).slice(0, limit)
  }

  // 3. Alternating round-robin selection
  const selected = []
  let bucketIndex = 0
  let emptyCycles = 0

  while (selected.length < limit && emptyCycles < buckets.length) {
    const currentBucket = buckets[bucketIndex]
    if (currentBucket && currentBucket.length > 0) {
      selected.push(currentBucket.pop())
      emptyCycles = 0 // reset because we found an item
    } else {
      emptyCycles++ // track consecutive empty buckets
    }

    bucketIndex = (bucketIndex + 1) % buckets.length
  }

  // If still under limit (e.g. buckets ran out), fill remaining from leftover pool if any
  if (selected.length < limit) {
    const selectedIds = new Set(selected.map(it => it.id))
    const leftovers = items.filter(it => !selectedIds.has(it.id)).sort(() => 0.5 - Math.random())
    while (selected.length < limit && leftovers.length > 0) {
      selected.push(leftovers.pop())
    }
  }

  return selected
}

