import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  expenses: '@offline_expenses',
  recurring: '@offline_recurring',
  profile: '@offline_profile',
  pendingChanges: '@offline_pending',
}

async function getAll<T>(key: string): Promise<T[]> {
  const raw = await AsyncStorage.getItem(key)
  return raw ? JSON.parse(raw) : []
}

async function saveAll(key: string, data: any[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data))
}

async function getOne<T>(key: string): Promise<T | null> {
  const all = await getAll<any>(key)
  return all[0] ?? null
}

export async function initDatabase(): Promise<void> {
  // AsyncStorage is always ready
}

export function getDatabase(): never {
  throw new Error('getDatabase() not available on web. Use AsyncStorage-backed functions.')
}

export async function getLocalExpenses(userId: string): Promise<any[]> {
  const all = await getAll<any>(KEYS.expenses)
  return all.filter(e => e.user_id === userId).sort((a, b) =>
    (b.date || b.created_at)?.localeCompare(a.date || a.created_at)
  )
}

export async function saveLocalExpense(expense: any): Promise<void> {
  const all = await getAll<any>(KEYS.expenses)
  const idx = all.findIndex(e => e.id === expense.id)
  if (idx >= 0) all[idx] = expense
  else all.push(expense)
  await saveAll(KEYS.expenses, all)
}

export async function saveLocalExpenses(expenses: any[]): Promise<void> {
  for (const e of expenses) await saveLocalExpense(e)
}

export async function updateLocalExpense(id: string, changes: any): Promise<void> {
  const all = await getAll<any>(KEYS.expenses)
  const idx = all.findIndex(e => e.id === id)
  if (idx >= 0) Object.assign(all[idx], changes)
  await saveAll(KEYS.expenses, all)
}

export async function deleteLocalExpense(id: string): Promise<void> {
  const all = await getAll<any>(KEYS.expenses)
  await saveAll(KEYS.expenses, all.filter(e => e.id !== id))
}

export async function getLocalRecurringExpenses(userId: string): Promise<any[]> {
  const all = await getAll<any>(KEYS.recurring)
  return all.filter(r => r.user_id === userId && r.is_active !== false)
}

export async function saveLocalRecurringExpense(rec: any): Promise<void> {
  const all = await getAll<any>(KEYS.recurring)
  const idx = all.findIndex(r => r.id === rec.id)
  if (idx >= 0) all[idx] = rec
  else all.push(rec)
  await saveAll(KEYS.recurring, all)
}

export async function saveLocalRecurringExpenses(recs: any[]): Promise<void> {
  for (const r of recs) await saveLocalRecurringExpense(r)
}

export async function deactivateLocalRecurringExpense(id: string): Promise<void> {
  const all = await getAll<any>(KEYS.recurring)
  const idx = all.findIndex(r => r.id === id)
  if (idx >= 0) all[idx].is_active = false
  await saveAll(KEYS.recurring, all)
}

export async function getLocalProfile(): Promise<any | null> {
  return getOne(KEYS.profile)
}

export async function saveLocalProfile(profile: any): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile))
}

export async function updateLocalProfileField(id: string, field: string, value: any): Promise<void> {
  const profile = await getOne<any>(KEYS.profile)
  if (profile) {
    profile[field] = value
    await saveLocalProfile(profile)
  }
}

export async function addPendingChange(tableName: string, operation: string, recordId: string | null, data: any): Promise<void> {
  const all = await getAll<any>(KEYS.pendingChanges)
  all.push({ id: Date.now(), table_name: tableName, operation, record_id: recordId, data: JSON.stringify(data), created_at: new Date().toISOString() })
  await saveAll(KEYS.pendingChanges, all)
}

export async function getPendingChanges(): Promise<any[]> {
  return getAll(KEYS.pendingChanges)
}

export async function removePendingChange(id: number): Promise<void> {
  const all = await getAll<any>(KEYS.pendingChanges)
  await saveAll(KEYS.pendingChanges, all.filter(c => c.id !== id))
}

export async function clearPendingChanges(): Promise<void> {
  await saveAll(KEYS.pendingChanges, [])
}

export async function getPendingChangesCount(): Promise<number> {
  const all = await getAll<any>(KEYS.pendingChanges)
  return all.length
}
