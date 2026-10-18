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
