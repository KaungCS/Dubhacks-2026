import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'

process.env.GOOGLE_TOKEN_KEY = randomBytes(32).toString('base64')
const { encrypt, decrypt } = await import('./crypto.ts')

test('round trips, uses a fresh iv, and rejects tampering', () => {
  const a = encrypt('1//refresh-token')
  assert.equal(decrypt(a), '1//refresh-token')
  assert.notEqual(encrypt('1//refresh-token'), a)
  const [iv, tag, data] = a.split('.')
  const flipped = Buffer.from(data, 'base64')
  flipped[0] ^= 1
  assert.throws(() => decrypt([iv, tag, flipped.toString('base64')].join('.')))
})
