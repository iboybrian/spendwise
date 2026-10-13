// Run: node lib/speech.test.ts   (Node >=23 strips the types itself)
import assert from 'node:assert'
import { parseAmount } from './speech.ts'

assert.strictEqual(parseAmount('Mi almuerzo me costó 35 quetzales'), 35)
assert.strictEqual(parseAmount('gasté 35.50 en gasolina'), 35.5)
assert.strictEqual(parseAmount('gasté 35,50 en gasolina'), 35.5)
assert.strictEqual(parseAmount('la renta fue 1,200'), 1200)
assert.strictEqual(parseAmount('la renta fue 1.200 quetzales'), 1200)
assert.strictEqual(parseAmount('Q12 de café'), 12)
assert.strictEqual(parseAmount('un café'), null)

console.log('speech: all assertions passed')
