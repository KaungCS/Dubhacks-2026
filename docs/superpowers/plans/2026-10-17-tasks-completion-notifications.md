# Tasks: per-assignee completion, grouped list, in-app notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Jackson's tasks module on `main`, fitted to the real schema, with per-assignee completion (officers set their own, admins set anyone's), one task list grouped by event then assignee title, and in-app-only notifications.

**Architecture:** Pure rules (`lib/tasks/rules.ts`: derived status, permission, grouping) are unit-tested with `node --test`. `lib/tasks/index.ts` and `lib/notifications/index.ts` hold all DB access, collapsing Jackson's per-function files. Pages are Server Components; the only client components are the task form, the completion checkbox and the bell menu. Server actions call `refresh()` (Next 16, `next/cache`) or `redirect()`.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase (`getDb()` service role), Tailwind 4, `node --test` with type stripping (Node 24).

**Spec:** `docs/superpowers/specs/2026-10-17-tasks-completion-notifications-design.md`

## Global Constraints

- Branch `kaung/tasks`. Its first commit `d318fb9` is Jackson's (author `Icy-Monkey`); never rewrite it. Merge the PR with a merge commit, not squash.
- Every page, action and lib entry point is scoped by `requireMembership()`'s `workspace.id`; `getDb()` bypasses RLS.
- UI only from `@/components/ui` (`Button`, `buttonClass`, `Input`, `Select`, `Textarea`, `Card`, `Page`). White, flat, no shadows/gradients, color only for meaning (overdue = red).
- Other modules only through contracts: `listEvents`, `getEvent` from `@/lib/events`. Don't import `lib/polls` internals.
- Contracts this module keeps: `createTask(input: NewTask): Promise<Task>` with `NewTask = TablesInsert<'tasks'> & { assignee_ids?: string[]; tag_ids?: string[] }`, `listTasksForCalendar(workspaceId, from, to): Promise<Task[]>`, `createNotification(userId, kind, payload): Promise<void>`.
- No email anywhere. Times shown in Pacific (`America/Los_Angeles`) like polls.
- `rules.ts` has no runtime imports (only `import type`), so plain node can run its test.
- `npm run build` fails until Task 6 is done (Jackson's components import modules removed in Tasks 3 and 4); per-task checks before then are `npm test`.

## File map

| File | Action | Responsibility |
| --- | --- | --- |
| `supabase/migrations/20261017120000_task_assignee_completion.sql` | create | `task_assignees.completed_at`, drop `memberships.last_emailed_on` |
| `lib/db/types.ts` | modify | match the migration |
| `lib/tasks/rules.ts`, `lib/tasks/rules.test.mjs` | create | derived status, permission, overdue, Pacific format, grouping |
| `lib/tasks/index.ts` | rewrite | all task DB access |
| `lib/tasks/{create-task,get-task,list-tasks,list-tasks-for-calendar,map,relations,types,update-task,users}.ts`, `lib/tasks/__smoke_test.mjs`, `lib/email/*` | delete | replaced / email dropped |
| `lib/notifications/index.ts` | rewrite | notification DB access |
| `lib/notifications/{create-notification,list-notifications,mark-read,types}.ts` | delete | collapsed into index |
| `app/tasks/actions.ts` | rewrite | create, update, set completion |
| `app/tasks/page.tsx`, `app/tasks/new/page.tsx`, `app/tasks/[id]/page.tsx` | rewrite | list/board, new, detail |
| `components/tasks/task-list.tsx` | rewrite | grouped list + `CompletionBoxes` |
| `components/tasks/completion-box.tsx` | create | one optimistic checkbox |
| `components/tasks/task-form.tsx` | rewrite | create/edit form |
| `components/tasks/task-board.tsx`, `components/tasks/new-since-last-visit.tsx` | rewrite | fit schema + ui |
| `components/tasks/{create-task-form,edit-task-form,touch-last-visit,view-toggle}.tsx` | delete | folded into the above |
| `components/notifications/Bell.tsx` | rewrite | server part: unread count |
| `components/notifications/notification-bell.tsx` | rewrite | client menu |
| `components/notifications/actions.ts` | create | list / mark read for the session user |
| `package.json`, `package-lock.json`, `.env.example` | modify | drop `resend` |
| spec, `TEAM_PLAN.md`, `AGENTS.md`, `README.md` | modify | in-app only, ownership |

---

### Task 1: Schema

**Files:**
- Create: `supabase/migrations/20261017120000_task_assignee_completion.sql`
- Modify: `lib/db/types.ts` (memberships Row/Insert/Update lines 175, 186, 197; task_assignees Row/Insert/Update)

**Interfaces:**
- Produces: `Tables<'task_assignees'>` has `completed_at: string | null`; `Tables<'memberships'>` has no `last_emailed_on`.

- [ ] **Step 1: Write the migration**

```sql
-- Each assignee marks their own part done; tasks.status is derived from these (lib/tasks/rules.ts).
alter table task_assignees add column completed_at timestamptz;

-- Email was dropped for in-app notifications only, so the once-a-day rule is gone.
alter table memberships drop column last_emailed_on;
```

- [ ] **Step 2: Update `lib/db/types.ts`**

Delete the three `last_emailed_on` lines in `memberships` (Row `last_emailed_on: string | null`, Insert/Update `last_emailed_on?: string | null`). In `task_assignees` add `completed_at: string | null` to Row and `completed_at?: string | null` to Insert and Update, keeping keys alphabetical (before `task_id`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261017120000_task_assignee_completion.sql lib/db/types.ts
git commit -m "feat(db): per-assignee task completion, drop last_emailed_on"
```

### Task 2: Pure task rules (TDD)

**Files:**
- Create: `lib/tasks/rules.ts`, `lib/tasks/rules.test.mjs`

**Interfaces:**
- Produces:
  - `type Status = 'todo' | 'in_progress' | 'done'`
  - `type Assignee = { user_id: string; completed_at: string | null }`
  - `type Actor = { id: string; isAdmin: boolean }`
  - `deriveStatus(assignees: Assignee[]): Status | null`
  - `canSetCompletion(actor: Actor, assigneeId: string | null): boolean`
  - `isOverdue(task: { due_at: string | null; status: Status }, now?: number): boolean`
  - `pacific(iso: string): string`
  - `NO_TITLE = 'No title'`, `UNASSIGNED = 'Unassigned'`
  - `type TaskGroup<T, E> = { event: E | null; roles: { role: string; rows: { task: T; assignees: Assignee[] }[] }[] }`
  - `groupTasks<T, E>(tasks: T[], events: E[], titleOf: (userId: string) => string | null): TaskGroup<T, E>[]`

- [ ] **Step 1: Write the failing test** `lib/tasks/rules.test.mjs`

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSetCompletion, deriveStatus, groupTasks, isOverdue, NO_TITLE, UNASSIGNED } from './rules.ts'

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
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test lib/tasks/rules.test.mjs`
Expected: FAIL, cannot find module `./rules.ts`.

- [ ] **Step 3: Write `lib/tasks/rules.ts`**

```ts
// Pure task rules, no runtime imports, so lib/tasks/rules.test.mjs can run them with plain node.

export type Status = 'todo' | 'in_progress' | 'done'
export type Assignee = { user_id: string; completed_at: string | null }
export type Actor = { id: string; isAdmin: boolean }

// An assigned task's status follows its assignees' checkboxes. Null for an unassigned task, whose
// status an admin sets directly.
export function deriveStatus(assignees: Assignee[]): Status | null {
  if (assignees.length === 0) return null
  const done = assignees.filter((a) => a.completed_at).length
  return done === 0 ? 'todo' : done === assignees.length ? 'done' : 'in_progress'
}

// Officers set completion only on their own assignment; admins set anyone's, and unassigned tasks'
// (assigneeId null). Callers still check that the assignment exists.
export const canSetCompletion = (actor: Actor, assigneeId: string | null) =>
  actor.isAdmin || (assigneeId !== null && assigneeId === actor.id)

export const isOverdue = (task: { due_at: string | null; status: Status }, now = Date.now()) =>
  !!task.due_at && task.status !== 'done' && Date.parse(task.due_at) < now

// ponytail: Pacific for the pilot, same as polls; switch to the browser's zone if clubs span zones.
export const pacific = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' })

export const NO_TITLE = 'No title'
export const UNASSIGNED = 'Unassigned'

type Row<T> = { task: T; assignees: Assignee[] }
export type TaskGroup<T, E> = { event: E | null; roles: { role: string; rows: Row<T>[] }[] }

// Event groups (by start, "No event" last), each split by assignee title (alphabetical, then
// "No title", then "Unassigned"). A task appears once per title among its assignees, with only
// that title's assignees. Task order inside a group follows the input.
export function groupTasks<T extends { event_id: string | null; assignees: Assignee[] }, E extends { id: string; starts_at: string }>(
  tasks: T[],
  events: E[],
  titleOf: (userId: string) => string | null,
): TaskGroup<T, E>[] {
  const eventById = new Map(events.map((e) => [e.id, e]))
  const groups = new Map<E | null, Map<string, Row<T>[]>>()
  for (const task of tasks) {
    const event = (task.event_id && eventById.get(task.event_id)) || null
    const roles = groups.get(event) ?? new Map<string, Row<T>[]>()
    groups.set(event, roles)
    const byRole = new Map<string, Assignee[]>()
    if (task.assignees.length === 0) byRole.set(UNASSIGNED, [])
    for (const a of task.assignees) {
      const role = titleOf(a.user_id) || NO_TITLE
      byRole.set(role, [...(byRole.get(role) ?? []), a])
    }
    for (const [role, assignees] of byRole) roles.set(role, [...(roles.get(role) ?? []), { task, assignees }])
  }
  const rank = (role: string) => (role === UNASSIGNED ? 2 : role === NO_TITLE ? 1 : 0)
  return [...groups]
    .map(([event, roles]) => ({
      event,
      roles: [...roles]
        .map(([role, rows]) => ({ role, rows }))
        .sort((a, b) => rank(a.role) - rank(b.role) || a.role.localeCompare(b.role)),
    }))
    .sort((a, b) => (!a.event ? 1 : !b.event ? -1 : Date.parse(a.event.starts_at) - Date.parse(b.event.starts_at)))
}
```

- [ ] **Step 4: Run it and see it pass**

Run: `node --test lib/tasks/rules.test.mjs`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/tasks/rules.ts lib/tasks/rules.test.mjs
git commit -m "feat(tasks): completion, grouping and overdue rules"
```

### Task 3: Notifications library

**Files:**
- Rewrite: `lib/notifications/index.ts`
- Delete: `lib/notifications/create-notification.ts`, `list-notifications.ts`, `mark-read.ts`, `types.ts`

**Interfaces:**
- Produces: `type Notification = Tables<'notifications'>`, `createNotification(userId, kind, payload): Promise<void>` (never throws), `listNotifications(userId): Promise<Notification[]>`, `countUnread(userId): Promise<number>`, `markRead(userId: string, id?: string): Promise<void>`.

- [ ] **Step 1: Replace `lib/notifications/index.ts`**

```ts
import { getDb, type Json, type Tables } from '@/lib/db'

export type Notification = Tables<'notifications'>

// In-app notification for the bell. kind: 'task_assigned', 'prereq_done', 'event_created', 'poll_opened',
// 'poll_closing', 'rsvp_target'. Logs instead of throwing, so a failed notification never blocks the
// change that caused it.
export async function createNotification(userId: string, kind: string, payload: object): Promise<void> {
  const { error } = await getDb().from('notifications').insert({ user_id: userId, kind, payload: payload as Json })
  if (error) console.error('createNotification failed', error)
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await getDb()
    .from('notifications')
    .select()
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30)
  if (error) throw error
  return data
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await getDb()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  if (error) throw error
  return count ?? 0
}

// Marks one of the user's notifications read, or all of them when id is omitted. Never touches
// another user's rows.
export async function markRead(userId: string, id?: string): Promise<void> {
  let query = getDb().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null)
  if (id) query = query.eq('id', id)
  const { error } = await query
  if (error) throw error
}
```

- [ ] **Step 2: Delete the split files and commit**

```bash
git rm lib/notifications/create-notification.ts lib/notifications/list-notifications.ts lib/notifications/mark-read.ts lib/notifications/types.ts
git add lib/notifications/index.ts
git commit -m "refactor(notifications): one module on the real schema, scoped mark-read"
```

### Task 4: Tasks data layer, email removed

**Files:**
- Rewrite: `lib/tasks/index.ts`
- Delete: `lib/tasks/{create-task,get-task,list-tasks,list-tasks-for-calendar,map,relations,types,update-task,users}.ts`, `lib/tasks/__smoke_test.mjs`, `lib/email/` (all five files)
- Modify: `package.json`, `package-lock.json` (via `npm uninstall resend`), `.env.example` (drop the two Resend lines)

**Interfaces:**
- Consumes: Task 2 `deriveStatus`, `canSetCompletion`, `Actor`, `Assignee`, `Status`; Task 3 `createNotification`; `listEvents` from `@/lib/events`.
- Produces:
  - `type NewTask`, `type TaskWithPeople = Task & { assignees: Assignee[]; tags: { user_id: string }[] }`, `type Officer = { id: string; name: string; title: string | null }`, `type TaskEdit`
  - `createTask(input: NewTask): Promise<Task>`
  - `listTasksForCalendar(workspaceId, from: Date, to: Date): Promise<Task[]>`
  - `listTasks(workspaceId): Promise<TaskWithPeople[]>`
  - `getTask(workspaceId, taskId): Promise<TaskWithPeople | null>`
  - `listOfficers(workspaceId): Promise<Officer[]>`
  - `allEvents(workspaceId): Promise<Event[]>`
  - `updateTask(workspaceId, taskId, edit: TaskEdit, actorId: string): Promise<void>`
  - `setCompletion(workspaceId, taskId, assigneeId: string | null, done: boolean, actor: Actor): Promise<void>`
  - `markTasksSeen(membershipId): Promise<void>`

- [ ] **Step 1: Replace `lib/tasks/index.ts`**

```ts
import { getDb, type Task, type TablesInsert, type TablesUpdate } from '@/lib/db'
import { listEvents } from '@/lib/events'
import { createNotification } from '@/lib/notifications'
import { canSetCompletion, deriveStatus, type Actor, type Assignee, type Status } from './rules'

