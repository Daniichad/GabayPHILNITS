import { getGenericCache, setGenericCache, getDb } from './database'

/**
 * Get an item from the SQLite cache. Returns null if not found or expired.
 * @param {string} key 
 */
export async function getCache(key) {
  const item = await getGenericCache(key);
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    await clearCache(key);
    return null;
  }
  return item.data;
}

/**
 * Save an item in the SQLite cache.
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlMs Time to live in milliseconds (default: 5 minutes)
 */
export async function setCache(key, data, ttlMs = 5 * 60 * 1000) {
  const cacheObj = {
    data,
    expiry: Date.now() + ttlMs,
  };
  await setGenericCache(key, cacheObj);
}

/**
 * Remove an item or clear all items from the cache.
 * @param {string} [key] 
 */
export async function clearCache(key) {
  const db = await getDb();
  if (!db) return;
  try {
    if (key) {
      await db.runAsync('DELETE FROM generic_cache WHERE cache_key = ?', [key]);
    } else {
      await db.runAsync('DELETE FROM generic_cache');
    }
  } catch (e) {
    console.error('Failed to clear cache:', e);
  }
}
