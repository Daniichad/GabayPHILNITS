import NetInfo from '@react-native-community/netinfo'
import { getCache, setCache } from './cache'
import { enqueueSync } from './database'

/**
 * Executes a promise with an automatic timeout (default 8 seconds).
 * Prevents Supabase queries from hanging indefinitely on slow or intermittent connections.
 */
export async function withTimeout(promise, timeoutMs = 8000, errorMsg = 'Request timed out') {
  let timerId
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      reject(new Error(errorMsg))
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timerId)
    return result
  } catch (err) {
    clearTimeout(timerId)
    throw err
  }
}

/**
 * Resilient query wrapper:
 * 1. Checks cache for instant display
 * 2. Fetches fresh data with timeout
 * 3. Falls back gracefully to cached data on error/timeout so the app NEVER hangs on a blank loading screen
 */
export async function safeQuery(queryPromiseFn, options = {}) {
  const {
    cacheKey = null,
    ttlMs = 5 * 60 * 1000,
    fallback = null,
    timeoutMs = 8000,
  } = options

  // 1. Check local cache first
  let cachedData = null
  if (cacheKey) {
    try {
      cachedData = await getCache(cacheKey, true)
    } catch (_) {}
  }

  // 2. Check network connectivity
  try {
    const netState = await NetInfo.fetch()
    if (!netState.isConnected && cachedData !== null) {
      return { data: cachedData, error: null, fromCache: true }
    }
  } catch (_) {}

  // 3. Attempt live query with timeout
  try {
    const response = await withTimeout(queryPromiseFn(), timeoutMs)
    if (response?.error) {
      if (cachedData !== null) {
        return { data: cachedData, error: null, fromCache: true }
      }
      return { data: fallback, error: response.error, fromCache: false }
    }

    const liveData = response?.data ?? fallback
    if (cacheKey && liveData !== null) {
      setCache(cacheKey, liveData, ttlMs).catch(() => {})
    }
    return { data: liveData, error: null, fromCache: false }
  } catch (err) {
    console.warn(`Query ${cacheKey || 'unnamed'} timed out or failed:`, err?.message || err)
    if (cachedData !== null) {
      return { data: cachedData, error: null, fromCache: true }
    }
    return { data: fallback, error: err, fromCache: false }
  }
}

/**
 * Resilient mutation wrapper (Insert, Update, Upsert, Delete):
 * Ensures changes are applied instantly in UI and queued offline if network hangs.
 */
export async function safeMutate(mutatePromiseFn, offlineOptions = {}) {
  const {
    tableName = null,
    action = 'UPSERT',
    payload = null,
    timeoutMs = 7000,
  } = offlineOptions

  try {
    const netState = await NetInfo.fetch()
    if (!netState.isConnected && tableName && payload) {
      await enqueueSync(tableName, action, payload)
      return { success: true, queued: true }
    }

    const result = await withTimeout(mutatePromiseFn(), timeoutMs)
    if (result?.error) throw result.error
    return { success: true, queued: false, data: result?.data }
  } catch (err) {
    console.warn(`Mutation on ${tableName || 'table'} failed/timed out, queuing offline:`, err?.message || err)
    if (tableName && payload) {
      try {
        await enqueueSync(tableName, action, payload)
        return { success: true, queued: true }
      } catch (qErr) {
        console.error('Failed to queue offline mutation:', qErr)
      }
    }
    return { success: false, error: err }
  }
}