export type NewTask = TablesInsert<'tasks'> & { assignee_ids?: string[]; tag_ids?: string[] }
export type TaskWithPeople = Task & { assignees: Assignee[]; tags: { user_id: string }[] }
export type Officer = { id: string; name: string; title: string | null }
export type TaskEdit = Pick<TablesUpdate<'tasks'>, 'title' | 'description' | 'due_at' | 'difficulty' | 'is_prereq' | 'event_id'> & {
  assignee_ids: string[]
  tag_ids: string[]
}

const WITH_PEOPLE = '*, assignees:task_assignees(user_id, completed_at), tags:task_tags(user_id)'

const unique = (ids: string[]) => [...new Set(ids.filter(Boolean))]

async function addPeople(table: 'task_assignees' | 'task_tags', taskId: string, userIds: string[]) {
  if (userIds.length === 0) return
  const { error } = await getDb().from(table).insert(userIds.map((user_id) => ({ task_id: taskId, user_id })))
  if (error) throw error
}

// New assignees hear about it in-app, except whoever assigned themselves.
const notifyAssigned = (task: { id: string; title: string }, userIds: string[], actorId: string | null) =>
  Promise.all(
    userIds.filter((id) => id !== actorId).map((id) => createNotification(id, 'task_assigned', { taskId: task.id, title: task.title })),
  )

