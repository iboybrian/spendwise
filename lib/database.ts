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

// One read + one write for the whole batch. Looping saveLocalExpense() re-read,
// re-parsed and re-stringified the entire expense array once per row, which is
// O(n^2) on every fetch and is what made the app crawl as rows piled up.
export async function saveLocalExpenses(expenses: any[]): Promise<void> {
  if (expenses.length === 0) return
  const byId = new Map<string, any>((await getAll<any>(KEYS.expenses)).map(e => [e.id, e]))
  for (const e of expenses) byId.set(e.id, e)
  await saveAll(KEYS.expenses, [...byId.values()])
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
  if (recs.length === 0) return
  const byId = new Map<string, any>((await getAll<any>(KEYS.recurring)).map(r => [r.id, r]))
  for (const r of recs) byId.set(r.id, r)
  await saveAll(KEYS.recurring, [...byId.values()])
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
