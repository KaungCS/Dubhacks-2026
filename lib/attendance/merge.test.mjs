import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mergeAttendees, newVsReturning } from './merge.ts'

test('merges RSVPs and sign-ins by email', () => {
  const rows = mergeAttendees(
    'e1',
    [{ email: 'A@uw.edu ', name: 'Ann', at: '2026-10-01T00:00:00Z' }, { email: 'b@uw.edu', name: 'Bo', at: '2026-10-02T00:00:00Z' }],
    [{ email: 'a@uw.edu', name: 'Ann S' }, { email: 'c@uw.edu', name: 'Cy' }],
  )
  const by = Object.fromEntries(rows.map((r) => [r.email, r]))
  assert.equal(rows.length, 3)
  assert.deepEqual(by['a@uw.edu'], { event_id: 'e1', email: 'a@uw.edu', name: 'Ann', rsvped_at: '2026-10-01T00:00:00Z', attended: true })
  assert.equal(by['b@uw.edu'].attended, false)
  assert.deepEqual(by['c@uw.edu'], { event_id: 'e1', email: 'c@uw.edu', name: 'Cy', rsvped_at: null, attended: true })
})

test('new vs returning goes by event date, not input order', () => {
  const events = [{ id: 'late', starts_at: '2026-11-01T00:00:00Z' }, { id: 'early', starts_at: '2026-10-01T00:00:00Z' }]
  const attended = [
    { event_id: 'early', email: 'a' }, { event_id: 'early', email: 'b' },
    { event_id: 'late', email: 'a' }, { event_id: 'late', email: 'c' },
  ]
  const r = newVsReturning(events, attended)
  assert.deepEqual(r.get('early'), { new: 2, returning: 0 })
  assert.deepEqual(r.get('late'), { new: 1, returning: 1 })
})
