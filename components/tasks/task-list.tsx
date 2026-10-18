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
