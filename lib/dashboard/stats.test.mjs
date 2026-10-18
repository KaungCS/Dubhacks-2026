import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countdown, countsByEvent, fileStates, isMeetingTemplate, rate, returningMembers } from './stats.ts'

test('countdown counts Pacific calendar days', () => {
  const now = Date.parse('2026-10-18T19:00:00Z') // noon Pacific
  assert.equal(countdown('2026-10-18T23:00:00Z', now), 'today')
  assert.equal(countdown('2026-10-19T06:30:00Z', now), 'today') // 11:30pm Pacific on the 18th
  assert.equal(countdown('2026-10-19T08:00:00Z', now), 'tomorrow') // 1am Pacific on the 19th
})

test('countdown future and past', () => {
  const now = Date.parse('2026-10-18T19:00:00Z')
  assert.equal(countdown('2026-10-24T01:00:00Z', now), 'in 5 days')
  assert.equal(countdown('2026-10-15T19:00:00Z', now), '3 days ago')
})

test('counts and returning members', () => {
  const rows = [
    { event_id: 'a', email: 'x', rsvped_at: '2026-01-01', attended: true },
    { event_id: 'a', email: 'y', rsvped_at: '2026-01-01', attended: false },
    { event_id: 'b', email: 'x', rsvped_at: null, attended: true },
    { event_id: 'b', email: 'z', rsvped_at: '2026-01-01', attended: true },
  ]
  assert.deepEqual(countsByEvent(rows).get('a'), { rsvps: 2, attended: 1 })
  assert.deepEqual(countsByEvent(rows).get('b'), { rsvps: 1, attended: 2 })
  assert.equal(returningMembers(rows), 1)
  assert.equal(rate(1, 2), '50%')
  assert.equal(rate(3, 0), '–')
})

test('meetings and file states', () => {
  assert.ok(isMeetingTemplate('General Meeting'))
  assert.ok(!isMeetingTemplate('Social'))
  assert.deepEqual(fileStates({ folder: true, slides: false, rsvp_form: false }, ['folder', 'slides']), {
    folder: 'ok',
    slides: 'missing',
    rsvp_form: 'none',
  })
})
