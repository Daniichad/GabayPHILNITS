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

export const enqueueSync = async (tableName, action, payloadObj) => {
    const db = await getDb()
    if (!db) return null
    
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
