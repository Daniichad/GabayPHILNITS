import NetInfo from '@react-native-community/netinfo'
import {
    getPendingSyncItems, markSyncItemCompleted, markSyncItemFailed,
    getUnsyncedPoints, markPointsSynced, cacheQuestionsLocally
} from './database'
import { supabase } from './supabase'

let isSyncing = false
const syncListeners = new Set()

export const addSyncListener = (cb) => {
    syncListeners.add(cb)
    return () => syncListeners.delete(cb)
}

const notifySyncListeners = (status, count = 0) => {
    syncListeners.forEach(cb => {
        try { cb({ status, count, isSyncing }) } catch (_) {}
    })
}

export const processSyncQueue = async () => {
    // Prevent multiple sync processes running at the same time
    if (isSyncing) return
    isSyncing = true
    notifySyncListeners('STARTING', 0)

    try {
        const state = await NetInfo.fetch()
        if (!state.isConnected) {
            isSyncing = false
            notifySyncListeners('IDLE', 0)
            return
        }

        const pendingItems = await getPendingSyncItems()
        if (pendingItems.length === 0) {
            // Also check points
            const unsyncedPts = await getUnsyncedPoints()
            if (unsyncedPts.length === 0) {
                isSyncing = false
                notifySyncListeners('COMPLETED', 0)
                return
            }
        }

        notifySyncListeners('SYNCING', pendingItems.length)
        console.log(`Found ${pendingItems.length} items to sync. Starting sync...`)

        for (const item of pendingItems) {
            const payload = JSON.parse(item.payload)
            let error = null

            try {
                if (item.action === 'INSERT') {
                    const { error: insertError } = await supabase
                        .from(item.table_name)
                        .insert(payload)
                    error = insertError
                } else if (item.action === 'UPSERT') {
                    const onConflict = payload.id ? 'id' : (payload.user_id ? 'user_id' : undefined)
                    const { error: upsertError } = await supabase
                        .from(item.table_name)
                        .upsert(payload, onConflict ? { onConflict } : undefined)
                    error = upsertError
                } else if (item.action === 'UPDATE') {
                    // Assuming updates provide an 'id' or other primary key in the payload.
                    if (payload.id) {
                        const { error: updateError } = await supabase
                            .from(item.table_name)
                            .update(payload)
                            .eq('id', payload.id)
                        error = updateError
                    } else if (payload.user_id) {
                        const { error: updateError } = await supabase
                            .from(item.table_name)
                            .update(payload)
                            .eq('user_id', payload.user_id)
                        error = updateError
                    } else if (payload.email) {
                        const { email: targetEmail, ...updateFields } = payload
                        const { error: updateError } = await supabase
                            .from(item.table_name)
                            .update(updateFields)
                            .ilike('email', targetEmail)
                        error = updateError
                    } else if (item.table_name === 'users') {
                        // Fallback: resolve active user session email for queued user updates
                        const { data: { session } } = await supabase.auth.getSession()
                        const sessionEmail = session?.user?.email
                        if (sessionEmail) {
                            const { email: _, id: __, user_id: ___, ...updateFields } = payload
                            const { error: updateError } = await supabase
                                .from('users')
                                .update(updateFields)
                                .ilike('email', sessionEmail)
                            error = updateError
                        } else {
                            // If no session email exists, discard this invalid queue item to prevent repeated errors
                            console.warn(`Discarding orphan user update item ${item.id} without email or id`)
                            await markSyncItemCompleted(item.id)
                            continue
                        }
                    } else {
                        console.warn(`Update action on ${item.table_name} missing primary key; discarding invalid queue item ${item.id}`)
                        await markSyncItemCompleted(item.id)
                        continue
                    }
                } else if (item.action === 'DELETE') {
                    if (payload.id) {
                        const { error: deleteError } = await supabase
                            .from(item.table_name)
                            .delete()
                            .eq('id', payload.id)
                        error = deleteError
                    } else {
                        console.error('Delete action missing primary key id')
                        error = { message: 'Missing primary key' }
                    }
                }

                if (error) {
                    console.error(`Failed to sync item ${item.id} (${item.table_name}):`, error)
                    await markSyncItemFailed(item.id)
                } else {
                    console.log(`Successfully synced item ${item.id}`)
                    await markSyncItemCompleted(item.id)
                }
            } catch (err) {
                console.error(`Error processing item ${item.id}:`, err)
                await markSyncItemFailed(item.id)
            }
        }

        // --- POINTS SYNC LOGIC ---
        const unsyncedPoints = await getUnsyncedPoints()
        if (unsyncedPoints.length > 0) {
            console.log(`Found ${unsyncedPoints.length} points entries to sync.`)
            
            // Get current user session
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.id) {
                const userFullName = session.user.user_metadata?.full_name || session.user.user_metadata?.fullName || ''
                const payload = unsyncedPoints.map(p => {
                    let metaObj = p.metadata ? (typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata) : {}
                    if (userFullName && !metaObj.user_name) {
                        metaObj.user_name = userFullName
                    }
                    return {
                        user_id: session.user.id,
                        category: p.category,
                        points: p.points,
                        metadata: metaObj,
                        created_at: p.created_at
                    }
                })

                let syncSucceeded = false
                const { error: rpcError } = await supabase.rpc('sync_points_ledger', { payload })
                
                if (rpcError) {
                    console.warn("RPC sync_points_ledger unavailable or failed, trying direct table insert fallback:", rpcError?.message || rpcError)
                    const { error: insertError } = await supabase.from('points_ledger').insert(payload)
                    if (insertError) {
                        console.error("Failed to sync points to Supabase points_ledger:", insertError?.message || insertError)
                    } else {
                        syncSucceeded = true
                    }
                } else {
                    syncSucceeded = true
                }

                if (syncSucceeded) {
                    const idsToMark = unsyncedPoints.map(p => p.id)
                    await markPointsSynced(idsToMark)
                    console.log(`Successfully synced ${idsToMark.length} points entries.`)
                }
            } else {
                console.log("No active session, skipping points sync.")
            }
        }

    } catch (error) {
        console.error('Error during sync process:', error)
        notifySyncListeners('ERROR', 0)
    } finally {
        isSyncing = false
        notifySyncListeners('COMPLETED', 0)
    }
}

