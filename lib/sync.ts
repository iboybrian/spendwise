import { supabase } from './supabase'
import {
  getPendingChanges, removePendingChange,
  getPendingChangesCount
} from './database'
import { useStore } from '@/store/useStore'

export async function syncPendingChanges(): Promise<{ synced: number; failed: number }> {
  const store = useStore.getState()
  if (store.syncInProgress) return { synced: 0, failed: 0 }

  store.setSyncInProgress(true)
  let synced = 0
  let failed = 0

  try {
    const changes = await getPendingChanges()

    for (const change of changes) {
      const data = JSON.parse(change.data)
      let success = false

      try {
        switch (change.table_name) {
          case 'expenses': {
            if (change.operation === 'INSERT') {
              const { error } = await supabase.from('expenses').insert(data)
              if (!error) success = true
            } else if (change.operation === 'UPDATE') {
              const { error } = await supabase.from('expenses').update(data.changes).eq('id', change.record_id)
              if (!error) success = true
            } else if (change.operation === 'DELETE') {
              const { error } = await supabase.from('expenses').delete().eq('id', change.record_id)
              if (!error) success = true
            }
            break
          }
          case 'recurring_expenses': {
            if (change.operation === 'INSERT') {
              const { error } = await supabase.from('recurring_expenses').insert(data)
              if (!error) success = true
            } else if (change.operation === 'UPDATE') {
              const { error } = await supabase.from('recurring_expenses').update(data).eq('id', change.record_id)
              if (!error) success = true
            } else if (change.operation === 'DELETE') {
              const { error } = await supabase.from('recurring_expenses').delete().eq('id', change.record_id)
              if (!error) success = true
            }
            break
          }
          case 'profile': {
            if (change.operation === 'UPDATE') {
              const { error } = await supabase.from('users').update(data).eq('id', change.record_id)
              if (!error) success = true
            }
            break
          }
        }
      } catch (e) {
        console.warn('Sync failed for change', change.id, e)
      }

      if (success) {
        await removePendingChange(change.id)
        synced++
      } else {
        failed++
      }
    }
  } finally {
    store.setSyncInProgress(false)
    const count = await getPendingChangesCount()
    store.setPendingChangesCount(count)
  }

  return { synced, failed }
}
