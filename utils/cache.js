const cacheStore = {};

/**
 * Get an item from the cache. Returns null if not found or expired.
 * @param {string} key 
 */
export function getCache(key) {
  const item = cacheStore[key];
  if (!item) return null;
  
  if (Date.now() > item.expiry) {
    delete cacheStore[key];
    return null;
  }
  return item.data;
}

/**
 * Save an item in the cache.
 * @param {string} key 
 * @param {any} data 
 * @param {number} ttlMs Time to live in milliseconds (default: 5 minutes)
 */
export function setCache(key, data, ttlMs = 5 * 60 * 1000) {
  cacheStore[key] = {
    data,
    expiry: Date.now() + ttlMs,
  };
}

/**
 * Remove an item or clear all items from the cache.
 * @param {string} [key] 
 */
export function clearCache(key) {
  if (key) {
    delete cacheStore[key];
  } else {
    Object.keys(cacheStore).forEach(k => delete cacheStore[k]);
  }
}
