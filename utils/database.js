import * as SQLite from 'expo-sqlite'

const DB_NAME = 'gabay.db'

let dbPromise = null

export const getDb = async () => {
    if (!dbPromise) {
        dbPromise = (async () => {
            try {
                const instance = await SQLite.openDatabaseAsync(DB_NAME)
                await instance.execAsync(`
                    PRAGMA journal_mode = WAL;
                    
                    CREATE TABLE IF NOT EXISTS sync_queue (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        table_name TEXT NOT NULL,
                        action TEXT NOT NULL,
                        payload TEXT NOT NULL,
                        status TEXT DEFAULT 'PENDING',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS user_cache (
                        user_id TEXT PRIMARY KEY,
                        pin_hash TEXT,
                        personal_info_completed BOOLEAN DEFAULT 0,
                        diagnostic_completed BOOLEAN DEFAULT 0,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS points_ledger_local (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        category TEXT NOT NULL,
                        points INTEGER NOT NULL,
                        metadata TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        is_synced BOOLEAN DEFAULT 0
                    );

                    CREATE TABLE IF NOT EXISTS generic_cache (
                        cache_key TEXT PRIMARY KEY,
                        cache_value TEXT NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS user_session_cache (
                        user_id TEXT PRIMARY KEY,
                        email TEXT,
                        full_name TEXT,
                        pin_hash TEXT,
                        target_exam_level TEXT,
                        raw_user_json TEXT,
                        is_logged_in INTEGER DEFAULT 1,
                        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
                    );

                    CREATE TABLE IF NOT EXISTS local_questions_cache (
                        id TEXT PRIMARY KEY,
                        exam_type TEXT NOT NULL,
                        subject TEXT,
                        payload TEXT NOT NULL,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );
                `)
                return instance
            } catch (e) {
                console.error("Error opening/initializing database:", e)
                dbPromise = null
                return null
            }
        })()
    }
    return dbPromise
}

export const initDb = async () => {
    const db = await getDb()
    if (db) {
        console.log("Local database initialized successfully.")
        return true
    }
    return false
}

let dbWriteLock = Promise.resolve()
export const runExclusive = async (fn) => {
    const nextLock = dbWriteLock.then(async () => {
        try {
            return await fn()
        } catch (e) {
            throw e
        }
    })
    dbWriteLock = nextLock.catch(() => { })
    return nextLock
}

export const enqueueSync = async (tableName, action, payloadObj) => {
    const db = await getDb()
    if (!db) return null

    return runExclusive(async () => {
        try {
            const payloadString = JSON.stringify(payloadObj)
            const result = await db.runAsync(
                'INSERT INTO sync_queue (table_name, action, payload, status) VALUES (?, ?, ?, ?)',
                [tableName, action, payloadString, 'PENDING']
            )
            return result.lastInsertRowId
        } catch (e) {
            console.error("Failed to enqueue sync:", e)
            return null
        }
    })
}

export const getPendingSyncItems = async () => {
    const db = await getDb()
    if (!db) return []

    try {
        const result = await db.getAllAsync('SELECT * FROM sync_queue WHERE status = "PENDING" ORDER BY id ASC')
        return result
    } catch (e) {
        console.error("Failed to get pending sync items:", e)
        return []
    }
}

export const markSyncItemCompleted = async (id) => {
    const db = await getDb()
    if (!db) return
    try {
        await db.runAsync('UPDATE sync_queue SET status = "COMPLETED" WHERE id = ?', [id])
    } catch (e) {
        console.error("Failed to mark sync item completed:", e)
    }
}

export const markSyncItemFailed = async (id) => {
    const db = await getDb()
    if (!db) return
    try {
        await db.runAsync('UPDATE sync_queue SET status = "FAILED" WHERE id = ?', [id])
    } catch (e) {
        console.error("Failed to mark sync item failed:", e)
    }
}

