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
