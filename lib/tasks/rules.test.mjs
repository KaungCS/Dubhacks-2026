import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSetCompletion, deriveStatus, groupTasks, isOverdue, NO_TITLE, prereqNotifyDue, UNASSIGNED } from './rules.ts'

const done = (user_id) => ({ user_id, completed_at: '2026-10-17T20:00:00Z' })
const open = (user_id) => ({ user_id, completed_at: null })

test('status follows the assignees', () => {
  assert.equal(deriveStatus([]), null)
  assert.equal(deriveStatus([open('a'), open('b')]), 'todo')
  assert.equal(deriveStatus([done('a'), open('b')]), 'in_progress')
  assert.equal(deriveStatus([done('a'), done('b')]), 'done')
})

test("officers set only their own completion, admins anyone's", () => {
  const officer = { id: 'a', isAdmin: false }
  const admin = { id: 'z', isAdmin: true }
  assert.equal(canSetCompletion(officer, 'a'), true)
  assert.equal(canSetCompletion(officer, 'b'), false)
  assert.equal(canSetCompletion(officer, null), false)
  assert.equal(canSetCompletion(admin, 'b'), true)
  assert.equal(canSetCompletion(admin, null), true)
})

test('overdue only when past due and not done', () => {
  const now = Date.parse('2026-10-18T12:00:00Z')
  assert.equal(isOverdue({ due_at: '2026-10-18T11:00:00Z', status: 'todo' }, now), true)
  assert.equal(isOverdue({ due_at: '2026-10-18T11:00:00Z', status: 'done' }, now), false)
  assert.equal(isOverdue({ due_at: '2026-10-18T13:00:00Z', status: 'todo' }, now), false)
  assert.equal(isOverdue({ due_at: null, status: 'todo' }, now), false)
})

test('prereq notifications wait out the cooldown', () => {
  const now = Date.parse('2026-10-18T12:00:00Z')
  assert.equal(prereqNotifyDue(null, now), true)
  assert.equal(prereqNotifyDue('2026-10-18T11:59:00Z', now), false)
  assert.equal(prereqNotifyDue('2026-10-18T11:58:00Z', now), true)
})

test('groups by event, then assignee title', () => {
  const late = { id: 'e2', starts_at: '2026-11-02T18:00:00Z' }
  const soon = { id: 'e1', starts_at: '2026-10-20T18:00:00Z' }
  const titles = { t: 'Treasurer', p: 'President', x: null }
  const tasks = [
    { id: 'shared', event_id: 'e1', assignees: [open('t'), done('p'), open('x')] },
    { id: 'nobody', event_id: 'e1', assignees: [] },
    { id: 'loose', event_id: null, assignees: [open('t')] },
    { id: 'later', event_id: 'e2', assignees: [open('p')] },
  ]
  const groups = groupTasks(tasks, [late, soon], (id) => titles[id] ?? null)
  assert.deepEqual(groups.map((g) => g.event?.id ?? null), ['e1', 'e2', null])
  assert.deepEqual(groups[0].roles.map((r) => r.role), ['President', 'Treasurer', NO_TITLE, UNASSIGNED])
  const treasurer = groups[0].roles[1].rows
  assert.equal(treasurer[0].task.id, 'shared')
  assert.deepEqual(treasurer[0].assignees.map((a) => a.user_id), ['t'])
  assert.deepEqual(groups[0].roles[3].rows.map((r) => r.task.id), ['nobody'])
})

test('a task whose event is missing goes under No event', () => {
  const groups = groupTasks([{ id: 'x', event_id: 'gone', assignees: [] }], [], () => null)
  assert.equal(groups[0].event, null)
})
