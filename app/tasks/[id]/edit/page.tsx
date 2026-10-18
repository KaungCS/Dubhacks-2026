import { notFound } from 'next/navigation'
import { Page } from '@/components/ui'
import { TaskForm } from '@/components/tasks/task-form'
import { requireMembership } from '@/lib/auth'
import { allEvents, getTask, listOfficers } from '@/lib/tasks'

export default async function EditTaskPage({ params }: PageProps<'/tasks/[id]/edit'>) {
  const { workspace } = await requireMembership()
  const { id } = await params
  const [task, officers, events] = await Promise.all([getTask(workspace.id, id), listOfficers(workspace.id), allEvents(workspace.id)])
  if (!task) notFound()
  return (
    <Page title="Edit task">
      <TaskForm officers={officers} events={events} task={task} />
    </Page>
  )
}
