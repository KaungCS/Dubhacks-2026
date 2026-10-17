import { Page } from '@/components/ui'
import { requireMembership } from '@/lib/auth'

// Stub from the scaffold. Dom owns this folder.
export default async function MetricsPage() {
  await requireMembership()
  return (
    <Page title="Metrics">
      <p className="text-neutral-500">Coming soon.</p>
    </Page>
  )
}
