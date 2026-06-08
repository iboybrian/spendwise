import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite'

let db: SQLiteDatabase | null = null

export async function initDatabase(): Promise<SQLiteDatabase> {
  if (db) return db

  db = await openDatabaseAsync('spendwise.db')

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Other',
      category_confidence REAL NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      recurring_expense_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recurring_expenses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Other',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile (
      id TEXT PRIMARY KEY,
      email TEXT,
      full_name TEXT,
      salary REAL,
      weekly_budget REAL,
      currency TEXT DEFAULT 'USD',
      language TEXT DEFAULT 'es',
      onboarding_completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS pending_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL,
      record_id TEXT,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  return db
}

export function getDatabase(): SQLiteDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  return db
}

// ─── Expenses ──────────────────────────────────────────

export async function getLocalExpenses(userId: string): Promise<any[]> {
  return getDatabase().getAllAsync(
    'SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC, created_at DESC',
    [userId]
  )
}

export async function saveLocalExpense(expense: any): Promise<void> {
  await getDatabase().runAsync(
    `INSERT OR REPLACE INTO expenses (id, user_id, amount, description, category, category_confidence, date, recurring_expense_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [expense.id, expense.user_id, expense.amount, expense.description,
     expense.category, expense.category_confidence ?? 0, expense.date,
     expense.recurring_expense_id ?? null, expense.created_at ?? null]
  )
}

export async function saveLocalExpenses(expenses: any[]): Promise<void> {
  for (const e of expenses) {
    await saveLocalExpense(e)
  }
}

export async function updateLocalExpense(id: string, changes: any): Promise<void> {
  const sets: string[] = []
  const vals: any[] = []
  if (changes.amount !== undefined) { sets.push('amount = ?'); vals.push(changes.amount) }
  if (changes.description !== undefined) { sets.push('description = ?'); vals.push(changes.description) }
  if (changes.category !== undefined) { sets.push('category = ?'); vals.push(changes.category) }
  if (changes.date !== undefined) { sets.push('date = ?'); vals.push(changes.date) }
  if (sets.length === 0) return
  vals.push(id)
  await getDatabase().runAsync(
    `UPDATE expenses SET ${sets.join(', ')} WHERE id = ?`,
    vals
  )
}

export async function deleteLocalExpense(id: string): Promise<void> {
  await getDatabase().runAsync('DELETE FROM expenses WHERE id = ?', [id])
}

// ─── Recurring Expenses ────────────────────────────────

export async function getLocalRecurringExpenses(userId: string): Promise<any[]> {
  return getDatabase().getAllAsync(
    'SELECT * FROM recurring_expenses WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [userId]
  )
}

export async function saveLocalRecurringExpense(rec: any): Promise<void> {
  await getDatabase().runAsync(
    `INSERT OR REPLACE INTO recurring_expenses (id, user_id, amount, description, category, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [rec.id, rec.user_id, rec.amount, rec.description, rec.category,
     rec.is_active ?? 1, rec.created_at ?? null]
  )
}

export async function saveLocalRecurringExpenses(recs: any[]): Promise<void> {
  for (const r of recs) {
    await saveLocalRecurringExpense(r)
  }
}

export async function deactivateLocalRecurringExpense(id: string): Promise<void> {
  await getDatabase().runAsync(
    'UPDATE recurring_expenses SET is_active = 0 WHERE id = ?', [id]
  )
}

// ─── Profile ───────────────────────────────────────────

export async function getLocalProfile(): Promise<any | null> {
  return getDatabase().getFirstAsync('SELECT * FROM profile LIMIT 1')
}

export async function saveLocalProfile(profile: any): Promise<void> {
  await getDatabase().runAsync(
    `INSERT OR REPLACE INTO profile (id, email, full_name, salary, weekly_budget, currency, language, onboarding_completed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [profile.id, profile.email ?? '', profile.full_name ?? '',
     profile.salary ?? null, profile.weekly_budget ?? null,
     profile.currency ?? 'USD', profile.language ?? 'es',
     profile.onboarding_completed ? 1 : 0]
  )
}

export async function updateLocalProfileField(id: string, field: string, value: any): Promise<void> {
  await getDatabase().runAsync(
    `UPDATE profile SET ${field} = ? WHERE id = ?`, [value, id]
  )
}

// ─── Pending Changes (Sync Queue) ──────────────────────

export async function addPendingChange(
  tableName: string,
  operation: string,
  recordId: string | null,
  data: any
): Promise<void> {
  await getDatabase().runAsync(
    'INSERT INTO pending_changes (table_name, operation, record_id, data) VALUES (?, ?, ?, ?)',
    [tableName, operation, recordId, JSON.stringify(data)]
  )
}

export async function getPendingChanges(): Promise<any[]> {
  return getDatabase().getAllAsync(
    'SELECT * FROM pending_changes ORDER BY id ASC'
  )
}

export async function removePendingChange(id: number): Promise<void> {
  await getDatabase().runAsync('DELETE FROM pending_changes WHERE id = ?', [id])
}

export async function clearPendingChanges(): Promise<void> {
  await getDatabase().runAsync('DELETE FROM pending_changes')
}

export async function getPendingChangesCount(): Promise<number> {
  const row = await getDatabase().getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_changes'
  )
  return row?.count ?? 0
}
