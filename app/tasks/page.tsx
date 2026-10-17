import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jackson owns this folder.
export default async function TasksPage() {
  await requireMembership()
  return (
    <Page title="Tasks">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
}
