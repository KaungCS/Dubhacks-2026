import { getDb, type Task, type TablesInsert, type TablesUpdate } from '@/lib/db'
import { listEvents } from '@/lib/events'
import { createNotification } from '@/lib/notifications'
import { canSetCompletion, deriveStatus, PREREQ_COOLDOWN_MS, type Actor, type Assignee, type Status } from './rules'

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

// Sets status and completed_at; a prereq becoming done notifies its tagged officers, at most once per
// cooldown. The cooldown check and the claim are one UPDATE, so two quick confirms can't both send.
async function setStatus(task: TaskWithPeople, status: Status) {
  if (task.status === status) return
  const db = getDb()
  const { error } = await db
    .from('tasks')
    .update({ status, completed_at: status === 'done' ? new Date().toISOString() : null })
    .eq('id', task.id)
  if (error) throw error
  if (status !== 'done' || !task.is_prereq || task.tags.length === 0) return
  const cutoff = new Date(Date.now() - PREREQ_COOLDOWN_MS).toISOString()
  const { data: claimed, error: claimError } = await db
    .from('tasks')
    .update({ prereq_notified_at: new Date().toISOString() })
    .eq('id', task.id)
    .or(`prereq_notified_at.is.null,prereq_notified_at.lt."${cutoff}"`)
    .select('id')
  if (claimError) throw claimError
  if (claimed.length === 0) return
  await Promise.all(task.tags.map((t) => createNotification(t.user_id, 'prereq_done', { taskId: task.id, title: task.title })))
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
