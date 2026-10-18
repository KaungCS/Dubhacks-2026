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
