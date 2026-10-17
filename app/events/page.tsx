import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Jun owns this folder.
export default async function EventsPage() {
  await requireMembership()
  return (
    <Page title="Events">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
}