// User Cache methods
export const saveUserCache = async (userId, pinHash, personalInfoCompleted, diagnosticCompleted) => {
    const db = await getDb()
    if (!db) return
    try {
        await db.runAsync(
            `INSERT INTO user_cache (user_id, pin_hash, personal_info_completed, diagnostic_completed, updated_at)
             VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id) DO UPDATE SET
                pin_hash = excluded.pin_hash,
                personal_info_completed = excluded.personal_info_completed,
                diagnostic_completed = excluded.diagnostic_completed,
                updated_at = CURRENT_TIMESTAMP
            `,
            [userId, pinHash, personalInfoCompleted ? 1 : 0, diagnosticCompleted ? 1 : 0]
        )
    } catch (e) {
        console.error("Failed to save user cache:", e)
    }
}

export const getUserCache = async (userId) => {
    const db = await getDb()
    if (!db) return null
    try {
        const result = await db.getFirstAsync('SELECT * FROM user_cache WHERE user_id = ?', [userId])
        if (result) {
            return {
                ...result,
                personal_info_completed: result.personal_info_completed === 1,
                diagnostic_completed: result.diagnostic_completed === 1
            }
        }
        return null
    } catch (e) {
        console.error("Failed to get user cache:", e)
        return null
    }
}

export const addLocalPointEntry = async (category, points, metadataObj) => {
    const db = await getDb()
    if (!db) return null
    try {
        const metadataString = JSON.stringify(metadataObj)
        const result = await db.runAsync(
            'INSERT INTO points_ledger_local (category, points, metadata, is_synced) VALUES (?, ?, ?, 0)',
            [category, points, metadataString]
        )
        return result.lastInsertRowId
    } catch (e) {
        console.error("Failed to add local point entry:", e)
        return null
    }
}

export const getUnsyncedPoints = async () => {
    try {
        const db = await getDb()
        if (!db) return []
        const result = await db.getAllAsync('SELECT * FROM points_ledger_local WHERE is_synced = 0 ORDER BY id ASC')
        return result || []
    } catch (e) {
        console.warn("Failed to get unsynced points:", e?.message || e)
        return []
    }
}

export const markPointsSynced = async (ids) => {
    if (!ids || ids.length === 0) return
    const db = await getDb()
    if (!db) return
    try {
        const placeholders = ids.map(() => '?').join(',')
        await db.runAsync(`UPDATE points_ledger_local SET is_synced = 1 WHERE id IN (${placeholders})`, ids)
    } catch (e) {
        console.error("Failed to mark points synced:", e)
    }
}

// ── Generic Cache for Offline Mode ──
export const setGenericCache = async (key, valueObj) => {
    return runExclusive(async () => {
        const db = await getDb()
        if (!db) return
        try {
            const valueString = JSON.stringify(valueObj)
            await db.runAsync(
                `INSERT INTO generic_cache (cache_key, cache_value, updated_at) 
                 VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(cache_key) DO UPDATE SET 
                 cache_value = excluded.cache_value, 
                 updated_at = CURRENT_TIMESTAMP`,
                [key, valueString]
            )
        } catch (e) {
            console.error(`Failed to set generic cache for key ${key}:`, e)
        }
    })
}

export const getGenericCache = async (key) => {
    return runExclusive(async () => {
        const db = await getDb()
        if (!db) return null
        try {
            const result = await db.getFirstAsync('SELECT cache_value FROM generic_cache WHERE cache_key = ?', [key])
            if (result && result.cache_value) {
                return JSON.parse(result.cache_value)
            }
            return null
        } catch (e) {
            console.error(`Failed to get generic cache for key ${key}:`, e)
            return null
        }
    })
}

export const clearGenericCache = async (key) => {
    return runExclusive(async () => {
        const db = await getDb()
        if (!db) return
        try {
            if (key) {
                await db.runAsync('DELETE FROM generic_cache WHERE cache_key = ?', [key])
            } else {
                await db.runAsync('DELETE FROM generic_cache')
            }
        } catch (e) {
            console.error('Failed to clear generic cache:', e)
        }
    })
}