/**
 * Pre-cache published practice questions, true/false, and flashcards into SQLite
 * so offline mode immediately has questions ready without needing prior visits.
 */
export const precachePracticeContent = async () => {
    try {
        const state = await NetInfo.fetch()
        if (!state.isConnected) return

        console.log('Pre-caching practice questions for offline use...')

        // 1. Multiple Choice Questions
        const { data: mcqs } = await supabase
            .from('multiple_choice_questions')
            .select('*, practice_categories!inner(name)')
            .eq('is_published', true)
            .limit(150)
        if (mcqs && mcqs.length > 0) {
            await cacheQuestionsLocally('mcq', 'all', mcqs)
            // Also index by category name for targeted subject practice
            const byCategory = {}
            mcqs.forEach(q => {
                const catName = q.practice_categories?.name
                if (catName) {
                    if (!byCategory[catName]) byCategory[catName] = []
                    byCategory[catName].push(q)
                }
            })
            for (const [catName, catQs] of Object.entries(byCategory)) {
                await cacheQuestionsLocally('mcq', catName, catQs)
            }
        }

        // 2. True / False Questions
        const { data: tfs } = await supabase
            .from('true_false_questions')
            .select('*, practice_categories!inner(name)')
            .eq('is_published', true)
            .limit(150)
        if (tfs && tfs.length > 0) {
            await cacheQuestionsLocally('tf', 'all', tfs)
            const byCategory = {}
            tfs.forEach(q => {
                const catName = q.practice_categories?.name
                if (catName) {
                    if (!byCategory[catName]) byCategory[catName] = []
                    byCategory[catName].push(q)
                }
            })
            for (const [catName, catQs] of Object.entries(byCategory)) {
                await cacheQuestionsLocally('tf', catName, catQs)
            }
        }

        // 3. Flashcards
        const { data: fcs } = await supabase
            .from('flashcards')
            .select('*, flashcard_decks!inner(category_id, practice_categories!inner(name))')
            .limit(150)
        if (fcs && fcs.length > 0) {
            await cacheQuestionsLocally('flashcard', 'all', fcs)
            const byCategory = {}
            fcs.forEach(c => {
                const catName = c.flashcard_decks?.practice_categories?.name
                if (catName) {
                    if (!byCategory[catName]) byCategory[catName] = []
                    byCategory[catName].push(c)
                }
            })
            for (const [catName, catCards] of Object.entries(byCategory)) {
                await cacheQuestionsLocally('flashcard', catName, catCards)
            }
        }

        console.log('Pre-caching practice content complete.')
    } catch (e) {
        console.warn('Precache error:', e?.message || e)
    }
}

