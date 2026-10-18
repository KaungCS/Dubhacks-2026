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