// ── Offline User Session Management ──
export const saveUserSession = async (user, extra = {}) => {
    if (!user?.id) return
    const db = await getDb()
    if (!db) return
    return runExclusive(async () => {
        try {
            const email = user.email || extra.email || ''
            const fullName = user.user_metadata?.full_name || extra.full_name || ''
            const pinHash = extra.pin_hash || ''
            const targetExamLevel = extra.target_exam_level || ''
            const rawUserJson = JSON.stringify({ ...user, ...extra })

            await db.runAsync(
                `INSERT INTO user_session_cache 
                 (user_id, email, full_name, pin_hash, target_exam_level, raw_user_json, is_logged_in, last_active)
                 VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
                 ON CONFLICT(user_id) DO UPDATE SET
                    email = excluded.email,
                    full_name = CASE WHEN excluded.full_name != '' THEN excluded.full_name ELSE user_session_cache.full_name END,
                    pin_hash = CASE WHEN excluded.pin_hash != '' THEN excluded.pin_hash ELSE user_session_cache.pin_hash END,
                    target_exam_level = CASE WHEN excluded.target_exam_level != '' THEN excluded.target_exam_level ELSE user_session_cache.target_exam_level END,
                    raw_user_json = excluded.raw_user_json,
                    is_logged_in = 1,
                    last_active = CURRENT_TIMESTAMP`,
                [user.id, email, fullName, pinHash, targetExamLevel, rawUserJson]
            )
        } catch (e) {
            console.error("Failed to save user session:", e)
        }
    })
}

export const getActiveUserSession = async () => {
    const db = await getDb()
    if (!db) return null
    try {
        const row = await db.getFirstAsync(
            'SELECT * FROM user_session_cache WHERE is_logged_in = 1 ORDER BY last_active DESC LIMIT 1'
        )
        if (!row) return null
        let parsed = {}
        try {
            parsed = JSON.parse(row.raw_user_json)
        } catch (_) { }
        return {
            ...row,
            parsedUser: parsed,
            hasPin: Boolean(row.pin_hash && String(row.pin_hash).trim().length > 0)
        }
    } catch (e) {
        console.error("Failed to get active user session:", e)
        return null
    }
}

export const clearUserSession = async () => {
    const db = await getDb()
    if (!db) return
    try {
        await db.runAsync('UPDATE user_session_cache SET is_logged_in = 0')
    } catch (e) {
        console.error("Failed to clear user session:", e)
    }
}

// ── Offline Questions & Practice Cache ──
export const cacheQuestionsLocally = async (examType, subject = 'all', questions = []) => {
    const list = Array.isArray(questions) ? questions : (questions ? [questions] : [])
    if (list.length === 0) return
    const db = await getDb()
    if (!db) return
    return runExclusive(async () => {
        try {
            const cleanSub = (subject || 'all').toLowerCase()
            const chunkSize = 25
            for (let i = 0; i < list.length; i += chunkSize) {
                const chunk = list.slice(i, i + chunkSize)
                if (chunk.length === 0) continue

                const placeholders = chunk.map(() => '(?, ?, ?, ?, CURRENT_TIMESTAMP)').join(', ')
                const params = []
                for (const q of chunk) {
                    const qId = `${examType}_${cleanSub}_${q.id || Math.random().toString(36).substring(2)}`
                    const payloadStr = JSON.stringify(q)
                    params.push(qId, examType, cleanSub, payloadStr)
                }

                await db.runAsync(
                    `INSERT INTO local_questions_cache (id, exam_type, subject, payload, updated_at)
                     VALUES ${placeholders}
                     ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP`,
                    params
                )
            }
        } catch (e) {
            console.warn(`Failed caching questions for ${examType}:`, e?.message || e)
        }
    })
}

export const getLocalQuestions = async (examType, subject = 'all', limit = 20) => {
    const db = await getDb()
    if (!db) return []
    try {
        const cleanSub = (subject || 'all').toLowerCase()
        let rows = []
        if (cleanSub && cleanSub !== 'all') {
            rows = await db.getAllAsync(
                'SELECT payload FROM local_questions_cache WHERE exam_type = ? AND subject = ? ORDER BY RANDOM() LIMIT ?',
                [examType, cleanSub, limit]
            )
        }
        // Fallback to any questions of that examType if subject-specific didn't yield enough
        if (rows.length < limit) {
            rows = await db.getAllAsync(
                'SELECT payload FROM local_questions_cache WHERE exam_type = ? ORDER BY RANDOM() LIMIT ?',
                [examType, limit]
            )
        }
        return rows.map(r => {
            try {
                return JSON.parse(r.payload)
            } catch (_) {
                return null
            }
        }).filter(Boolean)
    } catch (e) {
        console.warn(`Failed getting local questions for ${examType}:`, e)
        return []
    }
}

