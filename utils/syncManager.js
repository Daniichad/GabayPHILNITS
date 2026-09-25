import NetInfo from '@react-native-community/netinfo'
import { getPendingSyncItems, markSyncItemCompleted, markSyncItemFailed, getUnsyncedPoints, markPointsSynced } from './database'
import { supabase } from './supabase'

let isSyncing = false

export const processSyncQueue = async () => {
    // Prevent multiple sync processes running at the same time
    if (isSyncing) return
    isSyncing = true

    try {
        const state = await NetInfo.fetch()
        if (!state.isConnected) {
            isSyncing = false
            return
        }

        const pendingItems = await getPendingSyncItems()
        if (pendingItems.length === 0) {
            isSyncing = false
            return
        }

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
                } else if (item.action === 'UPDATE') {
                    // Assuming updates provide an 'id' or other primary key in the payload.
                    // A robust generic update needs to know the where clause.
                    // For now, if we have an id, we use it.
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
                    } else {
                        console.error('Update action missing primary key id or user_id')
                        error = { message: 'Missing primary key' }
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
                    // Depending on the error, we might want to fail it or keep it pending.
                    // If it's a conflict or hard error, maybe fail it. Let's just fail for now.
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
                const payload = unsyncedPoints.map(p => ({
                    user_id: session.user.id,
                    category: p.category,
                    points: p.points,
                    metadata: p.metadata ? JSON.parse(p.metadata) : null,
                    created_at: p.created_at
                }))

                const { error: rpcError } = await supabase.rpc('sync_points_ledger', { payload })
                
                if (rpcError) {
                    console.error("Failed to sync points to Supabase:", rpcError)
                } else {
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
    } finally {
        isSyncing = false
    }
}
