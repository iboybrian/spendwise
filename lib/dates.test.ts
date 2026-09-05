// Run: node lib/dates.test.ts   (Node >=23 strips the types itself)
import assert from 'node:assert'
import { toLocalDateStr, startOfWeek } from './dates.ts'

// Late evening must stay on today's date. toISOString() would roll this
// forward to the 16th anywhere west of UTC — that was the original bug.
assert.strictEqual(toLocalDateStr(new Date(2026, 0, 15, 20, 30)), '2026-01-15')
assert.strictEqual(toLocalDateStr(new Date(2026, 0, 15, 0, 0)), '2026-01-15')
assert.strictEqual(toLocalDateStr(new Date(2026, 0, 15, 23, 59)), '2026-01-15')

// Zero padding on both month and day.
assert.strictEqual(toLocalDateStr(new Date(2026, 8, 5, 12, 0)), '2026-09-05')

// ISO week: Monday starts it, Sunday closes it.
// 2026-01-15 is a Thursday, so its week starts Monday the 12th.
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 0, 15))), '2026-01-12')
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 0, 12))), '2026-01-12') // Monday itself
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 0, 18))), '2026-01-12') // Sunday looks back 6
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 0, 19))), '2026-01-19') // next Monday

// Week start crossing a month boundary.
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 1, 1))), '2026-01-26') // Sun Feb 1

// Evening time of day must not shift the week either.
assert.strictEqual(toLocalDateStr(startOfWeek(new Date(2026, 0, 15, 22, 0))), '2026-01-12')

console.log('dates: all assertions passed')
