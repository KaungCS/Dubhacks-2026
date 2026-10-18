import Link from 'next/link'
import { Card } from '@/components/ui'
import type { Event } from '@/lib/db'
import type { TaskWithPeople } from '@/lib/tasks'
import { canSetCompletion, isOverdue, pacific, type Actor, type TaskGroup } from '@/lib/tasks/rules'

type People = { names: Map<string, string>; viewer: Actor }

type LinkProps = { taskId: string; assigneeId: string | null; label: string; done: boolean; enabled: boolean; back: string }

// One assignee's state (assigneeId null = the whole unassigned task). Changing it goes through the
// confirmation page, so nobody can flip it on and off with single clicks.
export function CompletionLink({ taskId, assigneeId, label, done, enabled, back }: LinkProps) {
  const text = `${done ? '☑' : '☐'} ${label}`
  if (!enabled) {
    return (
      <span className="text-sm text-neutral-400" title="Only an admin can change this">
        {text}
      </span>
    )
  }
  const query = new URLSearchParams({ back, ...(assigneeId && { assignee: assigneeId }) })
  return (
    <Link href={`/tasks/${taskId}/complete?${query}`} title={done ? 'Mark not done' : 'Mark done'} className="text-sm hover:underline">
      {text}
    </Link>
  )
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
              // The title's ::after covers the row so the whole row opens the task; the completion links sit
              // above it (relative, later in the DOM) so they stay clickable.
              <li key={task.id} className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 hover:bg-neutral-50">
                <div className="min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className={`text-sm font-medium after:absolute after:inset-0 ${task.status === 'done' ? 'text-neutral-400 line-through' : ''}`}
                  >
                    {task.title}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    <span className={isOverdue(task) ? 'text-red-600' : ''}>{task.due_at ? `Due ${pacific(task.due_at)}` : 'No due date'}</span>
                    {` · ${task.difficulty}`}
                    {task.is_prereq && ' · prereq'}
                  </p>
                </div>
                <div className="relative flex flex-wrap gap-x-4 gap-y-1">
                  {task.assignees.length === 0 ? (
                    <CompletionLink taskId={task.id} assigneeId={null} label="Done" done={task.status === 'done'} enabled={canSetCompletion(viewer, null)} back="/tasks" />
                  ) : (
                    assignees.map((a) => (
                      <CompletionLink
                        key={a.user_id}
                        taskId={task.id}
                        assigneeId={a.user_id}
                        label={names.get(a.user_id) ?? 'Former officer'}
                        done={!!a.completed_at}
                        enabled={canSetCompletion(viewer, a.user_id)}
                        back="/tasks"
                      />
                    ))
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Card>
  ))
}
