import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSeeResults, diffOptions, isClosingSoon, isOpen, isValidVote } from './rules.ts'

const now = Date.parse('2026-10-18T12:00:00Z')
const at = (h) => new Date(now + h * 3600e3).toISOString()

test('open, closing soon and results visibility', () => {
  assert.equal(isOpen({ status: 'open', closes_at: null }, now), true)
  assert.equal(isOpen({ status: 'open', closes_at: at(-1) }, now), false)
  assert.equal(isOpen({ status: 'closed', closes_at: at(5) }, now), false)
  assert.equal(isClosingSoon({ status: 'open', closes_at: at(5) }, now), true)
  assert.equal(isClosingSoon({ status: 'open', closes_at: at(30) }, now), false)
  assert.equal(isClosingSoon({ status: 'open', closes_at: null }, now), false)

  assert.equal(canSeeResults('live', true, false), true)
  assert.equal(canSeeResults('after_vote', true, false), false)
  assert.equal(canSeeResults('after_vote', true, true), true)
  assert.equal(canSeeResults('after_close', true, true), false)
  assert.equal(canSeeResults('after_close', false, false), true)
})

test('votes: one option unless multiple choice, only this poll\'s options, no duplicates', () => {
  assert.equal(isValidVote(['a'], ['a', 'b'], false), true)
  assert.equal(isValidVote(['a', 'b'], ['a', 'b'], false), false)
  assert.equal(isValidVote(['a', 'b'], ['a', 'b'], true), true)
  assert.equal(isValidVote(['a', 'a'], ['a', 'b'], true), false)
  assert.equal(isValidVote(['x'], ['a', 'b'], true), false)
  assert.equal(isValidVote([], ['a', 'b'], true), false)
})

test('editing options: same label keeps its id (and votes), the rest are removed or added', () => {
  const existing = [{ id: 'a', label: 'Pizza' }, { id: 'b', label: 'Tacos' }, { id: 'c', label: 'Sushi' }]
  assert.deepEqual(diffOptions(existing, ['Sushi', 'Pizza', 'Burgers']), {
    remove: ['b'],
    keep: [{ id: 'c', position: 0 }, { id: 'a', position: 1 }],
    add: [{ label: 'Burgers', position: 2 }],
  })
})
