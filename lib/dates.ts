/**
 * Local-timezone date helpers.
 *
 * `Date.prototype.toISOString()` serializes in UTC. In a negative-offset zone
 * (Guatemala is UTC-6) that rolls over to tomorrow's date during the evening,
 * so an expense logged at 8pm gets stamped with the next calendar day. Expense
 * dates are calendar days, not instants — always derive them from the local
 * clock, never from `toISOString()`.
 */

/** `YYYY-MM-DD` for `d` in the device's local timezone. */
export function toLocalDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local midnight on the Monday of the week containing `d` (ISO week). */
export function startOfWeek(d: Date = new Date()): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = out.getDay() // 0 = Sunday
  out.setDate(out.getDate() - (day === 0 ? 6 : day - 1))
  return out
}
