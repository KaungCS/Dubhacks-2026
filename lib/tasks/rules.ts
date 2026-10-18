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

// A prereq's tagged officers hear it's done at most once per cooldown, so completing and undoing
// repeatedly can't flood them.
export const PREREQ_COOLDOWN_MS = 2 * 60_000
export const prereqNotifyDue = (notifiedAt: string | null, now = Date.now()) =>
  !notifiedAt || now - Date.parse(notifiedAt) >= PREREQ_COOLDOWN_MS

export const isOverdue =(task: { due_at: string | null; status: Status }, now = Date.now()) =>
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