// Creates the task, its assignees and tags, and notifies the assignees in-app.
export async function createTask({ assignee_ids = [], tag_ids = [], ...input }: NewTask): Promise<Task> {
  const { data: task, error } = await getDb().from('tasks').insert(input).select().single()
  if (error) throw error
  const assignees = unique(assignee_ids)
  await addPeople('task_assignees', task.id, assignees)
  await addPeople('task_tags', task.id, unique(tag_ids))
  await notifyAssigned(task, assignees, task.created_by)
  return task
}

// Tasks due in [from, to], for the calendar.
export async function listTasksForCalendar(workspaceId: string, from: Date, to: Date): Promise<Task[]> {
  const { data, error } = await getDb()
    .from('tasks')
    .select()
    .eq('workspace_id', workspaceId)
    .gte('due_at', from.toISOString())
    .lte('due_at', to.toISOString())
    .order('due_at')
  if (error) throw error
  return data
}

export async function listTasks(workspaceId: string): Promise<TaskWithPeople[]> {
  const { data, error } = await getDb()
    .from('tasks')
    .select(WITH_PEOPLE)
    .eq('workspace_id', workspaceId)
    .order('due_at', { nullsFirst: false })
    .order('created_at')
  if (error) throw error
  return data
}

// Null when the task isn't in this club (or the id isn't a uuid).
export async function getTask(workspaceId: string, taskId: string): Promise<TaskWithPeople | null> {
  const { data, error } = await getDb().from('tasks').select(WITH_PEOPLE).eq('workspace_id', workspaceId).eq('id', taskId).maybeSingle()
  if (error?.code === '22P02') return null
  if (error) throw error
  return data
}

