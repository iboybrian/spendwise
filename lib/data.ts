import { supabase } from './supabase'
import { checkIsOnline } from './connectivity'
import {
  getLocalExpenses, saveLocalExpense, saveLocalExpenses,
  updateLocalExpense, deleteLocalExpense,
  getLocalRecurringExpenses, saveLocalRecurringExpense,
  saveLocalRecurringExpenses, deactivateLocalRecurringExpense,
  getLocalProfile, saveLocalProfile, updateLocalProfileField,
  addPendingChange, getPendingChangesCount
} from './database'
import { useStore } from '@/store/useStore'

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ─── Expenses ──────────────────────────────────────────

export async function fetchExpenses(userId: string): Promise<any[]> {
  const online = await checkIsOnline()

  if (online) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        await saveLocalExpenses(data)
        return data
      }
    } catch (e) {
      console.warn('Failed to fetch expenses from Supabase, using local', e)
    }
  }

  return getLocalExpenses(userId)
}

export async function insertExpense(expense: any): Promise<any> {
  const id = expense.id || generateId()
  const newExpense = { ...expense, id }

  const online = await checkIsOnline()
  if (online) {
    const { data, error } = await supabase.from('expenses').insert(newExpense).select().single()
    if (!error && data) {
      await saveLocalExpense(data)
      return data
    }
  }

  await saveLocalExpense(newExpense)
  await addPendingChange('expenses', 'INSERT', id, newExpense)
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
  return newExpense
}

export async function updateExpense(id: string, changes: any): Promise<void> {
  const online = await checkIsOnline()
  if (online) {
    const { error } = await supabase.from('expenses').update(changes).eq('id', id)
    if (!error) {
      await updateLocalExpense(id, changes)
      return
    }
  }

  await updateLocalExpense(id, changes)
  await addPendingChange('expenses', 'UPDATE', id, { changes })
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
}

export async function deleteExpense(id: string): Promise<void> {
  const online = await checkIsOnline()
  if (online) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) {
      await deleteLocalExpense(id)
      return
    }
  }

  await deleteLocalExpense(id)
  await addPendingChange('expenses', 'DELETE', id, {})
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
}

// ─── Recurring Expenses ────────────────────────────────

export async function fetchRecurringExpenses(userId: string): Promise<any[]> {
  const online = await checkIsOnline()

  if (online) {
    try {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (!error && data) {
        await saveLocalRecurringExpenses(data)
        return data
      }
    } catch (e) {
      console.warn('Failed to fetch recurring from Supabase, using local', e)
    }
  }

  return getLocalRecurringExpenses(userId)
}

export async function insertRecurringExpense(rec: any): Promise<any> {
  const id = rec.id || generateId()
  const newRec = { ...rec, id, is_active: true }

  const online = await checkIsOnline()
  if (online) {
    const { data, error } = await supabase.from('recurring_expenses').insert(newRec).select().single()
    if (!error && data) {
      await saveLocalRecurringExpense(data)
      return data
    }
  }

  await saveLocalRecurringExpense(newRec)
  await addPendingChange('recurring_expenses', 'INSERT', id, newRec)
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
  return newRec
}

export async function deactivateRecurringExpense(id: string): Promise<void> {
  const online = await checkIsOnline()
  if (online) {
    const { error } = await supabase.from('recurring_expenses').update({ is_active: false }).eq('id', id)
    if (!error) {
      await deactivateLocalRecurringExpense(id)
      return
    }
  }

  await deactivateLocalRecurringExpense(id)
  await addPendingChange('recurring_expenses', 'UPDATE', id, { is_active: false })
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
}

// ─── Profile ───────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<any | null> {
  const online = await checkIsOnline()

  if (online) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        await saveLocalProfile(data)
        return data
      }
    } catch (e) {
      console.warn('Failed to fetch profile from Supabase, using local', e)
    }
  }

  return getLocalProfile()
}

export async function updateProfileField(id: string, field: string, value: any): Promise<void> {
  const online = await checkIsOnline()

  if (online) {
    const { error } = await supabase.from('users').update({ [field]: value }).eq('id', id)
    if (!error) {
      await updateLocalProfileField(id, field, value)
      return
    }
  }

  await updateLocalProfileField(id, field, value)
  await addPendingChange('profile', 'UPDATE', id, { [field]: value })
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
}

export async function updateProfile(profile: any): Promise<void> {
  const online = await checkIsOnline()

  if (online) {
    const { error } = await supabase.from('users').update(profile).eq('id', profile.id)
    if (!error) {
      await saveLocalProfile(profile)
      return
    }
  }

  await saveLocalProfile(profile)
  await addPendingChange('profile', 'UPDATE', profile.id, profile)
  const count = await getPendingChangesCount()
  useStore.getState().setPendingChangesCount(count)
}

// ─── Recurring from Supabase (for batch insert during onboarding) ───

export async function insertRecurringExpensesBatch(recs: any[]): Promise<void> {
  for (const rec of recs) {
    await insertRecurringExpense(rec)
  }
}
