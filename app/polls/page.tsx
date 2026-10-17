import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Dom owns this folder.
export default async function PollsPage() {
  await requireMembership()
  return (
    <Page title="Polls">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
}