// Active officers, for assignee pickers and title groups.
export async function listOfficers(workspaceId: string): Promise<Officer[]> {
  const { data, error } = await getDb()
    .from('memberships')
    .select('title, user:users(id, name, email)')
    .eq('workspace_id', workspaceId)
    .is('left_at', null)
  if (error) throw error
  return data
    .map((m) => ({ id: m.user.id, name: m.user.name || m.user.email, title: m.title }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

// Every event of the club, for the event picker and group headers.
export const allEvents = (workspaceId: string) => listEvents(workspaceId, new Date(0), new Date('9999-12-31'))

// Sets status and completed_at; a prereq becoming done notifies its tagged officers.
async function setStatus(task: TaskWithPeople, status: Status) {
  if (task.status === status) return
  const { error } = await getDb()
    .from('tasks')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', task.id)
  if (error) throw error
  if (status === 'done' && task.is_prereq) {
    await Promise.all(task.tags.map((t) => createNotification(t.user_id, 'prereq_done', { taskId: task.id, title: task.title })))
  }
}

// Re-derives an assigned task's status from its assignees' checkboxes.
async function syncStatus(workspaceId: string, taskId: string) {
  const task = await getTask(workspaceId, taskId)
  const status = task && deriveStatus(task.assignees)
  if (task && status) await setStatus(task, status)
}

// Saves the form, keeps completion for assignees who stay, notifies new ones, and re-derives the
// status (removing the last unfinished assignee finishes the task).
export async function updateTask(workspaceId: string, taskId: string, { assignee_ids, tag_ids, ...fields }: TaskEdit, actorId: string) {
  const db = getDb()
  const before = await getTask(workspaceId, taskId)
  if (!before) throw new Error('Task not found in this club')
  const { error } = await db.from('tasks').update(fields).eq('id', taskId)
  if (error) throw error

  const next = unique(assignee_ids)
  const current = before.assignees.map((a) => a.user_id)
  const removed = current.filter((id) => !next.includes(id))
  const added = next.filter((id) => !current.includes(id))
  if (removed.length) {
    const { error: e } = await db.from('task_assignees').delete().eq('task_id', taskId).in('user_id', removed)
    if (e) throw e
  }
  await addPeople('task_assignees', taskId, added)
  const { error: tagError } = await db.from('task_tags').delete().eq('task_id', taskId)
  if (tagError) throw tagError
  await addPeople('task_tags', taskId, unique(tag_ids))

  await notifyAssigned({ id: taskId, title: fields.title ?? before.title }, added, actorId)
  await syncStatus(workspaceId, taskId)
}

// Ticks or unticks one assignee's part, or the whole task when it has no assignees (assigneeId null).
// Officers may set only their own; admins anyone's (rules.ts).
export async function setCompletion(workspaceId: string, taskId: string, assigneeId: string | null, done: boolean, actor: Actor) {
  if (!canSetCompletion(actor, assigneeId)) throw new Error('Only an admin can set completion for someone else')
  const task = await getTask(workspaceId, taskId)
  if (!task) throw new Error('Task not found in this club')
  if (assigneeId === null) {
    if (task.assignees.length) throw new Error('This task has assignees; set completion per assignee')
    return setStatus(task, done ? 'done' : 'todo')
  }
  if (!task.assignees.some((a) => a.user_id === assigneeId)) throw new Error('Not an assignee of this task')
  const { error } = await getDb()
    .from('task_assignees')
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq('task_id', taskId)
    .eq('user_id', assigneeId)
  if (error) throw error
  await syncStatus(workspaceId, taskId)
}

// Moves the officer's "last visit" to now; the tasks page reads the old value first.
export async function markTasksSeen(membershipId: string) {
  const { error } = await getDb().from('memberships').update({ last_seen_at: new Date().toISOString() }).eq('id', membershipId)
  if (error) console.error('markTasksSeen failed', error)
}
```

- [ ] **Step 2: Delete Jackson's split files, the email module and Resend**

```bash
git rm lib/tasks/create-task.ts lib/tasks/get-task.ts lib/tasks/list-tasks.ts lib/tasks/list-tasks-for-calendar.ts lib/tasks/map.ts lib/tasks/relations.ts lib/tasks/types.ts lib/tasks/update-task.ts lib/tasks/users.ts lib/tasks/__smoke_test.mjs
git rm -r lib/email
npm uninstall resend
```

In `.env.example` delete the lines `# Resend, verified club domain` and `RESEND_API_KEY=`.

- [ ] **Step 3: Check the rules test still passes, then commit**

Run: `npm test`
Expected: all tests pass (polls, attendance, auth crypto, tasks rules).

```bash
git add lib/tasks/index.ts package.json package-lock.json .env.example
git commit -m "feat(tasks): data layer on the real schema, per-assignee completion, no email"
```

### Task 5: Tasks pages and components

**Files:**
- Rewrite: `app/tasks/actions.ts`, `app/tasks/page.tsx`, `app/tasks/new/page.tsx`, `app/tasks/[id]/page.tsx`, `components/tasks/task-list.tsx`, `components/tasks/task-form.tsx`, `components/tasks/task-board.tsx`, `components/tasks/new-since-last-visit.tsx`
- Create: `components/tasks/completion-box.tsx`
- Delete: `components/tasks/create-task-form.tsx`, `edit-task-form.tsx`, `touch-last-visit.tsx`, `view-toggle.tsx`

**Interfaces:**
- Consumes: Task 4 functions/types; Task 2 `groupTasks`, `canSetCompletion`, `isOverdue`, `pacific`, `Actor`, `TaskGroup`, `Status`, `Assignee`; `getEvent` from `@/lib/events`.
- Produces: `setCompletionAction(taskId: string, assigneeId: string | null, done: boolean): Promise<void>`, `createTaskAction(fd)`, `updateTaskAction(fd)`; `CompletionBoxes` component.

- [ ] **Step 1: `app/tasks/actions.ts`**

```ts
'use server'

import { refresh } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireMembership } from '@/lib/auth'
import { getEvent } from '@/lib/events'
import { createTask, listOfficers, setCompletion, updateTask } from '@/lib/tasks'

const DIFFICULTY = ['easy', 'medium', 'hard'] as const

// Fields shared by create and edit. Event and people must belong to this club.
async function readTaskForm(fd: FormData, workspaceId: string) {
  const title = String(fd.get('title') ?? '').trim()
  if (!title) throw new Error('A task needs a title')
  const due = String(fd.get('due_at') ?? '')
  if (due && Number.isNaN(Date.parse(due))) throw new Error('Invalid due date')
  const eventId = String(fd.get('event_id') ?? '') || null
  if (eventId && (await getEvent(eventId)).workspace_id !== workspaceId) throw new Error('Event not in this club')
  const officers = new Set((await listOfficers(workspaceId)).map((o) => o.id))
  const people = (name: string) => fd.getAll(name).map(String).filter((id) => officers.has(id))
  const isPrereq = fd.get('is_prereq') === 'on'
  return {
    title,
    description: String(fd.get('description') ?? '').trim() || null,
    due_at: due || null,
    difficulty: DIFFICULTY.find((d) => d === fd.get('difficulty')) ?? 'medium',
    is_prereq: isPrereq,
    event_id: eventId,
    assignee_ids: people('assignee'),
    tag_ids: isPrereq ? people('tag') : [],
  }
}

export async function createTaskAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  await createTask({ ...(await readTaskForm(fd, workspace.id)), workspace_id: workspace.id, created_by: user.id })
  redirect('/tasks')
}

export async function updateTaskAction(fd: FormData) {
  const { user, workspace } = await requireMembership()
  await updateTask(workspace.id, String(fd.get('id')), await readTaskForm(fd, workspace.id), user.id)
  redirect('/tasks')
}

export async function setCompletionAction(taskId: string, assigneeId: string | null, done: boolean) {
  const { user, membership, workspace } = await requireMembership()
  await setCompletion(workspace.id, taskId, assigneeId, done, { id: user.id, isAdmin: membership.role === 'admin' })
  refresh()
}
```

- [ ] **Step 2: `components/tasks/completion-box.tsx`**

```tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import { setCompletionAction } from '@/app/tasks/actions'

type Props = { taskId: string; assigneeId: string | null; label: string; checked: boolean; disabled: boolean }

// One assignee's checkbox (assigneeId null = the whole unassigned task). Shows the click at once and
// falls back to the saved value if the server refuses.
export function CompletionBox({ taskId, assigneeId, label, checked, disabled }: Props) {
  const [shown, setShown] = useOptimistic(checked)
  const [pending, startTransition] = useTransition()
  return (
    <label className={`flex items-center gap-1.5 text-sm ${disabled ? 'text-neutral-400' : ''}`} title={disabled ? 'Only an admin can change this' : undefined}>
      <input
        type="checkbox"
        checked={shown}
        disabled={disabled || pending}
        onChange={(e) => {
          const done = e.target.checked
          startTransition(async () => {
            setShown(done)
            await setCompletionAction(taskId, assigneeId, done)
          })
        }}
        className="accent-black"
      />
      {label}
    </label>
  )
}
```

- [ ] **Step 3: `components/tasks/task-list.tsx`**

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui'
import type { Event } from '@/lib/db'
import type { TaskWithPeople } from '@/lib/tasks'
import { canSetCompletion, isOverdue, pacific, type Actor, type Assignee, type TaskGroup } from '@/lib/tasks/rules'
import { CompletionBox } from './completion-box'

type People = { names: Map<string, string>; viewer: Actor }

// Checkboxes for the given assignees, or one task-level box when the task has none.
export function CompletionBoxes({ task, assignees, names, viewer }: People & { task: TaskWithPeople; assignees: Assignee[] }) {
  if (task.assignees.length === 0) {
    return <CompletionBox taskId={task.id} assigneeId={null} label="Done" checked={task.status === 'done'} disabled={!canSetCompletion(viewer, null)} />
  }
  return assignees.map((a) => (
    <CompletionBox
      key={a.user_id}
      taskId={task.id}
      assigneeId={a.user_id}
      label={names.get(a.user_id) ?? 'Former officer'}
      checked={!!a.completed_at}
      disabled={!canSetCompletion(viewer, a.user_id)}
    />
  ))
}

// All tasks: one card per event (then "No event"), split by assignee title.
export function TaskList({ groups, names, viewer }: People & { groups: TaskGroup<TaskWithPeople, Event>[] }) {
  if (groups.length === 0) return <p className="text-neutral-500">No tasks yet.</p>
  return groups.map(({ event, roles }) => (
    <Card key={event?.id ?? 'none'} className="space-y-4">
      <h2 className="font-semibold">
        {event ? (
          <Link href={`/events/${event.id}`} className="hover:underline">
            {event.title}
          </Link>
        ) : (
          'No event'
        )}
        {event && <span className="ml-2 text-sm font-normal text-neutral-500">{pacific(event.starts_at)}</span>}
      </h2>
      {roles.map(({ role, rows }) => (
        <div key={role}>
          <h3 className="text-sm text-neutral-500">{role}</h3>
          <ul className="divide-y divide-neutral-100">
            {rows.map(({ task, assignees }) => (
              <li key={task.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <div className="min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className={`text-sm font-medium hover:underline ${task.status === 'done' ? 'text-neutral-400 line-through' : ''}`}
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    <span className={isOverdue(task) ? 'text-red-600' : ''}>{task.due_at ? `Due ${pacific(task.due_at)}` : 'No due date'}</span>
                    {` · ${task.difficulty}`}
                    {task.is_prereq && ' · prereq'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <CompletionBoxes task={task} assignees={assignees} names={names} viewer={viewer} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  ))
}
```

- [ ] **Step 4: `components/tasks/task-board.tsx`**

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui'
import type { TaskWithPeople } from '@/lib/tasks'
import { isOverdue, pacific, type Status } from '@/lib/tasks/rules'

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
]

export function TaskBoard({ tasks }: { tasks: TaskWithPeople[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status)
        return (
          <Card key={col.status} className="space-y-2">
            <h2 className="font-semibold">
              {col.label} <span className="font-normal text-neutral-500">{columnTasks.length}</span>
            </h2>
            <ul className="divide-y divide-neutral-100">
              {columnTasks.map((task) => (
                <li key={task.id} className="py-2">
                  <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline">
                    {task.title}
                  </Link>
                  <p className={`text-xs ${isOverdue(task) ? 'text-red-600' : 'text-neutral-500'}`}>
                    {task.due_at ? pacific(task.due_at) : 'No due date'}
                    {task.is_prereq && ' · prereq'}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: `components/tasks/new-since-last-visit.tsx`**

```tsx
import Link from 'next/link'
import { Card } from '@/components/ui'
import type { Task } from '@/lib/db'

// Tasks other officers created since this officer last opened Tasks.
export function NewSinceLastVisit({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) return null
  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">New since your last visit</h2>
      <ul className="space-y-1 text-sm">
        {tasks.slice(0, 5).map((task) => (
          <li key={task.id}>
            <Link href={`/tasks/${task.id}`} className="hover:underline">
              {task.title}
            </Link>
          </li>
        ))}
      </ul>
      {tasks.length > 5 && <p className="text-xs text-neutral-500">+{tasks.length - 5} more</p>}
    </Card>
  )
}
```

- [ ] **Step 6: `components/tasks/task-form.tsx`**

```tsx
'use client'

import { useState, useSyncExternalStore } from 'react'
import { Button, Card, Input, Select, Textarea } from '@/components/ui'
import { createTaskAction, updateTaskAction } from '@/app/tasks/actions'
import type { Event } from '@/lib/db'
import type { Officer, TaskWithPeople } from '@/lib/tasks'

const noop = () => () => {}

// datetime-local wants the officer's local "YYYY-MM-DDTHH:mm".
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function OfficerPicker({ legend, name, officers, selected }: { legend: string; name: string; officers: Officer[]; selected: Set<string> }) {
  return (
    <fieldset className="space-y-1 text-sm">
      <legend className="text-neutral-500">{legend}</legend>
      {officers.length === 0 && <p className="text-neutral-500">No officers yet.</p>}
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {officers.map((o) => (
          <label key={o.id} className="flex items-center gap-2">
            <input type="checkbox" name={name} value={o.id} defaultChecked={selected.has(o.id)} className="accent-black" />
            {o.name}
            {o.title && <span className="text-neutral-500">{o.title}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

// Create (no task) or edit. Status isn't here: it follows the assignees' checkboxes.
export function TaskForm({ officers, events, task }: { officers: Officer[]; events: Event[]; task?: TaskWithPeople }) {
  const [isPrereq, setIsPrereq] = useState(task?.is_prereq ?? false)
  // The server doesn't know the officer's time zone, so the due field gets its value only in the browser.
  const inBrowser = useSyncExternalStore(noop, () => true, () => false)
  const assigned = new Set(task?.assignees.map((a) => a.user_id))
  const tagged = new Set(task?.tags.map((t) => t.user_id))

  return (
    <Card>
      <form
        action={(fd) => {
          // datetime-local has no time zone; convert here, in the officer's own zone, before it reaches the server.
          const local = String(fd.get('due_at') ?? '')
          fd.set('due_at', local ? new Date(local).toISOString() : '')
          return (task ? updateTaskAction : createTaskAction)(fd)
        }}
        className="space-y-4"
      >
        {task && <input type="hidden" name="id" value={task.id} />}
        <Input name="title" defaultValue={task?.title} placeholder="Title" aria-label="Title" required className="w-full" />
        <Textarea name="description" defaultValue={task?.description ?? ''} placeholder="Description" aria-label="Description" rows={3} className="w-full" />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            Due
            <Input key={String(inBrowser)} type="datetime-local" name="due_at" defaultValue={inBrowser ? toLocalInput(task?.due_at) : ''} />
          </label>
          <label className="flex items-center gap-2">
            Difficulty
            <Select name="difficulty" defaultValue={task?.difficulty ?? 'medium'}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </label>
          <label className="flex items-center gap-2">
            Event
            <Select name="event_id" defaultValue={task?.event_id ?? ''}>
              <option value="">No event</option>
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} ({e.starts_at.slice(0, 10)})
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="is_prereq" checked={isPrereq} onChange={(e) => setIsPrereq(e.target.checked)} className="accent-black" />
            Prerequisite
          </label>
        </div>
        <OfficerPicker legend="Assignees" name="assignee" officers={officers} selected={assigned} />
        {isPrereq && <OfficerPicker legend="Notify when done" name="tag" officers={officers} selected={tagged} />}
        <Button>{task ? 'Save' : 'Create task'}</Button>
      </form>
    </Card>
  )
}
```

- [ ] **Step 7: `app/tasks/page.tsx`**

```tsx
import Link from 'next/link'
import { buttonClass, Page } from '@/components/ui'
import { NewSinceLastVisit } from '@/components/tasks/new-since-last-visit'
import { TaskBoard } from '@/components/tasks/task-board'
import { TaskList } from '@/components/tasks/task-list'
import { requireMembership } from '@/lib/auth'
import { allEvents, listOfficers, listTasks, markTasksSeen } from '@/lib/tasks'
import { groupTasks } from '@/lib/tasks/rules'

export default async function TasksPage({ searchParams }: PageProps<'/tasks'>) {
  const { user, membership, workspace } = await requireMembership()
  const board = (await searchParams).view === 'board'
  const [tasks, events, officers] = await Promise.all([listTasks(workspace.id), allEvents(workspace.id), listOfficers(workspace.id)])

  const since = membership.last_seen_at ? Date.parse(membership.last_seen_at) : null
  await markTasksSeen(membership.id)
  const fresh = since ? tasks.filter((t) => Date.parse(t.created_at) > since && t.created_by !== user.id) : []
  const titles = new Map(officers.map((o) => [o.id, o.title]))
  const names = new Map(officers.map((o) => [o.id, o.name]))

  return (
    <Page
      title="Tasks"
      actions={
        <div className="flex gap-2">
          <Link className={buttonClass} href={board ? '/tasks' : '/tasks?view=board'}>
            {board ? 'List view' : 'Board view'}
          </Link>
          <Link className={buttonClass} href="/tasks/new">
            New task
          </Link>
        </div>
      }
    >
      <NewSinceLastVisit tasks={fresh} />
      {board ? (
        <TaskBoard tasks={tasks} />
      ) : (
        <TaskList
          groups={groupTasks(tasks, events, (id) => titles.get(id) ?? null)}
          names={names}
          viewer={{ id: user.id, isAdmin: membership.role === 'admin' }}
        />
      )}
    </Page>
  )
}
```

- [ ] **Step 8: `app/tasks/new/page.tsx`**

```tsx
import { Page } from '@/components/ui'
import { TaskForm } from '@/components/tasks/task-form'
import { requireMembership } from '@/lib/auth'
import { allEvents, listOfficers } from '@/lib/tasks'

export default async function NewTaskPage() {
  const { workspace } = await requireMembership()
  const [officers, events] = await Promise.all([listOfficers(workspace.id), allEvents(workspace.id)])
  return (
    <Page title="New task">
      <TaskForm officers={officers} events={events} />
    </Page>
  )
}
```

- [ ] **Step 9: `app/tasks/[id]/page.tsx`**

```tsx
import { notFound } from 'next/navigation'
import { Card, Page } from '@/components/ui'
import { TaskForm } from '@/components/tasks/task-form'
import { CompletionBoxes } from '@/components/tasks/task-list'
import { requireMembership } from '@/lib/auth'
import { allEvents, getTask, listOfficers } from '@/lib/tasks'

export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const { user, membership, workspace } = await requireMembership()
  const { id } = await params
  const [task, officers, events] = await Promise.all([getTask(workspace.id, id), listOfficers(workspace.id), allEvents(workspace.id)])
  if (!task) notFound()
  const names = new Map(officers.map((o) => [o.id, o.name]))

  return (
    <Page title={task.title}>
      <Card className="space-y-2">
        <h2 className="font-semibold">Completion</h2>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <CompletionBoxes task={task} assignees={task.assignees} names={names} viewer={{ id: user.id, isAdmin: membership.role === 'admin' }} />
        </div>
      </Card>
      <TaskForm officers={officers} events={events} task={task} />
    </Page>
  )
}
```

- [ ] **Step 10: Delete folded components and commit**

```bash
git rm components/tasks/create-task-form.tsx components/tasks/edit-task-form.tsx components/tasks/touch-last-visit.tsx components/tasks/view-toggle.tsx
git add app/tasks components/tasks
git commit -m "feat(tasks): grouped list, per-assignee checkboxes, board and form on shared UI"
```

### Task 6: Bell in the layout

**Files:**
- Rewrite: `components/notifications/Bell.tsx`, `components/notifications/notification-bell.tsx`
- Create: `components/notifications/actions.ts`

**Interfaces:**
- Consumes: Task 3 `listNotifications`, `countUnread`, `markRead`, `Notification`; `requireUser` from `@/lib/auth`.
- Produces: `NotificationBell` (unchanged export the layout already renders).

- [ ] **Step 1: `components/notifications/actions.ts`**

```ts
'use server'

import { requireUser } from '@/lib/auth'
import { listNotifications, markRead } from '@/lib/notifications'

export async function listMyNotifications() {
  return listNotifications((await requireUser()).id)
}

// One notification, or all when id is omitted. Always the signed-in user's own.
export async function markReadAction(id?: string) {
  await markRead((await requireUser()).id, id)
}
```

- [ ] **Step 2: `components/notifications/Bell.tsx`**

```tsx
import { requireUser } from '@/lib/auth'
import { countUnread } from '@/lib/notifications'
import { NotificationMenu } from './notification-bell'

// app/layout.tsx renders this on every signed-in page. The list loads when opened, because the
// layout doesn't re-render on navigation. A failed count never breaks the page.
export async function NotificationBell() {
  const user = await requireUser()
  const unread = await countUnread(user.id).catch(() => 0)
  return <NotificationMenu initialUnread={unread} />
}
```

- [ ] **Step 3: `components/notifications/notification-bell.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'
import { buttonClass } from '@/components/ui'
import type { Notification } from '@/lib/notifications'
import { listMyNotifications, markReadAction } from './actions'

const LABELS: Record<string, string> = {
  task_assigned: 'Assigned to you',
  prereq_done: 'Prereq done',
  event_created: 'Event created',
  poll_opened: 'New poll',
  poll_closing: 'Poll closing soon',
  rsvp_target: 'RSVP target reached',
}

const field = (n: Notification, key: string) => {
  const value = (n.payload as Record<string, unknown> | null)?.[key]
  return typeof value === 'string' ? value : ''
}

function labelFor(n: Notification) {
  const name = field(n, 'title') || field(n, 'question')
  const label = LABELS[n.kind] ?? n.kind
  return name ? `${label}: ${name}` : label
}

function hrefFor(n: Notification) {
  if (field(n, 'taskId')) return `/tasks/${field(n, 'taskId')}`
  if (field(n, 'eventId')) return `/events/${field(n, 'eventId')}`
  if (field(n, 'pollId')) return '/polls'
  return null
}

export function NotificationMenu({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[] | null>(null)
  const [unread, setUnread] = useState(initialUnread)
  const [, startTransition] = useTransition()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    setOpen(!open)
    if (open) return
    startTransition(async () => {
      const list = await listMyNotifications()
      setItems(list)
      setUnread(list.filter((n) => !n.read_at).length)
    })
  }

  function markRead(id?: string) {
    const now = new Date().toISOString()
    setItems((list) => list?.map((n) => (!id || n.id === id ? { ...n, read_at: n.read_at ?? now } : n)) ?? null)
    setUnread((count) => (id ? Math.max(0, count - 1) : 0))
    startTransition(() => markReadAction(id))
  }

  return (
    <div ref={root} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} className={buttonClass}>
        Notifications{unread > 0 && ` (${unread > 99 ? '99+' : unread})`}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2 text-sm">
            <span className="font-semibold">Notifications</span>
            <button type="button" onClick={() => markRead()} disabled={unread === 0} className="text-neutral-500 hover:underline disabled:opacity-40">
              Mark all read
            </button>
          </div>
          <ul className="max-h-80 overflow-y-auto text-sm">
            {items === null && <li className="px-4 py-6 text-center text-neutral-500">Loading…</li>}
            {items?.length === 0 && <li className="px-4 py-6 text-center text-neutral-500">No notifications</li>}
            {items?.map((n) => {
              const href = hrefFor(n)
              const read = () => !n.read_at && markRead(n.id)
              const body = (
                <>
                  <p className={n.read_at ? 'text-neutral-500' : 'font-medium'}>{labelFor(n)}</p>
                  <p className="text-xs text-neutral-500">{new Date(n.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </>
              )
              return (
                <li key={n.id} className="border-b border-neutral-100 last:border-0">
                  {href ? (
                    <Link href={href} onClick={() => (read(), setOpen(false))} className="block px-4 py-2 hover:bg-neutral-50">
                      {body}
                    </Link>
                  ) : (
                    <button type="button" onClick={read} className="block w-full px-4 py-2 text-left hover:bg-neutral-50">
                      {body}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Full checks, then commit**

Run: `npm run lint && npm run build && npm test`
Expected: lint clean, build succeeds, all tests pass. Fix anything they report before committing.

```bash
git add components/notifications
git commit -m "feat(notifications): bell in the layout, links to the task, event or poll"
```

### Task 7: Docs

**Files:**
- Modify: `Club Ops App — Data Model & MVP Plan.md`, `TEAM_PLAN.md`, `AGENTS.md`, `README.md`

- [ ] **Step 1: Spec**
  - Overview: "The only emails are the two described under Notifications." → "There is no email; notifications are in-app only."
  - Architecture table: delete the `Email | Resend…` row.
  - Data model: Membership key fields drop `last_emailed_on`, Notes → `last_seen_at` powers "new since your last visit"; TaskAssignee key fields → `task_id, user_id, completed_at`, Notes → "Multiple assignees allowed; each marks their own part done (admins can mark anyone's). Task status follows: none → todo, some → in progress, all → done".
  - Notifications section: replace the Email table and its sentence with an in-app list: task assigned to you (not when you assign yourself), prereq task done (its tagged officers), new tasks since your last visit, poll opened, poll closing soon, RSVP target reached. Keep "There is no digest and no weekly summary." Note overdue and "event in 48 hours" as not built (overdue shows red in the list).
  - Build order item 2: "the two emails" → "in-app notifications".
  - Open risks: delete the once-a-day email item.
  - Decisions made: add "Email dropped; notifications are in-app only (Oct 17)."
- [ ] **Step 2: TEAM_PLAN.md**
  - Setup: drop "the Resend key (club domain),".
  - Step 0: drop `` `resend` `` from the dependency list.
  - Ownership: Kaung row adds Tasks and notifications and their folders (`app/tasks/`, `lib/tasks/`, `lib/notifications/`, `components/tasks/`, `components/notifications/`); Jackson row → "Tasks (first version, merged into Kaung's `kaung/tasks`)" with no folders.
  - Contracts: `createTask` comment → "handles assignees, tagged officers and in-app assignment notifications".
  - "Jackson: Tasks" section: replace the email step with per-assignee completion and in-app notifications; mark it handed to Kaung.
- [ ] **Step 3: AGENTS.md** — "Email is sent only in the two cases in the spec." → "There is no email: notifications are in-app only (the bell)."
- [ ] **Step 4: README.md** — Stack line drop ", Resend".
- [ ] **Step 5: Commit**

```bash
git add "Club Ops App — Data Model & MVP Plan.md" TEAM_PLAN.md AGENTS.md README.md
git commit -m "docs: in-app notifications only, per-assignee completion, Kaung owns tasks"
```

### Task 8: Ship (needs Kaung's go-ahead for each external write)

- [ ] **Step 1:** `git pull --rebase origin main` (AGENTS.md rule; a rebase keeps Jackson as author), then rerun `npm run lint && npm run build && npm test`.
- [ ] **Step 2:** Ask Kaung, then apply the migration to the shared project: `npx supabase db push`.
- [ ] **Step 3:** Ask Kaung, then push and open the PR: `git push` and `gh pr create --base main --title "Tasks: Jackson's module + per-assignee completion, grouped list, in-app notifications" --body-file <file>`; the body says to merge with a merge commit.
- [ ] **Step 4:** Kaung clicks through: create a task with two assignees; each ticks their own box; an officer can't tick someone else's; the admin ticks another's; status becomes done; a tagged officer of a prereq sees "Prereq done" in the bell; the assignee sees "Assigned to you".
