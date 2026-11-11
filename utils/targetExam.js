import { supabase } from '../supabase'
import { getCache, setCache } from './cache'
import { getActiveUserSession, saveUserSession } from './database'
import { withTimeout } from './queryHelper'

/**
 * Standardize any exam level string into 'FE' | 'IP'
 * @param {string | null | undefined} rawLevel
 * @returns {'FE' | 'IP' | null}
 */
export function parseExamTrack(rawLevel) {
  if (!rawLevel) return null
  const lvl = String(rawLevel).trim().toLowerCase()
  if (
    lvl === 'fe' ||
    lvl.includes('fundamental') ||
    lvl.includes('(fe)') ||
    (lvl.includes('pro') && !lvl.includes('sub'))
  ) {
    return 'FE'
  }
  if (
    lvl === 'ip' ||
    lvl.includes('passport') ||
    lvl.includes('(ip)') ||
    lvl.includes('sub')
  ) {
    return 'IP'
  }
  return null
}

/**
 * Resolves the user's active target exam track ('FE' | 'IP').
 * Priority order:
 * 1. Persistent cache ('user_target_exam')
 * 2. SQLite local user_session_cache
 * 3. Remote Supabase personal_info (if online & authenticated)
 * 4. Fallback (defaultTrack || 'IP')
 *
 * @param {string | null} [uid]
 * @param {'FE' | 'IP'} [defaultTrack]
 * @returns {Promise<'FE' | 'IP'>}
 */
export async function resolveUserTargetExam(uid = null, defaultTrack = 'IP') {
  try {
    let resolvedTrack = null

    // 1. Check instant cache first
    const cachedTrack = await getCache('user_target_exam')
    if (cachedTrack === 'FE' || cachedTrack === 'IP') {
      resolvedTrack = cachedTrack
    }

    // 2. If not in cache, check SQLite user session
    if (!resolvedTrack) {
      const session = await getActiveUserSession()
      if (session?.target_exam_level) {
        resolvedTrack = parseExamTrack(session.target_exam_level)
      }
    }

    // 3. Resolve user id if not provided
    let userId = uid
    if (!userId) {
      const { data: authData } = await supabase.auth.getSession()
      userId = authData?.session?.user?.id || null
    }

    // 4. Fetch fresh personal_info from Supabase if user is signed in
    if (userId) {
      try {
        const { data: pInfo, error } = await withTimeout(
          supabase
            .from('personal_info')
            .select('target_exam_level')
            .eq('user_id', userId)
            .maybeSingle(),
          6000
        )
        if (!error && pInfo?.target_exam_level) {
          const remoteTrack = parseExamTrack(pInfo.target_exam_level)
          if (remoteTrack) {
            resolvedTrack = remoteTrack
            // Update SQLite session & cache in background with 30-day TTL
            setCache('user_target_exam', remoteTrack, 30 * 24 * 60 * 60 * 1000).catch(() => {})
            setCache('library_target_exam', remoteTrack, 30 * 24 * 60 * 60 * 1000).catch(() => {})
          }
        }
      } catch (_) {
        // Network timeout / offline: keep locally resolvedTrack
      }
    }

    const finalTrack = resolvedTrack || defaultTrack || 'IP'
    if (finalTrack) {
      await setCache('user_target_exam', finalTrack, 30 * 24 * 60 * 60 * 1000).catch(() => {})
    }
    return finalTrack
  } catch (err) {
    console.warn('resolveUserTargetExam error:', err)
    return defaultTrack || 'IP'
  }
}

/**
 * Persists the user's target exam across Supabase, SQLite session, and local cache.
 * @param {'FE' | 'IP'} track
 * @param {any} [user]
 */
export async function setUserTargetExamTrack(track, user = null) {
  const normTrack = track === 'FE' ? 'FE' : 'IP'
  const fullLevelText = normTrack === 'FE'
    ? 'Fundamental IT Engineer (FE)'
    : 'Information Technology Passport (IP)'

  try {
    // 1. Update cache with long TTL (30 days)
    await setCache('user_target_exam', normTrack, 30 * 24 * 60 * 60 * 1000)
    await setCache('library_target_exam', normTrack, 30 * 24 * 60 * 60 * 1000)

    // 2. Invalidate old reading materials & videos cache so new curriculum loads fresh
    await setCache('library_materials', null)
    await setCache('library_videos', null)

    // 3. Update SQLite session
    let currentUser = user
    if (!currentUser) {
      const { data: authData } = await supabase.auth.getSession()
      currentUser = authData?.session?.user || null
    }

    if (currentUser?.id) {
      await saveUserSession(currentUser, { target_exam_level: fullLevelText })
      // 4. Update Supabase personal_info
      withTimeout(
        supabase
          .from('personal_info')
          .upsert({
            user_id: currentUser.id,
            target_exam_level: fullLevelText,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' }),
        8000
      ).catch((err) => {
        console.warn('Background personal_info update notice:', err)
      })
    }
  } catch (e) {
    console.warn('setUserTargetExamTrack error:', e)
  }
}

