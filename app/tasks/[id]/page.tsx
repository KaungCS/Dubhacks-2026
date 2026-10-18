import Link from 'next/link'
import { notFound } from 'next/navigation'
import { buttonClass, Card, Page } from '@/components/ui'
import { CompletionLink } from '@/components/tasks/task-list'
import { requireMembership } from '@/lib/auth'
import { getEvent } from '@/lib/events'
import { getTask, listOfficers } from '@/lib/tasks'
import { canSetCompletion, isOverdue, pacific } from '@/lib/tasks/rules'

const STATUS = { todo: 'To do', in_progress: 'In progress', done: 'Done' }

// Read-only view; notifications and the list land here. Editing is a separate page.
export default async function TaskPage({ params }: PageProps<'/tasks/[id]'>) {
  const { user, membership, workspace } = await requireMembership()
  const { id } = await params
  const [task, officers] = await Promise.all([getTask(workspace.id, id), listOfficers(workspace.id)])
  if (!task) notFound()
  const event = task.event_id ? await getEvent(task.event_id) : null
  const names = new Map(officers.map((o) => [o.id, o.name]))
  const viewer = { id: user.id, isAdmin: membership.role === 'admin' }
  const back = `/tasks/${task.id}`
  const tagged = task.tags.map((t) => names.get(t.user_id) ?? 'Former officer')

  return (
    <Page
      title={task.title}
      actions={
        <Link className={buttonClass} href={`/tasks/${task.id}/edit`}>
          Edit
        </Link>
      }
    >
      <Card className="space-y-4">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-neutral-500">Status</dt>
          <dd>{STATUS[task.status]}</dd>
          <dt className="text-neutral-500">Event</dt>
          <dd>
            {event ? (
              <Link href={`/events/${event.id}`} className="hover:underline">
                {event.title}
              </Link>
            ) : (
              'None'
            )}
          </dd>
          <dt className="text-neutral-500">Due</dt>
          <dd className={isOverdue(task) ? 'text-red-600' : ''}>{task.due_at ? pacific(task.due_at) : 'No due date'}</dd>
          <dt className="text-neutral-500">Difficulty</dt>
          <dd className="capitalize">{task.difficulty}</dd>
          {task.is_prereq && (
            <>
              <dt className="text-neutral-500">Prerequisite</dt>
              <dd>{tagged.length ? `Notifies ${tagged.join(', ')} when done` : 'Nobody to notify'}</dd>
            </>
          )}
        </dl>
        {task.description && <p className="whitespace-pre-wrap text-sm">{task.description}</p>}
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Completion</h2>
        <ul className="space-y-1">
          {task.assignees.length === 0 ? (
            <li>
              <CompletionLink taskId={task.id} assigneeId={null} label="Done" done={task.status === 'done'} enabled={canSetCompletion(viewer, null)} back={back} />
              {task.completed_at && <span className="ml-2 text-sm text-neutral-500">{pacific(task.completed_at)}</span>}
            </li>
          ) : (
            task.assignees.map((a) => (
              <li key={a.user_id}>
                <CompletionLink
                  taskId={task.id}
                  assigneeId={a.user_id}
                  label={names.get(a.user_id) ?? 'Former officer'}
                  done={!!a.completed_at}
                  enabled={canSetCompletion(viewer, a.user_id)}
                  back={back}
                />
                {a.completed_at && <span className="ml-2 text-sm text-neutral-500">{pacific(a.completed_at)}</span>}
              </li>
            ))
          )}
        </ul>
      </Card>
    </Page>
  )
}
